<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_PREVENTIVO, voce, fmtData, fmtEuro } from '$lib/dominio';

	let { data, form } = $props();
	let modalVoce = $state(false);

	$effect(() => {
		if (form?.ok) modalVoce = false;
	});

	const p = $derived(data.preventivo);
	const int = $derived(p.intervento);
	const cli = $derived(int?.cliente);
	const nomeCli = $derived(cli?.ragione_sociale || `${cli?.nome ?? ''} ${cli?.cognome ?? ''}`);
	const s = $derived(voce(STATO_PREVENTIVO, p.stato));

	const totale = $derived(
		data.voci.reduce(
			(acc, v) => acc + (Number(v.costo_manodopera) || 0) + (Number(v.costo_ricambi_stimato) || 0),
			0
		)
	);
	const totManodopera = $derived(
		data.voci.reduce((acc, v) => acc + (Number(v.costo_manodopera) || 0), 0)
	);
	const totRicambi = $derived(
		data.voci.reduce((acc, v) => acc + (Number(v.costo_ricambi_stimato) || 0), 0)
	);

	const voceColore: Record<string, string> = { proposta: 'neutro', approvata: 'verde', rifiutata: 'rosso', in_attesa: 'ambra' };
	const voceLabel: Record<string, string> = { proposta: 'Proposta', approvata: 'Approvata', rifiutata: 'Rifiutata', in_attesa: 'In attesa' };

	// Transizioni di stato del preventivo
	const azioniStato: Record<string, { v: string; l: string; classe: string }[]> = {
		bozza: [{ v: 'inviato', l: 'Segna come inviato', classe: 'btn-primary' }],
		inviato: [
			{ v: 'approvato', l: 'Approvato dal cliente', classe: 'btn-accent' },
			{ v: 'parzialmente_approvato', l: 'Parzialmente approvato', classe: 'btn' },
			{ v: 'rifiutato', l: 'Rifiutato', classe: 'btn-danger' }
		],
		parzialmente_approvato: [
			{ v: 'approvato', l: 'Approvato', classe: 'btn-accent' },
			{ v: 'rifiutato', l: 'Rifiutato', classe: 'btn-danger' }
		]
	};
</script>

<svelte:head><title>Preventivo · {fmtData(p.data_creazione)}</title></svelte:head>

<div class="briciole small muted mb-2">
	<a href="/preventivi">Preventivi</a> / {fmtData(p.data_creazione)}
