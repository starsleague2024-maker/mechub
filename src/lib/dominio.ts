// Etichette leggibili + colore badge per gli enum dello schema.
// Fonte: supabase/migrations (i CHECK constraint). Se aggiungi un valore
// allo schema, aggiungilo anche qui.

type Voce = { label: string; colore: string };

export const STATO_INTERVENTO: Record<string, Voce> = {
	prenotato: { label: 'Prenotato', colore: 'neutro' },
	accettato: { label: 'Accettato', colore: 'blu' },
	in_lavorazione: { label: 'In lavorazione', colore: 'cantiere' },
	in_attesa_cliente: { label: 'Attesa cliente', colore: 'ambra' },
	sospeso: { label: 'Sospeso', colore: 'ambra' },
	pronto_per_consegna: { label: 'Pronto', colore: 'verde' },
	consegnato: { label: 'Consegnato', colore: 'neutro' },
	annullato: { label: 'Annullato', colore: 'rosso' }
};

export const STATO_LAVORAZIONE: Record<string, Voce> = {
	bloccata_da_prerequisiti: { label: 'Bloccata', colore: 'rosso' },
	non_pianificata: { label: 'Da pianificare', colore: 'neutro' },
	pianificata: { label: 'Pianificata', colore: 'blu' },
	in_corso: { label: 'In corso', colore: 'cantiere' },
	sospesa: { label: 'Sospesa', colore: 'ambra' },
	completata: { label: 'Completata', colore: 'verde' },
	annullata: { label: 'Annullata', colore: 'rosso' },
	saltata: { label: 'Saltata', colore: 'neutro' }
};

export const STATO_PIANIFICAZIONE: Record<string, Voce> = {
	non_pianificata: { label: 'Non pianificata', colore: 'neutro' },
	pianificata: { label: 'Pianificata', colore: 'blu' },
	in_conflitto: { label: 'In conflitto', colore: 'rosso' }
};

export const STATO_APPUNTAMENTO: Record<string, Voce> = {
	programmato: { label: 'Programmato', colore: 'neutro' },
	confermato_dal_cliente: { label: 'Confermato', colore: 'blu' },
	vettura_arrivata: { label: 'Arrivata', colore: 'verde' },
	vettura_in_ritardo: { label: 'In ritardo', colore: 'ambra' },
	annullato: { label: 'Annullato', colore: 'rosso' },
	non_presentato: { label: 'No-show', colore: 'rosso' }
};

export const STATO_PREVENTIVO: Record<string, Voce> = {
	bozza: { label: 'Bozza', colore: 'neutro' },
	inviato: { label: 'Inviato', colore: 'blu' },
	parzialmente_approvato: { label: 'Parz. approvato', colore: 'ambra' },
	approvato: { label: 'Approvato', colore: 'verde' },
	rifiutato: { label: 'Rifiutato', colore: 'rosso' },
	scaduto: { label: 'Scaduto', colore: 'ambra' }
};

export const STATO_FABBISOGNO: Record<string, Voce> = {
	da_verificare: { label: 'Da verificare', colore: 'neutro' },
	disponibile_a_magazzino: { label: 'A magazzino', colore: 'verde' },
	da_ordinare: { label: 'Da ordinare', colore: 'ambra' },
	ordinato: { label: 'Ordinato', colore: 'blu' },
	parzialmente_arrivato: { label: 'Parz. arrivato', colore: 'blu' },
	arrivato: { label: 'Arrivato', colore: 'verde' },
	assorbito_da_lavorazione: { label: 'Assorbito', colore: 'neutro' },
	annullato: { label: 'Annullato', colore: 'rosso' },
	riassegnato_ad_altro_veicolo: { label: 'Riassegnato', colore: 'ambra' },
	non_disponibile: { label: 'Non disponibile', colore: 'rosso' }
};

export const STATO_ORDINE: Record<string, Voce> = {
	creato: { label: 'Creato', colore: 'neutro' },
	inviato: { label: 'Inviato', colore: 'blu' },
	confermato: { label: 'Confermato', colore: 'blu' },
	parzialmente_evaso: { label: 'Parz. evaso', colore: 'ambra' },
	evaso: { label: 'Evaso', colore: 'verde' },
	in_ritardo: { label: 'In ritardo', colore: 'rosso' }
};

