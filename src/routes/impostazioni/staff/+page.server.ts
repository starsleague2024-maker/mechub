import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;

	const [{ data: persone }, { data: ruoli }] = await Promise.all([
		sb
			.from('persone')
			.select('id, nome, cognome, stato, foto_path, persona_ruoli(ruolo_primario, ruolo:ruoli(nome))')
			.order('cognome'),
		sb.from('ruoli').select('id, nome').order('nome')
	]);

	// conteggi sintetici + foto firmata per ogni persona
	const lista = [] as any[];
	for (const p of persone ?? []) {
		let foto_url: string | null = null;
		if (p.foto_path) {
			const { data: signed } = await sb.storage
				.from('foto-staff')
				.createSignedUrl(p.foto_path, 3600);
			foto_url = signed?.signedUrl ?? null;
		}
		const [{ count: nMansioni }, { count: nCompetenze }] = await Promise.all([
			sb.from('persona_mansioni').select('*', { count: 'exact', head: true }).eq('persona_id', p.id),
			sb.from('persona_competenze').select('*', { count: 'exact', head: true }).eq('persona_id', p.id)
		]);
		// ruolo primario dalla tabella-ponte persona_ruoli
		const rp: any = (p.persona_ruoli ?? []).find((r: any) => r.ruolo_primario) ?? (p.persona_ruoli ?? [])[0];
		const ruoloNome = (Array.isArray(rp?.ruolo) ? rp?.ruolo[0]?.nome : rp?.ruolo?.nome) ?? null;
		lista.push({ ...p, foto_url, ruoloNome, n_mansioni: nMansioni ?? 0, n_competenze: nCompetenze ?? 0 });
	}

	return {
		persone: lista,
		ruoli: (ruoli ?? []) as any[],
		officinaId: officina?.id ?? null
	};
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

		const { data, error } = await locals.supabase
			.from('persone')
			.insert({
				officina_id: officinaId,
				nome,
				cognome,
				stato: (f.get('stato') as string) || 'attivo'
			})
			.select('id')
			.single();
		if (error) return fail(400, { errore: error.message });

		// collega il ruolo primario nella tabella-ponte persona_ruoli
		const ruoloId = (f.get('ruolo_id') as string) || null;
		if (ruoloId) {
			const { error: eR } = await locals.supabase
				.from('persona_ruoli')
				.insert({ persona_id: data.id, ruolo_id: ruoloId, ruolo_primario: true });
			if (eR) return fail(400, { errore: eR.message });
		}
		return { ok: true, nuovaPersonaId: data.id };
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
