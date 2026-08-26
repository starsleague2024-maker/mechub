import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	let query = locals.supabase
		.from('veicoli')
		.select(
			'id, targa, marca, modello, anno, km, categoria:categorie_veicolo(nome), cliente:clienti(id, nome, cognome, ragione_sociale)'
		)
		.order('created_at', { ascending: false });

	if (q) {
		query = query.or(`targa.ilike.%${q}%,marca.ilike.%${q}%,modello.ilike.%${q}%`);
	}

	const { data } = await query;
	return { veicoli: (data ?? []) as any[], q };
};
