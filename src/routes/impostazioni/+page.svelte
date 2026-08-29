<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Sezione from '$lib/components/Sezione.svelte';
	import AlberoCompetenze from '$lib/components/AlberoCompetenze.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import {
		ALIMENTAZIONE,
		ALIMENTAZIONI,
		STATO_CERTIFICAZIONE,
		TIPO_CERTIFICAZIONE,
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
	const TIPI_CERT = Object.keys(TIPO_CERTIFICAZIONE);
	let modalCert = $state(false);
	let certCorrente = $state<any>(null);

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

	<div class="sezioni">
		<!-- ─── Profilo officina ─── -->
		<Sezione titolo="Officina" descrizione="Anagrafica, contatti, social e fatturazione" aperta={true}>
			<form method="POST" action="?/aggiornaOfficina" use:enhance class="flex-col gap-3 profilo">
				<input type="hidden" name="id" value={data.officina.id} />

				<!-- Identità -->
				<div class="blocco">
					<div class="blocco-tit">Identità</div>
					<div class="griglia g-2">
						<div class="field"><label for="no">Nome officina</label><input id="no" class="input" name="nome" value={data.officina.nome} /></div>
						<div class="field"><label for="rs">Ragione sociale</label><input id="rs" class="input" name="ragione_sociale" value={data.officina.ragione_sociale ?? ''} placeholder="Per la fatturazione" /></div>
					</div>
				</div>

				<!-- Sede -->
				<div class="blocco">
					<div class="blocco-tit">Sede</div>
					<div class="field"><label for="in">Indirizzo</label><input id="in" class="input" name="indirizzo" value={data.officina.indirizzo ?? ''} /></div>
					<div class="griglia g-3">
						<div class="field"><label for="cap">CAP</label><input id="cap" class="input mono" name="cap" value={data.officina.cap ?? ''} maxlength="5" /></div>
						<div class="field"><label for="citta">Città</label><input id="citta" class="input" name="citta" value={data.officina.citta ?? ''} /></div>
						<div class="field"><label for="prov">Provincia</label><input id="prov" class="input mono" name="provincia" value={data.officina.provincia ?? ''} maxlength="2" placeholder="LU" /></div>
					</div>
				</div>

				<!-- Contatti -->
				<div class="blocco">
					<div class="blocco-tit">Contatti</div>
					<div class="griglia g-2">
						<div class="field"><label for="tf">Telefono fisso</label><input id="tf" class="input mono" name="telefono_fisso" value={data.officina.telefono_fisso ?? ''} /></div>
						<div class="field"><label for="cel">Cellulare</label><input id="cel" class="input mono" name="cellulare" value={data.officina.cellulare ?? ''} /></div>
					</div>
					<div class="griglia g-2">
						<div class="field"><label for="em">Email</label><input id="em" class="input" type="email" name="email" value={data.officina.email ?? ''} /></div>
						<div class="field"><label for="pec">PEC</label><input id="pec" class="input" type="email" name="pec" value={data.officina.pec ?? ''} /></div>
					</div>
					<div class="field"><label for="web">Sito web</label><input id="web" class="input" name="sito_web" value={data.officina.sito_web ?? ''} placeholder="https://" /></div>
				</div>

				<!-- Social & messaggistica -->
				<div class="blocco">
					<div class="blocco-tit">Social e messaggistica</div>
					<div class="griglia g-2">
						<div class="field"><label for="wa">WhatsApp</label><input id="wa" class="input" name="whatsapp" value={data.officina.whatsapp ?? ''} placeholder="Numero o link wa.me" /></div>
						<div class="field"><label for="wag">Gruppo / broadcast WhatsApp</label><input id="wag" class="input" name="whatsapp_gruppo" value={data.officina.whatsapp_gruppo ?? ''} placeholder="Link invito" /></div>
					</div>
					<div class="griglia g-2">
						<div class="field"><label for="ig">Instagram</label><input id="ig" class="input" name="instagram" value={data.officina.instagram ?? ''} placeholder="@handle o URL" /></div>
						<div class="field"><label for="fb">Facebook</label><input id="fb" class="input" name="facebook" value={data.officina.facebook ?? ''} placeholder="URL pagina" /></div>
					</div>
					<div class="griglia g-2">
						<div class="field"><label for="tk">TikTok</label><input id="tk" class="input" name="tiktok" value={data.officina.tiktok ?? ''} placeholder="@handle o URL" /></div>
						<div class="field"><label for="gb">Google Business</label><input id="gb" class="input" name="google_business" value={data.officina.google_business ?? ''} placeholder="Link scheda" /></div>
					</div>
				</div>

				<!-- Fatturazione -->
				<div class="blocco">
					<div class="blocco-tit">Dati fiscali e fatturazione</div>
					<div class="griglia g-2">
						<div class="field"><label for="piva">Partita IVA</label><input id="piva" class="input mono" name="partita_iva" value={data.officina.partita_iva ?? ''} /></div>
						<div class="field"><label for="cf">Codice fiscale</label><input id="cf" class="input mono" name="codice_fiscale" value={data.officina.codice_fiscale ?? ''} /></div>
					</div>
					<div class="griglia g-2">
						<div class="field"><label for="sdi">Codice SDI</label><input id="sdi" class="input mono" name="codice_sdi" value={data.officina.codice_sdi ?? ''} maxlength="7" placeholder="7 caratteri" /></div>
						<div class="field"><label for="rea">REA <span class="muted small">(facoltativo)</span></label><input id="rea" class="input mono" name="rea" value={data.officina.rea ?? ''} placeholder="LU-123456" /></div>
					</div>
					<div class="field"><label for="iban">IBAN</label><input id="iban" class="input mono" name="iban" value={data.officina.iban ?? ''} /></div>
				</div>

				<div><button class="btn btn-accent" type="submit">Salva profilo</button></div>
			</form>

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

		<!-- ─── Veicoli trattati ─── -->
		<Sezione titolo="Veicoli trattati" descrizione="Categorie di veicolo" badge={data.categorie.length}>
			<p class="muted small mb-2">Le categorie di veicolo che l'officina tratta. Utile al Planner per assegnare le risorse giuste.</p>
			{#if data.categorie.length > 0}
				<div class="chips mb-2">
					{#each data.categorie as c}
						<span class="chip-el">
							{c.nome}
							<form method="POST" action="?/scollegaCategoria" use:enhance class="inline-x">
								<input type="hidden" name="officina_id" value={data.officina.id} />
								<input type="hidden" name="categoria_id" value={c.id} />
								<button type="submit" aria-label="Rimuovi">×</button>
							</form>
						</span>
					{/each}
				</div>
			{/if}
			<form method="POST" action="?/creaCategoria" use:enhance class="flex gap-1">
				<input type="hidden" name="officina_id" value={data.officina.id} />
				<input class="input" name="nome" placeholder="Es. Auto, Moto, Furgone, Camper" required />
				<button class="btn btn-accent" type="submit">+</button>
			</form>
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

		<!-- ─── Ruoli ─── -->
		<Sezione titolo="Ruoli" descrizione="Ruoli del personale" badge={data.ruoli.length}>
			{#if data.ruoli.length > 0}
				<ul class="lista-el mb-2">
					{#each data.ruoli as r}
						<li>
							<span>{r.nome}</span>
							<form method="POST" action="?/eliminaRuolo" use:enhance class="inline-x">
								<input type="hidden" name="id" value={r.id} />
								<button type="submit" aria-label="Elimina">×</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
			<form method="POST" action="?/creaRuolo" use:enhance class="flex gap-1">
				<input type="hidden" name="officina_id" value={data.officina.id} />
				<input class="input" name="nome" placeholder="Es. Meccanico, Capofficina" required />
				<button class="btn btn-accent" type="submit">+</button>
			</form>
		</Sezione>

		<!-- ─── Certificazioni e abilitazioni officina ─── -->
		<Sezione
			titolo="Certificazioni e abilitazioni"
			descrizione="Abilitazioni dell'officina"
			badge={data.certificazioniOfficina.length}
		>
			<p class="muted small mb-2">
				Certificazioni e abilitazioni che appartengono all'officina (autorizzazioni, iscrizioni,
				certificazioni tecniche). Le abilitazioni personali dello staff si gestiscono nella scheda
				di ciascun membro in <a href="/organico">Organico</a>.
			</p>
			{#if data.certificazioniOfficina.length > 0}
				<div class="tabella-wrap piatta mb-2">
					<table class="dati">
						<thead>
							<tr><th>Tipo</th><th>Nome</th><th>Ente</th><th>Scadenza</th><th>Stato</th><th></th></tr>
						</thead>
						<tbody>
							{#each data.certificazioniOfficina as c}
								{@const st = voce(STATO_CERTIFICAZIONE, statoCertificazione(c.data_scadenza, c.stato_manuale))}
								<tr>
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
										<button class="link-btn" onclick={() => apriModificaCert(c)}>Modifica</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			<button class="btn btn-accent btn-sm" onclick={apriNuovaCert}>+ Aggiungi certificazione</button>
		</Sezione>
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
					<input id="co-tipo" class="input" name="tipo" list="tipi-cert-off" value={certCorrente?.tipo ?? ''} placeholder="Autorizzazione, certificazione…" />
					<datalist id="tipi-cert-off">
						{#each TIPI_CERT as t}<option value={t}>{TIPO_CERTIFICAZIONE[t].label}</option>{/each}
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
		max-width: 900px;
	}
	.hidden-form {
		display: none;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.chip-el {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: var(--acciaio-100);
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
	}
	.lista-el {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.lista-el li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 10px;
		background: var(--nebbia-50);
		border-radius: var(--r);
		font-size: 13.5px;
		font-weight: 500;
	}
	.inline-x {
		display: inline;
	}
	.inline-x button {
		background: none;
		border: none;
		color: var(--acciaio-400);
		cursor: pointer;
		font-size: 15px;
		line-height: 1;
		padding: 0 0 0 4px;
	}
	.inline-x button:hover {
		color: var(--rosso);
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
	/* Profilo officina a sotto-blocchi */
	.profilo {
		max-width: 640px;
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
		max-width: 640px;
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
</style>
