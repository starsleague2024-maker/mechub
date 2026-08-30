-- ============================================================
-- 0029_rimuovi_officina_test.sql · Pulizia — rimozione officina duplicata
--
-- Nel DB erano presenti DUE officine (una creata per errore durante i test):
--   MANTENERE:  Duke Garage        c300d82e-c329-49f0-b478-fa1aee430643
--   ELIMINARE:  Officina del ...   42f0218d-134e-4bf7-a4e2-bb34bb3dab53
--
-- L'eliminazione rimuove in cascata tutti i dati agganciati all'officina
-- fantasma (competenze, veicoli, alimentazioni, ruoli, ecc.).
-- Questo risolve alla radice i "doppioni" del catalogo competenze:
-- erano due alberi paralleli, uno per officina.
--
-- Sicuro: elimina SOLO per id esatto, con guardia sul nome.
-- ============================================================
do $$
declare v_nome text;
begin
  select nome into v_nome from officine where id = '42f0218d-134e-4bf7-a4e2-bb34bb3dab53';
  if v_nome is null then
    raise notice 'Officina 42f0218d già assente: niente da fare.';
  else
    raise notice 'Elimino officina: %', v_nome;
    delete from officine where id = '42f0218d-134e-4bf7-a4e2-bb34bb3dab53';
    raise notice 'Fatto.';
  end if;
end $$;

-- verifica finale: deve restare solo Duke Garage
-- (riga informativa nei risultati)
select id, nome from officine order by nome;
