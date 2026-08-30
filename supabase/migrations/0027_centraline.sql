-- ============================================================
-- 0027_centraline.sql · Blocco 6 — unione centraline (recupero da 0025)
-- La 0025 si era interrotta prima di unire le centraline. Questa la completa.
-- "Programmazione centraline" + "Codifica centraline" → "Centraline/ECU".
-- Idempotente.
-- ============================================================
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
  elsif v_cod is not null then
    -- se esiste solo "Codifica centraline", rinomino quello
    update competenze set nome = 'Centraline/ECU',
      descrizione = 'Programmazione e codifica centraline (ECU).'
      where id = v_cod;
  end if;
end $$;
