<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_FABBISOGNO, voce } from '$lib/dominio';

	let { data, form } = $props();
	let modalRett = $state(false);
	let rigaCorrente = $state<any>(null);

	$effect(() => {
		if (form?.ok) modalRett = false;
	});

	function apriRettifica(g: any) {
		rigaCorrente = g;
		modalRett = true;
	}

	function sottoScorta(g: any): boolean {
		return g.scorta_minima > 0 && g.quantita_disponibile <= g.scorta_minima;
	}
</script>

<svelte:head><title>Magazzino · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Preventivi e ricambi</div>
		<h1 class="pagina-titolo">Magazzino</h1>
	</div>
	<a href="/ricambi" class="btn">Gestisci catalogo →</a>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<div class="griglia layout">
	<!-- Giacenze -->
	<section class="panel">
		<header class="sez-head"><h2>Giacenze</h2></header>
		{#if data.giacenze.length === 0}
			<Vuoto titolo="Magazzino vuoto" testo="Aggiungi ricambi al catalogo: le loro giacenze compariranno qui." />
		{:else}
			<div class="tabella-wrap piatta">
				<table class="dati">
					<thead><tr><th>Codice</th><th>Descrizione</th><th>Disp.</th><th>Risv.</th><th>Scorta min</th><th>Ubicazione</th><th></th></tr></thead>
					<tbody>
						{#each data.giacenze as g}
							<tr>
								<td class="mono riga-link">{g.ricambio?.codice ?? '—'}</td>
								<td class="small">{g.ricambio?.descrizione ?? '—'}</td>
								<td class="mono">
									{g.quantita_disponibile}
									{#if sottoScorta(g)}<span class="badge ambra" style="margin-left:6px">basso</span>{/if}
								</td>
								<td class="mono muted">{g.quantita_riservata}</td>
								<td class="mono muted">{g.scorta_minima}</td>
								<td class="small muted">{g.ubicazione ?? '—'}</td>
								<td class="text-right">
									<button class="btn btn-ghost btn-sm" onclick={() => apriRettifica(g)}>Rettifica</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Fabbisogni da gestire -->
	<section class="panel">
		<header class="sez-head"><h2>Fabbisogni da gestire</h2></header>
		{#if data.fabbisogni.length === 0}
			<Vuoto titolo="Nessun fabbisogno aperto" testo="I ricambi richiesti dalle lavorazioni compaiono qui finché non sono ordinati." />
		{:else}
			<ul class="fab-lista">
				{#each data.fabbisogni as fb}
					{@const s = voce(STATO_FABBISOGNO, fb.stato_fabbisogno)}
					<li>
						<div>
							<div class="fab-codice mono">{fb.ricambio?.codice ?? '—'} <span class="muted small">×{fb.quantita_richiesta}</span></div>
							<div class="muted small">{fb.ricambio?.descrizione ?? ''} {#if fb.veicolo}· <span class="targa">{fb.veicolo.targa}</span>{/if}</div>
						</div>
						<div class="flex items-center gap-1">
							<Badge label={s.label} colore={s.colore} />
							{#if fb.stato_fabbisogno === 'da_verificare'}
								<form method="POST" action="?/segnaDaOrdinare" use:enhance>
									<input type="hidden" name="id" value={fb.id} />
									<button class="btn btn-sm" type="submit">Da ordinare</button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
			<div class="panel-pad" style="padding-top:0">
				<a href="/ordini?nuovo=1" class="btn btn-accent full">Crea ordine fornitore →</a>
			</div>
		{/if}
	</section>
</div>

<Modal titolo="Rettifica giacenza" bind:aperto={modalRett}>
	{#if rigaCorrente}
		<form method="POST" action="?/rettifica" use:enhance id="form-rett" class="flex-col gap-2">
			<input type="hidden" name="ricambio_catalogo_id" value={rigaCorrente.ricambio_catalogo_id} />
			<div class="assegna-testa">
				<span class="mono riga-link">{rigaCorrente.ricambio?.codice}</span>
				<span class="muted small">{rigaCorrente.ricambio?.descrizione ?? ''}</span>
			</div>
			<div class="griglia g-2">
				<div class="field"><label for="qd">Quantità disponibile</label><input id="qd" class="input mono" type="number" name="quantita_disponibile" value={rigaCorrente.quantita_disponibile} min="0" /></div>
				<div class="field"><label for="sm">Scorta minima</label><input id="sm" class="input mono" type="number" name="scorta_minima" value={rigaCorrente.scorta_minima} min="0" /></div>
			</div>
			<div class="field"><label for="ub">Ubicazione</label><input id="ub" class="input" name="ubicazione" value={rigaCorrente.ubicazione ?? ''} placeholder="Es. Scaffale B3" /></div>
		</form>
	{/if}
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalRett = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-rett">Salva</button>
	{/snippet}
</Modal>

<style>
	.layout {
		grid-template-columns: 1.5fr 1fr;
		align-items: start;
	}
	@media (max-width: 940px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
	.sez-head {
		padding: 15px 18px;
		border-bottom: 1px solid var(--bordo);
	}
	.sez-head h2 {
		font-size: 17px;
	}
	.tabella-wrap.piatta {
		border: none;
	}
	.fab-lista {
		list-style: none;
		margin: 0;
		padding: 8px;
	}
	.fab-lista li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 11px 12px;
		border-bottom: 1px solid var(--bordo);
	}
	.fab-lista li:last-child {
		border-bottom: none;
	}
	.fab-codice {
		font-weight: 600;
	}
	.full {
		width: 100%;
		justify-content: center;
		margin-top: 12px;
	}
	.assegna-testa {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-bottom: 4px;
	}
</style>
