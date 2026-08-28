import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;

	let officinaFull = null;
	let categorie: any[] = [];
	let tutteCategorie: any[] = [];
	let ruoli: any[] = [];
	let competenze: any[] = [];
	let alimentazioni: any[] = [];
	let certificazioniOfficina: any[] = [];

	if (officina) {
		const [o, cat, tuttecat, ru, co, al, ce] = await Promise.all([
			sb.from('officine').select('*').eq('id', officina.id).maybeSingle(),
			sb
				.from('officina_categorie_veicolo')
				.select('categoria:categorie_veicolo(id, nome)')
				.eq('officina_id', officina.id),
			sb.from('categorie_veicolo').select('id, nome').order('nome'),
			sb.from('ruoli').select('id, nome, descrizione').eq('officina_id', officina.id).order('nome'),
			sb
				.from('competenze')
				.select('id, nome, famiglia, competenza_padre_id, selezionabile, ordine, attiva')
				.eq('officina_id', officina.id)
				.order('ordine', { ascending: true, nullsFirst: false }),
			sb
				.from('officina_alimentazioni')
				.select('id, alimentazione, attiva')
				.eq('officina_id', officina.id),
			sb
				.from('certificazioni_officina')
				.select('id, tipo, nome, numero_codice, ente_rilascio, data_rilascio, data_scadenza, stato_manuale, note, documento_path')
				.eq('officina_id', officina.id)
				.order('data_scadenza', { ascending: true, nullsFirst: false })
		]);
		officinaFull = o.data;
		categorie = (cat.data ?? []).map((r: any) => r.categoria).filter(Boolean);
		tutteCategorie = tuttecat.data ?? [];
		ruoli = ru.data ?? [];
		competenze = co.data ?? [];
		alimentazioni = al.data ?? [];
		certificazioniOfficina = ce.data ?? [];
	}

	return {
		officina: officinaFull,
		categorie,
		tutteCategorie,
		ruoli,
		competenze: competenze as any[],
		alimentazioni: alimentazioni as any[],
		certificazioniOfficina: certificazioniOfficina as any[]
	};
};

