<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AlberoCompetenze from '$lib/components/AlberoCompetenze.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import {
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

	// Apertura automatica del file scaricato (signed URL restituito dall'action)
	$effect(() => {
		if (form?.signedUrl) window.open(form.signedUrl, '_blank');
	});

	const p = $derived(data.persona);
	const possedute = $derived(new Set(data.possedute.map((pc: any) => pc.competenza_id)));

	let formToggle = $state<HTMLFormElement | null>(null);
	let toggleId = $state('');
	let togglePossiede = $state('true');

	function onToggle(id: string, nuovoStato: boolean) {
		toggleId = id;
		togglePossiede = String(nuovoStato);
		queueMicrotask(() => formToggle?.requestSubmit());
	}

	// ── Certificazioni: modale crea/modifica ──
	const TIPI = Object.keys(TIPO_CERTIFICAZIONE);
	let modalCert = $state(false);
	let certCorrente = $state<any>(null); // null = nuova, oggetto = modifica

	function apriNuova() {
		certCorrente = null;
		modalCert = true;
	}
	function apriModifica(c: any) {
		certCorrente = c;
		modalCert = true;
	}
	$effect(() => {
		if (form?.ok && !form?.signedUrl) modalCert = false;
	});
</script>

<svelte:head><title>{p.cognome} {p.nome} · Organico</title></svelte:head>

<div class="briciole small muted mb-2">
	<a href="/organico">Organico</a> / {p.cognome} {p.nome}
</div>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Scheda staff</div>
		<h1 class="pagina-titolo">{p.cognome} {p.nome}</h1>
		<div class="muted small mt-1">{p.ruolo?.nome ?? 'Nessun ruolo'} · {p.stato}</div>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<!-- form nascosto per toggle competenza -->
<form method="POST" action="?/toggleCompetenza" use:enhance bind:this={formToggle} class="hidden-form">
	<input type="hidden" name="competenza_id" value={toggleId} />
	<input type="hidden" name="possiede" value={togglePossiede} />
</form>

