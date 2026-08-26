<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import {
		STATO_INTERVENTO,
		STATO_LAVORAZIONE,
		STATO_PREVENTIVO,
		voce,
		fmtData,
		fmtDataOra
	} from '$lib/dominio';

	let { data, form } = $props();
	let modalLav = $state(false);
	let modalPrio = $state(false);

	$effect(() => {
		if (form?.ok) {
			modalLav = false;
			modalPrio = false;
		}
	});

	const i = $derived(data.intervento);
	const cli = $derived(i.cliente);
	const vei = $derived(i.veicolo);
	const nomeCli = $derived(cli?.ragione_sociale || `${cli?.nome} ${cli?.cognome ?? ''}`);
	const s = $derived(voce(STATO_INTERVENTO, i.stato_generale));

	// Transizioni di stato consentite per la lavorazione (semplice, coerente con lo schema)
	function prossimiStati(stato: string): { v: string; l: string; classe: string }[] {
		switch (stato) {
			case 'bloccata_da_prerequisiti':
				return [{ v: 'non_pianificata', l: 'Sblocca', classe: 'btn' }];
			case 'non_pianificata':
				return [{ v: 'in_corso', l: 'Avvia', classe: 'btn-accent' }];
			case 'pianificata':
				return [{ v: 'in_corso', l: 'Avvia', classe: 'btn-accent' }];
			case 'in_corso':
				return [
					{ v: 'completata', l: 'Completa', classe: 'btn-primary' },
					{ v: 'sospesa', l: 'Sospendi', classe: 'btn' }
				];
			case 'sospesa':
				return [{ v: 'in_corso', l: 'Riprendi', classe: 'btn-accent' }];
			default:
				return [];
		}
	}

	const statiIntervento = Object.keys(STATO_INTERVENTO);
</script>

<svelte:head><title>{i.motivo_iniziale || 'Intervento'} · Interventi</title></svelte:head>

<div class="briciole small muted mb-2">
	<a href="/interventi">Interventi</a> / {i.motivo_iniziale || 'Intervento'}
