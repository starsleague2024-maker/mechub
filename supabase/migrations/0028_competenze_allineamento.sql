-- ============================================================
-- 0028_competenze_allineamento.sql · Blocco 6
-- Allinea il catalogo competenze allo stato desiderato, partendo da un DB
-- dove: manca la colonna `descrizione`, ci sono doppioni (Manutenzione ×8,
-- centraline doppie), i cambi sono già rinominati.
--
-- Ordine sicuro:
--   1. crea colonna descrizione (se manca)
--   2. garantisce il vincolo UNIQUE per (officina, nome, padre)
--   3. DEDUP completo del catalogo
--   4. unione centraline → Centraline/ECU
--   5. bombole GPL/metano + note diagnosi/aftermarket
-- Idempotente.
-- ============================================================

-- ══ 1. Colonna descrizione ═════════════════════════════════
alter table competenze add column if not exists descrizione text;

-- ══ 2. Vincolo unico per (officina, nome, padre) ═══════════
-- Necessario prima della dedup, e permette nomi ripetuti sotto padri diversi.
do $$
declare v_con text;
begin
  -- rimuovi un eventuale vecchio unique su (officina_id, nome)
  select conname into v_con from pg_constraint
  where conrelid='competenze'::regclass and contype='u'
    and pg_get_constraintdef(oid) ilike '%(officina_id, nome)%';
  if v_con is not null then execute format('alter table competenze drop constraint %I', v_con); end if;
end $$;

-- ══ 3. DEDUP (per officina, nome, padre) ═══════════════════
do $$
declare r record; canonica uuid;
begin
  for r in
    select officina_id, nome, coalesce(competenza_padre_id::text,'ROOT') as padre
    from competenze
    group by officina_id, nome, coalesce(competenza_padre_id::text,'ROOT')
    having count(*) > 1
  loop
    select id into canonica from competenze
    where nome=r.nome and coalesce(officina_id::text,'')=coalesce(r.officina_id::text,'')
      and coalesce(competenza_padre_id::text,'ROOT')=r.padre
    order by created_at asc, id asc limit 1;

    update competenze set competenza_padre_id = canonica
    where competenza_padre_id in (
      select id from competenze where nome=r.nome
        and coalesce(officina_id::text,'')=coalesce(r.officina_id::text,'')
        and coalesce(competenza_padre_id::text,'ROOT')=r.padre and id<>canonica);

    update persona_competenze pc set competenza_id=canonica
    where competenza_id in (
      select id from competenze where nome=r.nome
        and coalesce(officina_id::text,'')=coalesce(r.officina_id::text,'')
        and coalesce(competenza_padre_id::text,'ROOT')=r.padre and id<>canonica)
    and not exists (select 1 from persona_competenze p2 where p2.persona_id=pc.persona_id and p2.competenza_id=canonica);

    delete from persona_competenze where competenza_id in (
      select id from competenze where nome=r.nome
        and coalesce(officina_id::text,'')=coalesce(r.officina_id::text,'')
        and coalesce(competenza_padre_id::text,'ROOT')=r.padre and id<>canonica);

    delete from competenze where nome=r.nome
      and coalesce(officina_id::text,'')=coalesce(r.officina_id::text,'')
      and coalesce(competenza_padre_id::text,'ROOT')=r.padre and id<>canonica;
  end loop;
end $$;

-- crea l'indice unico dopo la dedup (idempotente)
do $$
begin
  if not exists (select 1 from pg_indexes where tablename='competenze' and indexname='competenze_officina_nome_padre_key') then
    create unique index competenze_officina_nome_padre_key
      on competenze (officina_id, nome, coalesce(competenza_padre_id, '00000000-0000-0000-0000-000000000000'::uuid));
  end if;
end $$;

-- ══ 4. Unione centraline → Centraline/ECU ══════════════════
do $$
declare v_prog uuid; v_cod uuid;
begin
  select id into v_prog from competenze where nome='Programmazione centraline' limit 1;
  select id into v_cod  from competenze where nome='Codifica centraline' limit 1;
  if v_prog is not null then
    update competenze set nome='Centraline/ECU',
      descrizione='Programmazione e codifica centraline (ECU).' where id=v_prog;
    if v_cod is not null then
      update persona_competenze pc set competenza_id=v_prog where competenza_id=v_cod
        and not exists (select 1 from persona_competenze p2 where p2.persona_id=pc.persona_id and p2.competenza_id=v_prog);
      delete from persona_competenze where competenza_id=v_cod;
      delete from competenze where id=v_cod;
    end if;
  elsif v_cod is not null then
    update competenze set nome='Centraline/ECU',
      descrizione='Programmazione e codifica centraline (ECU).' where id=v_cod;
  end if;
end $$;

-- ══ 5. Bombole + note ══════════════════════════════════════
update competenze set nome='Sostituzione bombole',
  descrizione='Sostituzione bombole a scadenza (10 anni per il GPL auto).'
  where nome='Revisione/sostituzione bombole GPL';
update competenze set nome='Revisione bombole',
  descrizione='Collaudo/revisione periodica delle bombole metano.'
  where nome='Revisione/sostituzione bombole metano';
update competenze set descrizione='Collega lo strumento, legge i codici errore e li segnala.'
  where nome='Diagnosi base';
update competenze set descrizione='Risale alla causa reale, distinguendo il guasto dai sintomi derivati.'
  where nome='Diagnosi avanzata';
update competenze set descrizione='Solo su impianti aftermarket (non di serie).'
  where nome in ('Rimozione impianto GPL','Rimozione impianto metano');
