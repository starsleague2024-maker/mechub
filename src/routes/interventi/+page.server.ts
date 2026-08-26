import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const filtro = url.searchParams.get('stato') ?? 'aperti';
	const sb = locals.supabase;

	let query = sb
		.from('interventi')
		.select(
			'id, motivo_iniziale, stato_generale, priorita_livello, data_apertura, data_promessa_cliente, cliente:clienti(nome, cognome, ragione_sociale), veicolo:veicoli(targa, marca, modello), lavorazioni(count)'
		)
		.order('data_apertura', { ascending: false });

	if (filtro === 'aperti') {
		query = query.not('stato_generale', 'in', '(consegnato,annullato)');
	} else if (filtro !== 'tutti') {
		query = query.eq('stato_generale', filtro);
	}

	const [{ data: interventi }, { data: veicoli }] = await Promise.all([
		query,
		sb
			.from('veicoli')
			.select('id, targa, marca, modello, cliente_id, cliente:clienti(nome, cognome, ragione_sociale)')
			.order('targa')
	]);

	return { interventi: (interventi ?? []) as any[], veicoli: (veicoli ?? []) as any[], filtro };
};

export const actions: Actions = {
	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const veicoloId = f.get('veicolo_id') as string;
		if (!veicoloId) return fail(400, { errore: 'Seleziona un veicolo.' });

		// cliente_id ricavato dal veicolo (ownership: il veicolo conosce il suo cliente)
		const { data: veicolo } = await locals.supabase
			.from('veicoli')
			.select('cliente_id')
			.eq('id', veicoloId)
			.maybeSingle();
		if (!veicolo) return fail(400, { errore: 'Veicolo non valido.' });

		const { data: nuovo, error } = await locals.supabase
			.from('interventi')
			.insert({
				veicolo_id: veicoloId,
				cliente_id: veicolo.cliente_id,
				motivo_iniziale: (f.get('motivo_iniziale') as string)?.trim() || null,
				data_promessa_cliente: (f.get('data_promessa_cliente') as string) || null,
				priorita_livello: (f.get('priorita_livello') as string) || 'normale',
				stato_generale: 'prenotato'
			})
			.select('id')
			.single();

		if (error) return fail(400, { errore: error.message });

		// Evento (principio B: ogni fatto operativo è un evento tracciato)
		await locals.supabase.rpc('registra_evento', {
			p_tipo_evento: 'InterventoAperto',
			p_aggregate_type: 'intervento',
			p_aggregate_id: nuovo.id,
			p_payload: { veicolo_id: veicoloId }
		});

		return { ok: true, id: nuovo.id };
	}
};
