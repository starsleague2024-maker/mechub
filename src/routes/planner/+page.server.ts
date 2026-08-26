import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const sb = locals.supabase;

	const [{ data: allocazioni }, { data: postazioni }, { data: persone }] = await Promise.all([
		sb
			.from('allocazioni')
			.select(
				`id, stato_pianificazione, postazione_assegnata_id, slot_pianificato_inizio, slot_pianificato_fine,
				 durata_stimata_min_minuti, durata_stimata_max_minuti,
				 lavorazione:lavorazioni!inner(
					id, nome, stato_operativo, richiede_preventivo, approvazione_cliente_ottenuta,
					richiede_ricambi, fabbisogno_ricambi_soddisfatto,
					intervento:interventi(id, priorita_livello, data_promessa_cliente,
						veicolo:veicoli(targa, marca, modello),
						cliente:clienti(nome, cognome, ragione_sociale))
				 ),
				 postazione:postazioni(id, nome),
				 assegnazioni:assegnazioni_persona(id, ruolo_in_lavorazione, persona:persone(id, nome, cognome))`
			)
			.order('created_at', { ascending: true }),
		sb
			.from('postazioni')
			.select('id, nome, stato, tipo:tipi_risorsa(nome)')
			.eq('stato', 'disponibile')
			.order('nome'),
		sb
			.from('persone')
			.select('id, nome, cognome')
			.eq('stato', 'attivo')
			.order('cognome')
	]);

	return {
		allocazioni: (allocazioni ?? []) as any[],
		postazioni: (postazioni ?? []) as any[],
		persone: (persone ?? []) as any[]
	};
};

export const actions: Actions = {
	// Assegna postazione + eventuale slot temporale a una lavorazione
	assegna: async ({ request, locals }) => {
		const f = await request.formData();
		const allocId = f.get('allocazione_id') as string;
		const postazione = (f.get('postazione_assegnata_id') as string) || null;
		const inizio = (f.get('slot_inizio') as string) || null;
		const durata = f.get('durata_minuti') ? Number(f.get('durata_minuti')) : null;

		let fine: string | null = null;
		if (inizio && durata) {
			fine = new Date(new Date(inizio).getTime() + durata * 60000).toISOString();
		}

		const nuovoStato = postazione || inizio ? 'pianificata' : 'non_pianificata';

		const { error: e } = await locals.supabase
			.from('allocazioni')
			.update({
				postazione_assegnata_id: postazione,
				slot_pianificato_inizio: inizio,
				slot_pianificato_fine: fine,
				durata_stimata_min_minuti: durata,
				stato_pianificazione: nuovoStato
			})
			.eq('id', allocId);
		if (e) return fail(400, { errore: e.message });

		// riflette lo stato sulla lavorazione se era da pianificare
		const lavId = f.get('lavorazione_id') as string;
		if (nuovoStato === 'pianificata') {
			await locals.supabase
				.from('lavorazioni')
				.update({ stato_operativo: 'pianificata' })
				.eq('id', lavId)
				.eq('stato_operativo', 'non_pianificata');
		}

		await locals.supabase.rpc('registra_evento', {
			p_tipo_evento: 'LavorazionePianificata',
			p_aggregate_type: 'lavorazione',
			p_aggregate_id: lavId,
			p_payload: { postazione, inizio }
		});
		return { ok: true };
	},

	// Assegna una persona (principale/supporto) alla lavorazione
	assegnaPersona: async ({ request, locals }) => {
		const f = await request.formData();
		const allocId = f.get('allocazione_id') as string;
		const personaId = f.get('persona_id') as string;
		if (!personaId) return fail(400, { errore: 'Seleziona una persona.' });

		const { error: e } = await locals.supabase.from('assegnazioni_persona').insert({
			allocazione_id: allocId,
			persona_id: personaId,
			ruolo_in_lavorazione: (f.get('ruolo') as string) || 'principale'
		});
		if (e) {
			if (e.code === '23505') return fail(400, { errore: 'Persona già assegnata a questa lavorazione.' });
			return fail(400, { errore: e.message });
		}
		return { ok: true };
	},

	rimuoviPersona: async ({ request, locals }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('assegnazioni_persona')
			.delete()
			.eq('id', f.get('assegnazione_id') as string);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	}
};
