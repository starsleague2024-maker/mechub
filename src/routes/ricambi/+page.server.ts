import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { officina } = await parent();
	const sb = locals.supabase;
	const q = url.searchParams.get('q')?.trim() ?? '';

	let query = sb
		.from('catalogo_ricambi')
		.select(
			'id, codice, descrizione, prezzo, fornitore:fornitori(nome), categoria:categorie_veicolo(nome), giacenza:giacenza_magazzino(quantita_disponibile, scorta_minima)'
		)
		.order('codice');
	if (q) query = query.or(`codice.ilike.%${q}%,descrizione.ilike.%${q}%`);

	const [{ data: ricambi }, { data: fornitori }, { data: categorie }] = await Promise.all([
		query,
		sb.from('fornitori').select('id, nome').order('nome'),
		sb.from('categorie_veicolo').select('id, nome').order('nome')
	]);

	return {
		ricambi: ricambi ?? [] as any[],
		fornitori: fornitori ?? [] as any[],
		categorie: categorie ?? [] as any[],
		officinaId: officina?.id ?? null,
		q
	};
};

export const actions: Actions = {
	creaFornitore: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome del fornitore è obbligatorio.' });
		const { error } = await locals.supabase
			.from('fornitori')
			.insert({ officina_id: officinaId, nome });
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		if (!officinaId) return fail(400, { errore: 'Nessuna officina configurata.' });
		const codice = (f.get('codice') as string)?.trim();
		if (!codice) return fail(400, { errore: 'Il codice è obbligatorio.' });

		const { data: nuovo, error } = await locals.supabase
			.from('catalogo_ricambi')
			.insert({
				officina_id: officinaId,
				codice,
				descrizione: (f.get('descrizione') as string)?.trim() || null,
				prezzo: f.get('prezzo') ? Number(f.get('prezzo')) : null,
				fornitore_preferito_id: (f.get('fornitore_preferito_id') as string) || null,
				categoria_veicolo_id: (f.get('categoria_veicolo_id') as string) || null
			})
			.select('id')
			.single();
		if (error) {
			if (error.code === '23505') return fail(400, { errore: 'Codice già presente in catalogo.' });
			return fail(400, { errore: error.message });
		}

		// crea riga giacenza iniziale
		await locals.supabase.from('giacenza_magazzino').insert({
			ricambio_catalogo_id: nuovo.id,
			quantita_disponibile: f.get('giacenza_iniziale') ? Number(f.get('giacenza_iniziale')) : 0,
			scorta_minima: f.get('scorta_minima') ? Number(f.get('scorta_minima')) : 0
		});
		return { ok: true };
	},

	elimina: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('catalogo_ricambi')
			.delete()
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
