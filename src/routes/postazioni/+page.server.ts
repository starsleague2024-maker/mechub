import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;
	const [{ data: postazioni }, { data: tipi }] = await Promise.all([
		sb
			.from('postazioni')
			.select('id, nome, stato, zona, capacita_simultanea, tipo:tipi_risorsa(id, nome)')
			.order('nome'),
		sb.from('tipi_risorsa').select('id, nome').order('nome')
	]);
	return { postazioni: (postazioni ?? []) as any[], tipi: (tipi ?? []) as any[], officinaId: officina?.id ?? null };
};

export const actions: Actions = {
	creaTipo: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome del tipo è obbligatorio.' });
		const { error } = await locals.supabase
			.from('tipi_risorsa')
			.insert({ officina_id: officinaId, nome });
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		if (!officinaId) return fail(400, { errore: 'Nessuna officina configurata.' });
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome della postazione è obbligatorio.' });
		const tipoRisorsa = f.get('tipo_risorsa_id') as string;
		if (!tipoRisorsa)
			return fail(400, { errore: 'Seleziona un tipo risorsa (creane uno prima se non esiste).' });

		const { error } = await locals.supabase.from('postazioni').insert({
			officina_id: officinaId,
			nome,
			tipo_risorsa_id: tipoRisorsa,
			zona: (f.get('zona') as string)?.trim() || null,
			capacita_simultanea: f.get('capacita_simultanea') ? Number(f.get('capacita_simultanea')) : 1,
			stato: (f.get('stato') as string) || 'disponibile'
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	cambiaStato: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('postazioni')
			.update({ stato: f.get('stato') as string })
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
