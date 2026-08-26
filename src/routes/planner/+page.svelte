<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_LAVORAZIONE, voce, fmtDataOra, fmtMinuti } from '$lib/dominio';

	let { data, form } = $props();

	let modalAssegna = $state(false);
	let allocCorrente = $state<any>(null);

	$effect(() => {
		if (form?.ok) modalAssegna = false;
	});

	function apriAssegna(a: any) {
		allocCorrente = a;
		modalAssegna = true;
	}

	// Raggruppa per stato di pianificazione
	const daPianificare = $derived(
		data.allocazioni.filter((a) => a.stato_pianificazione === 'non_pianificata')
	);
	const pianificate = $derived(
		data.allocazioni.filter((a) => a.stato_pianificazione === 'pianificata')
	);
	const inConflitto = $derived(
		data.allocazioni.filter((a) => a.stato_pianificazione === 'in_conflitto')
	);

	function veicoloDi(a: any) {
		return a.lavorazione?.intervento?.veicolo;
	}
	function prereqBloccante(a: any): string | null {
		const l = a.lavorazione;
		if (l.richiede_preventivo && !l.approvazione_cliente_ottenuta) return 'Preventivo non approvato';
		if (l.richiede_ricambi && !l.fabbisogno_ricambi_soddisfatto) return 'Ricambi non disponibili';
		return null;
	}
	const prioColore: Record<string, string> = { urgente: 'rosso', alta: 'ambra' };
</script>

<svelte:head><title>Planner · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Operativo · Fase 2 · Assegnazione manuale</div>
		<h1 class="pagina-titolo">Planner</h1>
	</div>
</div>

<p class="intro muted mb-2">
	Assegnazione manuale delle lavorazioni a postazioni e persone. Nessun motore
	automatico: la priorità operativa e i suggerimenti arriveranno in Fase 9. Qui
	decidi tu chi fa cosa e dove.
