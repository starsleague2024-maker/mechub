-- ============================================================
-- 0026_competenze_vincolo.sql · Blocco 6 — vincolo competenze per padre
-- Additiva/correttiva. Completa la 0025 che si era fermata sui nomi ripetuti.
--
-- Il vincolo UNIQUE(officina_id, nome) impediva di avere "Manutenzione" e
-- "Revisione" sotto più tipi di cambio. Lo sostituiamo con
-- UNIQUE(officina_id, nome, competenza_padre_id): stesso nome ammesso sotto
-- padri diversi (così ogni voce è assegnabile singolarmente per persona),
-- ma niente doppioni sotto lo stesso padre.
--
-- Poi completa le rinomine dei cambi/differenziali rimaste dalla 0025.
-- Idempotente.
-- ============================================================

-- ══ 1. Sostituisco il vincolo UNIQUE ═══════════════════════
do $$
declare v_con text;
begin
  -- trova il nome reale del vincolo unique su (officina_id, nome)
  select conname into v_con
  from pg_constraint
  where conrelid = 'competenze'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) ilike '%(officina_id, nome)%';
  if v_con is not null then
    execute format('alter table competenze drop constraint %I', v_con);
  end if;

  -- crea il nuovo vincolo per (officina_id, nome, competenza_padre_id) se manca.
  -- NB: in Postgres NULL non entra nei confronti UNIQUE; usiamo un indice
  -- unico su COALESCE del padre così anche le radici (padre NULL) restano uniche.
  if not exists (
    select 1 from pg_indexes where tablename='competenze' and indexname='competenze_officina_nome_padre_key'
  ) then
    create unique index competenze_officina_nome_padre_key
      on competenze (officina_id, nome, coalesce(competenza_padre_id, '00000000-0000-0000-0000-000000000000'::uuid));
  end if;
end $$;

-- ══ 2. Completa rinomine cambi (ora possibili) ═════════════
update competenze set nome = 'Manutenzione'
  where nome in ('Cambio manuale: manutenzione','Cambio automatico: manutenzione','Cambio robotizzato: manutenzione');
update competenze set nome = 'Revisione'
  where nome in ('Cambio manuale: revisione','Cambio automatico: revisione','Cambio robotizzato: revisione');
update competenze set nome = 'Manutenzione' where nome = 'Differenziali: manutenzione';
update competenze set nome = 'Revisione' where nome = 'Differenziali: revisione';
