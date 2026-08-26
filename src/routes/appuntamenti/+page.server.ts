import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const sb = locals.supabase;
	const [{ data: appuntamenti }, { data: veicoli }] = await Promise.all([
		sb
			.from('appuntamenti')
			.select(
				'id, data_ora_promessa, stato, note, cliente:clienti(id, nome, cognome, ragione_sociale), veicolo:veicoli(id, targa, marca, modello)'
			)
			.order('data_ora_promessa', { ascending: true }),
		sb
			.from('veicoli')
			.select('id, targa, marca, modello, cliente_id, cliente:clienti(nome, cognome, ragione_sociale)')
			.order('targa')
	]);
	return { appuntamenti: appuntamenti ?? [], veicoli: veicoli ?? [] };
};

export const actions: Actions = {
	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const veicoloId = f.get('veicolo_id') as string;
		const dataOra = f.get('data_ora_promessa') as string;
		if (!veicoloId) return fail(400, { errore: 'Seleziona un veicolo.' });
		if (!dataOra) return fail(400, { errore: 'Indica data e ora.' });

		const { data: veicolo } = await locals.supabase
			.from('veicoli')
			.select('cliente_id')
			.eq('id', veicoloId)
			.maybeSingle();
		if (!veicolo) return fail(400, { errore: 'Veicolo non valido.' });

		const { data: nuovo, error } = await locals.supabase
			.from('appuntamenti')
			.insert({
				veicolo_id: veicoloId,
				cliente_id: veicolo.cliente_id,
				data_ora_promessa: dataOra,
				note: (f.get('note') as string)?.trim() || null,
				stato: 'programmato'
			})
			.select('id')
			.single();
		if (error) return fail(400, { errore: error.message });

		await locals.supabase.rpc('registra_evento', {
			p_tipo_evento: 'AppuntamentoCreato',
			p_aggregate_type: 'appuntamento',
			p_aggregate_id: nuovo.id,
			p_payload: { data_ora_promessa: dataOra }
		});
		return { ok: true };
	},

	cambiaStato: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('appuntamenti')
			.update({ stato: f.get('stato') as string })
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	elimina: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('appuntamenti')
			.delete()
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