</p>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.allocazioni.length === 0}
	<Vuoto titolo="Niente da pianificare" testo="Crea lavorazioni negli interventi: compariranno qui pronte per l'assegnazione.">
		<a href="/interventi" class="btn btn-accent">Vai agli interventi</a>
	</Vuoto>
{:else}
	<div class="colonne">
		<!-- Da pianificare -->
		<div class="colonna">
			<div class="colonna-head">
				<span class="colonna-tit">Da pianificare</span>
				<span class="conta mono">{daPianificare.length}</span>
			</div>
			{#if daPianificare.length === 0}
				<div class="colonna-vuota">Tutto pianificato 👌</div>
			{:else}
				{#each daPianificare as a}
					{@const v = veicoloDi(a)}
					{@const blocco = prereqBloccante(a)}
					{@const prio = a.lavorazione?.intervento?.priorita_livello}
					<article class="carta">
						<div class="carta-head">
							<a class="carta-nome" href={`/interventi/${a.lavorazione?.intervento?.id}`}>{a.lavorazione?.nome}</a>
							{#if prio && prioColore[prio]}<Badge label={prio} colore={prioColore[prio]} />{/if}
						</div>
						{#if v}<div class="carta-vei"><span class="targa">{v.targa}</span> <span class="muted small">{v.marca ?? ''} {v.modello ?? ''}</span></div>{/if}
						{#if blocco}<div class="blocco">⚠ {blocco}</div>{/if}
						<button class="btn btn-sm btn-accent full mt-1" onclick={() => apriAssegna(a)}>Assegna</button>
					</article>
				{/each}
			{/if}
		</div>

		<!-- Pianificate -->
		<div class="colonna">
			<div class="colonna-head">
				<span class="colonna-tit">Pianificate</span>
				<span class="conta mono">{pianificate.length}</span>
			</div>
			{#if pianificate.length === 0}
				<div class="colonna-vuota">Nessuna lavorazione pianificata</div>
			{:else}
				{#each pianificate as a}
					{@const v = veicoloDi(a)}
					{@const persone = a.assegnazioni ?? []}
					<article class="carta pian">
						<div class="carta-head">
							<a class="carta-nome" href={`/interventi/${a.lavorazione?.intervento?.id}`}>{a.lavorazione?.nome}</a>
						</div>
						{#if v}<div class="carta-vei"><span class="targa">{v.targa}</span></div>{/if}
						<div class="carta-info">
							{#if a.postazione}<span class="info-riga mono small">▨ {a.postazione.nome}</span>{/if}
							{#if a.slot_pianificato_inizio}<span class="info-riga small muted">◷ {fmtDataOra(a.slot_pianificato_inizio)}{#if a.durata_stimata_min_minuti} · {fmtMinuti(a.durata_stimata_min_minuti)}{/if}</span>{/if}
						</div>
						<div class="persone-riga">
							{#each persone as p}
								<span class="chip-persona">
									{p.persona?.nome} {p.persona?.cognome?.[0] ?? ''}.
									<form method="POST" action="?/rimuoviPersona" use:enhance class="inline-x">
										<input type="hidden" name="assegnazione_id" value={p.id} />
										<button type="submit" aria-label="Rimuovi">×</button>
									</form>
								</span>
							{/each}
							{#if persone.length === 0}<span class="muted small">Nessuna persona</span>{/if}
						</div>
						<button class="btn btn-sm full mt-1" onclick={() => apriAssegna(a)}>Modifica</button>
					</article>
				{/each}
			{/if}
		</div>

		<!-- In conflitto -->
		<div class="colonna">
			<div class="colonna-head">
				<span class="colonna-tit rosso">In conflitto</span>
				<span class="conta mono">{inConflitto.length}</span>
			</div>
			{#if inConflitto.length === 0}
				<div class="colonna-vuota">Nessun conflitto 🎉</div>
			{:else}
				{#each inConflitto as a}
					{@const v = veicoloDi(a)}
					<article class="carta conflitto">
						<a class="carta-nome" href={`/interventi/${a.lavorazione?.intervento?.id}`}>{a.lavorazione?.nome}</a>
						{#if v}<div class="carta-vei"><span class="targa">{v.targa}</span></div>{/if}
						<button class="btn btn-sm full mt-1" onclick={() => apriAssegna(a)}>Risolvi</button>
					</article>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<!-- Modal assegnazione -->
<Modal titolo="Assegna lavorazione" bind:aperto={modalAssegna}>
	{#if allocCorrente}
		<div class="assegna-testa">
			<div class="carta-nome">{allocCorrente.lavorazione?.nome}</div>
			{#if veicoloDi(allocCorrente)}<span class="targa">{veicoloDi(allocCorrente).targa}</span>{/if}
		</div>

		<!-- Postazione + slot -->
		<form method="POST" action="?/assegna" use:enhance class="flex-col gap-2 blocco-form">
			<input type="hidden" name="allocazione_id" value={allocCorrente.id} />
			<input type="hidden" name="lavorazione_id" value={allocCorrente.lavorazione?.id} />
			<div class="field">
				<label for="post">Postazione</label>
				<select id="post" class="select" name="postazione_assegnata_id" value={allocCorrente.postazione_assegnata_id ?? ''}>
					<option value="">— nessuna —</option>
					{#each data.postazioni as p}<option value={p.id}>{p.nome} {p.tipo ? `(${p.tipo.nome})` : ''}</option>{/each}
				</select>
			</div>
			<div class="griglia g-2">
				<div class="field">
					<label for="ini">Inizio previsto</label>
					<input id="ini" class="input" type="datetime-local" name="slot_inizio" />
				</div>
				<div class="field">
					<label for="dur">Durata (min)</label>
					<input id="dur" class="input mono" type="number" name="durata_minuti" min="0" step="15" placeholder="90" />
				</div>
			</div>
			<button class="btn btn-primary" type="submit">Salva pianificazione</button>
		</form>

		<hr class="sep" />

		<!-- Persone assegnate -->
		<div class="field">
			<span class="etichetta-gruppo">Persone assegnate</span>
			<div class="persone-attuali">
				{#each allocCorrente.assegnazioni ?? [] as p}
					<span class="chip-persona grande">
						{p.persona?.nome} {p.persona?.cognome ?? ''} · {p.ruolo_in_lavorazione}
						<form method="POST" action="?/rimuoviPersona" use:enhance class="inline-x">
							<input type="hidden" name="assegnazione_id" value={p.id} />
							<button type="submit" aria-label="Rimuovi">×</button>
						</form>
					</span>
				{:else}
					<span class="muted small">Nessuna persona ancora assegnata.</span>
				{/each}
			</div>
		</div>

		<form method="POST" action="?/assegnaPersona" use:enhance class="flex gap-1 items-end">
			<input type="hidden" name="allocazione_id" value={allocCorrente.id} />
			<div class="field grow">
				<label for="pers">Aggiungi persona</label>
				<select id="pers" class="select" name="persona_id">
					<option value="">— seleziona —</option>
					{#each data.persone as p}<option value={p.id}>{p.cognome} {p.nome}</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="ruolo">Ruolo</label>
				<select id="ruolo" class="select" name="ruolo">
					<option value="principale">Principale</option>
					<option value="supporto">Supporto</option>
				</select>
			</div>
			<button class="btn btn-accent" type="submit">+</button>
		</form>

		{#if data.persone.length === 0}
			<div class="avviso info small">Nessuna persona attiva. Aggiungine in <a href="/organico">Organico</a>.</div>
		{/if}
	{/if}

	{#snippet azioni()}
		<button class="btn" onclick={() => (modalAssegna = false)}>Chiudi</button>
	{/snippet}
</Modal>

<style>
	.intro {
		max-width: 72ch;
		font-size: 13.5px;
	}
	.colonne {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		align-items: start;
	}
	@media (max-width: 900px) {
		.colonne {
			grid-template-columns: 1fr;
		}
	}
	.colonna {
		background: var(--nebbia-50);
		border: 1px solid var(--bordo);
		border-radius: var(--r-lg);
		padding: 12px;
		min-height: 120px;
	}
	.colonna-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 6px 12px;
	}
	.colonna-tit {
		font-family: var(--display);
		font-weight: 600;
		font-size: 15px;
	}
	.colonna-tit.rosso {
		color: var(--rosso);
	}
	.conta {
		background: var(--acciaio-200);
		color: var(--grafite-700);
		border-radius: 999px;
		padding: 1px 9px;
		font-size: 12px;
		font-weight: 600;
	}
	.colonna-vuota {
		text-align: center;
		color: var(--testo-tenue);
		font-size: 13px;
		padding: 20px 8px;
	}
	.carta {
		background: var(--carta);
		border: 1px solid var(--bordo-forte);
		border-radius: var(--r);
		padding: 12px;
		margin-bottom: 10px;
		box-shadow: var(--ombra-sm);
	}
	.carta.pian {
		border-left: 3px solid var(--blu);
	}
	.carta.conflitto {
		border-left: 3px solid var(--rosso);
		background: var(--rosso-tenue);
	}
	.carta-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
	}
	.carta-nome {
		font-weight: 600;
		font-size: 14px;
		color: var(--grafite-900);
	}
	a.carta-nome:hover {
		color: var(--blu);
	}
	.carta-vei {
		margin-top: 6px;
	}
	.carta-info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-top: 8px;
	}
	.blocco {
		margin-top: 8px;
		font-size: 12px;
		color: var(--ambra);
		font-weight: 600;
	}
	.persone-riga {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-top: 8px;
	}
	.chip-persona {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: var(--blu-tenue);
		color: #2c568a;
		font-size: 11.5px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
	}
	.chip-persona.grande {
		font-size: 13px;
		padding: 4px 10px;
	}
	.inline-x {
		display: inline;
	}
	.inline-x button {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 14px;
		line-height: 1;
		padding: 0 0 0 2px;
		opacity: 0.6;
	}
	.inline-x button:hover {
		opacity: 1;
	}
	.full {
		width: 100%;
		justify-content: center;
	}
	.assegna-testa {
		display: flex;
		align-items: center;
		gap: 10px;
		padding-bottom: 6px;
	}
	.blocco-form {
		background: var(--nebbia-50);
		padding: 14px;
		border-radius: var(--r);
	}
	.sep {
		border: none;
		border-top: 1px solid var(--bordo);
		margin: 4px 0;
	}
	.etichetta-gruppo {
		display: block;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--grafite-600);
		margin-bottom: 5px;
	}
	.persone-attuali {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
</style>
