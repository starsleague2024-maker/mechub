import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { officina } = await parent();
	const { data: tipi } = await locals.supabase
		.from('tipi_lavorazione')
		.select('id, nome, tempo_standard_default_min, numero_persone_richieste, modalita_operativa')
		.order('nome');
	return { tipi: tipi ?? [], officinaId: officina?.id ?? null };
};

export const actions: Actions = {
	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		if (!officinaId) return fail(400, { errore: 'Nessuna officina configurata.' });
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome è obbligatorio.' });

		const { error } = await locals.supabase.from('tipi_lavorazione').insert({
			officina_id: officinaId,
			nome,
			tempo_standard_default_min: f.get('tempo') ? Number(f.get('tempo')) : null,
			numero_persone_richieste: f.get('persone') ? Number(f.get('persone')) : 1,
			modalita_operativa: (f.get('modalita') as string) || 'lasciabile'
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	elimina: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('tipi_lavorazione')
			.delete()
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
