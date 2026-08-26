import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const sb = locals.supabase;
	const { data: cliente } = await sb
		.from('clienti')
		.select('*')
		.eq('id', params.id)
		.maybeSingle();

	if (!cliente) throw error(404, 'Cliente non trovato');

	const [{ data: veicoli }, { data: categorie }, { data: interventi }] = await Promise.all([
		sb
			.from('veicoli')
			.select('id, targa, marca, modello, anno, km, categoria:categorie_veicolo(nome)')
			.eq('cliente_id', params.id)
			.order('created_at', { ascending: false }),
		sb.from('categorie_veicolo').select('id, nome').order('nome'),
		sb
			.from('interventi')
			.select('id, motivo_iniziale, stato_generale, data_apertura, veicolo:veicoli(targa)')
			.eq('cliente_id', params.id)
			.order('data_apertura', { ascending: false })
			.limit(20)
	]);

	return {
		cliente,
		veicoli: veicoli ?? [] as any[],
		categorie: categorie ?? [] as any[],
		interventi: interventi ?? [] as any[]
	};
};

export const actions: Actions = {
	aggiorna: async ({ request, locals, params }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('clienti')
			.update({
				nome: (f.get('nome') as string)?.trim(),
				cognome: (f.get('cognome') as string)?.trim() || null,
				ragione_sociale: (f.get('ragione_sociale') as string)?.trim() || null,
				email: (f.get('email') as string)?.trim() || null,
				telefono: (f.get('telefono') as string)?.trim() || null,
				canale_whatsapp: (f.get('canale_whatsapp') as string)?.trim() || null
			})
			.eq('id', params.id);
		if (e) return fail(400, { errore: e.message });
		return { ok: true, salvato: true };
	},

	creaVeicolo: async ({ request, locals, params }) => {
		const f = await request.formData();
		const targa = (f.get('targa') as string)?.trim();
		const categoria = f.get('categoria_veicolo_id') as string;
		if (!targa) return fail(400, { errore: 'La targa è obbligatoria.' });
		if (!categoria) return fail(400, { errore: 'Seleziona una categoria veicolo.' });

		const anno = f.get('anno') ? Number(f.get('anno')) : null;
		const km = f.get('km') ? Number(f.get('km')) : null;

		const { error: e } = await locals.supabase.from('veicoli').insert({
			cliente_id: params.id,
			categoria_veicolo_id: categoria,
			targa: targa.toUpperCase(),
			telaio: (f.get('telaio') as string)?.trim() || null,
			marca: (f.get('marca') as string)?.trim() || null,
			modello: (f.get('modello') as string)?.trim() || null,
			anno,
			km
		});
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	}
};
