<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Sezione from '$lib/components/Sezione.svelte';
	import AlberoCompetenze from '$lib/components/AlberoCompetenze.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import CampoAuto from '$lib/components/CampoAuto.svelte';
	import OrariSettimana from '$lib/components/OrariSettimana.svelte';
	import {
		ALIMENTAZIONE,
		ALIMENTAZIONI,
		STATO_CERTIFICAZIONE,
		TIPO_CERTIFICAZIONE,
		TIPI_CERT_STAFF,
		TIPI_CERT_OFFICINA,
		statoCertificazione,
		voce,
		fmtData
	} from '$lib/dominio';

	let { data, form } = $props();

	$effect(() => {
		if (form?.ok && !form?.signedUrl) invalidateAll();
	});
	$effect(() => {
		if (form?.signedUrl) window.open(form.signedUrl, '_blank');
	});

	// Le 7 alimentazioni, in ordine canonico, unite allo stato dal DB.
	// Il seed automatico (trigger + backfill, migration 0018) garantisce che
	// le righe esistano sempre; il fallback copre solo casi anomali, senza
	// alcun pulsante di generazione manuale.
	const alimentazioni = $derived(
		ALIMENTAZIONI.map((chiave) => {
			const riga = data.alimentazioni.find((a: any) => a.alimentazione === chiave);
			return {
				chiave,
				label: ALIMENTAZIONE[chiave].label,
				id: riga?.id ?? null,
				attiva: riga?.attiva ?? false
			};
		})
	);
	const alimentazioniAttiveCount = $derived(alimentazioni.filter((a) => a.attiva).length);

	// toggle alimentazione: stesso pattern del form nascosto usato per le competenze
	let formToggleAlim = $state<HTMLFormElement | null>(null);
	let alimId = $state('');
	let alimAttiva = $state('true');

	function onToggleAlimentazione(id: string, nuovoStato: boolean) {
		if (!id) return;
		alimId = id;
		alimAttiva = String(nuovoStato);
		queueMicrotask(() => formToggleAlim?.requestSubmit());
	}

	// ── Certificazioni officina: modale crea/modifica ──
	let modalCert = $state(false);

	// ── Navigazione a schede ──
	const SCHEDE = [
		{ id: 'officina', label: 'Officina', icona: '⬡' },
		{ id: 'orari', label: 'Orari & Chiusure', icona: '◷' },
		{ id: 'tratti', label: 'Cosa tratti', icona: '⬒' },
		{ id: 'competenze', label: 'Competenze', icona: '☰' },
		{ id: 'certificazioni', label: 'Certificazioni', icona: '▤' },
		{ id: 'staff', label: 'Ruoli & Staff', icona: '◑' }
	];
	let schedaAttiva = $state('officina');
	let certCorrente = $state<any>(null);

	// ── Elenco unico filtrabile (staff + officina) ──
	let filtroAmbito = $state<'tutti' | 'officina' | 'staff'>('tutti');
	let filtroTipo = $state('');
	let ricercaCert = $state('');

	const certificazioniFiltrate = $derived(
		(data.certificazioniTutte ?? []).filter((c: any) => {
			if (filtroAmbito !== 'tutti' && c.ambito !== filtroAmbito) return false;
			if (filtroTipo && c.tipo !== filtroTipo) return false;
			if (ricercaCert.trim()) {
				const q = ricercaCert.trim().toLowerCase();
				const blob = `${c.nome ?? ''} ${c.tipo ?? ''} ${c.numero_codice ?? ''} ${c.ente_rilascio ?? ''} ${c.assegnataA ?? ''}`.toLowerCase();
				if (!blob.includes(q)) return false;
			}
			return true;
		})
	);
	// tipi presenti nell'elenco, per popolare il filtro
	const tipiPresenti = $derived(
		[...new Set((data.certificazioniTutte ?? []).map((c: any) => c.tipo).filter(Boolean))]
	);

	function apriNuovaCert() {
		certCorrente = null;
		modalCert = true;
	}
	function apriModificaCert(c: any) {
		certCorrente = c;
		modalCert = true;
	}
	$effect(() => {
		if (form?.ok && !form?.signedUrl) modalCert = false;
	});

	// competenze attive (flag `attiva`) come Set per l'albero
	const attive = $derived(new Set(data.competenze.filter((c: any) => c.attiva).map((c: any) => c.id)));

	// toggle competenza officina: invia il form nascosto via fetch (enhance manuale)
	let formToggle = $state<HTMLFormElement | null>(null);
	let toggleId = $state('');
	let toggleAttiva = $state('true');

	function onToggleCompetenza(id: string, nuovoStato: boolean) {
		toggleId = id;
		toggleAttiva = String(nuovoStato);
		// invia al submit successivo
		queueMicrotask(() => formToggle?.requestSubmit());
	}

	const competenzeAttiveCount = $derived(data.competenze.filter((c: any) => c.attiva).length);
	const albeoVuoto = $derived(data.competenze.length === 0);

	// toggle categoria veicolo: stesso pattern del form nascosto delle alimentazioni
	let formToggleCat = $state<HTMLFormElement | null>(null);
	let catId = $state('');
	let catAttiva = $state('true');
	function onToggleCategoria(id: string, nuovoStato: boolean) {
		if (!id) return;
		catId = id;
		catAttiva = String(nuovoStato);
		queueMicrotask(() => formToggleCat?.requestSubmit());
	}
	const categorieAttiveCount = $derived(data.categorie.filter((c: any) => c.attiva).length);

	// ── Orari officina ──
	let orariOfficina = $state<Record<string, any>>(data.officina.orari_apertura ?? {});
	let orariStato = $state<'idle' | 'saving' | 'ok' | 'error'>('idle');
	let formOrari = $state<HTMLFormElement | null>(null);
	function onCambioOrari(dati: Record<string, any>) {
		orariOfficina = dati;
	}
	async function salvaOrari() {
		orariStato = 'saving';
		try {
			const fd = new FormData();
			fd.set('orari', JSON.stringify(orariOfficina));
			const res = await fetch('?/salvaOrariOfficina', { method: 'POST', body: fd });
			orariStato = res.ok ? 'ok' : 'error';
			if (orariStato === 'ok') setTimeout(() => (orariStato = 'idle'), 1800);
		} catch {
			orariStato = 'error';
		}
	}
