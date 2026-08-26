import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const sb = locals.supabase;
	const preselInt = url.searchParams.get('intervento');

	const [{ data: preventivi }, { data: interventiAperti }] = await Promise.all([
		sb
			.from('preventivi')
			.select(
				'id, stato, data_creazione, intervento:interventi(id, motivo_iniziale, veicolo:veicoli(targa), cliente:clienti(nome, cognome, ragione_sociale))'
			)
			.order('data_creazione', { ascending: false }),
		sb
			.from('interventi')
			.select('id, motivo_iniziale, veicolo:veicoli(targa)')
			.not('stato_generale', 'in', '(consegnato,annullato)')
			.order('data_apertura', { ascending: false })
	]);

	return {
		preventivi: preventivi ?? [] as any[],
		interventiAperti: interventiAperti ?? [] as any[],
		preselInt
	};
};

export const actions: Actions = {
	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const interventoId = f.get('intervento_id') as string;
		if (!interventoId) return fail(400, { errore: 'Seleziona un intervento.' });

		const { data: nuovo, error } = await locals.supabase
			.from('preventivi')
			.insert({ intervento_id: interventoId, stato: 'bozza' })
			.select('id')
			.single();
		if (error) return fail(400, { errore: error.message });

		await locals.supabase.rpc('registra_evento', {
			p_tipo_evento: 'PreventivoCreato',
			p_aggregate_type: 'preventivo',
			p_aggregate_id: nuovo.id,
			p_payload: { intervento_id: interventoId }
		});
		return { ok: true, id: nuovo.id };
	}
};
