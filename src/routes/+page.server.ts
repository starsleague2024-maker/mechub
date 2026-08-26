import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;

	// Se non esiste ancora un'officina, la dashboard invita a crearla.
	if (!officina) {
		return { serve_setup: true, conteggi: null, lavorazioniAttive: [], appuntamentiOggi: [] };
	}

	const oggiInizio = new Date();
	oggiInizio.setHours(0, 0, 0, 0);
	const oggiFine = new Date();
	oggiFine.setHours(23, 59, 59, 999);

	const [
		interventiAperti,
		lavorazioniInCorso,
		appuntamentiOggiCount,
		fabbisogniDaOrdinare,
		lavorazioniAttive,
		appuntamentiOggi,
		conflitti
	] = await Promise.all([
		sb
			.from('interventi')
			.select('id', { count: 'exact', head: true })
			.not('stato_generale', 'in', '(consegnato,annullato)'),
		sb
			.from('lavorazioni')
			.select('id', { count: 'exact', head: true })
			.eq('stato_operativo', 'in_corso'),
		sb
			.from('appuntamenti')
			.select('id', { count: 'exact', head: true })
			.gte('data_ora_promessa', oggiInizio.toISOString())
			.lte('data_ora_promessa', oggiFine.toISOString()),
		sb
			.from('fabbisogni_ricambio')
			.select('id', { count: 'exact', head: true })
			.eq('stato_fabbisogno', 'da_ordinare'),
		sb
			.from('lavorazioni')
			.select(
				'id, nome, stato_operativo, intervento:interventi(id, veicolo:veicoli(targa, marca, modello))'
			)
			.in('stato_operativo', ['in_corso', 'pianificata', 'sospesa'])
			.order('updated_at', { ascending: false })
			.limit(8),
		sb
			.from('appuntamenti')
			.select(
				'id, data_ora_promessa, stato, cliente:clienti(nome, cognome), veicolo:veicoli(targa)'
			)
			.gte('data_ora_promessa', oggiInizio.toISOString())
			.lte('data_ora_promessa', oggiFine.toISOString())
			.order('data_ora_promessa', { ascending: true }),
		sb
			.from('conflitti_pianificazione')
			.select('id', { count: 'exact', head: true })
			.eq('stato', 'aperto')
	]);

	return {
		serve_setup: false,
		conteggi: {
			interventiAperti: interventiAperti.count ?? 0,
			lavorazioniInCorso: lavorazioniInCorso.count ?? 0,
			appuntamentiOggi: appuntamentiOggiCount.count ?? 0,
			fabbisogniDaOrdinare: fabbisogniDaOrdinare.count ?? 0,
			conflitti: conflitti.count ?? 0
		},
		lavorazioniAttive: lavorazioniAttive.data ?? [] as any[],
		appuntamentiOggi: appuntamentiOggi.data ?? [] as any[]
	};
};