</script>

<svelte:head><title>Impostazioni · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Sistema</div>
		<h1 class="pagina-titolo">Impostazioni</h1>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if !data.officina}
	<!-- Primo avvio -->
	<div class="panel panel-pad setup">
		<div class="eyebrow">Primo avvio</div>
		<h2 class="mt-1 mb-2">Crea la tua officina</h2>
		<p class="muted mb-2">
			È il primo passo: definisce il contenitore di clienti, veicoli, organico e
			interventi. Potrai aggiungere altre sedi in seguito.
		</p>
		<form method="POST" action="?/creaOfficina" use:enhance class="flex-col gap-2" style="max-width:440px">
			<div class="field"><label for="no">Nome officina *</label><input id="no" class="input" name="nome" required placeholder="Es. Autofficina Rossi" /></div>
			<div class="field"><label for="in">Indirizzo</label><input id="in" class="input" name="indirizzo" /></div>
			<button class="btn btn-accent" type="submit">Crea officina</button>
		</form>
	</div>
{:else}
	<!-- form nascosto per il toggle competenza officina -->
	<form
		method="POST"
		action="?/toggleCompetenza"
		use:enhance
		bind:this={formToggle}
		class="hidden-form"
	>
		<input type="hidden" name="id" value={toggleId} />
		<input type="hidden" name="attiva" value={toggleAttiva} />
	</form>

	<!-- form nascosto per il toggle alimentazione officina -->
	<form
		method="POST"
		action="?/toggleAlimentazione"
		use:enhance
		bind:this={formToggleAlim}
		class="hidden-form"
	>
		<input type="hidden" name="id" value={alimId} />
		<input type="hidden" name="attiva" value={alimAttiva} />
	</form>

	<!-- form nascosto per il toggle categoria veicolo -->
	<form
		method="POST"
		action="?/toggleCategoria"
		use:enhance
		bind:this={formToggleCat}
		class="hidden-form"
	>
		<input type="hidden" name="officina_id" value={data.officina.id} />
		<input type="hidden" name="categoria_id" value={catId} />
		<input type="hidden" name="attiva" value={catAttiva} />
	</form>

	<div class="tab-bar">
		{#each SCHEDE as s}
			<button class="tab" class:on={schedaAttiva === s.id} onclick={() => (schedaAttiva = s.id)}>
				<span class="tab-ico">{s.icona}</span>
				<span class="tab-lab">{s.label}</span>
			</button>
		{/each}
	</div>

	<div class="sezioni">
		{#if schedaAttiva === 'officina'}
		<!-- ─── Profilo officina ─── -->
		<Sezione titolo="Officina" descrizione="Anagrafica, contatti, social e fatturazione" aperta={true}>
			<div class="profilo">
				<p class="muted small mb-2">Le modifiche si salvano da sole quando esci da un campo. L'icona ↺ ripristina l'ultimo valore salvato.</p>
				<div class="blocchi-grid">
				<!-- Identità -->
				<div class="blocco">
					<div class="blocco-tit">Identità</div>
					<div class="griglia g-2">
						<CampoAuto campo="nome" etichetta="Nome officina" valoreIniziale={data.officina.nome} />
						<CampoAuto campo="ragione_sociale" etichetta="Ragione sociale" valoreIniziale={data.officina.ragione_sociale} placeholder="Per la fatturazione" />
					</div>
				</div>

				<!-- Sede -->
				<div class="blocco">
					<div class="blocco-tit">Sede</div>
					<CampoAuto campo="indirizzo" etichetta="Indirizzo" valoreIniziale={data.officina.indirizzo} />
					<div class="griglia g-3">
						<CampoAuto campo="cap" etichetta="CAP" valoreIniziale={data.officina.cap} mono maxlength={5} />
						<CampoAuto campo="citta" etichetta="Città" valoreIniziale={data.officina.citta} />
						<CampoAuto campo="provincia" etichetta="Provincia" valoreIniziale={data.officina.provincia} mono maxlength={2} placeholder="LU" />
					</div>
				</div>

				<!-- Contatti -->
				<div class="blocco">
					<div class="blocco-tit">Contatti</div>
					<div class="griglia g-2">
						<CampoAuto campo="telefono_fisso" etichetta="Telefono fisso" valoreIniziale={data.officina.telefono_fisso} mono />
						<CampoAuto campo="cellulare" etichetta="Cellulare" valoreIniziale={data.officina.cellulare} mono />
					</div>
					<div class="griglia g-2">
						<CampoAuto campo="email" etichetta="Email" valoreIniziale={data.officina.email} type="email" />
						<CampoAuto campo="pec" etichetta="PEC" valoreIniziale={data.officina.pec} type="email" />
					</div>
					<CampoAuto campo="sito_web" etichetta="Sito web" valoreIniziale={data.officina.sito_web} placeholder="https://" />
				</div>

				<!-- Social & messaggistica -->
				<div class="blocco">
					<div class="blocco-tit">Social e messaggistica</div>
					<div class="griglia g-2">
						<CampoAuto campo="whatsapp" etichetta="WhatsApp" valoreIniziale={data.officina.whatsapp} placeholder="Numero o link wa.me" />
						<CampoAuto campo="whatsapp_gruppo" etichetta="Gruppo / broadcast WhatsApp" valoreIniziale={data.officina.whatsapp_gruppo} placeholder="Link invito" />
					</div>
					<div class="griglia g-2">
						<CampoAuto campo="instagram" etichetta="Instagram" valoreIniziale={data.officina.instagram} placeholder="@handle o URL" />
						<CampoAuto campo="facebook" etichetta="Facebook" valoreIniziale={data.officina.facebook} placeholder="URL pagina" />
					</div>
					<div class="griglia g-2">
						<CampoAuto campo="tiktok" etichetta="TikTok" valoreIniziale={data.officina.tiktok} placeholder="@handle o URL" />
						<CampoAuto campo="google_business" etichetta="Google Business" valoreIniziale={data.officina.google_business} placeholder="Link scheda" />
					</div>
				</div>

				<!-- Fatturazione -->
				<div class="blocco">
					<div class="blocco-tit">Dati fiscali e fatturazione</div>
					<div class="griglia g-2">
						<CampoAuto campo="partita_iva" etichetta="Partita IVA" valoreIniziale={data.officina.partita_iva} mono />
						<CampoAuto campo="codice_fiscale" etichetta="Codice fiscale" valoreIniziale={data.officina.codice_fiscale} mono />
					</div>
					<div class="griglia g-2">
						<CampoAuto campo="codice_sdi" etichetta="Codice SDI" valoreIniziale={data.officina.codice_sdi} mono maxlength={7} placeholder="7 caratteri" />
						<CampoAuto campo="rea" etichetta="REA (facoltativo)" valoreIniziale={data.officina.rea} mono placeholder="LU-123456" />
					</div>
					<CampoAuto campo="iban" etichetta="IBAN" valoreIniziale={data.officina.iban} mono />
				</div>
				</div>
			</div>

			<!-- Logo (fuori dal form principale: upload separato) -->
			<div class="blocco logo-blocco mt-2">
				<div class="blocco-tit">Logo</div>
				<div class="logo-riga">
					{#if data.officina.logo_url}
						<img class="logo-preview" src={data.officina.logo_url} alt="Logo officina" />
					{:else}
						<div class="logo-vuoto">Nessun logo</div>
					{/if}
					<div class="flex-col gap-1">
						<form method="POST" action="?/caricaLogo" use:enhance enctype="multipart/form-data" class="flex gap-1">
							<input type="hidden" name="officina_id" value={data.officina.id} />
							<input class="input" type="file" name="file" accept="image/*" required />
							<button class="btn btn-sm" type="submit">Carica</button>
						</form>
						{#if data.officina.logo_path}
							<form method="POST" action="?/rimuoviLogo" use:enhance>
								<input type="hidden" name="officina_id" value={data.officina.id} />
								<button class="btn btn-ghost btn-sm btn-danger" type="submit">Rimuovi logo</button>
							</form>
						{/if}
						<span class="hint">Usato per intestare preventivi e documenti. Consigliato PNG/JPG, sfondo chiaro.</span>
					</div>
				</div>
			</div>
		</Sezione>
		{/if}

		{#if schedaAttiva === 'orari'}
		<!-- ─── Orari di apertura officina ─── -->
		<Sezione titolo="Orari di apertura" descrizione="Orari settimanali dell'officina" aperta={true}>
			<p class="muted small mb-2">
				Imposta gli orari di apertura per ogni giorno. Questi orari faranno da base
				per lo staff: quando crei una persona potrai copiarli e modificarli.
			</p>
			<OrariSettimana valore={orariOfficina} onChange={onCambioOrari} />
			<div class="flex gap-1 mt-2" style="align-items:center">
				<button class="btn btn-accent" type="button" onclick={salvaOrari}>Salva orari</button>
				{#if orariStato === 'saving'}<span class="muted small">salvataggio…</span>
				{:else if orariStato === 'ok'}<span class="small" style="color:#1a7f4b">salvato ✓</span>
				{:else if orariStato === 'error'}<span class="small" style="color:#c0392b">errore</span>{/if}
			</div>
		</Sezione>
		{/if}

		{#if schedaAttiva === 'staff'}
		<!-- ─── Ruoli & Staff ─── -->
		<Sezione titolo="Ruoli & Staff" descrizione="Gestione del personale" aperta={true}>
			<p class="muted small mb-2">Gestisci le persone dell'officina: dati, ruolo, orari, veicoli, competenze, mansioni, certificazioni e permessi.</p>
			<a href="/impostazioni/staff" class="btn btn-accent">Apri Ruoli &amp; Staff →</a>
		</Sezione>
		{/if}

		{#if schedaAttiva === 'tratti'}
		<!-- ─── Veicoli trattati ─── -->
		<Sezione titolo="Veicoli trattati" descrizione="Categorie di veicolo" badge={categorieAttiveCount} aperta={true}>
			<p class="muted small mb-2">Attiva le categorie di veicolo che l'officina tratta. Utile al Planner per assegnare le risorse giuste.</p>
			<ul class="alim-lista">
				{#each data.categorie as c}
					<li>
						<label class="alim-riga">
							<input
								type="checkbox"
								checked={c.attiva}
								onchange={(e) => onToggleCategoria(c.id, e.currentTarget.checked)}
							/>
							<span class="alim-nome">{c.nome}</span>
							<span class="alim-stato" class:on={c.attiva}>{c.attiva ? 'Attiva' : 'Non attiva'}</span>
						</label>
					</li>
				{/each}
			</ul>
		</Sezione>

		<!-- ─── Alimentazioni trattate ─── -->
		<Sezione
			titolo="Alimentazioni trattate"
			descrizione="Cosa sa gestire l'officina"
			badge={alimentazioniAttiveCount}
		>
			<p class="muted small mb-2">
				Indica quali alimentazioni l'officina è in grado di gestire. Quando entra un veicolo con
				un'alimentazione non attiva, il desk riceve un avviso; il salvataggio resta comunque possibile.
			</p>
			<ul class="alim-lista">
				{#each alimentazioni as a}
					<li>
						<label class="alim-riga">
							<input
								type="checkbox"
								checked={a.attiva}
								disabled={!a.id}
								onchange={(e) => onToggleAlimentazione(a.id, e.currentTarget.checked)}
							/>
							<span class="alim-nome">{a.label}</span>
							<span class="alim-stato" class:on={a.attiva}>{a.attiva ? 'Attiva' : 'Non attiva'}</span>
						</label>
					</li>
				{/each}
			</ul>
		</Sezione>
		{/if}

		{#if schedaAttiva === 'competenze'}
		<!-- ─── Competenze officina (ALBERO) ─── -->
		<Sezione titolo="Competenze e lavorazioni dell'officina" descrizione="Cosa fa questa officina" badge={competenzeAttiveCount} aperta={true}>
			<p class="muted small mb-2">
				Spunta le competenze che l'officina è in grado di offrire. Le macro-aree (in grassetto)
				sono contenitori: attiva le competenze specifiche al loro interno. La stessa struttura
				sarà usata per lo staff e per le lavorazioni.
			</p>
			{#if albeoVuoto}
				<div class="avviso info mb-2">
					L'albero delle competenze non è ancora stato generato per questa officina.
					<form method="POST" action="?/generaAlbero" use:enhance class="mt-1">
						<input type="hidden" name="officina_id" value={data.officina.id} />
						<button class="btn btn-accent btn-sm" type="submit">Genera albero competenze</button>
					</form>
				</div>
			{:else}
				<AlberoCompetenze competenze={data.competenze} {attive} ontoggle={onToggleCompetenza} />
			{/if}
		</Sezione>
		{/if}

		{#if schedaAttiva === 'certificazioni'}
		<!-- ─── Certificazioni e abilitazioni (elenco unico filtrabile) ─── -->
		<Sezione
			titolo="Certificazioni e abilitazioni"
			descrizione="Staff e officina, in un unico elenco"
			badge={data.certificazioniTutte?.length ?? 0}
			aperta={true}
		>
			<p class="muted small mb-2">
				Elenco unico di tutte le certificazioni e abilitazioni: quelle dell'officina e quelle personali
				dello staff. Filtra per ambito, tipo o cerca per nome/persona — utile in caso di controllo.
				Le abilitazioni personali si aggiungono anche dalla scheda di ciascun membro in <a href="/impostazioni/staff">Organico</a>.
			</p>

			<!-- Barra filtri -->
			<div class="filtri-cert mb-2">
				<div class="seg">
					<button class="seg-btn" class:on={filtroAmbito === 'tutti'} onclick={() => (filtroAmbito = 'tutti')}>Tutte</button>
					<button class="seg-btn" class:on={filtroAmbito === 'officina'} onclick={() => (filtroAmbito = 'officina')}>Officina</button>
					<button class="seg-btn" class:on={filtroAmbito === 'staff'} onclick={() => (filtroAmbito = 'staff')}>Staff</button>
				</div>
				<select class="select" bind:value={filtroTipo}>
					<option value="">Tutti i tipi</option>
					{#each tipiPresenti as t}
						<option value={t}>{TIPO_CERTIFICAZIONE[t]?.label ?? t}</option>
					{/each}
				</select>
				<input class="input" placeholder="Cerca nome, codice, persona…" bind:value={ricercaCert} />
			</div>

			{#if certificazioniFiltrate.length > 0}
				<div class="tabella-wrap piatta mb-2">
					<table class="dati">
						<thead>
							<tr><th>Ambito</th><th>Assegnata a</th><th>Tipo</th><th>Nome</th><th>Ente</th><th>Scadenza</th><th>Stato</th><th></th></tr>
						</thead>
						<tbody>
							{#each certificazioniFiltrate as c}
								{@const st = voce(STATO_CERTIFICAZIONE, statoCertificazione(c.data_scadenza, c.stato_manuale))}
								<tr>
									<td><Badge label={c.ambito === 'officina' ? 'Officina' : 'Staff'} colore={c.ambito === 'officina' ? 'neutro' : 'blu'} /></td>
									<td class="small">{c.assegnataA}</td>
									<td class="small">{c.tipo ? (TIPO_CERTIFICAZIONE[c.tipo]?.label ?? c.tipo) : '—'}</td>
									<td>{c.nome}{#if c.numero_codice}<span class="muted small mono"> · {c.numero_codice}</span>{/if}</td>
									<td class="small muted">{c.ente_rilascio ?? '—'}</td>
									<td class="mono small">{c.data_scadenza ? fmtData(c.data_scadenza) : '—'}</td>
									<td><Badge label={st.label} colore={st.colore} /></td>
									<td class="azioni-cella">
										{#if c.documento_path}
											<form method="POST" action="?/scaricaAllegatoOfficina" use:enhance class="inline">
												<input type="hidden" name="path" value={c.documento_path} />
												<button type="submit" class="link-btn" title="Scarica allegato">📎</button>
											</form>
										{/if}
										{#if c.ambito === 'officina'}
											<button class="link-btn" onclick={() => apriModificaCert(c)}>Modifica</button>
										{:else}
											<a class="link-btn" href={`/organico/${c.persona_id}`}>Apri scheda</a>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="muted small mb-2">Nessuna certificazione corrisponde ai filtri.</p>
			{/if}
			<button class="btn btn-accent btn-sm" onclick={apriNuovaCert}>+ Aggiungi certificazione officina</button>
		</Sezione>
		{/if}
	</div>

	<Modal titolo={certCorrente ? 'Modifica certificazione' : 'Nuova certificazione'} bind:aperto={modalCert}>
		<form
			method="POST"
			action={certCorrente ? '?/aggiornaCertOfficina' : '?/creaCertOfficina'}
			use:enhance
			id="form-cert-off"
			class="flex-col gap-2"
		>
			<input type="hidden" name="officina_id" value={data.officina.id} />
			{#if certCorrente}<input type="hidden" name="id" value={certCorrente.id} />{/if}
			<div class="griglia g-2">
				<div class="field">
					<label for="co-tipo">Tipo</label>
					<input id="co-tipo" class="input" name="tipo" list="tipi-cert-off" value={certCorrente?.tipo ?? ''} placeholder="Scegli o scrivi (Altro…)" />
					<datalist id="tipi-cert-off">
						{#each TIPI_CERT_OFFICINA as t}<option value={t}>{TIPO_CERTIFICAZIONE[t].label}</option>{/each}
					</datalist>
				</div>
				<div class="field">
					<label for="co-nome">Nome *</label>
					<input id="co-nome" class="input" name="nome" required value={certCorrente?.nome ?? ''} />
				</div>
			</div>
			<div class="griglia g-2">
				<div class="field"><label for="co-num">Numero / codice</label><input id="co-num" class="input mono" name="numero_codice" value={certCorrente?.numero_codice ?? ''} /></div>
				<div class="field"><label for="co-ente">Ente rilascio</label><input id="co-ente" class="input" name="ente_rilascio" value={certCorrente?.ente_rilascio ?? ''} /></div>
			</div>
			<div class="griglia g-2">
				<div class="field"><label for="co-ril">Data rilascio</label><input id="co-ril" class="input mono" type="date" name="data_rilascio" value={certCorrente?.data_rilascio ?? ''} /></div>
				<div class="field"><label for="co-sca">Scadenza <span class="muted small">(vuoto = senza scadenza)</span></label><input id="co-sca" class="input mono" type="date" name="data_scadenza" value={certCorrente?.data_scadenza ?? ''} /></div>
			</div>
			{#if certCorrente}
				<div class="field">
					<label for="co-stato">Stato manuale <span class="muted small">(opzionale)</span></label>
					<select id="co-stato" class="select" name="stato_manuale">
						<option value="">— automatico dalla scadenza —</option>
						<option value="valida" selected={certCorrente?.stato_manuale === 'valida'}>Valida</option>
						<option value="sospesa" selected={certCorrente?.stato_manuale === 'sospesa'}>Sospesa</option>
						<option value="revocata" selected={certCorrente?.stato_manuale === 'revocata'}>Revocata</option>
					</select>
				</div>
			{/if}
			<div class="field"><label for="co-note">Note</label><textarea id="co-note" class="input" name="note" rows="2">{certCorrente?.note ?? ''}</textarea></div>
		</form>

		{#if certCorrente}
			<div class="allegato-box mt-2">
				<div class="small muted mb-1">Allegato</div>
				{#if certCorrente.documento_path}
					<form method="POST" action="?/scaricaAllegatoOfficina" use:enhance class="inline">
						<input type="hidden" name="path" value={certCorrente.documento_path} />
						<button type="submit" class="btn btn-sm">📎 Scarica documento</button>
					</form>
				{/if}
				<form method="POST" action="?/caricaAllegatoOfficina" use:enhance enctype="multipart/form-data" class="flex gap-1 mt-1">
					<input type="hidden" name="officina_id" value={data.officina.id} />
					<input type="hidden" name="cert_id" value={certCorrente.id} />
					<input class="input" type="file" name="file" required />
					<button class="btn" type="submit">Carica</button>
				</form>
			</div>
		{:else}
			<div class="avviso info small mt-2">Salva la certificazione, poi potrai allegare un documento.</div>
		{/if}

		{#snippet azioni()}
			{#if certCorrente}
				<form method="POST" action="?/eliminaCertOfficina" use:enhance class="inline mr-auto">
					<input type="hidden" name="id" value={certCorrente.id} />
					<button class="btn btn-ghost btn-danger" type="submit">Elimina</button>
				</form>
			{/if}
			<button class="btn" onclick={() => (modalCert = false)}>Annulla</button>
			<button class="btn btn-accent" type="submit" form="form-cert-off">Salva</button>
		{/snippet}
	</Modal>
{/if}

<style>
	.setup {
		max-width: 640px;
	}
	.sezioni {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
	}
	.hidden-form {
		display: none;
	}
	.alim-lista {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-width: 420px;
	}
	.alim-riga {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		background: var(--nebbia-50);
		border-radius: var(--r);
		cursor: pointer;
	}
	.alim-riga:hover {
		background: var(--acciaio-100);
	}
	.alim-riga input {
		accent-color: var(--cantiere);
		width: 16px;
		height: 16px;
		cursor: pointer;
	}
	.alim-nome {
		font-weight: 500;
		font-size: 14px;
	}
	.alim-stato {
		margin-left: auto;
		font-size: 12px;
		font-weight: 600;
		color: var(--testo-tenue);
	}
	.alim-stato.on {
		color: var(--verde);
	}
	.tabella-wrap.piatta {
		border: none;
	}
	.azioni-cella {
		text-align: right;
		white-space: nowrap;
	}
	.link-btn {
		background: none;
		border: none;
		color: var(--blu);
		cursor: pointer;
		font-size: 13px;
		padding: 0 4px;
	}
	.link-btn:hover {
		text-decoration: underline;
	}
	.inline {
		display: inline;
	}
	.allegato-box {
		border-top: 1px solid var(--bordo);
		padding-top: 12px;
	}
	.btn-danger {
		color: var(--rosso);
	}
	.mr-auto {
		margin-right: auto;
	}
	/* Profilo officina a sotto-blocchi: griglia responsive full-width.
	   Su schermi larghi i blocchi si affiancano; su mobile si impilano. */
	.profilo {
		width: 100%;
	}
	.profilo :global(.blocchi-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 12px;
		align-items: start;
	}
	.blocco {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		background: var(--nebbia-50);
		border-radius: var(--r);
		border: 1px solid var(--bordo);
	}
	.blocco-tit {
		font-family: var(--display);
		font-weight: 600;
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--testo-tenue);
		padding-bottom: 2px;
	}
	.logo-blocco {
		width: 100%;
	}
	.logo-riga {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}
	.logo-preview {
		width: 96px;
		height: 96px;
		object-fit: contain;
		background: var(--bianco, #fff);
		border: 1px solid var(--bordo);
		border-radius: var(--r);
		padding: 6px;
		flex-shrink: 0;
	}
	.logo-vuoto {
		width: 96px;
		height: 96px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-size: 12px;
		color: var(--testo-tenue);
		background: var(--acciaio-100);
		border: 1px dashed var(--bordo);
		border-radius: var(--r);
		flex-shrink: 0;
	}
	.hint {
		font-size: 12px;
		color: var(--testo-tenue);
	}
	/* Barra filtri certificazioni */
	.filtri-cert {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.filtri-cert .select,
	.filtri-cert .input {
		max-width: 260px;
	}
	.seg {
		display: inline-flex;
		border: 1px solid var(--bordo);
		border-radius: var(--r);
		overflow: hidden;
	}
	.seg-btn {
		background: var(--carta);
		border: none;
		padding: 7px 14px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		color: var(--testo);
		border-right: 1px solid var(--bordo);
	}
	.seg-btn:last-child {
		border-right: none;
	}
	.seg-btn:hover {
		background: var(--nebbia-50);
	}
	.seg-btn.on {
		background: var(--grafite-900);
		color: #fff;
	}
	.tab-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 20px;
		border-bottom: 2px solid var(--bordo, #e2e5ea);
		padding-bottom: 0;
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 10px 16px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		color: var(--testo-tenue, #7a828e);
		transition: color 0.12s, border-color 0.12s;
		white-space: nowrap;
	}
	.tab:hover {
		color: var(--testo, #2a2d33);
	}
	.tab.on {
		color: var(--testo, #2a2d33);
		border-bottom-color: var(--cantiere, #f5b301);
		font-weight: 600;
	}
	.tab-ico {
		font-size: 16px;
		opacity: 0.8;
	}
	@media (max-width: 640px) {
		.tab-lab {
			display: none;
		}
		.tab {
			padding: 10px 14px;
		}
		.tab-ico {
			font-size: 20px;
		}
	}
</style>
