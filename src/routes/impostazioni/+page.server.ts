import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { officina } = await parent();
	const sb = locals.supabase;

	let officinaFull = null;
	let categorie: any[] = [];
	let ruoli: any[] = [];
	let competenze: any[] = [];

	if (officina) {
		const [o, cat, ru, co] = await Promise.all([
			sb.from('officine').select('*').eq('id', officina.id).maybeSingle(),
			sb
				.from('officina_categorie_veicolo')
				.select('categoria:categorie_veicolo(id, nome)')
				.eq('officina_id', officina.id),
			sb.from('ruoli').select('id, nome, descrizione').eq('officina_id', officina.id).order('nome'),
			sb
				.from('competenze')
				.select('id, nome, famiglia')
				.eq('officina_id', officina.id)
				.order('nome')
		]);
		officinaFull = o.data;
		categorie = (cat.data ?? []).map((r: any) => r.categoria).filter(Boolean);
		ruoli = ru.data ?? [];
		competenze = co.data ?? [];
	}

	return { officina: officinaFull, categorie, ruoli, competenze };
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
	}
};
