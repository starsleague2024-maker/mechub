-- ============================================================
-- 0025_competenze_fix.sql · Blocco 6 — pulizia e affinamento competenze
-- Additiva/correttiva. Nessuna perdita dati utili.
--
--  A. + colonna descrizione (note esplicative di fianco alle voci)
--  B. DEDUP catalogo competenze (voci duplicate per nome+padre)
--  C. Cambi: rinomina "Cambio X: manutenzione/revisione" → figli puliti
--  D. Autodiagnosi base/avanzata: descrizioni
--  E. Centraline: unione Programmazione+Codifica → "Centraline/ECU"
--  F. Bombole: GPL "Sostituzione bombole" · Metano "Revisione bombole"
--  G. Rimozione GPL/metano: nota "solo impianti aftermarket"
--
-- Idempotente: rieseguibile senza danni.
-- ============================================================

-- ══ A. Colonna descrizione ══════════════════════════════════
alter table competenze add column if not exists descrizione text;

-- ══ B. DEDUP (per nome + padre) ═════════════════════════════
-- Tiene la riga più vecchia; sposta persona_competenze sulla superstite.
do $$
declare r record; canonica uuid;
begin
  for r in
    select nome, coalesce(competenza_padre_id::text,'ROOT') as padre
    from competenze
    group by nome, coalesce(competenza_padre_id::text,'ROOT')
    having count(*) > 1
  loop
    select id into canonica from competenze
    where nome = r.nome and coalesce(competenza_padre_id::text,'ROOT') = r.padre
    order by created_at asc, id asc limit 1;

    -- sposta i figli dei duplicati sulla canonica
    update competenze set competenza_padre_id = canonica
    where competenza_padre_id in (
      select id from competenze
      where nome = r.nome and coalesce(competenza_padre_id::text,'ROOT') = r.padre and id <> canonica
    );
    -- sposta persona_competenze sulla canonica (evita conflitti)
    update persona_competenze pc set competenza_id = canonica
    where competenza_id in (
      select id from competenze
      where nome = r.nome and coalesce(competenza_padre_id::text,'ROOT') = r.padre and id <> canonica
    )
    and not exists (
      select 1 from persona_competenze p2
      where p2.persona_id = pc.persona_id and p2.competenza_id = canonica
    );
    delete from persona_competenze
    where competenza_id in (
      select id from competenze
      where nome = r.nome and coalesce(competenza_padre_id::text,'ROOT') = r.padre and id <> canonica
    );
    -- elimina i duplicati
    delete from competenze
    where nome = r.nome and coalesce(competenza_padre_id::text,'ROOT') = r.padre and id <> canonica;
  end loop;
end $$;

-- ══ C. Cambi: rinomina figli puliti ════════════════════════
-- "Cambio manuale: manutenzione" → "Manutenzione" (resta figlio di "Cambio manuale")
-- idem revisione, e per automatico/robotizzato.
update competenze set nome = 'Manutenzione'
  where nome in ('Cambio manuale: manutenzione','Cambio automatico: manutenzione','Cambio robotizzato: manutenzione');
update competenze set nome = 'Revisione'
  where nome in ('Cambio manuale: revisione','Cambio automatico: revisione','Cambio robotizzato: revisione');
-- idem per Differenziali (stessa forma)
update competenze set nome = 'Manutenzione' where nome = 'Differenziali: manutenzione';
update competenze set nome = 'Revisione' where nome = 'Differenziali: revisione';

-- ══ D. Autodiagnosi: descrizioni ═══════════════════════════
update competenze set descrizione = 'Collega lo strumento, legge i codici errore e li segnala.'
  where nome = 'Diagnosi base';
update competenze set descrizione = 'Risale alla causa reale, distinguendo il guasto dai sintomi derivati.'
  where nome = 'Diagnosi avanzata';

-- ══ E. Centraline: unione in "Centraline/ECU" ══════════════
-- Rinomina "Programmazione centraline" → "Centraline/ECU", sposta i
-- persona_competenze di "Codifica centraline" sulla voce unita, poi elimina.
do $$
declare v_prog uuid; v_cod uuid;
begin
  select id into v_prog from competenze where nome = 'Programmazione centraline' limit 1;
  select id into v_cod  from competenze where nome = 'Codifica centraline' limit 1;
  if v_prog is not null then
    update competenze set nome = 'Centraline/ECU',
      descrizione = 'Programmazione e codifica centraline (ECU).'
      where id = v_prog;
    if v_cod is not null then
      update persona_competenze pc set competenza_id = v_prog
      where competenza_id = v_cod
      and not exists (select 1 from persona_competenze p2 where p2.persona_id=pc.persona_id and p2.competenza_id=v_prog);
      delete from persona_competenze where competenza_id = v_cod;
      delete from competenze where id = v_cod;
    end if;
  end if;
end $$;

-- ══ F. Bombole GPL/metano ══════════════════════════════════
update competenze set nome = 'Sostituzione bombole',
  descrizione = 'Sostituzione bombole a scadenza (10 anni per il GPL auto).'
  where nome = 'Revisione/sostituzione bombole GPL';
update competenze set nome = 'Revisione bombole',
  descrizione = 'Collaudo/revisione periodica delle bombole metano.'
  where nome = 'Revisione/sostituzione bombole metano';

-- ══ G. Rimozione impianti: nota aftermarket ════════════════
update competenze set descrizione = 'Solo su impianti aftermarket (non di serie).'
  where nome in ('Rimozione impianto GPL','Rimozione impianto metano');
