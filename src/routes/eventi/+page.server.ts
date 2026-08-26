import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const tipo = url.searchParams.get('tipo')?.trim() ?? '';
	let query = locals.supabase
		.from('eventi')
		.select('id, tipo_evento, aggregate_type, aggregate_id, payload, generato_da, created_at')
		.order('created_at', { ascending: false })
		.limit(200);

	if (tipo) query = query.eq('tipo_evento', tipo);

	const { data: eventi } = await query;

	// tipi distinti per il filtro (dai risultati caricati)
	const tipi = [...new Set((eventi ?? []).map((e) => e.tipo_evento))].sort();

	return { eventi: eventi ?? [], tipi, tipoAttivo: tipo };
};
