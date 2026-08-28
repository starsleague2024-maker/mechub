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

	const [{ data: competenze }, { data: possedute }, { data: certificazioni }] = await Promise.all([
		// stesso catalogo centrale dell'officina
		sb
			.from('competenze')
			.select('id, nome, competenza_padre_id, selezionabile, ordine')
			.eq('officina_id', officina?.id ?? '')
			.order('ordine', { ascending: true, nullsFirst: false }),
		// competenze possedute dalla persona (generali: categoria NULL)
		sb.from('persona_competenze').select('id, competenza_id, livello').eq('persona_id', params.id),
		// certificazioni/abilitazioni personali (PES, PAV, patentini, ecc.)
		sb
			.from('certificazioni')
			.select('id, tipo, nome, numero_codice, ente_rilascio, data_rilascio, data_scadenza, stato_manuale, note, documento_path')
			.eq('persona_id', params.id)
			.order('data_scadenza', { ascending: true, nullsFirst: false })
	]);

	return {
		persona: persona as any,
		competenze: (competenze ?? []) as any[],
		possedute: (possedute ?? []) as any[],
		certificazioni: (certificazioni ?? []) as any[],
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
	},

	// ── Certificazioni/abilitazioni personali ──────────────────────────
	creaCertificazione: async ({ request, locals, params }) => {
		const f = await request.formData();
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome della certificazione è obbligatorio.' });
		const { error: e } = await locals.supabase.from('certificazioni').insert({
			persona_id: params.id,
			tipo: (f.get('tipo') as string)?.trim() || null,
			nome,
			numero_codice: (f.get('numero_codice') as string)?.trim() || null,
			ente_rilascio: (f.get('ente_rilascio') as string)?.trim() || null,
			data_rilascio: (f.get('data_rilascio') as string) || null,
			data_scadenza: (f.get('data_scadenza') as string) || null,
			note: (f.get('note') as string)?.trim() || null
		});
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	aggiornaCertificazione: async ({ request, locals }) => {
		const f = await request.formData();
		const id = f.get('id') as string;
		const { error: e } = await locals.supabase
			.from('certificazioni')
			.update({
				tipo: (f.get('tipo') as string)?.trim() || null,
				nome: (f.get('nome') as string)?.trim(),
				numero_codice: (f.get('numero_codice') as string)?.trim() || null,
				ente_rilascio: (f.get('ente_rilascio') as string)?.trim() || null,
				data_rilascio: (f.get('data_rilascio') as string) || null,
				data_scadenza: (f.get('data_scadenza') as string) || null,
				stato_manuale: (f.get('stato_manuale') as string) || null,
				note: (f.get('note') as string)?.trim() || null
			})
			.eq('id', id);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	eliminaCertificazione: async ({ request, locals }) => {
		const f = await request.formData();
		const id = f.get('id') as string;
		// rimuove anche l'eventuale allegato dallo Storage
		const { data: cert } = await locals.supabase
			.from('certificazioni')
			.select('documento_path')
			.eq('id', id)
			.maybeSingle();
		if (cert?.documento_path) {
			await locals.supabase.storage.from('certificazioni').remove([cert.documento_path]);
		}
		const { error: e } = await locals.supabase.from('certificazioni').delete().eq('id', id);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	// Carica un allegato nel bucket privato 'certificazioni'.
	// Path: {officina_id}/persona/{cert_id}/{filename}
	caricaAllegato: async ({ request, locals, params }) => {
		const f = await request.formData();
		const certId = f.get('cert_id') as string;
		const file = f.get('file') as File;
		if (!file || file.size === 0) return fail(400, { errore: 'Nessun file selezionato.' });
		// officina_id ricavato dalla persona (RLS garantisce che sia la propria)
		const { data: persona } = await locals.supabase
			.from('persone')
			.select('officina_id')
			.eq('id', params.id)
			.maybeSingle();
		if (!persona) return fail(400, { errore: 'Persona non trovata.' });
		const nomePulito = file.name.replace(/[^\w.\-]/g, '_');
		const path = `${persona.officina_id}/persona/${certId}/${nomePulito}`;
		const { error: eUp } = await locals.supabase.storage
			.from('certificazioni')
			.upload(path, file, { upsert: true });
		if (eUp) return fail(400, { errore: eUp.message });
		const { error: e } = await locals.supabase
			.from('certificazioni')
			.update({ documento_path: path })
			.eq('id', certId);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	// Genera un signed URL temporaneo per scaricare l'allegato.
	scaricaAllegato: async ({ request, locals }) => {
		const f = await request.formData();
		const path = f.get('path') as string;
		const { data, error: e } = await locals.supabase.storage
			.from('certificazioni')
			.createSignedUrl(path, 60);
		if (e) return fail(400, { errore: e.message });
		return { ok: true, signedUrl: data.signedUrl };
	}
};
