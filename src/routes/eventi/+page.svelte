<script lang="ts">
	import { goto } from '$app/navigation';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { fmtDataOra } from '$lib/dominio';

	let { data } = $props();

	function filtra(tipo: string) {
		goto(tipo ? `/eventi?tipo=${encodeURIComponent(tipo)}` : '/eventi');
	}

	// Colore per famiglia di eventi
	function coloreTipo(t: string): string {
		if (t.includes('Creato') || t.includes('Aperto')) return 'blu';
		if (t.includes('Completata') || t.includes('approvato') || t.includes('Approvato')) return 'verde';
		if (t.includes('Annull') || t.includes('rifiut')) return 'rosso';
		if (t.includes('Pianificata') || t.includes('Avviata')) return 'cantiere';
		return 'neutro';
	}
</script>

<svelte:head><title>Registro eventi · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Sistema</div>
		<h1 class="pagina-titolo">Registro eventi</h1>
	</div>
</div>

<p class="intro muted mb-2">
	Ogni fatto operativo rilevante viene registrato qui in modo immutabile: è la
	fonte di verità del gestionale. Ultimi 200 eventi.
</p>

<div class="filtri mb-2">
	<button class="chip" class:attivo={!data.tipoAttivo} onclick={() => filtra('')}>Tutti</button>
	{#each data.tipi as t}
		<button class="chip" class:attivo={data.tipoAttivo === t} onclick={() => filtra(t)}>{t}</button>
	{/each}
</div>

{#if data.eventi.length === 0}
	<Vuoto titolo="Nessun evento" testo="Le azioni operative (interventi, lavorazioni, preventivi, ordini) compariranno qui." />
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead><tr><th>Quando</th><th>Evento</th><th>Aggregato</th><th>Dettaglio</th></tr></thead>
			<tbody>
				{#each data.eventi as e}
					<tr>
						<td class="mono small muted">{fmtDataOra(e.created_at)}</td>
						<td><span class="badge {coloreTipo(e.tipo_evento)}">{e.tipo_evento}</span></td>
						<td class="small"><span class="muted">{e.aggregate_type}</span> <span class="mono id">{e.aggregate_id?.slice(0, 8)}</span></td>
						<td class="mono small payload">{e.payload ? JSON.stringify(e.payload) : '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.intro {
		max-width: 72ch;
		font-size: 13.5px;
	}
	.filtri {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.chip {
		padding: 5px 12px;
		border-radius: 999px;
		border: 1px solid var(--bordo-forte);
		font-size: 12.5px;
		font-weight: 500;
		background: var(--carta);
		cursor: pointer;
		font-family: var(--mono);
	}
	.chip:hover {
		border-color: var(--acciaio-300);
	}
	.chip.attivo {
		background: var(--grafite-800);
		border-color: var(--grafite-800);
		color: #fff;
	}
	.id {
		color: var(--acciaio-400);
	}
	.payload {
		max-width: 340px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--acciaio-400);
	}
</style>
