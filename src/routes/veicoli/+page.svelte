<script lang="ts">
	import { goto } from '$app/navigation';
	import Vuoto from '$lib/components/Vuoto.svelte';

	let { data } = $props();
	let ricerca = $state(data.q);

	function cerca(e: Event) {
		e.preventDefault();
		goto(`/veicoli?q=${encodeURIComponent(ricerca)}`, { keepFocus: true });
	}

	function nomeCliente(c: any) {
		if (!c) return '—';
		return c.ragione_sociale || `${c.nome} ${c.cognome ?? ''}`;
	}
</script>

<svelte:head><title>Veicoli · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Anagrafiche</div>
		<h1 class="pagina-titolo">Veicoli</h1>
	</div>
	<a href="/clienti" class="btn">I veicoli si aggiungono da un cliente →</a>
</div>

<form class="toolbar" onsubmit={cerca}>
	<input class="input" placeholder="Cerca per targa, marca o modello…" bind:value={ricerca} />
	<button class="btn" type="submit">Cerca</button>
	{#if data.q}<a href="/veicoli" class="btn btn-ghost">Azzera</a>{/if}
</form>

{#if data.veicoli.length === 0}
	<Vuoto titolo={data.q ? 'Nessun risultato' : 'Ancora nessun veicolo'} testo={data.q ? 'Prova con un altro termine.' : 'Apri un cliente e aggiungi il suo primo veicolo.'} />
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead>
				<tr><th>Targa</th><th>Veicolo</th><th>Categoria</th><th>Cliente</th><th>Anno</th><th>Km</th></tr>
			</thead>
			<tbody>
				{#each data.veicoli as v}
					<tr>
						<td><a class="riga-link" href={`/veicoli/${v.id}`}><span class="targa">{v.targa}</span></a></td>
						<td>{v.marca ?? ''} {v.modello ?? ''}</td>
						<td class="small muted">{v.categoria?.nome ?? '—'}</td>
						<td><a class="link-cli" href={`/clienti/${v.cliente?.id}`}>{nomeCliente(v.cliente)}</a></td>
						<td class="mono">{v.anno ?? '—'}</td>
						<td class="mono">{v.km ? v.km.toLocaleString('it-IT') : '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.toolbar {
		display: flex;
		gap: 10px;
		margin-bottom: 18px;
		max-width: 520px;
	}
	.toolbar .input {
		flex: 1;
	}
	.link-cli {
		color: var(--blu);
	}
</style>
