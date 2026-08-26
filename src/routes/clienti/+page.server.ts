import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	let query = locals.supabase
		.from('clienti')
		.select('id, nome, cognome, ragione_sociale, email, telefono, veicoli(count)')
		.order('created_at', { ascending: false });

	if (q) {
		query = query.or(
			`nome.ilike.%${q}%,cognome.ilike.%${q}%,ragione_sociale.ilike.%${q}%,email.ilike.%${q}%`
		);
	}

	const { data } = await query;
	return { clienti: (data ?? []) as any[], q };
};

export const actions: Actions = {
	crea: async ({ request, locals }) => {
		const form = await request.formData();
		const officina = form.get('officina_id') as string;
		if (!officina) return fail(400, { errore: 'Nessuna officina configurata.' });

		const nome = (form.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome è obbligatorio.' });

		const { error } = await locals.supabase.from('clienti').insert({
			officina_id: officina,
			nome,
			cognome: (form.get('cognome') as string)?.trim() || null,
			ragione_sociale: (form.get('ragione_sociale') as string)?.trim() || null,
			email: (form.get('email') as string)?.trim() || null,
			telefono: (form.get('telefono') as string)?.trim() || null,
			canale_whatsapp: (form.get('canale_whatsapp') as string)?.trim() || null
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	elimina: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const { error } = await locals.supabase.from('clienti').delete().eq('id', id);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
