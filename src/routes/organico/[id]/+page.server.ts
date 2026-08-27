import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;

	const { data: persona } = await sb
		.from('persone')
		.select('id, nome, cognome, email, telefono, stato, ruolo:ruoli(nome)')
		.eq('id', params.id)
		.maybeSingle();

	if (!persona) throw error(404, 'Persona non trovata');

	const [{ data: competenze }, { data: possedute }] = await Promise.all([
		// stesso catalogo centrale dell'officina
		sb
			.from('competenze')
			.select('id, nome, competenza_padre_id, selezionabile, ordine')
			.eq('officina_id', officina?.id ?? '')
			.order('ordine', { ascending: true, nullsFirst: false }),
		// competenze possedute dalla persona (generali: categoria NULL)
		sb.from('persona_competenze').select('id, competenza_id, livello').eq('persona_id', params.id)
	]);

	return {
		persona: persona as any,
		competenze: (competenze ?? []) as any[],
		possedute: (possedute ?? []) as any[],
		officinaId: officina?.id ?? null
	};
};

export const actions: Actions = {
	// Aggiunge/rimuove una competenza posseduta dalla persona (livello base = 3).
	// Competenza "generale": categoria_veicolo_id resta NULL.
	toggleCompetenza: async ({ request, locals, params }) => {
		const f = await request.formData();
		const competenzaId = f.get('competenza_id') as string;
		const possiede = f.get('possiede') === 'true';

		if (possiede) {
			const { error: e } = await locals.supabase.from('persona_competenze').insert({
				persona_id: params.id,
				competenza_id: competenzaId,
				livello: 3
			});
			// 23505 = già presente: lo ignoriamo (idempotente)
			if (e && e.code !== '23505') return fail(400, { errore: e.message });
		} else {
			const { error: e } = await locals.supabase
				.from('persona_competenze')
				.delete()
				.eq('persona_id', params.id)
				.eq('competenza_id', competenzaId)
				.is('categoria_veicolo_id', null);
			if (e) return fail(400, { errore: e.message });
		}
		return { ok: true };
	}
};