</div>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Preventivo · {fmtData(p.data_creazione)}</div>
		<h1 class="pagina-titolo flex items-center gap-2">
			Preventivo <Badge label={s.label} colore={s.colore} />
		</h1>
		<div class="flex items-center gap-2 mt-1 wrap">
			{#if int?.veicolo}<span class="targa">{int.veicolo.targa}</span>{/if}
			<a href={`/interventi/${int?.id}`} class="link">{int?.motivo_iniziale ?? 'Intervento'}</a>
			<span class="muted">· {nomeCli}</span>
		</div>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<div class="griglia layout">
	<section class="panel">
		<header class="sez-head">
			<h2>Voci</h2>
			<button class="btn btn-sm btn-accent" onclick={() => (modalVoce = true)}>+ Aggiungi voce</button>
		</header>
		{#if data.voci.length === 0}
			<Vuoto titolo="Nessuna voce" testo="Aggiungi una voce per ogni lavorazione da preventivare." />
		{:else}
			<div class="tabella-wrap piatta">
				<table class="dati">
					<thead><tr><th>Lavorazione</th><th>Manodopera</th><th>Ricambi</th><th>Totale</th><th>Stato</th><th></th></tr></thead>
					<tbody>
						{#each data.voci as v}
							{@const tot = (Number(v.costo_manodopera) || 0) + (Number(v.costo_ricambi_stimato) || 0)}
							<tr>
								<td>
									<div class="riga-link">{v.lavorazione?.nome ?? '—'}</div>
									{#if v.descrizione}<div class="muted small">{v.descrizione}</div>{/if}
								</td>
								<td class="mono">{fmtEuro(v.costo_manodopera)}</td>
								<td class="mono">{fmtEuro(v.costo_ricambi_stimato)}</td>
								<td class="mono">{fmtEuro(tot)}</td>
								<td>
									<form method="POST" action="?/statoVoce" use:enhance>
										<input type="hidden" name="id" value={v.id} />
										<select name="stato_voce" class="select select-sm" value={v.stato_voce} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
											<option value="proposta">Proposta</option>
											<option value="in_attesa">In attesa</option>
											<option value="approvata">Approvata</option>
											<option value="rifiutata">Rifiutata</option>
										</select>
									</form>
								</td>
								<td class="text-right">
									<form method="POST" action="?/eliminaVoce" use:enhance>
										<input type="hidden" name="id" value={v.id} />
										<button class="btn btn-ghost btn-sm btn-danger" type="submit">✕</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="tot-riga">
							<td class="text-right"><strong>Totale</strong></td>
							<td class="mono">{fmtEuro(totManodopera)}</td>
							<td class="mono">{fmtEuro(totRicambi)}</td>
							<td class="mono"><strong>{fmtEuro(totale)}</strong></td>
							<td colspan="2"></td>
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	</section>

	<div class="flex-col gap-3">
		<section class="panel panel-pad">
			<h3 class="mb-2">Riepilogo</h3>
			<div class="riepilogo">
				<div><span>Manodopera</span><span class="mono">{fmtEuro(totManodopera)}</span></div>
				<div><span>Ricambi stimati</span><span class="mono">{fmtEuro(totRicambi)}</span></div>
				<div class="tot"><span>Totale</span><span class="mono">{fmtEuro(totale)}</span></div>
			</div>
		</section>

		<section class="panel panel-pad">
			<h3 class="mb-2">Stato e azioni</h3>
			<div class="mb-2"><Badge label={s.label} colore={s.colore} /></div>
			{#if azioniStato[p.stato]}
				<div class="flex-col gap-1">
					{#each azioniStato[p.stato] as a}
						<form method="POST" action="?/cambiaStato" use:enhance>
							<input type="hidden" name="stato" value={a.v} />
							<button class="btn {a.classe} full" type="submit">{a.l}</button>
						</form>
					{/each}
				</div>
			{:else}
				<p class="muted small">Nessuna transizione disponibile da questo stato.</p>
			{/if}
			{#if p.stato === 'approvato'}
				<p class="hint mt-1">All'approvazione, le lavorazioni che richiedevano il preventivo vengono sbloccate.</p>
			{/if}
		</section>

		<section class="panel panel-pad">
			<h3 class="mb-2">Date</h3>
			<dl class="mini">
				<div><dt>Creazione</dt><dd>{fmtData(p.data_creazione)}</dd></div>
				<div><dt>Invio</dt><dd>{p.data_invio ? fmtData(p.data_invio) : '—'}</dd></div>
				<div><dt>Risposta</dt><dd>{p.data_risposta ? fmtData(p.data_risposta) : '—'}</dd></div>
			</dl>
		</section>
	</div>
</div>

<Modal titolo="Aggiungi voce" bind:aperto={modalVoce}>
	<form method="POST" action="?/aggiungiVoce" use:enhance id="form-voce" class="flex-col gap-2">
		<div class="field">
			<label for="lav">Lavorazione *</label>
			<select id="lav" class="select" name="lavorazione_id" required>
				<option value="">— seleziona —</option>
				{#each data.lavorazioni as l}<option value={l.id}>{l.nome}</option>{/each}
			</select>
			{#if data.lavorazioni.length === 0}
				<span class="hint">L'intervento non ha lavorazioni. Aggiungile prima nell'intervento.</span>
			{/if}
		</div>
		<div class="field"><label for="de">Descrizione</label><input id="de" class="input" name="descrizione" /></div>
		<div class="griglia g-2">
			<div class="field"><label for="cm">Costo manodopera (€)</label><input id="cm" class="input mono" type="number" name="costo_manodopera" min="0" step="0.01" /></div>
			<div class="field"><label for="cr">Costo ricambi (€)</label><input id="cr" class="input mono" type="number" name="costo_ricambi_stimato" min="0" step="0.01" /></div>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalVoce = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-voce">Aggiungi</button>
	{/snippet}
</Modal>

<style>
	.layout {
		grid-template-columns: 1.7fr 1fr;
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
	.tabella-wrap.piatta {
		border: none;
	}
	table.dati tfoot .tot-riga td {
		border-top: 2px solid var(--bordo-forte);
		background: var(--nebbia-50);
	}
	.select-sm {
		padding: 4px 8px;
		font-size: 12.5px;
		width: auto;
	}
	.full {
		width: 100%;
		justify-content: center;
	}
	.riepilogo {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.riepilogo div {
		display: flex;
		justify-content: space-between;
		font-size: 13.5px;
	}
	.riepilogo .tot {
		border-top: 1px solid var(--bordo);
		padding-top: 8px;
		font-weight: 700;
		font-size: 15px;
	}
	.mini {
		margin: 0;
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
</style>
