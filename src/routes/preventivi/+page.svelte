<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_PREVENTIVO, voce, fmtData } from '$lib/dominio';

	let { data, form } = $props();
	let modalAperto = $state(!!data.preselInt);

	$effect(() => {
		if (form?.ok && form?.id) goto(`/preventivi/${form.id}`);
	});

	function nomeCli(c: any) {
		return c?.ragione_sociale || `${c?.nome ?? ''} ${c?.cognome ?? ''}`;
	}
</script>

<svelte:head><title>Preventivi · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Preventivi e ricambi</div>
		<h1 class="pagina-titolo">Preventivi</h1>
	</div>
	<button class="btn btn-primary" onclick={() => (modalAperto = true)}>+ Nuovo preventivo</button>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.preventivi.length === 0}
	<Vuoto titolo="Nessun preventivo" testo="Crea un preventivo a partire da un intervento aperto.">
		<button class="btn btn-accent" onclick={() => (modalAperto = true)}>+ Nuovo preventivo</button>
	</Vuoto>
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead><tr><th>Data</th><th>Intervento</th><th>Veicolo</th><th>Cliente</th><th>Stato</th></tr></thead>
			<tbody>
				{#each data.preventivi as p}
					{@const s = voce(STATO_PREVENTIVO, p.stato)}
					<tr>
						<td><a class="riga-link" href={`/preventivi/${p.id}`}>{fmtData(p.data_creazione)}</a></td>
						<td class="small">{p.intervento?.motivo_iniziale ?? '—'}</td>
						<td>{#if p.intervento?.veicolo}<span class="targa">{p.intervento.veicolo.targa}</span>{:else}—{/if}</td>
						<td class="small">{nomeCli(p.intervento?.cliente)}</td>
						<td><Badge label={s.label} colore={s.colore} /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<Modal titolo="Nuovo preventivo" bind:aperto={modalAperto}>
	<form method="POST" action="?/crea" use:enhance id="form-prev" class="flex-col gap-2">
		<div class="field">
			<label for="int">Intervento *</label>
			<select id="int" class="select" name="intervento_id" required value={data.preselInt ?? ''}>
				<option value="">— seleziona intervento —</option>
				{#each data.interventiAperti as i}
					<option value={i.id}>{i.veicolo?.targa ?? ''} — {i.motivo_iniziale ?? 'Intervento'}</option>
				{/each}
			</select>
			{#if data.interventiAperti.length === 0}
				<span class="hint">Nessun intervento aperto. <a href="/interventi">Aprine uno</a>.</span>
			{/if}
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalAperto = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-prev">Crea bozza</button>
	{/snippet}
</Modal>
