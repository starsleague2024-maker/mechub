<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_INTERVENTO, voce, fmtData } from '$lib/dominio';

	let { data, form } = $props();
	let modalAperto = $state($page.url.searchParams.get('nuovo') === '1');
	let veicoloPreselezionato = $state($page.url.searchParams.get('veicolo') ?? '');

	$effect(() => {
		if (form?.ok && form?.id) goto(`/interventi/${form.id}`);
	});

	const filtri = [
		{ v: 'aperti', l: 'Aperti' },
		{ v: 'in_lavorazione', l: 'In lavorazione' },
		{ v: 'pronto_per_consegna', l: 'Pronti' },
		{ v: 'consegnato', l: 'Consegnati' },
		{ v: 'tutti', l: 'Tutti' }
	];

	function nomeCli(c: any) {
		return c?.ragione_sociale || `${c?.nome ?? ''} ${c?.cognome ?? ''}`;
	}
	function nomeVei(v: any) {
		if (!v) return '—';
		return `${v.targa} · ${v.marca ?? ''} ${v.modello ?? ''}`;
	}
	const prioColore: Record<string, string> = { urgente: 'rosso', alta: 'ambra', normale: 'neutro', bassa: 'neutro' };
</script>

<svelte:head><title>Interventi · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Operativo</div>
		<h1 class="pagina-titolo">Interventi</h1>
	</div>
	<button class="btn btn-primary" onclick={() => (modalAperto = true)}>+ Nuovo intervento</button>
</div>

<div class="filtri mb-2">
	{#each filtri as f}
		<a href={`/interventi?stato=${f.v}`} class="chip" class:attivo={data.filtro === f.v}>{f.l}</a>
	{/each}
</div>

{#if data.interventi.length === 0}
	<Vuoto titolo="Nessun intervento" testo="Apri il primo intervento selezionando un veicolo.">
		<button class="btn btn-accent" onclick={() => (modalAperto = true)}>+ Nuovo intervento</button>
	</Vuoto>
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead>
				<tr><th>Motivo</th><th>Veicolo</th><th>Cliente</th><th>Stato</th><th>Priorità</th><th>Lavorazioni</th><th>Apertura</th><th>Promessa</th></tr>
			</thead>
			<tbody>
				{#each data.interventi as i}
					{@const s = voce(STATO_INTERVENTO, i.stato_generale)}
					<tr>
						<td><a class="riga-link" href={`/interventi/${i.id}`}>{i.motivo_iniziale || 'Intervento'}</a></td>
						<td>{#if i.veicolo}<span class="targa">{i.veicolo.targa}</span> <span class="muted small">{i.veicolo.marca ?? ''} {i.veicolo.modello ?? ''}</span>{:else}—{/if}</td>
						<td class="small">{nomeCli(i.cliente)}</td>
						<td><Badge label={s.label} colore={s.colore} /></td>
						<td>
							{#if i.priorita_livello && i.priorita_livello !== 'normale'}
								<Badge label={i.priorita_livello} colore={prioColore[i.priorita_livello] ?? 'neutro'} />
							{:else}<span class="muted small">—</span>{/if}
						</td>
						<td class="mono">{i.lavorazioni?.[0]?.count ?? 0}</td>
						<td class="small muted">{fmtData(i.data_apertura)}</td>
						<td class="small muted">{fmtData(i.data_promessa_cliente)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if form?.errore}<div class="avviso errore mt-2">{form.errore}</div>{/if}

<Modal titolo="Nuovo intervento" bind:aperto={modalAperto}>
	<form method="POST" action="?/crea" use:enhance id="form-int" class="flex-col gap-2">
		<div class="field">
			<label for="ve">Veicolo *</label>
			<select id="ve" class="select" name="veicolo_id" required bind:value={veicoloPreselezionato}>
				<option value="">— seleziona veicolo —</option>
				{#each data.veicoli as v}
					<option value={v.id}>{nomeVei(v)} — {nomeCli(v.cliente)}</option>
				{/each}
			</select>
			{#if data.veicoli.length === 0}
				<span class="hint">Nessun veicolo registrato. <a href="/clienti">Aggiungine uno da un cliente</a>.</span>
			{/if}
		</div>
		<div class="field">
			<label for="mo">Motivo iniziale</label>
			<textarea id="mo" class="textarea" name="motivo_iniziale" placeholder="Es. Tagliando + rumore anteriore sx"></textarea>
		</div>
		<div class="griglia g-2">
			<div class="field">
				<label for="pr">Priorità</label>
				<select id="pr" class="select" name="priorita_livello">
					<option value="bassa">Bassa</option>
					<option value="normale" selected>Normale</option>
					<option value="alta">Alta</option>
					<option value="urgente">Urgente</option>
				</select>
			</div>
			<div class="field">
				<label for="dp">Data promessa cliente</label>
				<input id="dp" class="input" type="datetime-local" name="data_promessa_cliente" />
			</div>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalAperto = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-int">Apri intervento</button>
	{/snippet}
</Modal>

<style>
	.filtri {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.chip {
		padding: 6px 13px;
		border-radius: 999px;
		border: 1px solid var(--bordo-forte);
		font-size: 13px;
		font-weight: 500;
		background: var(--carta);
		transition: all 0.12s;
	}
	.chip:hover {
		border-color: var(--acciaio-300);
	}
	.chip.attivo {
		background: var(--grafite-800);
		border-color: var(--grafite-800);
		color: #fff;
	}
</style>
