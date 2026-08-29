-- ============================================================
-- 0021_toggle_categorie_ruoli.sql  ·  Blocco 5
-- Additiva. Nessun DROP distruttivo. Nessuna perdita dati.
--
-- Introduce:
--   1. officina_categorie_veicolo.attiva  → toggle on/off (come alimentazioni)
--   2. Ruoli predefiniti (Titolare, Desk, Capofficina, Meccanico)
--      con seed idempotente + trigger su officine + backfill
--
-- Le categorie NON si aggiungono/rimuovono più: le 5 base esistono sempre
-- (collegate dalla 0020) e si attivano/disattivano col flag `attiva`.
-- Extra categorie restano possibili via "Altro" (insert con attiva=true).
-- ============================================================

-- ── 1. Flag attiva su officina_categorie_veicolo ────────────
-- Default false: coerente con la scelta "tutte spente, attivi ciò che tratti".
alter table officina_categorie_veicolo
  add column if not exists attiva boolean not null default false;

-- ── 2. Ruoli predefiniti ────────────────────────────────────
-- Seed idempotente: crea i 4 ruoli base per un'officina se non esistono.
-- `ruoli` ha unique(officina_id, nome): l'ON CONFLICT rende l'operazione sicura.
-- SECURITY DEFINER per poter scrivere durante la creazione officina (sotto RLS).
create or replace function seed_ruoli(p_officina uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into ruoli (officina_id, nome)
  select p_officina, r
  from (values ('Titolare'),('Desk'),('Capofficina'),('Meccanico')) as v(r)
  on conflict (officina_id, nome) do nothing;
$$;
grant execute on function seed_ruoli(uuid) to authenticated;

-- Trigger: ogni nuova officina nasce con i 4 ruoli base.
create or replace function trg_seed_ruoli()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform seed_ruoli(new.id);
  return new;
end $$;

drop trigger if exists after_insert_officina_ruoli on officine;
create trigger after_insert_officina_ruoli
  after insert on officine
  for each row execute function trg_seed_ruoli();

-- Backfill: i 4 ruoli base per le officine GIÀ esistenti.
do $$
declare o record;
begin
  for o in select id from officine loop
    perform seed_ruoli(o.id);
  end loop;
end $$;