</div>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Intervento · aperto {fmtData(i.data_apertura)}</div>
		<h1 class="pagina-titolo">{i.motivo_iniziale || 'Intervento senza titolo'}</h1>
		<div class="flex items-center gap-2 mt-1 wrap">
			{#if vei}<a href={`/veicoli/${vei.id}`} class="targa">{vei.targa}</a>
				<span class="muted">{vei.marca ?? ''} {vei.modello ?? ''} {vei.anno ?? ''}</span>{/if}
			<span class="muted">·</span>
			<a href={`/clienti/${cli?.id}`} class="link">{nomeCli}</a>
			{#if cli?.telefono}<span class="muted mono small">{cli.telefono}</span>{/if}
		</div>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<div class="griglia layout">
	<!-- Colonna principale: lavorazioni -->
	<div class="flex-col gap-3">
		<section class="panel">
			<header class="sez-head">
				<h2>Lavorazioni</h2>
				<button class="btn btn-sm btn-accent" onclick={() => (modalLav = true)}>+ Aggiungi lavorazione</button>
			</header>

			{#if data.lavorazioni.length === 0}
				<Vuoto titolo="Nessuna lavorazione" testo="Scomponi l'intervento in lavorazioni: diagnosi, riparazione, sostituzioni…">
					<button class="btn btn-accent" onclick={() => (modalLav = true)}>+ Aggiungi lavorazione</button>
				</Vuoto>
			{:else}
				<div class="lav-lista">
					{#each data.lavorazioni as l}
						{@const ls = voce(STATO_LAVORAZIONE, l.stato_operativo)}
						{@const alloc = l.allocazione}
						{@const persone = alloc?.assegnazioni ?? []}
						<article class="lav">
							<div class="lav-top">
								<div>
									<div class="lav-nome">{l.nome}</div>
									<div class="lav-meta">
										{#if alloc?.postazione}<span class="mono small muted">▨ {alloc.postazione.nome}</span>{/if}
										{#each persone as p}<span class="chip-persona">{p.persona?.nome} {p.persona?.cognome?.[0] ?? ''}.</span>{/each}
										{#if alloc?.slot_pianificato_inizio}<span class="small muted">{fmtDataOra(alloc.slot_pianificato_inizio)}</span>{/if}
									</div>
								</div>
								<Badge label={ls.label} colore={ls.colore} />
							</div>

							{#if l.note}<p class="lav-note">{l.note}</p>{/if}

							<!-- Prerequisiti -->
							{#if l.richiede_preventivo || l.richiede_ricambi}
								<div class="prereq">
									{#if l.richiede_preventivo}
										<span class="prereq-item" class:ok={l.approvazione_cliente_ottenuta}>
											{l.approvazione_cliente_ottenuta ? '✓' : '○'} Preventivo {l.approvazione_cliente_ottenuta ? 'approvato' : 'da approvare'}
										</span>
									{/if}
									{#if l.richiede_ricambi}
										<span class="prereq-item" class:ok={l.fabbisogno_ricambi_soddisfatto}>
											{l.fabbisogno_ricambi_soddisfatto ? '✓' : '○'} Ricambi {l.fabbisogno_ricambi_soddisfatto ? 'disponibili' : 'da reperire'}
										</span>
									{/if}
								</div>
							{/if}

							<!-- Azioni di stato -->
							<div class="lav-azioni">
								{#each prossimiStati(l.stato_operativo) as ps}
									<form method="POST" action="?/cambiaStatoLavorazione" use:enhance>
										<input type="hidden" name="id" value={l.id} />
										<input type="hidden" name="stato" value={ps.v} />
										<button class="btn btn-sm {ps.classe}" type="submit">{ps.l}</button>
									</form>
								{/each}
								<a href="/planner" class="btn btn-sm btn-ghost">Pianifica →</a>
								<form method="POST" action="?/eliminaLavorazione" use:enhance onsubmit={(e) => { if (!confirm('Eliminare la lavorazione?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={l.id} />
									<button class="btn btn-sm btn-ghost btn-danger" type="submit">Elimina</button>
								</form>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<!-- Colonna laterale -->
	<div class="flex-col gap-3">
		<!-- Stato intervento -->
		<section class="panel panel-pad">
			<h3 class="mb-2">Stato intervento</h3>
			<div class="mb-2"><Badge label={s.label} colore={s.colore} /></div>
			<form method="POST" action="?/aggiornaStato" use:enhance class="flex gap-1">
				<select name="stato_generale" class="select" value={i.stato_generale}>
					{#each statiIntervento as st}<option value={st}>{voce(STATO_INTERVENTO, st).label}</option>{/each}
				</select>
				<button class="btn btn-primary" type="submit">OK</button>
			</form>
		</section>

		<!-- Priorità -->
		<section class="panel panel-pad">
			<div class="flex justify-between items-center mb-2">
				<h3>Priorità di business</h3>
				<button class="btn btn-sm btn-ghost" onclick={() => (modalPrio = true)}>Modifica</button>
			</div>
			<div class="prio-corrente mono">{i.priorita_livello}</div>
			{#if i.priorita_motivo}<p class="muted small mt-1">{i.priorita_motivo}</p>{/if}
			<p class="hint mt-1">La priorità operativa (ordine di esecuzione) è calcolata dal planner, non qui.</p>
		</section>

		<!-- Scadenze -->
		<section class="panel panel-pad">
			<h3 class="mb-2">Scadenze</h3>
			<dl class="mini">
				<div><dt>Apertura</dt><dd>{fmtData(i.data_apertura)}</dd></div>
				<div><dt>Promessa cliente</dt><dd>{i.data_promessa_cliente ? fmtDataOra(i.data_promessa_cliente) : '—'}</dd></div>
			</dl>
		</section>

		<!-- Preventivi -->
		<section class="panel panel-pad">
			<div class="flex justify-between items-center mb-2">
				<h3>Preventivi</h3>
				<a href={`/preventivi?intervento=${i.id}`} class="btn btn-sm">Gestisci</a>
			</div>
			{#if data.preventivi.length === 0}
				<p class="muted small">Nessun preventivo.</p>
			{:else}
				<ul class="mini-lista">
					{#each data.preventivi as p}
						{@const ps = voce(STATO_PREVENTIVO, p.stato)}
						<li><a href={`/preventivi/${p.id}`}>{fmtData(p.data_creazione)}</a> <Badge label={ps.label} colore={ps.colore} /></li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<!-- Modal nuova lavorazione -->
<Modal titolo="Nuova lavorazione" bind:aperto={modalLav}>
	<form method="POST" action="?/creaLavorazione" use:enhance id="form-lav" class="flex-col gap-2">
		<div class="field">
			<label for="tl">Tipo lavorazione <span class="muted">(dal catalogo, opzionale)</span></label>
			<select id="tl" class="select" name="tipo_lavorazione_id">
				<option value="">— libero —</option>
				{#each data.tipiLavorazione as t}<option value={t.id}>{t.nome}</option>{/each}
			</select>
		</div>
		<div class="field">
			<label for="nl">Nome *</label>
			<input id="nl" class="input" name="nome" required placeholder="Es. Sostituzione pastiglie anteriori" />
		</div>
		<div class="field">
			<label for="notel">Note</label>
			<textarea id="notel" class="textarea" name="note"></textarea>
		</div>
		<div class="flex-col gap-1">
			<label class="check"><input type="checkbox" name="richiede_preventivo" /> Richiede preventivo approvato dal cliente</label>
			<label class="check"><input type="checkbox" name="richiede_ricambi" /> Richiede ricambi</label>
			<span class="hint">Se spuntato, la lavorazione parte "bloccata da prerequisiti" finché non sono soddisfatti.</span>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalLav = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-lav">Aggiungi</button>
	{/snippet}
</Modal>

<!-- Modal priorità -->
<Modal titolo="Priorità di business" bind:aperto={modalPrio}>
	<form method="POST" action="?/aggiornaPriorita" use:enhance id="form-prio" class="flex-col gap-2">
		<div class="field">
			<label for="pl">Livello</label>
			<select id="pl" class="select" name="priorita_livello" value={i.priorita_livello}>
				<option value="bassa">Bassa</option>
				<option value="normale">Normale</option>
				<option value="alta">Alta</option>
				<option value="urgente">Urgente</option>
			</select>
		</div>
		<div class="field">
			<label for="pm">Motivo</label>
			<input id="pm" class="input" name="priorita_motivo" value={i.priorita_motivo ?? ''} placeholder="Es. cliente in attesa, auto unica famiglia" />
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalPrio = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-prio">Salva</button>
	{/snippet}
</Modal>

<style>
	.layout {
		grid-template-columns: 1.6fr 1fr;
		align-items: start;
	}
	@media (max-width: 920px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
	.briciole a,
	.link {
		color: var(--blu);
	}
	.sez-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 15px 18px;
		border-bottom: 1px solid var(--bordo);
	}
	.sez-head h2 {
		font-size: 17px;
	}
	.lav-lista {
		display: flex;
		flex-direction: column;
	}
	.lav {
		padding: 16px 18px;
		border-bottom: 1px solid var(--bordo);
	}
	.lav:last-child {
		border-bottom: none;
	}
	.lav-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	.lav-nome {
		font-weight: 600;
		font-size: 15px;
	}
	.lav-meta {
		display: flex;
		gap: 10px;
		align-items: center;
		margin-top: 4px;
		flex-wrap: wrap;
	}
	.chip-persona {
		background: var(--blu-tenue);
		color: #2c568a;
		font-size: 11.5px;
		font-weight: 600;
		padding: 1px 7px;
		border-radius: 999px;
	}
	.lav-note {
		margin: 10px 0 0;
		font-size: 13.5px;
		color: var(--grafite-600);
	}
	.prereq {
		display: flex;
		gap: 14px;
		margin-top: 10px;
		flex-wrap: wrap;
	}
	.prereq-item {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ambra);
	}
	.prereq-item.ok {
		color: var(--verde);
	}
	.lav-azioni {
		display: flex;
		gap: 8px;
		margin-top: 14px;
		flex-wrap: wrap;
	}
	.lav-azioni form {
		display: inline;
	}
	.prio-corrente {
		font-size: 20px;
		font-weight: 700;
		text-transform: capitalize;
	}
	.mini,
	.mini-lista {
		margin: 0;
		padding: 0;
	}
	.mini div {
		display: flex;
		justify-content: space-between;
		padding: 6px 0;
		border-bottom: 1px solid var(--bordo);
	}
	.mini div:last-child {
		border-bottom: none;
	}
	.mini dt {
		color: var(--testo-tenue);
		font-size: 13px;
	}
	.mini dd {
		margin: 0;
		font-weight: 500;
		font-size: 13px;
	}
	.mini-lista {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.mini-lista li {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.mini-lista a {
		color: var(--blu);
		font-size: 13.5px;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13.5px;
		font-weight: 500;
	}
</style>
