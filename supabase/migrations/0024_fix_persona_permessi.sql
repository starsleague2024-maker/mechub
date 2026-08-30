-- ============================================================
-- 0024_fix_persona_permessi.sql · Blocco 6 — allineamento
-- Additiva. La tabella persona_ruoli e le altre esistono già nello schema base.
-- Unica correzione necessaria: persona_permessi non aveva la colonna `concesso`
-- (serve per l'override: concesso=true aggiunge, concesso=false revoca).
-- ============================================================
alter table persona_permessi
  add column if not exists concesso boolean not null default true;

-- assicura la PK composta (se mancante) per permettere upsert
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'persona_permessi'::regclass and contype = 'p'
  ) then
    alter table persona_permessi add primary key (persona_id, permesso_id);
  end if;
end $$;
