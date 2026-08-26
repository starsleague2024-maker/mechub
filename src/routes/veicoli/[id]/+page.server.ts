import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const sb = locals.supabase;
	const { data: veicolo } = await sb
		.from('veicoli')
		.select(
			'*, categoria:categorie_veicolo(id, nome), cliente:clienti(id, nome, cognome, ragione_sociale)'
		)
		.eq('id', params.id)
		.maybeSingle();

	if (!veicolo) throw error(404, 'Veicolo non trovato');

	const [{ data: categorie }, { data: interventi }, { data: fabbisogni }] = await Promise.all([
		sb.from('categorie_veicolo').select('id, nome').order('nome'),
		sb
			.from('interventi')
			.select('id, motivo_iniziale, stato_generale, data_apertura')
			.eq('veicolo_id', params.id)
			.order('data_apertura', { ascending: false }),
		sb
			.from('fabbisogni_ricambio')
			.select('id, quantita_richiesta, stato_fabbisogno, ricambio:catalogo_ricambi(codice, descrizione)')
			.eq('veicolo_id', params.id)
			.order('created_at', { ascending: false })
	]);

	return {
		veicolo,
		categorie: categorie ?? [] as any[],
		interventi: interventi ?? [] as any[],
		fabbisogni: fabbisogni ?? [] as any[]
	};
};

export const actions: Actions = {
	aggiorna: async ({ request, locals, params }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('veicoli')
			.update({
				targa: (f.get('targa') as string)?.trim().toUpperCase(),
				categoria_veicolo_id: f.get('categoria_veicolo_id') as string,
				marca: (f.get('marca') as string)?.trim() || null,
				modello: (f.get('modello') as string)?.trim() || null,
				telaio: (f.get('telaio') as string)?.trim() || null,
				anno: f.get('anno') ? Number(f.get('anno')) : null,
				km: f.get('km') ? Number(f.get('km')) : null
			})
			.eq('id', params.id);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	}
};