<div class="panel panel-pad" style="max-width:720px">
	<h2 class="mb-2">Competenze</h2>
	<p class="muted small mb-2">
		Cosa sa fare questa persona. Le competenze provengono dallo stesso catalogo dell'officina.
		Il futuro Planner userà queste informazioni per capire chi può eseguire una lavorazione.
	</p>
	{#if data.competenze.length === 0}
		<div class="avviso info small">
			L'albero competenze non è ancora stato generato. Vai in <a href="/impostazioni">Impostazioni</a>
			e genera l'albero competenze dell'officina.
		</div>
	{:else}
		<AlberoCompetenze competenze={data.competenze} attive={possedute} ontoggle={onToggle} />
	{/if}
</div>

<div class="panel panel-pad mt-2" style="max-width:720px">
	<div class="flex items-center justify-between mb-2">
		<h2>Certificazioni e abilitazioni</h2>
		<button class="btn btn-accent btn-sm" onclick={apriNuova}>+ Aggiungi</button>
	</div>
	<p class="muted small mb-2">
		Abilitazioni e qualifiche possedute (PES, PAV, patentini, certificazioni tecniche). Diverse
		dalle competenze: qui conta cosa la persona è autorizzata a fare, con l'eventuale scadenza.
	</p>
	{#if data.certificazioni.length === 0}
		<Vuoto titolo="Nessuna certificazione" testo="Aggiungi la prima abilitazione di questa persona." />
	{:else}
		<div class="tabella-wrap piatta">
			<table class="dati">
				<thead>
					<tr><th>Tipo</th><th>Nome</th><th>Ente</th><th>Scadenza</th><th>Stato</th><th></th></tr>
				</thead>
				<tbody>
					{#each data.certificazioni as c}
						{@const st = voce(STATO_CERTIFICAZIONE, statoCertificazione(c.data_scadenza, c.stato_manuale))}
						{@const tp = c.tipo ? voce(TIPO_CERTIFICAZIONE, c.tipo) : null}
						<tr>
							<td>
								{#if tp && (c.tipo === 'PES' || c.tipo === 'PAV')}
									<Badge label={c.tipo} colore="cantiere" />
								{:else if c.tipo}
									<span class="small">{tp?.label ?? c.tipo}</span>
								{:else}
									<span class="muted small">—</span>
								{/if}
							</td>
							<td>
								{c.nome}
								{#if c.numero_codice}<span class="muted small mono"> · {c.numero_codice}</span>{/if}
							</td>
							<td class="small muted">{c.ente_rilascio ?? '—'}</td>
							<td class="mono small">{c.data_scadenza ? fmtData(c.data_scadenza) : '—'}</td>
							<td><Badge label={st.label} colore={st.colore} /></td>
							<td class="azioni-cella">
								{#if c.documento_path}
									<form method="POST" action="?/scaricaAllegato" use:enhance class="inline">
										<input type="hidden" name="path" value={c.documento_path} />
										<button type="submit" class="link-btn" title="Scarica allegato">📎</button>
									</form>
								{/if}
								<button class="link-btn" onclick={() => apriModifica(c)}>Modifica</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<Modal titolo={certCorrente ? 'Modifica certificazione' : 'Nuova certificazione'} bind:aperto={modalCert}>
	<form
		method="POST"
		action={certCorrente ? '?/aggiornaCertificazione' : '?/creaCertificazione'}
		use:enhance
		id="form-cert"
		class="flex-col gap-2"
	>
		{#if certCorrente}<input type="hidden" name="id" value={certCorrente.id} />{/if}
		<div class="griglia g-2">
			<div class="field">
				<label for="c-tipo">Tipo</label>
				<input
					id="c-tipo"
					class="input"
					name="tipo"
					list="tipi-cert"
					value={certCorrente?.tipo ?? ''}
					placeholder="PES, PAV, patentino…"
				/>
				<datalist id="tipi-cert">
					{#each TIPI as t}<option value={t}>{TIPO_CERTIFICAZIONE[t].label}</option>{/each}
				</datalist>
			</div>
			<div class="field">
				<label for="c-nome">Nome *</label>
				<input id="c-nome" class="input" name="nome" required value={certCorrente?.nome ?? ''} />
			</div>
		</div>
		<div class="griglia g-2">
			<div class="field">
				<label for="c-num">Numero / codice</label>
				<input id="c-num" class="input mono" name="numero_codice" value={certCorrente?.numero_codice ?? ''} />
			</div>
			<div class="field">
				<label for="c-ente">Ente rilascio</label>
				<input id="c-ente" class="input" name="ente_rilascio" value={certCorrente?.ente_rilascio ?? ''} />
			</div>
		</div>
		<div class="griglia g-2">
			<div class="field">
				<label for="c-ril">Data rilascio</label>
				<input id="c-ril" class="input mono" type="date" name="data_rilascio" value={certCorrente?.data_rilascio ?? ''} />
			</div>
			<div class="field">
				<label for="c-sca">Scadenza <span class="muted small">(vuoto = senza scadenza)</span></label>
				<input id="c-sca" class="input mono" type="date" name="data_scadenza" value={certCorrente?.data_scadenza ?? ''} />
			</div>
		</div>
		{#if certCorrente}
			<div class="field">
				<label for="c-stato">Stato manuale <span class="muted small">(opzionale, forza lo stato)</span></label>
				<select id="c-stato" class="select" name="stato_manuale">
					<option value="">— automatico dalla scadenza —</option>
					<option value="valida" selected={certCorrente?.stato_manuale === 'valida'}>Valida</option>
					<option value="sospesa" selected={certCorrente?.stato_manuale === 'sospesa'}>Sospesa</option>
					<option value="revocata" selected={certCorrente?.stato_manuale === 'revocata'}>Revocata</option>
				</select>
			</div>
		{/if}
		<div class="field">
			<label for="c-note">Note</label>
			<textarea id="c-note" class="input" name="note" rows="2">{certCorrente?.note ?? ''}</textarea>
		</div>
	</form>

	{#if certCorrente}
		<div class="allegato-box mt-2">
			<div class="small muted mb-1">Allegato</div>
			{#if certCorrente.documento_path}
				<div class="flex items-center gap-2">
					<form method="POST" action="?/scaricaAllegato" use:enhance class="inline">
						<input type="hidden" name="path" value={certCorrente.documento_path} />
						<button type="submit" class="btn btn-sm">📎 Scarica documento</button>
					</form>
					<span class="muted small">Carica un nuovo file per sostituirlo.</span>
				</div>
			{/if}
			<form method="POST" action="?/caricaAllegato" use:enhance enctype="multipart/form-data" class="flex gap-1 mt-1">
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
			<form method="POST" action="?/eliminaCertificazione" use:enhance class="inline mr-auto">
				<input type="hidden" name="id" value={certCorrente.id} />
				<button class="btn btn-ghost btn-danger" type="submit">Elimina</button>
			</form>
		{/if}
		<button class="btn" onclick={() => (modalCert = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-cert">Salva</button>
	{/snippet}
</Modal>

<style>
	.briciole a {
		color: var(--blu);
	}
	.hidden-form {
		display: none;
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
</style>
