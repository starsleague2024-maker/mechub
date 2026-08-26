import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

async function logEvento(
	sb: App.Locals['supabase'],
	tipo: string,
	aggType: string,
	aggId: string,
	payload: Record<string, unknown> = {}
) {
	await sb.rpc('registra_evento', {
		p_tipo_evento: tipo,
		p_aggregate_type: aggType,
		p_aggregate_id: aggId,
		p_payload: payload
	});
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const sb = locals.supabase;

	const { data: intervento } = await sb
		.from('interventi')
		.select(
			'*, cliente:clienti(id, nome, cognome, ragione_sociale, telefono), veicolo:veicoli(id, targa, marca, modello, anno, categoria_veicolo_id)'
		)
		.eq('id', params.id)
		.maybeSingle();

	if (!intervento) throw error(404, 'Intervento non trovato');

	const [{ data: lavorazioni }, { data: tipiLav }, { data: preventivi }] = await Promise.all([
		sb
			.from('lavorazioni')
			.select(
				'id, nome, stato_operativo, esito_tipo, note, richiede_preventivo, approvazione_cliente_ottenuta, richiede_ricambi, fabbisogno_ricambi_soddisfatto, tipo_lavorazione_id, allocazione:allocazioni(id, postazione_assegnata_id, slot_pianificato_inizio, postazione:postazioni(nome), assegnazioni:assegnazioni_persona(persona:persone(nome, cognome)))'
			)
			.eq('intervento_id', params.id)
			.order('created_at', { ascending: true }),
		sb
			.from('tipi_lavorazione')
			.select('id, nome, tempo_standard_default_min, numero_persone_richieste')
			.order('nome'),
		sb
			.from('preventivi')
			.select('id, stato, data_creazione')
			.eq('intervento_id', params.id)
			.order('data_creazione', { ascending: false })
	]);

	return {
		intervento,
		lavorazioni: lavorazioni ?? [] as any[],
		tipiLavorazione: tipiLav ?? [] as any[],
		preventivi: preventivi ?? [] as any[]
	};
};

export const actions: Actions = {
	aggiornaStato: async ({ request, locals, params }) => {
		const f = await request.formData();
		const stato = f.get('stato_generale') as string;
		const { error: e } = await locals.supabase
			.from('interventi')
			.update({ stato_generale: stato })
			.eq('id', params.id);
		if (e) return fail(400, { errore: e.message });
		await logEvento(locals.supabase, 'InterventoStatoCambiato', 'intervento', params.id, { stato });
		return { ok: true };
	},

	aggiornaPriorita: async ({ request, locals, params }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('interventi')
			.update({
				priorita_livello: f.get('priorita_livello') as string,
				priorita_motivo: (f.get('priorita_motivo') as string)?.trim() || null,
				priorita_timestamp: new Date().toISOString()
			})
			.eq('id', params.id);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	},

	creaLavorazione: async ({ request, locals, params }) => {
		const f = await request.formData();
		const nome = (f.get('nome') as string)?.trim();
		if (!nome) return fail(400, { errore: 'Il nome della lavorazione è obbligatorio.' });

		const tipoId = (f.get('tipo_lavorazione_id') as string) || null;
		const richiedePrev = f.get('richiede_preventivo') === 'on';
		const richiedeRic = f.get('richiede_ricambi') === 'on';

		// stato iniziale: se ha prerequisiti aperti -> bloccata, altrimenti da pianificare
		const bloccata = richiedePrev || richiedeRic;

		const { data: nuova, error: e } = await locals.supabase
			.from('lavorazioni')
			.insert({
				intervento_id: params.id,
				tipo_lavorazione_id: tipoId,
				nome,
				note: (f.get('note') as string)?.trim() || null,
				richiede_preventivo: richiedePrev,
				richiede_ricambi: richiedeRic,
				fabbisogno_ricambi_soddisfatto: !richiedeRic,
				stato_operativo: bloccata ? 'bloccata_da_prerequisiti' : 'non_pianificata'
			})
			.select('id')
			.single();
		if (e) return fail(400, { errore: e.message });

		// Allocazione vuota pronta per il planner (Fase 2)
		await locals.supabase.from('allocazioni').insert({ lavorazione_id: nuova.id });
		await logEvento(locals.supabase, 'LavorazioneCreata', 'lavorazione', nuova.id, { nome });
		return { ok: true };
	},

	cambiaStatoLavorazione: async ({ request, locals }) => {
		const f = await request.formData();
		const id = f.get('id') as string;
		const stato = f.get('stato') as string;
		const { error: e } = await locals.supabase
			.from('lavorazioni')
			.update({ stato_operativo: stato })
			.eq('id', id);
		if (e) return fail(400, { errore: e.message });

		// Aggiorna anche l'allocazione + registra eventi coerenti col ciclo di vita
		if (stato === 'in_corso') {
			await locals.supabase
				.from('allocazioni')
				.update({ data_inizio_effettiva: new Date().toISOString() })
				.eq('lavorazione_id', id);
			await logEvento(locals.supabase, 'LavorazioneAvviata', 'lavorazione', id);
		} else if (stato === 'completata') {
			await locals.supabase
				.from('allocazioni')
				.update({ data_fine_effettiva: new Date().toISOString() })
				.eq('lavorazione_id', id);
			await logEvento(locals.supabase, 'LavorazioneCompletata', 'lavorazione', id);
		}
		return { ok: true };
	},

	eliminaLavorazione: async ({ request, locals }) => {
		const f = await request.formData();
		const { error: e } = await locals.supabase
			.from('lavorazioni')
			.delete()
			.eq('id', f.get('id') as string);
		if (e) return fail(400, { errore: e.message });
		return { ok: true };
	}
};
