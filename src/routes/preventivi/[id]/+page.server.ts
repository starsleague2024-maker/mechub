import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const sb = locals.supabase;

	const { data: preventivo } = await sb
		.from('preventivi')
		.select(
			'*, intervento:interventi(id, motivo_iniziale, veicolo:veicoli(targa, marca, modello), cliente:clienti(nome, cognome, ragione_sociale))'
		)
		.eq('id', params.id)
		.maybeSingle();

	if (!preventivo) throw error(404, 'Preventivo non trovato');

	const [{ data: voci }, { data: lavorazioni }] = await Promise.all([
		sb
			.from('voci_preventivo')
			.select('*, lavorazione:lavorazioni(nome)')
			.eq('preventivo_id', params.id)
			.order('created_at', { ascending: true }),
		sb
			.from('lavorazioni')
			.select('id, nome')
			.eq('intervento_id', preventivo.intervento_id)
			.order('created_at', { ascending: true })
	]);

	return { preventivo, voci: voci ?? [], lavorazioni: lavorazioni ?? [] };
};

export const actions: Actions = {
	aggiungiVoce: async ({ request, locals, params }) => {
		const f = await request.formData();
		const lavId = f.get('lavorazione_id') as string;
		if (!lavId) return fail(400, { errore: 'Seleziona una lavorazione.' });

		const { error: e } = await locals.supabase.from('voci_preventivo').insert({
			preventivo_id: params.id,
			lavorazione_id: lavId,
			descrizione: (f.get('descrizione') as string)?.trim() || null,
			costo_manodopera: f.get('costo_manodopera') ? Number(f.get('costo_manodopera')) : null,
			costo_ricambi_stimato: f.get('costo_ricambi_stimato')
				? Number(f.get('costo_ricambi_stimato'))
				: null,
			stato_voce: 'proposta'
		});
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	eliminaVoce: async ({ request, locals }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('voci_preventivo')
			.delete()
			.eq('id', f.get('id') as string);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	statoVoce: async ({ request, locals }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('voci_preventivo')
			.update({ stato_voce: f.get('stato_voce') as string })
			.eq('id', f.get('id') as string);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	cambiaStato: async ({ request, locals, params }) => {
		const f = await request.formData();
		const stato = f.get('stato') as string;
		const patch: Record<string, unknown> = { stato };
		if (stato === 'inviato') patch.data_invio = new Date().toISOString();
		if (['approvato', 'rifiutato', 'parzialmente_approvato'].includes(stato))
			patch.data_risposta = new Date().toISOString();

		const { error: e } = await locals.supabase
			.from('preventivi')
			.update(patch)
			.eq('id', params.id);
		if (e) return fail(400, { errore: e.message });

		// Se approvato, sblocca le lavorazioni dell'intervento in attesa di approvazione
		if (stato === 'approvato') {
			const { data: prev } = await locals.supabase
				.from('preventivi')
				.select('intervento_id')
				.eq('id', params.id)
				.single();
			if (prev) {
				await locals.supabase
					.from('lavorazioni')
					.update({ approvazione_cliente_ottenuta: true })
					.eq('intervento_id', prev.intervento_id)
					.eq('richiede_preventivo', true);
			}
		}

		await locals.supabase.rpc('registra_evento', {
			p_tipo_evento: 'PreventivoStatoCambiato',
			p_aggregate_type: 'preventivo',
			p_aggregate_id: params.id,
			p_payload: { stato }
		});
		return { ok: true };
	}
};
