-- ============================================================
-- 0020_profilo_officina.sql  ·  Blocco 4 — Profilo officina completo
-- Additiva. Nessun DROP distruttivo. Nessuna perdita dati.
--
-- Introduce:
--   1. Campi anagrafici/contatti/social/fiscali/sede su `officine`
--   2. Seed categorie veicolo predefinite (Auto, Moto, Furgone, Camper, Agricolo)
--      con trigger su nuove officine + backfill, come per le alimentazioni (0018)
--   3. Bucket Storage privato 'logo-officina' + policy per-officina (come cert 0019)
--
-- Tutti i campi officina sono NULLABLE: le officine esistenti restano valide.
-- Nessun tocco a RLS di `officine` (le policy officine_select/officine_update
-- esistono già da 0016 e coprono automaticamente le nuove colonne).
-- ============================================================

-- ── 1. Campi profilo officina ───────────────────────────────
-- Contatti
alter table officine add column if not exists telefono_fisso text;
alter table officine add column if not exists cellulare text;
alter table officine add column if not exists email text;
alter table officine add column if not exists pec text;
alter table officine add column if not exists sito_web text;

-- Social / messaggistica
alter table officine add column if not exists whatsapp text;          -- numero o link wa.me
alter table officine add column if not exists whatsapp_gruppo text;   -- link gruppo/broadcast
alter table officine add column if not exists instagram text;
alter table officine add column if not exists facebook text;
alter table officine add column if not exists tiktok text;
alter table officine add column if not exists google_business text;

-- Dati fiscali / fatturazione
alter table officine add column if not exists ragione_sociale text;
alter table officine add column if not exists partita_iva text;
alter table officine add column if not exists codice_fiscale text;
alter table officine add column if not exists codice_sdi text;
alter table officine add column if not exists iban text;
alter table officine add column if not exists rea text;

-- Sede (l'indirizzo esiste già; aggiungo i complementi)
alter table officine add column if not exists cap text;
alter table officine add column if not exists citta text;
alter table officine add column if not exists provincia text;

-- Logo (path nel bucket 'logo-officina')
alter table officine add column if not exists logo_path text;

-- ── 2. Categorie veicolo predefinite ────────────────────────
-- Le categorie sono globali (nome unique). Il seed crea le 5 categorie base
-- se non esistono e le collega all'officina. Idempotente su entrambi i passi.
-- Stesso schema delle alimentazioni: funzione + trigger + backfill.
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
  foreach v_nome in array array['Auto','Moto','Furgone','Camper','Agricolo']
  loop
    -- crea la categoria globale se non esiste, altrimenti recupera l'id
    select id into v_id from categorie_veicolo where nome = v_nome;
    if v_id is null then
      insert into categorie_veicolo (nome) values (v_nome) returning id into v_id;
    end if;
    -- collega all'officina (idempotente sulla PK composta)
    insert into officina_categorie_veicolo (officina_id, categoria_veicolo_id)
    values (p_officina, v_id)
    on conflict (officina_id, categoria_veicolo_id) do nothing;
  end loop;
end $$;

grant execute on function seed_categorie_veicolo(uuid) to authenticated;

-- Trigger: ogni nuova officina nasce con le 5 categorie base collegate.
create or replace function trg_seed_categorie_veicolo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform seed_categorie_veicolo(new.id);
  return new;
end $$;

drop trigger if exists after_insert_officina_categorie on officine;
create trigger after_insert_officina_categorie
  after insert on officine
  for each row execute function trg_seed_categorie_veicolo();

-- Backfill: collega le 5 categorie base alle officine GIÀ esistenti.
do $$
declare o record;
begin
  for o in select id from officine loop
    perform seed_categorie_veicolo(o.id);
  end loop;
end $$;

-- ── 3. Storage: bucket privato 'logo-officina' + policy per-officina ──
-- Path convenzione: {officina_id}/{filename}
-- Stesso pattern del bucket 'certificazioni' (0019). Guardia su storage.buckets.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('logo-officina', 'logo-officina', false)
    on conflict (id) do nothing;

    drop policy if exists logo_storage_select on storage.objects;
    create policy logo_storage_select on storage.objects
      for select to authenticated
      using (bucket_id = 'logo-officina'
             and (storage.foldername(name))[1] = officina_utente()::text);

    drop policy if exists logo_storage_insert on storage.objects;
    create policy logo_storage_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'logo-officina'
                  and (storage.foldername(name))[1] = officina_utente()::text);

    drop policy if exists logo_storage_update on storage.objects;
    create policy logo_storage_update on storage.objects
      for update to authenticated
      using (bucket_id = 'logo-officina'
             and (storage.foldername(name))[1] = officina_utente()::text);

    drop policy if exists logo_storage_delete on storage.objects;
    create policy logo_storage_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'logo-officina'
             and (storage.foldername(name))[1] = officina_utente()::text);
  end if;
end $$;