// Alimentazioni standard trattabili da un'officina. L'ordine di questa
// lista è quello mostrato in Impostazioni e nei form veicolo.
// Le chiavi coincidono con il CHECK di `veicoli.alimentazione` e
// `officina_alimentazioni.alimentazione` (migration 0018).
export const ALIMENTAZIONE: Record<string, Voce> = {
	benzina: { label: 'Benzina', colore: 'ambra' },
	diesel: { label: 'Diesel', colore: 'neutro' },
	gpl: { label: 'GPL', colore: 'blu' },
	metano: { label: 'Metano', colore: 'blu' },
	ibrido: { label: 'Ibrido', colore: 'verde' },
	elettrico: { label: 'Elettrico', colore: 'verde' },
	idrogeno: { label: 'Idrogeno', colore: 'cantiere' }
};

// Ordine canonico delle 7 alimentazioni (utile come fallback UI).
export const ALIMENTAZIONI: string[] = Object.keys(ALIMENTAZIONE);

export const MODALITA_OPERATIVA: Record<string, string> = {
	da_finire_senza_fermarsi: 'Da finire senza fermarsi',
	lasciabile: 'Può essere lasciato e ripreso'
};

export const CATEGORIA_SOSPENSIONE: Record<string, string> = {
	attesa_ricambio: 'Attesa ricambio',
	attesa_approvazione_cliente: 'Attesa approvazione cliente',
	attesa_risorsa: 'Attesa risorsa',
	attesa_persona: 'Attesa persona',
	mancanza_informazioni: 'Mancanza informazioni',
	altro: 'Altro'
};

// Stato di una certificazione, CALCOLATO dalla data di scadenza (mai memorizzato).
// Rispecchia la funzione SQL stato_certificazione(). I giorni di preavviso
// ("in prossimità") non sono qui: arriveranno col blocco reminder.
export const STATO_CERTIFICAZIONE: Record<string, Voce> = {
	valida: { label: 'Valida', colore: 'verde' },
	scaduta: { label: 'Scaduta', colore: 'rosso' },
	senza_scadenza: { label: 'Senza scadenza', colore: 'neutro' },
	revocata: { label: 'Revocata', colore: 'rosso' },
	sospesa: { label: 'Sospesa', colore: 'ambra' }
};

// Tipi di certificazione/abilitazione. PES e PAV sono resi individuabili con
// un colore dedicato. Elenco non esaustivo: `tipo` accetta anche testo libero.
export const TIPO_CERTIFICAZIONE: Record<string, Voce> = {
	PES: { label: 'PES — Persona Esperta', colore: 'cantiere' },
	PAV: { label: 'PAV — Persona Avvertita', colore: 'cantiere' },
	patentino: { label: 'Patentino', colore: 'blu' },
	abilitazione: { label: 'Abilitazione', colore: 'blu' },
	certificazione: { label: 'Certificazione tecnica', colore: 'neutro' }
};

// Stato certificazione calcolato lato client (specchio della funzione SQL).
// Precedenza allo stato manuale se presente (es. 'revocata').
export function statoCertificazione(
	dataScadenza: string | null | undefined,
	statoManuale?: string | null
): string {
	if (statoManuale) return statoManuale;
	if (!dataScadenza) return 'senza_scadenza';
	const oggi = new Date();
	oggi.setHours(0, 0, 0, 0);
	return new Date(dataScadenza) < oggi ? 'scaduta' : 'valida';
}

export function voce(mappa: Record<string, Voce>, chiave: string | null | undefined): Voce {
	if (!chiave) return { label: '—', colore: 'neutro' };
	return mappa[chiave] ?? { label: chiave, colore: 'neutro' };
}

// ── Formattatori ────────────────────────────────────────────────
export function fmtData(v: string | null | undefined): string {
	if (!v) return '—';
	return new Date(v).toLocaleDateString('it-IT', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});
}

export function fmtDataOra(v: string | null | undefined): string {
	if (!v) return '—';
	return new Date(v).toLocaleString('it-IT', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function fmtEuro(v: number | null | undefined): string {
	if (v == null) return '—';
	return new Intl.NumberFormat('it-IT', {
		style: 'currency',
		currency: 'EUR'
	}).format(v);
}

export function fmtMinuti(min: number | null | undefined): string {
	if (min == null) return '—';
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	const m = min % 60;
	return m ? `${h}h ${m}m` : `${h}h`;
}
