-- ============================================================
-- 0023_staff.sql  ·  Blocco 6 — Ruoli & Staff
-- Additiva. Nessun DROP distruttivo. Nessuna perdita dati.
--
-- Costruisce la struttura completa dello staff, tenendo SEPARATI:
--   persona · ruolo · competenze · mansioni · veicoli · alimentazioni · permessi
--
-- Riusa senza duplicare: competenze, persona_competenze (con livello),
-- certificazioni, officina_categorie_veicolo, officina_alimentazioni, ruoli.
--
-- Contenuto:
--   1.  persone: + foto_path
--   2.  persona_orari            (7 giorni, entrata/uscita/pausa)
--   3.  persona_categorie_veicolo (veicoli trattati dalla persona)
--   4.  persona_alimentazioni     (alimentazioni della persona)
--   5.  mansioni + persona_mansioni (catalogo separato dalle competenze)
--   6.  aree_permesso (catalogo) + ruolo_permessi + persona_permessi_override
--   7.  membri_officina: admin multiplo (colonna e_admin)
--   8.  chiusure_officina        (giorni rossi / festività)
--   9.  seed: mansioni, permessi di default per ruolo, festività IT
--  10.  Storage: bucket 'foto-staff'
-- ============================================================

-- ══ 1. Foto persona ═════════════════════════════════════════
alter table persone add column if not exists foto_path text;

-- ══ 2. Orari personali ══════════════════════════════════════
-- Una riga per giorno (0=lunedì … 6=domenica). lavorativo=false → giorno libero.
-- Pausa singola opzionale. Le ore effettive si calcolano a valle.
create table if not exists persona_orari (
  id           uuid primary key default gen_random_uuid(),
  persona_id   uuid not null references persone(id) on delete cascade,
  giorno       smallint not null check (giorno between 0 and 6),
  lavorativo   boolean not null default true,
  entrata      time,
  uscita       time,
  pausa_inizio time,
  pausa_fine   time,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (persona_id, giorno)
);
create index if not exists idx_persona_orari_persona on persona_orari (persona_id);
drop trigger if exists trg_persona_orari_updated_at on persona_orari;
create trigger trg_persona_orari_updated_at before update on persona_orari
  for each row execute function set_updated_at();

-- ══ 3. Veicoli trattati dalla persona ═══════════════════════
-- Solo categorie ATTIVE dell'officina (vincolo applicato lato app + RLS).
create table if not exists persona_categorie_veicolo (
  persona_id           uuid not null references persone(id) on delete cascade,
  categoria_veicolo_id uuid not null references categorie_veicolo(id) on delete cascade,
  created_at           timestamptz not null default now(),
  primary key (persona_id, categoria_veicolo_id)
);
create index if not exists idx_persona_cat_persona on persona_categorie_veicolo (persona_id);

-- ══ 4. Alimentazioni della persona ══════════════════════════
create table if not exists persona_alimentazioni (
  persona_id    uuid not null references persone(id) on delete cascade,
  alimentazione text not null
                check (alimentazione in
                  ('benzina','diesel','gpl','metano','ibrido','elettrico','idrogeno')),
  created_at    timestamptz not null default now(),
  primary key (persona_id, alimentazione)
);
create index if not exists idx_persona_alim_persona on persona_alimentazioni (persona_id);

-- ══ 5. Mansioni (catalogo separato dalle competenze) ════════
-- Attività organizzative/gestionali. NON sono capacità tecniche.
-- gruppo: etichetta puramente visiva ('desk' | 'officina'), non un vincolo.
create table if not exists mansioni (
  id         uuid primary key default gen_random_uuid(),
  officina_id uuid not null references officine(id) on delete cascade,
  nome       text not null,
  gruppo     text not null default 'desk' check (gruppo in ('desk','officina')),
  ordine     integer not null default 0,
  attiva     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (officina_id, nome)
);
create index if not exists idx_mansioni_officina on mansioni (officina_id);

