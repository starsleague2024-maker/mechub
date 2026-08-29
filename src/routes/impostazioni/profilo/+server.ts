import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Campi del profilo officina salvabili via autosave. Whitelist: nessun altro
// campo viene scritto anche se inviato (sicurezza).
const CAMPI_CONSENTITI = new Set([
	'nome',
	'ragione_sociale',
	'indirizzo',
	'cap',
	'citta',
	'provincia',
	'telefono_fisso',
	'cellulare',
	'email',
	'pec',
	'sito_web',
	'whatsapp',
	'whatsapp_gruppo',
	'instagram',
	'facebook',
	'tiktok',
	'google_business',
	'partita_iva',
	'codice_fiscale',
	'codice_sdi',
	'iban',
	'rea'
]);

export const POST: RequestHandler = async ({ request, locals }) => {
	// officina corrente dell'utente (RLS garantisce sia la propria)
	const { data: mia } = await locals.supabase
		.from('officine')
		.select('id')
		.limit(1)
		.maybeSingle();
	if (!mia) throw error(403, 'Nessuna officina associata.');

	const body = await request.json().catch(() => null);
	if (!body || typeof body.campo !== 'string') throw error(400, 'Richiesta non valida.');
	if (!CAMPI_CONSENTITI.has(body.campo)) throw error(400, 'Campo non consentito.');

	// nome non può essere svuotato; gli altri sì (→ null)
	let valore: string | null = typeof body.valore === 'string' ? body.valore.trim() : null;
	if (body.campo === 'nome' && !valore) throw error(400, 'Il nome non può essere vuoto.');
	if (valore === '') valore = null;

	const { data: updated, error: eUp } = await locals.supabase
		.from('officine')
		.update({ [body.campo]: valore })
		.eq('id', mia.id)
		.select('id')
		.maybeSingle();

	if (eUp) throw error(400, eUp.message);
	if (!updated) throw error(403, 'Salvataggio non riuscito: nessuna riga aggiornata.');

	return json({ ok: true, campo: body.campo, valore });
};
