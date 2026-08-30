import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Mansioni consigliate per ruolo (solo suggerimenti, mai vincoli).
const CONSIGLIATE: Record<string, string[]> = {
	Desk: [
		'Appuntamenti', 'Accettazione', 'Preventivi', 'Gestione anagrafiche / clienti',
		'Incassi', 'Gestione cassa / prima nota', 'Consegna veicoli', 'Comunicazione cliente',
		'Gestione garanzie / assicurazioni', 'Gestione auto sostitutive'
	],
	Capofficina: [
		'Gestione lavorazioni', 'Controllo lavorazioni', 'Programmazione / assegnazione lavori',
		'Gestione ricambi', 'Contatto fornitori'
	],
	Meccanico: ['Gestione lavorazioni', 'Controllo lavorazioni'],
	Titolare: []
};

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;
	const pid = params.id;

	const { data: persona } = await sb
		.from('persone')
		.select('id, nome, cognome, email, telefono, stato, foto_path, persona_ruoli(ruolo_id, ruolo_primario, ruolo:ruoli(nome))')
		.eq('id', pid)
		.maybeSingle();
	if (!persona) throw error(404, 'Persona non trovata');

	// ruolo primario dalla tabella-ponte
	const rpRow: any = (persona.persona_ruoli ?? []).find((r: any) => r.ruolo_primario) ?? (persona.persona_ruoli ?? [])[0];
	const ruoloIdCorrente = rpRow?.ruolo_id ?? null;
	const nomeRuolo = (Array.isArray(rpRow?.ruolo) ? rpRow?.ruolo[0]?.nome : rpRow?.ruolo?.nome) ?? null;

	// foto firmata
	let foto_url: string | null = null;
	if (persona.foto_path) {
		const { data: signed } = await sb.storage.from('foto-staff').createSignedUrl(persona.foto_path, 3600);
		foto_url = signed?.signedUrl ?? null;
	}

	const [
		{ data: ruoli },
		{ data: orari },
		{ data: catAttive },
		{ data: personaCat },
		{ data: alimAttive },
		{ data: personaAlim },
		{ data: competenze },
		{ data: personaComp },
		{ data: mansioni },
		{ data: personaMans },
		{ data: certificazioni },
		{ data: permessi },
		{ data: ruoloPermessi },
		{ data: personaPermessi }
	] = await Promise.all([
		sb.from('ruoli').select('id, nome').order('nome'),
		sb.from('persona_orari').select('*').eq('persona_id', pid),
		// categorie ATTIVE dell'officina
		sb.from('officina_categorie_veicolo').select('attiva, categoria:categorie_veicolo(id, nome)').eq('attiva', true),
		sb.from('persona_categorie_veicolo').select('categoria_veicolo_id').eq('persona_id', pid),
		// alimentazioni ATTIVE dell'officina
		sb.from('officina_alimentazioni').select('alimentazione, attiva').eq('attiva', true),
		sb.from('persona_alimentazioni').select('alimentazione').eq('persona_id', pid),
		sb.from('competenze').select('id, nome, competenza_padre_id, selezionabile, ordine, descrizione').eq('attiva', true).order('ordine'),
		sb.from('persona_competenze').select('id, competenza_id, livello').eq('persona_id', pid),
		sb.from('mansioni').select('id, nome, gruppo, ordine').eq('attiva', true).order('ordine'),
		sb.from('persona_mansioni').select('mansione_id').eq('persona_id', pid),
		sb.from('certificazioni').select('id, tipo, nome, numero_codice, data_scadenza, stato_manuale, documento_path').eq('persona_id', pid),
		sb.from('permessi').select('id, codice, descrizione').order('codice'),
		// permessi del ruolo della persona
		ruoloIdCorrente
			? sb.from('ruolo_permessi').select('permesso_id').eq('ruolo_id', ruoloIdCorrente)
			: Promise.resolve({ data: [] as any[] }),
		sb.from('persona_permessi').select('permesso_id, concesso').eq('persona_id', pid)
	]);

	return {
		persona: { ...persona, foto_url, ruolo_id: ruoloIdCorrente },
		ruoli: ruoli ?? [],
		orari: orari ?? [],
		categorieAttive: (catAttive ?? []).map((r: any) => r.categoria).filter(Boolean),
		personaCategorie: (personaCat ?? []).map((r: any) => r.categoria_veicolo_id),
		alimentazioniAttive: (alimAttive ?? []).map((r: any) => r.alimentazione),
		personaAlimentazioni: (personaAlim ?? []).map((r: any) => r.alimentazione),
		competenze: competenze ?? [],
		personaCompetenze: personaComp ?? [],
		mansioni: mansioni ?? [],
		personaMansioni: (personaMans ?? []).map((r: any) => r.mansione_id),
		mansioniConsigliate: nomeRuolo ? (CONSIGLIATE[nomeRuolo] ?? []) : [],
		certificazioni: certificazioni ?? [],
		permessi: permessi ?? [],
		ruoloPermessi: (ruoloPermessi ?? []).map((r: any) => r.permesso_id),
		personaPermessi: personaPermessi ?? [],
		officinaId: officina?.id ?? null
	};
};