create table if not exists persona_mansioni (
  persona_id  uuid not null references persone(id) on delete cascade,
  mansione_id uuid not null references mansioni(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (persona_id, mansione_id)
);
create index if not exists idx_persona_mansioni_persona on persona_mansioni (persona_id);

-- ══ 6. Permessi ═════════════════════════════════════════════
-- Catalogo aree (globale, condiviso). Livelli: 0=nessuno,1=lettura,2=modifica.
create table if not exists aree_permesso (
  codice text primary key,
  nome   text not null,
  ordine integer not null default 0
);
insert into aree_permesso (codice, nome, ordine) values
  ('officina_lavori',   'Officina & Lavori',   1),
  ('accettazione',      'Accettazione',        2),
  ('preventivi',        'Preventivi & Listini',3),
  ('ricambi',           'Ricambi & Magazzino', 4),
  ('staff',             'Staff',               5),
  ('impostazioni',      'Impostazioni',        6),
  ('economia',          'Economia',            7),
  ('registro_eventi',   'Registro eventi',     8)
on conflict (codice) do nothing;

-- Permessi di DEFAULT per ruolo (base). livello 0/1/2.
create table if not exists ruolo_permessi (
  ruolo_id    uuid not null references ruoli(id) on delete cascade,
  area_codice text not null references aree_permesso(codice) on delete cascade,
  livello     smallint not null default 0 check (livello between 0 and 2),
  primary key (ruolo_id, area_codice)
);
create index if not exists idx_ruolo_permessi_ruolo on ruolo_permessi (ruolo_id);

-- Override per persona (eccezioni sopra il ruolo). Solo le aree con eccezione.
create table if not exists persona_permessi_override (
  persona_id  uuid not null references persone(id) on delete cascade,
  area_codice text not null references aree_permesso(codice) on delete cascade,
  livello     smallint not null check (livello between 0 and 2),
  primary key (persona_id, area_codice)
);
create index if not exists idx_persona_override_persona on persona_permessi_override (persona_id);

-- ══ 7. Admin multiplo su membri_officina ════════════════════
-- 'admin' è un privilegio ACCOUNT, separato dal ruolo operativo.
-- Il titolare resta e_titolare(); admin è un flag aggiuntivo assegnabile a più persone.
alter table membri_officina add column if not exists e_admin boolean not null default false;
-- il titolare è admin per definizione
update membri_officina set e_admin = true where ruolo_membro = 'titolare' and e_admin = false;

-- ══ 8. Chiusure officina (giorni rossi / festività) ═════════
create table if not exists chiusure_officina (
  id         uuid primary key default gen_random_uuid(),
  officina_id uuid not null references officine(id) on delete cascade,
  data       date not null,
  motivo     text,
  ricorrente boolean not null default false,  -- festività che si ripete ogni anno
  created_at timestamptz not null default now(),
  unique (officina_id, data)
);
create index if not exists idx_chiusure_officina on chiusure_officina (officina_id);

-- ══ 9. RLS ══════════════════════════════════════════════════
-- persona_* : figlie di persone (risalita a officina via persona)
-- mansioni, chiusure_officina : officina_id diretto
-- ruolo_permessi : figlia di ruoli · persona_permessi_override : figlia di persone
-- aree_permesso : catalogo globale in sola lettura

alter table persona_orari enable row level security;
alter table persona_categorie_veicolo enable row level security;
alter table persona_alimentazioni enable row level security;
alter table persona_mansioni enable row level security;
alter table persona_permessi_override enable row level security;
alter table mansioni enable row level security;
alter table ruolo_permessi enable row level security;
alter table chiusure_officina enable row level security;
alter table aree_permesso enable row level security;

-- helper macro: figlia di persone
do $$
declare t text;
begin
  foreach t in array array[
    'persona_orari','persona_categorie_veicolo','persona_alimentazioni',
    'persona_mansioni','persona_permessi_override'
  ]
  loop
    execute format($f$
      drop policy if exists %1$s_tenant_all on %1$s;
      create policy %1$s_tenant_all on %1$s for all to authenticated
        using (exists (select 1 from persone p where p.id = %1$s.persona_id and p.officina_id = officina_utente()))
        with check (exists (select 1 from persone p where p.id = %1$s.persona_id and p.officina_id = officina_utente()));
    $f$, t);
  end loop;
end $$;

-- mansioni: officina diretta
drop policy if exists mansioni_tenant_all on mansioni;
create policy mansioni_tenant_all on mansioni for all to authenticated
  using (officina_id = officina_utente()) with check (officina_id = officina_utente());

-- chiusure_officina: officina diretta
drop policy if exists chiusure_tenant_all on chiusure_officina;
create policy chiusure_tenant_all on chiusure_officina for all to authenticated
  using (officina_id = officina_utente()) with check (officina_id = officina_utente());

-- ruolo_permessi: figlia di ruoli
drop policy if exists ruolo_permessi_tenant_all on ruolo_permessi;
create policy ruolo_permessi_tenant_all on ruolo_permessi for all to authenticated
  using (exists (select 1 from ruoli r where r.id = ruolo_permessi.ruolo_id and r.officina_id = officina_utente()))
  with check (exists (select 1 from ruoli r where r.id = ruolo_permessi.ruolo_id and r.officina_id = officina_utente()));

-- aree_permesso: catalogo globale, lettura per tutti gli autenticati
drop policy if exists aree_permesso_read on aree_permesso;
create policy aree_permesso_read on aree_permesso for select to authenticated using (true);

grant select, insert, update, delete on
  persona_orari, persona_categorie_veicolo, persona_alimentazioni,
  persona_mansioni, persona_permessi_override, mansioni, ruolo_permessi,
  chiusure_officina to authenticated;
grant select on aree_permesso to authenticated;

-- ══ 10. Seed mansioni per officina ══════════════════════════
create or replace function seed_mansioni(p_officina uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into mansioni (officina_id, nome, gruppo, ordine)
  select p_officina, m.nome, m.gruppo, m.ordine
  from (values
    ('Appuntamenti','desk',1),
    ('Accettazione','desk',2),
    ('Preventivi','desk',3),
    ('Gestione anagrafiche / clienti','desk',4),
    ('Incassi','desk',5),
    ('Gestione cassa / prima nota','desk',6),
    ('Consegna veicoli','desk',7),
    ('Comunicazione cliente','desk',8),
    ('Gestione ricambi','desk',9),
    ('Contatto fornitori','desk',10),
    ('Gestione garanzie / assicurazioni','desk',11),
    ('Gestione auto sostitutive','desk',12),
    ('Gestione lavorazioni','officina',13),
    ('Controllo lavorazioni','officina',14),
    ('Programmazione / assegnazione lavori','officina',15)
  ) as m(nome,gruppo,ordine)
  on conflict (officina_id, nome) do nothing;
end $$;
grant execute on function seed_mansioni(uuid) to authenticated;

-- ══ 11. Seed permessi default per ruolo ═════════════════════
-- Imposta i default SOLO se il ruolo non ha ancora permessi (non sovrascrive scelte).
create or replace function seed_permessi_ruoli(p_officina uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in select id, nome from ruoli where officina_id = p_officina loop
    -- se ha già permessi, salta
    if exists (select 1 from ruolo_permessi where ruolo_id = r.id) then
      continue;
    end if;
    if r.nome = 'Titolare' then
      insert into ruolo_permessi (ruolo_id, area_codice, livello) values
        (r.id,'officina_lavori',2),(r.id,'accettazione',2),(r.id,'preventivi',2),
        (r.id,'ricambi',2),(r.id,'staff',2),(r.id,'impostazioni',2),
        (r.id,'economia',2),(r.id,'registro_eventi',2)
      on conflict do nothing;
    elsif r.nome = 'Capofficina' then
      insert into ruolo_permessi (ruolo_id, area_codice, livello) values
        (r.id,'officina_lavori',2),(r.id,'accettazione',1),(r.id,'preventivi',1),
        (r.id,'ricambi',2),(r.id,'staff',1),(r.id,'impostazioni',0),
        (r.id,'economia',0),(r.id,'registro_eventi',1)
      on conflict do nothing;
    elsif r.nome = 'Desk' then
      insert into ruolo_permessi (ruolo_id, area_codice, livello) values
        (r.id,'officina_lavori',1),(r.id,'accettazione',2),(r.id,'preventivi',2),
        (r.id,'ricambi',1),(r.id,'staff',0),(r.id,'impostazioni',0),
        (r.id,'economia',0),(r.id,'registro_eventi',0)
      on conflict do nothing;
    elsif r.nome = 'Meccanico' then
      insert into ruolo_permessi (ruolo_id, area_codice, livello) values
        (r.id,'officina_lavori',2),(r.id,'accettazione',1),(r.id,'preventivi',0),
        (r.id,'ricambi',1),(r.id,'staff',0),(r.id,'impostazioni',0),
        (r.id,'economia',0),(r.id,'registro_eventi',0)
      on conflict do nothing;
    end if;
  end loop;
end $$;
grant execute on function seed_permessi_ruoli(uuid) to authenticated;

-- ══ 12. Seed festività nazionali IT (ricorrenti) ════════════
-- Date dell'anno corrente; ricorrente=true → si ripetono ogni anno (stessa g/m).
create or replace function seed_festivita(p_officina uuid)
returns void language plpgsql security definer set search_path = public as $$
declare y int := extract(year from current_date);
begin
  insert into chiusure_officina (officina_id, data, motivo, ricorrente)
  select p_officina, make_date(y, m, d), motivo, true
  from (values
    (1,1,'Capodanno'),(1,6,'Epifania'),(4,25,'Liberazione'),
    (5,1,'Festa del Lavoro'),(6,2,'Festa della Repubblica'),
    (8,15,'Ferragosto'),(11,1,'Ognissanti'),(12,8,'Immacolata'),
    (12,25,'Natale'),(12,26,'Santo Stefano')
  ) as f(m,d,motivo)
  on conflict (officina_id, data) do nothing;
end $$;
grant execute on function seed_festivita(uuid) to authenticated;

-- ══ 13. Trigger su nuova officina + backfill ════════════════
create or replace function trg_seed_staff()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform seed_mansioni(new.id);
  perform seed_permessi_ruoli(new.id);
  perform seed_festivita(new.id);
  return new;
end $$;
drop trigger if exists after_insert_officina_staff on officine;
create trigger after_insert_officina_staff
  after insert on officine for each row execute function trg_seed_staff();

-- backfill officine esistenti
do $$
declare o record;
begin
  for o in select id from officine loop
    perform seed_mansioni(o.id);
    perform seed_permessi_ruoli(o.id);
    perform seed_festivita(o.id);
  end loop;
end $$;

-- ══ 14. Storage: bucket privato 'foto-staff' ════════════════
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('foto-staff','foto-staff',false)
    on conflict (id) do nothing;

    drop policy if exists foto_staff_select on storage.objects;
    create policy foto_staff_select on storage.objects for select to authenticated
      using (bucket_id='foto-staff' and (storage.foldername(name))[1] = officina_utente()::text);
    drop policy if exists foto_staff_insert on storage.objects;
    create policy foto_staff_insert on storage.objects for insert to authenticated
      with check (bucket_id='foto-staff' and (storage.foldername(name))[1] = officina_utente()::text);
    drop policy if exists foto_staff_update on storage.objects;
    create policy foto_staff_update on storage.objects for update to authenticated
      using (bucket_id='foto-staff' and (storage.foldername(name))[1] = officina_utente()::text);
    drop policy if exists foto_staff_delete on storage.objects;
    create policy foto_staff_delete on storage.objects for delete to authenticated
      using (bucket_id='foto-staff' and (storage.foldername(name))[1] = officina_utente()::text);
  end if;
end $$;
