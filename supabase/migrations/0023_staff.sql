-- ============================================================
-- 0023_staff.sql  ·  Blocco 6 — Ruoli & Staff
-- Additiva. Nessun DROP distruttivo. Nessuna perdita dati.
--
-- USA IL SISTEMA PERMESSI ESISTENTE (0004_permessi_processi / 0014_seed_permessi):
--   tabella `permessi` (id, codice, descrizione) — 13 permessi-azione
--   tabella `ruolo_permessi` (ruolo_id, permesso_id) — ponte, sì/no
-- Non crea un secondo sistema. Aggiunge solo l'override per persona.
--
-- Contenuto:
--   1.  persone: + foto_path
--   2.  persona_orari
--   3.  persona_categorie_veicolo
--   4.  persona_alimentazioni
--   5.  mansioni + persona_mansioni
--   6.  persona_permessi (override sul sistema esistente)
--   7.  membri_officina: admin multiplo
--   8.  chiusure_officina
--   9.  RLS
--  10.  seed: mansioni, permessi-ruolo (sistema esistente), festività
--  11.  Storage: bucket 'foto-staff'
-- ============================================================

-- ══ 1. Foto persona ═════════════════════════════════════════
alter table persone add column if not exists foto_path text;

-- ══ 2. Orari personali ══════════════════════════════════════
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

-- ══ 6. Override permessi per persona (sul sistema esistente) ═
-- concesso=true  → aggiunge il permesso alla persona (oltre al ruolo)
-- concesso=false → revoca alla persona un permesso che il ruolo darebbe
-- Permesso effettivo = (permessi del ruolo ∪ concessi) ∖ revocati
create table if not exists persona_permessi (
  persona_id  uuid not null references persone(id) on delete cascade,
  permesso_id uuid not null references permessi(id) on delete cascade,
  concesso    boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (persona_id, permesso_id)
);
create index if not exists idx_persona_permessi_persona on persona_permessi (persona_id);

-- ══ 7. Admin multiplo su membri_officina ════════════════════
alter table membri_officina add column if not exists e_admin boolean not null default false;
update membri_officina set e_admin = true where ruolo_membro = 'titolare' and e_admin = false;

-- ══ 8. Chiusure officina (giorni rossi / festività) ═════════
create table if not exists chiusure_officina (
  id         uuid primary key default gen_random_uuid(),
  officina_id uuid not null references officine(id) on delete cascade,
  data       date not null,
  motivo     text,
  ricorrente boolean not null default false,
  created_at timestamptz not null default now(),
  unique (officina_id, data)
);
create index if not exists idx_chiusure_officina on chiusure_officina (officina_id);

-- ══ 9. RLS ══════════════════════════════════════════════════
alter table persona_orari enable row level security;
alter table persona_categorie_veicolo enable row level security;
alter table persona_alimentazioni enable row level security;
alter table persona_mansioni enable row level security;
alter table persona_permessi enable row level security;
alter table mansioni enable row level security;
alter table chiusure_officina enable row level security;

-- figlie di persone
do $$
declare t text;
begin
  foreach t in array array[
    'persona_orari','persona_categorie_veicolo','persona_alimentazioni',
    'persona_mansioni','persona_permessi'
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

-- officina diretta
drop policy if exists mansioni_tenant_all on mansioni;
create policy mansioni_tenant_all on mansioni for all to authenticated
  using (officina_id = officina_utente()) with check (officina_id = officina_utente());

drop policy if exists chiusure_tenant_all on chiusure_officina;
create policy chiusure_tenant_all on chiusure_officina for all to authenticated
  using (officina_id = officina_utente()) with check (officina_id = officina_utente());

grant select, insert, update, delete on
  persona_orari, persona_categorie_veicolo, persona_alimentazioni,
  persona_mansioni, persona_permessi, mansioni, chiusure_officina to authenticated;

-- ══ 10a. Seed mansioni per officina ═════════════════════════
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

-- ══ 10b. Seed permessi-ruolo (USA IL SISTEMA ESISTENTE) ═════
-- Assegna i permessi-azione ai ruoli base, SOLO se il ruolo non ha già permessi.
-- Non sovrascrive assegnazioni esistenti.
create or replace function seed_ruolo_permessi(p_officina uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_meccanico text[] := array['mettere_in_pausa','riprendere_lavoro','annullare_lavorazione_intervento','accettare_sovraccarico'];
  v_capo text[] := array['mettere_in_pausa','riprendere_lavoro','annullare_lavorazione_intervento','accettare_sovraccarico',
                         'assegnare_lavori','riassegnare_lavori','modificare_pianificazione','modificare_competenze_richieste',
                         'gestire_arrivo_ricambi','ordinare_ricambi'];
  v_desk text[] := array['prendere_appuntamenti','modificare_appuntamenti','approvare_preventivi','ordinare_ricambi','gestire_arrivo_ricambi'];
  codici text[];
begin
  for r in select id, nome from ruoli where officina_id = p_officina loop
    -- salta se il ruolo ha già permessi assegnati
    if exists (select 1 from ruolo_permessi where ruolo_id = r.id) then
      continue;
    end if;
    if r.nome = 'Titolare' then
      -- tutti i permessi
      insert into ruolo_permessi (ruolo_id, permesso_id)
      select r.id, p.id from permessi p
      on conflict do nothing;
      continue;
    elsif r.nome = 'Capofficina' then codici := v_capo;
    elsif r.nome = 'Desk' then codici := v_desk;
    elsif r.nome = 'Meccanico' then codici := v_meccanico;
    else continue;
    end if;
    insert into ruolo_permessi (ruolo_id, permesso_id)
    select r.id, p.id from permessi p where p.codice = any(codici)
    on conflict do nothing;
  end loop;
end $$;
grant execute on function seed_ruolo_permessi(uuid) to authenticated;

-- ══ 10c. Seed festività nazionali IT (ricorrenti) ══════════
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

-- ══ 10d. Trigger su nuova officina + backfill ══════════════
create or replace function trg_seed_staff()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform seed_mansioni(new.id);
  perform seed_ruolo_permessi(new.id);
  perform seed_festivita(new.id);
  return new;
end $$;
drop trigger if exists after_insert_officina_staff on officine;
create trigger after_insert_officina_staff
  after insert on officine for each row execute function trg_seed_staff();

do $$
declare o record;
begin
  for o in select id from officine loop
    perform seed_mansioni(o.id);
    perform seed_ruolo_permessi(o.id);
    perform seed_festivita(o.id);
  end loop;
end $$;

-- ══ 11. Storage: bucket privato 'foto-staff' ═══════════════
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