export const actions: Actions = {
	// ── Profilo ──
	aggiornaProfilo: async ({ request, locals, params }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('persone')
			.update({
				nome: (f.get('nome') as string)?.trim(),
				cognome: (f.get('cognome') as string)?.trim(),
				email: (f.get('email') as string)?.trim() || null,
				telefono: (f.get('telefono') as string)?.trim() || null,
				stato: (f.get('stato') as string) || 'attivo'
			})
			.eq('id', params.id);
		if (e) return fail(400, { errore: e.message });

		// ruolo primario nella tabella-ponte: rimuovo i primari esistenti e reimposto
		let ruoloId = (f.get('ruolo_id') as string) || null;
		const nuovoRuolo = (f.get('nuovo_ruolo') as string)?.trim();
		if (ruoloId === '__nuovo__') {
			if (!nuovoRuolo) {
				ruoloId = null;
			} else {
				// serve l'officina della persona
				const { data: p } = await locals.supabase
					.from('persone').select('officina_id').eq('id', params.id).maybeSingle();
				const { data: r, error: eN } = await locals.supabase
					.from('ruoli')
					.insert({ officina_id: p?.officina_id, nome: nuovoRuolo })
					.select('id')
					.single();
				if (eN) return fail(400, { errore: eN.message });
				ruoloId = r.id;
			}
		}
		await locals.supabase
			.from('persona_ruoli')
			.delete()
			.eq('persona_id', params.id)
			.eq('ruolo_primario', true);
		if (ruoloId) {
			const { error: eR } = await locals.supabase
				.from('persona_ruoli')
				.upsert({ persona_id: params.id, ruolo_id: ruoloId, ruolo_primario: true });
			if (eR) return fail(400, { errore: eR.message });
		}
		return { ok: true };
	},

	// ── Foto ──
	caricaFoto: async ({ request, locals, params }) => {
		const f = await request.formData();
		const officinaId = f.get('officina_id') as string;
		const file = f.get('file') as File;
		if (!file || file.size === 0) return fail(400, { errore: 'Nessun file selezionato.' });
		const nomePulito = file.name.replace(/[^\w.\-]/g, '_');
		const path = `${officinaId}/${params.id}/${nomePulito}`;
		const { error: eUp } = await locals.supabase.storage.from('foto-staff').upload(path, file, { upsert: true });
		if (eUp) return fail(400, { errore: eUp.message });
		const { error: e } = await locals.supabase.from('persone').update({ foto_path: path }).eq('id', params.id);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	// ── Orari (riceve JSON dei 7 giorni) ──
	salvaOrari: async ({ request, locals, params }) => {
		const f = await request.formData();
		let giorni: any;
		try {
			giorni = JSON.parse(f.get('orari') as string);
		} catch {
			return fail(400, { errore: 'Dati orari non validi.' });
		}
		// cancella e reinserisce (7 righe)
		await locals.supabase.from('persona_orari').delete().eq('persona_id', params.id);
		const righe = Object.entries(giorni).map(([giorno, g]: [string, any]) => ({
			persona_id: params.id,
			giorno: Number(giorno),
			lavorativo: !!g.aperto,
			entrata: g.aperto && g.entrata ? g.entrata : null,
			uscita: g.aperto && g.uscita ? g.uscita : null,
			pausa_inizio: g.aperto && g.pausa_inizio ? g.pausa_inizio : null,
			pausa_fine: g.aperto && g.pausa_fine ? g.pausa_fine : null
		}));
		const { error: e } = await locals.supabase.from('persona_orari').insert(righe);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	// ── Toggle generico veicolo ──
	toggleVeicolo: async ({ request, locals, params }) => {
		const f = await request.formData();
		const catId = f.get('categoria_id') as string;
		const attivo = f.get('attivo') === 'true';
		if (attivo) {
			const { error: e } = await locals.supabase
				.from('persona_categorie_veicolo')
				.upsert({ persona_id: params.id, categoria_veicolo_id: catId });
			if (e) return fail(400, { errore: e.message });
		} else {
			const { error: e } = await locals.supabase
				.from('persona_categorie_veicolo')
				.delete()
				.eq('persona_id', params.id)
				.eq('categoria_veicolo_id', catId);
			if (e) return fail(400, { errore: e.message });
		}
		return { ok: true };
	},

	// ── Toggle alimentazione ──
	toggleAlimentazione: async ({ request, locals, params }) => {
		const f = await request.formData();
		const alim = f.get('alimentazione') as string;
		const attivo = f.get('attivo') === 'true';
		if (attivo) {
			const { error: e } = await locals.supabase
				.from('persona_alimentazioni')
				.upsert({ persona_id: params.id, alimentazione: alim });
			if (e) return fail(400, { errore: e.message });
		} else {
			const { error: e } = await locals.supabase
				.from('persona_alimentazioni')
				.delete()
				.eq('persona_id', params.id)
				.eq('alimentazione', alim);
			if (e) return fail(400, { errore: e.message });
		}
		return { ok: true };
	},

	// ── Toggle competenza ──
	toggleCompetenza: async ({ request, locals, params }) => {
		const f = await request.formData();
		const compId = f.get('competenza_id') as string;
		const attivo = f.get('attivo') === 'true';
		if (attivo) {
			const { error: e } = await locals.supabase
				.from('persona_competenze')
				.insert({ persona_id: params.id, competenza_id: compId, livello: 3 });
			if (e) return fail(400, { errore: e.message });
		} else {
			const { error: e } = await locals.supabase
				.from('persona_competenze')
				.delete()
				.eq('persona_id', params.id)
				.eq('competenza_id', compId);
			if (e) return fail(400, { errore: e.message });
		}
		return { ok: true };
	},

	// ── Livello competenza ──
	livelloCompetenza: async ({ request, locals, params }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('persona_competenze')
			.update({ livello: Number(f.get('livello')) })
			.eq('persona_id', params.id)
			.eq('competenza_id', f.get('competenza_id') as string);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	// ── Toggle mansione ──
	toggleMansione: async ({ request, locals, params }) => {
		const f = await request.formData();
		const mansId = f.get('mansione_id') as string;
		const attivo = f.get('attivo') === 'true';
		if (attivo) {
			const { error: e } = await locals.supabase
				.from('persona_mansioni')
				.upsert({ persona_id: params.id, mansione_id: mansId });
			if (e) return fail(400, { errore: e.message });
		} else {
			const { error: e } = await locals.supabase
				.from('persona_mansioni')
				.delete()
				.eq('persona_id', params.id)
				.eq('mansione_id', mansId);
			if (e) return fail(400, { errore: e.message });
		}
		return { ok: true };
	},

	// ── Override permesso (concesso/revocato/eredita) ──
	// stato: 'concesso' | 'revocato' | 'eredita'
	overridePermesso: async ({ request, locals, params }) => {
		const f = await request.formData();
		const permId = f.get('permesso_id') as string;
		const stato = f.get('stato') as string;
		if (stato === 'eredita') {
			const { error: e } = await locals.supabase
				.from('persona_permessi')
				.delete()
				.eq('persona_id', params.id)
				.eq('permesso_id', permId);
			if (e) return fail(400, { errore: e.message });
		} else {
			const { error: e } = await locals.supabase
				.from('persona_permessi')
				.upsert({ persona_id: params.id, permesso_id: permId, concesso: stato === 'concesso' });
			if (e) return fail(400, { errore: e.message });
		}
		return { ok: true };
	}
};
