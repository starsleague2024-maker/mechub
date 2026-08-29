-- ============================================================
-- 0022_pulizia_categorie.sql  ·  Blocco 5b — Pulizia categorie veicolo
-- Additiva/correttiva. NON distruttiva sui dati utili: nessun veicolo
-- è collegato alle categorie (verificato), quindi la dedup è sicura.
--
-- Fa tre cose, in ordine:
--   1. DEDUP: rimuove le categorie_veicolo duplicate per nome, tenendo
--      la riga più vecchia (min ctid) e spostando eventuali collegamenti
--      officina_categorie_veicolo sulla riga superstite.
--   2. RENAME: 'Furgone' -> 'Mezzi pesanti'.
--   3. VINCOLO: ripristina UNIQUE(nome) per impedire nuovi doppioni,
--      e garantisce che l'officina abbia ESATTAMENTE le 5 categorie
--      definitive collegate (spente): Auto, Moto, Camper, Agricolo, Mezzi pesanti.
--
-- Idempotente: rieseguibile senza danni.
-- ============================================================

-- ── 1. DEDUP categorie_veicolo per nome ─────────────────────
-- Per ogni nome duplicato: individua la riga "canonica" (la più vecchia),
-- sposta i collegamenti dai duplicati alla canonica, poi elimina i duplicati.
do $$
declare
  r record;
  canonica uuid;
begin
  for r in
    select nome from categorie_veicolo group by nome having count(*) > 1
  loop
    -- riga canonica: la più vecchia per created_at, poi id
    select id into canonica
    from categorie_veicolo
    where nome = r.nome
    order by created_at asc, id asc
    limit 1;

    -- sposta i collegamenti dei duplicati sulla canonica (evita conflitti PK)
    update officina_categorie_veicolo ocv
    set categoria_veicolo_id = canonica
    where categoria_veicolo_id in (
      select id from categorie_veicolo where nome = r.nome and id <> canonica
    )
    and not exists (
      select 1 from officina_categorie_veicolo o2
      where o2.officina_id = ocv.officina_id
        and o2.categoria_veicolo_id = canonica
    );

    -- elimina i collegamenti duplicati residui (già presenti sulla canonica)
    delete from officina_categorie_veicolo
    where categoria_veicolo_id in (
      select id from categorie_veicolo where nome = r.nome and id <> canonica
    );

    -- sposta eventuali veicoli (se in futuro ce ne fossero) sulla canonica
    update veicoli
    set categoria_veicolo_id = canonica
    where categoria_veicolo_id in (
      select id from categorie_veicolo where nome = r.nome and id <> canonica
    );

    -- elimina le righe categoria duplicate
    delete from categorie_veicolo
    where nome = r.nome and id <> canonica;
  end loop;
end $$;

-- ── 2. RENAME Furgone -> Mezzi pesanti ──────────────────────
-- Solo se 'Mezzi pesanti' non esiste già (evita collisione col futuro UNIQUE).
do $$
begin
  if not exists (select 1 from categorie_veicolo where nome = 'Mezzi pesanti') then
    update categorie_veicolo set nome = 'Mezzi pesanti' where nome = 'Furgone';
  else
    -- se entrambe esistono, sposta i collegamenti su 'Mezzi pesanti' ed elimina 'Furgone'
    update officina_categorie_veicolo ocv
    set categoria_veicolo_id = (select id from categorie_veicolo where nome='Mezzi pesanti')
    where categoria_veicolo_id = (select id from categorie_veicolo where nome='Furgone')
    and not exists (
      select 1 from officina_categorie_veicolo o2
      where o2.officina_id = ocv.officina_id
        and o2.categoria_veicolo_id = (select id from categorie_veicolo where nome='Mezzi pesanti')
    );
    delete from officina_categorie_veicolo
    where categoria_veicolo_id = (select id from categorie_veicolo where nome='Furgone');
    delete from categorie_veicolo where nome='Furgone';
  end if;
end $$;

-- ── 3. Ripristina UNIQUE(nome) ──────────────────────────────
-- Ora che i doppioni sono spariti, il vincolo può essere (ri)creato.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'categorie_veicolo'::regclass and contype = 'u'
  ) then
    alter table categorie_veicolo add constraint categorie_veicolo_nome_key unique (nome);
  end if;
end $$;

-- ── 4. Allinea le categorie definitive per ogni officina ────
-- Aggiorna il seed globale alle 5 categorie definitive e le collega (spente)
-- a tutte le officine, se non già presenti. Rimpiazza la funzione della 0020.
create or replace function seed_categorie_veicolo(p_officina uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_id uuid;
begin
  foreach v_nome in array array['Auto','Moto','Camper','Agricolo','Mezzi pesanti']
  loop
    select id into v_id from categorie_veicolo where nome = v_nome;
    if v_id is null then
      insert into categorie_veicolo (nome) values (v_nome) returning id into v_id;
    end if;
    insert into officina_categorie_veicolo (officina_id, categoria_veicolo_id, attiva)
    values (p_officina, v_id, false)
    on conflict (officina_id, categoria_veicolo_id) do nothing;
  end loop;
end $$;

grant execute on function seed_categorie_veicolo(uuid) to authenticated;

-- backfill: garantisce le 5 definitive collegate a ogni officina esistente
do $$
declare o record;
begin
  for o in select id from officine loop
    perform seed_categorie_veicolo(o.id);
  end loop;
end $$;
