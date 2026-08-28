-- ============================================================
-- 0018_alimentazioni.sql  ·  Blocco 2 — Alimentazioni trattate
-- Additiva. Nessun DROP distruttivo. Nessuna perdita dati.
--
-- Introduce:
--   1. veicoli.alimentazione            (caratteristica del veicolo)
--   2. officina_alimentazioni           (quali alimentazioni tratta l'officina)
--   3. RLS con isolamento per officina (via officina_utente())
--   4. seed_alimentazioni() idempotente + trigger su officine + backfill
--
-- L'alimentazione è una CARATTERISTICA DEL VEICOLO, non una competenza.
-- Qui interessa solo: "l'officina tratta questa alimentazione? sì/no".
-- Nessuna lavorazione GPL/metano, bombole, patentini: blocchi successivi.
-- ============================================================

-- Le 7 alimentazioni standard. text + CHECK (non enum) per restare additivi:
-- aggiungere un valore in futuro sarà una semplice migration, senza ALTER TYPE.
-- Lista canonica riusata sia dal veicolo sia dall'officina.

-- ── 1. Alimentazione del veicolo ────────────────────────────
-- Facoltativa (nullable): i veicoli esistenti restano validi.
alter table veicoli
  add column if not exists alimentazione text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'veicoli_alimentazione_check'
  ) then
    alter table veicoli
      add constraint veicoli_alimentazione_check
      check (alimentazione is null or alimentazione in
        ('benzina','diesel','gpl','metano','ibrido','elettrico','idrogeno'));
  end if;
end $$;

-- ── 2. Alimentazioni trattate dall'officina ─────────────────
create table if not exists officina_alimentazioni (
  id            uuid primary key default gen_random_uuid(),
  officina_id   uuid not null references officine(id) on delete cascade,
  alimentazione text not null
                check (alimentazione in
                  ('benzina','diesel','gpl','metano','ibrido','elettrico','idrogeno')),
  attiva        boolean not null default false,
  created_at    timestamptz not null default now(),
  -- Impossibile avere duplicati della stessa alimentazione per la stessa officina.
  unique (officina_id, alimentazione)
);

create index if not exists idx_officina_alimentazioni_officina
  on officina_alimentazioni (officina_id);

-- ── 3. RLS: isolamento per officina ─────────────────────────
alter table officina_alimentazioni enable row level security;

drop policy if exists sel_officina_alimentazioni on officina_alimentazioni;
create policy sel_officina_alimentazioni on officina_alimentazioni
  for select using (officina_id = officina_utente());

drop policy if exists ins_officina_alimentazioni on officina_alimentazioni;
create policy ins_officina_alimentazioni on officina_alimentazioni
  for insert with check (officina_id = officina_utente());

drop policy if exists upd_officina_alimentazioni on officina_alimentazioni;
create policy upd_officina_alimentazioni on officina_alimentazioni
  for update using (officina_id = officina_utente())
             with check (officina_id = officina_utente());

drop policy if exists del_officina_alimentazioni on officina_alimentazioni;
create policy del_officina_alimentazioni on officina_alimentazioni
  for delete using (officina_id = officina_utente());

grant select, insert, update, delete on officina_alimentazioni to authenticated;

-- ── 4. Seed idempotente + automazione ───────────────────────
-- Funzione tecnica: crea le 7 righe (attiva=false) per una officina.
-- Idempotente via ON CONFLICT sulla UNIQUE. SECURITY DEFINER così può
-- scrivere anche durante la creazione officina, sotto RLS, come gli altri helper.
-- NON esposta all'utente: nessun bottone "Genera" in UI.
create or replace function seed_alimentazioni(p_officina uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into officina_alimentazioni (officina_id, alimentazione, attiva)
  select p_officina, a, false
  from (values ('benzina'),('diesel'),('gpl'),('metano'),
               ('ibrido'),('elettrico'),('idrogeno')) as v(a)
  on conflict (officina_id, alimentazione) do nothing;
$$;

-- Trigger: ogni nuova officina nasce con le 7 alimentazioni.
create or replace function trg_seed_alimentazioni()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform seed_alimentazioni(new.id);
  return new;
end $$;

drop trigger if exists after_insert_officina_alimentazioni on officine;
create trigger after_insert_officina_alimentazioni
  after insert on officine
  for each row execute function trg_seed_alimentazioni();

-- Backfill: predispone le 7 righe anche per le officine GIÀ esistenti,
-- all'atto dell'applicazione di questa migration.
do $$
declare o record;
begin
  for o in select id from officine loop
    perform seed_alimentazioni(o.id);
  end loop;
end $$;