export const actions: Actions = {
	// Primo avvio: crea l'officina e collega l'utente come titolare.
	// Passa dalla funzione RPC (SECURITY DEFINER): l'insert diretto in
	// `officine` è bloccato da RLS finché l'utente non ha un'officina.
	creaOfficina: async ({ request, locals }) => {
		const f = await request.formData();
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: "Il nome dell'officina è obbligatorio." });
		const { error } = await locals.supabase.rpc('crea_officina_e_collega', {
			nome_officina: nome,
			indirizzo_officina: (f.get('indirizzo') as string)?.trim() || null
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	aggiornaOfficina: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('officine')
			.update({
				nome: (f.get('nome') as string)?.trim(),
				indirizzo: (f.get('indirizzo') as string)?.trim() || null
			})
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	creaCategoria: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome della categoria è obbligatorio.' });

		// Le categorie sono globali (nome unique). Riusa se esiste, altrimenti crea.
		let categoriaId: string;
		const { data: esistente } = await locals.supabase
			.from('categorie_veicolo')
			.select('id')
			.eq('nome', nome)
			.maybeSingle();

		if (esistente) {
			categoriaId = esistente.id;
		} else {
			const { data: nuova, error } = await locals.supabase
				.from('categorie_veicolo')
				.insert({ nome })
				.select('id')
				.single();
			if (error) return fail(400, { errore: error.message });
			categoriaId = nuova.id;
		}

		// collega all'officina (idempotente)
		const { error: eLink } = await locals.supabase
			.from('officina_categorie_veicolo')
			.upsert({ officina_id: officinaId, categoria_veicolo_id: categoriaId });
		if (eLink) return fail(400, { errore: eLink.message });
		return { ok: true };
	},

	scollegaCategoria: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('officina_categorie_veicolo')
			.delete()
			.eq('officina_id', f.get('officina_id') as string)
			.eq('categoria_veicolo_id', f.get('categoria_id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	creaRuolo: async ({ request, locals }) => {
		const f = await request.formData();
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome del ruolo è obbligatorio.' });
		const { error } = await locals.supabase.from('ruoli').insert({
			officina_id: f.get('officina_id') as string,
			nome,
			descrizione: (f.get('descrizione') as string)?.trim() || null
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	eliminaRuolo: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('ruoli')
			.delete()
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	creaCompetenza: async ({ request, locals }) => {
		const f = await request.formData();
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome della competenza è obbligatorio.' });
		const { error } = await locals.supabase.from('competenze').insert({
			officina_id: f.get('officina_id') as string,
			nome,
			famiglia: (f.get('famiglia') as string)?.trim() || null
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	eliminaCompetenza: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('competenze')
			.delete()
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	// Attiva/disattiva una competenza offerta dall'officina (flag `attiva`).
	toggleCompetenza: async ({ request, locals }) => {
		const f = await request.formData();
		const id = f.get('id') as string;
		const attiva = f.get('attiva') === 'true';
		const { error } = await locals.supabase
			.from('competenze')
			.update({ attiva })
			.eq('id', id);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	// Attiva/disattiva un'alimentazione trattata dall'officina (flag `attiva`).
	// Le 7 righe esistono già (seed automatico via trigger/backfill): qui si
	// aggiorna solo lo stato. La RLS garantisce che si tocchi la propria officina.
	toggleAlimentazione: async ({ request, locals }) => {
		const f = await request.formData();
		const id = f.get('id') as string;
		const attiva = f.get('attiva') === 'true';
		const { error } = await locals.supabase
			.from('officina_alimentazioni')
			.update({ attiva })
			.eq('id', id);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	// ── Certificazioni/abilitazioni dell'officina ──────────────────────
	creaCertOfficina: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome della certificazione è obbligatorio.' });
		const { error } = await locals.supabase.from('certificazioni_officina').insert({
			officina_id: officinaId,
			tipo: (f.get('tipo') as string)?.trim() || null,
			nome,
			numero_codice: (f.get('numero_codice') as string)?.trim() || null,
			ente_rilascio: (f.get('ente_rilascio') as string)?.trim() || null,
			data_rilascio: (f.get('data_rilascio') as string) || null,
			data_scadenza: (f.get('data_scadenza') as string) || null,
			note: (f.get('note') as string)?.trim() || null
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	aggiornaCertOfficina: async ({ request, locals }) => {
		const f = await request.formData();
		const { error } = await locals.supabase
			.from('certificazioni_officina')
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
			.eq('id', f.get('id') as string);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	eliminaCertOfficina: async ({ request, locals }) => {
		const f = await request.formData();
		const id = f.get('id') as string;
		const { data: cert } = await locals.supabase
			.from('certificazioni_officina')
			.select('documento_path')
			.eq('id', id)
			.maybeSingle();
		if (cert?.documento_path) {
			await locals.supabase.storage.from('certificazioni').remove([cert.documento_path]);
		}
		const { error } = await locals.supabase.from('certificazioni_officina').delete().eq('id', id);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	// Allegato cert officina — path: {officina_id}/officina/{cert_id}/{filename}
	caricaAllegatoOfficina: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		const certId = f.get('cert_id') as string;
		const file = f.get('file') as File;
		if (!file || file.size === 0) return fail(400, { errore: 'Nessun file selezionato.' });
		const nomePulito = file.name.replace(/[^\w.\-]/g, '_');
		const path = `${officinaId}/officina/${certId}/${nomePulito}`;
		const { error: eUp } = await locals.supabase.storage
			.from('certificazioni')
			.upload(path, file, { upsert: true });
		if (eUp) return fail(400, { errore: eUp.message });
		const { error } = await locals.supabase
			.from('certificazioni_officina')
			.update({ documento_path: path })
			.eq('id', certId);
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	},

	scaricaAllegatoOfficina: async ({ request, locals }) => {
		const f = await request.formData();
		const path = f.get('path') as string;
		const { data, error } = await locals.supabase.storage
			.from('certificazioni')
			.createSignedUrl(path, 60);
		if (error) return fail(400, { errore: error.message });
		return { ok: true, signedUrl: data.signedUrl };
	},

	// Genera l'albero competenze iniziale per l'officina (idempotente lato DB).
	// Utile se l'officina è stata creata prima di questa migration.
	generaAlbero: async ({ request, locals }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		if (!officinaId) return fail(400, { errore: 'Nessuna officina.' });
		const { error } = await locals.supabase.rpc('seed_albero_competenze', {
			p_officina: officinaId
		});
		if (error) return fail(400, { errore: error.message });
		return { ok: true };
	}
};
