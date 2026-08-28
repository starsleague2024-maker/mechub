-- ============================================================
-- 0019_certificazioni.sql  ·  Blocco 3 — Certificazioni, abilitazioni, qualifiche
-- Additiva. Nessun DROP distruttivo. Nessuna perdita dati.
--
-- Due entità distinte, ciascuna col suo pattern RLS naturale (coerente con 0016):
--   1. certificazioni          → ramo PERSONA (tabella esistente 0002, estesa)
--   2. certificazioni_officina  → ramo OFFICINA (nuova, officina_id diretto)
--
-- CERTIFICAZIONE ≠ COMPETENZA: qui registriamo abilitazioni/qualifiche
-- (PES, PAV, patentini, certificazioni tecniche) con scadenza strutturata.
-- Lo stato (valida/scaduta/senza scadenza) è CALCOLATO dalla data_scadenza,
-- mai memorizzato, così non si disallinea col passare del tempo.
-- Nessuna durata di validità inventata: la scadenza è un dato configurabile.
-- I giorni di preavviso ("in prossimità") NON sono qui: verranno col blocco reminder.
-- ============================================================

-- ── 1. Estensione additiva di `certificazioni` (ramo PERSONA) ──────────
-- persona_id resta NOT NULL (invariato). Aggiungo i campi mancanti.
alter table certificazioni add column if not exists tipo text;
alter table certificazioni add column if not exists numero_codice text;
alter table certificazioni add column if not exists stato_manuale text;   -- override facoltativo (es. 'revocata','sospesa')
alter table certificazioni add column if not exists note text;
alter table certificazioni add column if not exists documento_path text;  -- path in Supabase Storage (bucket 'certificazioni')
alter table certificazioni add column if not exists updated_at timestamptz not null default now();

-- CHECK additivo sullo stato_manuale (solo override espliciti; NULL = stato derivato dalla scadenza)
do $$ begin
  if not exists (select 1 from pg_constraint where conname='certificazioni_stato_manuale_check') then
    alter table certificazioni add constraint certificazioni_stato_manuale_check
      check (stato_manuale is null or stato_manuale in ('valida','revocata','sospesa'));
  end if;
end $$;

-- trigger updated_at (la funzione set_updated_at esiste dalla 0001)
drop trigger if exists trg_certificazioni_updated_at on certificazioni;
create trigger trg_certificazioni_updated_at before update on certificazioni
  for each row execute function set_updated_at();

-- ── 2. Nuova tabella `certificazioni_officina` (ramo OFFICINA) ─────────
create table if not exists certificazioni_officina (
  id uuid primary key default gen_random_uuid(),
  officina_id uuid not null references officine(id) on delete cascade,
  tipo text,
  nome text not null,
  numero_codice text,
  ente_rilascio text,
  data_rilascio date,
  data_scadenza date,
  stato_manuale text check (stato_manuale is null or stato_manuale in ('valida','revocata','sospesa')),
  note text,
  documento_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_certificazioni_officina_officina on certificazioni_officina (officina_id);
drop trigger if exists trg_certificazioni_officina_updated_at on certificazioni_officina;
create trigger trg_certificazioni_officina_updated_at before update on certificazioni_officina
  for each row execute function set_updated_at();

-- ── 3. RLS ─────────────────────────────────────────────────────────────
-- certificazioni (persona): la policy figlia-di-persone esiste già da 0016
-- (certificazioni_tenant_all) e copre i nuovi campi senza modifiche. Non la tocco.

-- certificazioni_officina: pattern DIRETTO (come ruoli/competenze/clienti in 0016)
alter table certificazioni_officina enable row level security;
drop policy if exists certificazioni_officina_tenant_all on certificazioni_officina;
create policy certificazioni_officina_tenant_all on certificazioni_officina
  for all to authenticated
  using (officina_id = officina_utente())
  with check (officina_id = officina_utente());
grant select, insert, update, delete on certificazioni_officina to authenticated;

-- ── 4. Stato scadenza calcolato (senza scadenza / valida / scaduta) ────
-- Funzione pura: NON inventa preavvisi, NON memorizza nulla. 'in_prossimita'
-- sarà introdotto dal blocco reminder con la sua soglia; qui non si usa.
-- Se c'è uno stato_manuale esplicito, ha precedenza (es. 'revocata').
create or replace function stato_certificazione(p_data_scadenza date, p_stato_manuale text default null)
returns text
language sql
immutable
as $$
  select case
    when p_stato_manuale is not null then p_stato_manuale
    when p_data_scadenza is null then 'senza_scadenza'
    when p_data_scadenza < current_date then 'scaduta'
    else 'valida'
  end;
$$;
grant execute on function stato_certificazione(date, text) to authenticated;

-- ── 5. Supabase Storage: bucket privato 'certificazioni' + policy per-officina ──
-- Path convenzione: {officina_id}/{ambito}/{cert_id}/{filename}
-- L'accesso avviene via signed URL generati lato server; il bucket NON è pubblico.
-- Guardia: su Supabase lo schema storage esiste; in ambiente di test può mancare,
-- quindi eseguiamo questo blocco solo se storage.buckets è presente.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('certificazioni', 'certificazioni', false)
    on conflict (id) do nothing;

    -- Le policy Storage isolano i file per officina: la prima cartella del path
    -- ({officina_id}) deve coincidere con l'officina dell'utente.
    -- (Usa storage.foldername(name)[1] = officina_id::text)
    drop policy if exists cert_storage_select on storage.objects;
    create policy cert_storage_select on storage.objects
      for select to authenticated
      using (bucket_id = 'certificazioni'
             and (storage.foldername(name))[1] = officina_utente()::text);

    drop policy if exists cert_storage_insert on storage.objects;
    create policy cert_storage_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'certificazioni'
                  and (storage.foldername(name))[1] = officina_utente()::text);

    drop policy if exists cert_storage_update on storage.objects;
    create policy cert_storage_update on storage.objects
      for update to authenticated
      using (bucket_id = 'certificazioni'
             and (storage.foldername(name))[1] = officina_utente()::text);

    drop policy if exists cert_storage_delete on storage.objects;
    create policy cert_storage_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'certificazioni'
             and (storage.foldername(name))[1] = officina_utente()::text);
  end if;
end $$;
