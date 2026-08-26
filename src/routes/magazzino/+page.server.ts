import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const sb = locals.supabase;

	const [{ data: giacenze }, { data: fabbisogni }] = await Promise.all([
		sb
			.from('giacenza_magazzino')
			.select(
				'ricambio_catalogo_id, quantita_disponibile, quantita_riservata, scorta_minima, ubicazione, ricambio:catalogo_ricambi(codice, descrizione, prezzo)'
			)
			.order('quantita_disponibile', { ascending: true }),
		sb
			.from('fabbisogni_ricambio')
			.select(
				'id, quantita_richiesta, stato_fabbisogno, veicolo:veicoli(targa), ricambio:catalogo_ricambi(codice, descrizione)'
			)
			.in('stato_fabbisogno', ['da_verificare', 'da_ordinare'])
			.order('created_at', { ascending: true })
	]);

	return { giacenze: (giacenze ?? []) as any[], fabbisogni: (fabbisogni ?? []) as any[] };
};

export const actions: Actions = {
	rettifica: async ({ request, locals }) => {
		const f = await request.formData();
		const id = f.get('ricambio_catalogo_id') as string;
		const disp = Number(f.get('quantita_disponibile'));
		const scorta = Number(f.get('scorta_minima'));
		const { error } = await locals.supabase
			.from('giacenza_magazzino')
			.update({
				quantita_disponibile: isNaN(disp) ? 0 : disp,
				scorta_minima: isNaN(scorta) ? 0 : scorta,
				ubicazione: (f.get('ubicazione') as string)?.trim() || null
			})
			.eq('ricambio_catalogo_id', id);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	segnaDaOrdinare: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('fabbisogni_ricambio')
			.update({ stato_fabbisogno: 'da_ordinare' })
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
