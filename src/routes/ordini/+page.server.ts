import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const sb = locals.supabase;
	const [{ data: ordini }, { data: fornitori }, { data: ricambi }] = await Promise.all([
		sb
			.from('ordini_fornitore')
			.select(
				'id, stato_ordine, data_ordine, fornitore:fornitori(nome), righe:righe_ordine_fornitore(id, quantita_ordinata, quantita_evasa, stato_riga, ricambio:catalogo_ricambi(codice, descrizione))'
			)
			.order('data_ordine', { ascending: false }),
		sb.from('fornitori').select('id, nome').order('nome'),
		sb.from('catalogo_ricambi').select('id, codice, descrizione').order('codice')
	]);
	return { ordini: (ordini ?? []) as any[], fornitori: (fornitori ?? []) as any[], ricambi: (ricambi ?? []) as any[] };
};

export const actions: Actions = {
	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const fornitoreId = f.get('fornitore_id') as string;
		if (!fornitoreId) return fail(400, { errore: 'Seleziona un fornitore.' });

		const { data: nuovo, error } = await locals.supabase
			.from('ordini_fornitore')
			.insert({ fornitore_id: fornitoreId, stato_ordine: 'creato' })
			.select('id')
			.single();
		if (error) return fail(400, { errore: error.message });

		await locals.supabase.rpc('registra_evento', {
			p_tipo_evento: 'OrdineFornitoreCreato',
			p_aggregate_type: 'ordine_fornitore',
			p_aggregate_id: nuovo.id,
			p_payload: { fornitore_id: fornitoreId }
		});
		return { ok: true, id: nuovo.id };
	},

	aggiungiRiga: async ({ request, locals }) => {
		const f = await request.formData();
		const ordineId = f.get('ordine_id') as string;
		const ricambioId = f.get('ricambio_catalogo_id') as string;
		const quantita = Number(f.get('quantita_ordinata'));
		if (!ricambioId) return fail(400, { errore: 'Seleziona un ricambio.' });
		if (!quantita || quantita < 1) return fail(400, { errore: 'Quantità non valida.' });

		const { error } = await locals.supabase.from('righe_ordine_fornitore').insert({
			ordine_fornitore_id: ordineId,
			ricambio_catalogo_id: ricambioId,
			quantita_ordinata: quantita,
			data_consegna_prevista: (f.get('data_consegna_prevista') as string) || null,
			stato_riga: 'in_attesa'
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	cambiaStato: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('ordini_fornitore')
			.update({ stato_ordine: f.get('stato') as string })
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	eliminaRiga: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('righe_ordine_fornitore')
			.delete()
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
