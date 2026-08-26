import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;
	const [{ data: persone }, { data: ruoli }] = await Promise.all([
		sb
			.from('persone')
			.select('id, nome, cognome, email, telefono, stato, ruolo:ruoli(nome)')
			.order('cognome'),
		sb.from('ruoli').select('id, nome').order('nome')
	]);
	return { persone: (persone ?? []) as any[], ruoli: (ruoli ?? []) as any[], officinaId: officina?.id ?? null };
};

export const actions: Actions = {
	crea: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		if (!officinaId) return fail(400, { errore: 'Nessuna officina configurata.' });
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome è obbligatorio.' });
		const cognome = (f.get('cognome') as string)?.trim();
		if (!cognome) return fail(400, { errore: 'Il cognome è obbligatorio.' });

		const { error } = await locals.supabase.from('persone').insert({
			officina_id: officinaId,
			nome,
			cognome,
			email: (f.get('email') as string)?.trim() || null,
			telefono: (f.get('telefono') as string)?.trim() || null,
			ruolo_id: (f.get('ruolo_id') as string) || null,
			stato: (f.get('stato') as string) || 'attivo'
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	cambiaStato: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('persone')
			.update({ stato: f.get('stato') as string })
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
