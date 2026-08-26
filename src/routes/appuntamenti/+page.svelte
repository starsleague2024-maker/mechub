<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_APPUNTAMENTO, voce, fmtDataOra } from '$lib/dominio';

	let { data, form } = $props();
	let modalAperto = $state($page.url.searchParams.get('nuovo') === '1');

	$effect(() => {
		if (form?.ok) modalAperto = false;
	});

	function nomeCli(c: any) {
		return c?.ragione_sociale || `${c?.nome ?? ''} ${c?.cognome ?? ''}`;
	}
	function nomeVei(v: any) {
		if (!v) return '—';
		return `${v.targa} · ${v.marca ?? ''} ${v.modello ?? ''}`;
	}

	// Raggruppa per giorno
	const perGiorno = $derived.by(() => {
		const gruppi: Record<string, any[]> = {};
		for (const a of data.appuntamenti) {
			const g = new Date(a.data_ora_promessa).toLocaleDateString('it-IT', {
				weekday: 'long',
				day: 'numeric',
				month: 'long'
			});
			(gruppi[g] ??= []).push(a);
		}
		return Object.entries(gruppi);
	});

	const statiApp = Object.keys(STATO_APPUNTAMENTO);
</script>

<svelte:head><title>Appuntamenti · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Operativo</div>
		<h1 class="pagina-titolo">Appuntamenti</h1>
	</div>
	<button class="btn btn-primary" onclick={() => (modalAperto = true)}>+ Nuovo appuntamento</button>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.appuntamenti.length === 0}
	<Vuoto titolo="Nessun appuntamento" testo="Programma l'arrivo di un veicolo per vederlo qui e nel cruscotto.">
		<button class="btn btn-accent" onclick={() => (modalAperto = true)}>+ Nuovo appuntamento</button>
	</Vuoto>
{:else}
	<div class="giorni">
		{#each perGiorno as [giorno, lista]}
			<section class="giorno">
				<h2 class="giorno-tit">{giorno}</h2>
				<div class="panel">
					{#each lista as a}
						{@const s = voce(STATO_APPUNTAMENTO, a.stato)}
						<div class="app-riga">
							<div class="app-ora mono">{new Date(a.data_ora_promessa).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
							<div class="app-corpo">
								<div class="flex items-center gap-2 wrap">
									{#if a.veicolo}<a href={`/veicoli/${a.veicolo.id}`} class="targa">{a.veicolo.targa}</a>{/if}
									<span class="app-cli">{nomeCli(a.cliente)}</span>
								</div>
								{#if a.note}<div class="muted small mt-1">{a.note}</div>{/if}
							</div>
							<form method="POST" action="?/cambiaStato" use:enhance class="flex gap-1 items-center">
								<input type="hidden" name="id" value={a.id} />
								<select name="stato" class="select select-sm" value={a.stato} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
									{#each statiApp as st}<option value={st}>{voce(STATO_APPUNTAMENTO, st).label}</option>{/each}
								</select>
							</form>
							<Badge label={s.label} colore={s.colore} />
							<form method="POST" action="?/elimina" use:enhance onsubmit={(e) => { if (!confirm('Eliminare l\'appuntamento?')) e.preventDefault(); }}>
								<input type="hidden" name="id" value={a.id} />
								<button class="btn btn-ghost btn-sm btn-danger" type="submit">✕</button>
							</form>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}

<Modal titolo="Nuovo appuntamento" bind:aperto={modalAperto}>
	<form method="POST" action="?/crea" use:enhance id="form-app" class="flex-col gap-2">
		<div class="field">
			<label for="ve">Veicolo *</label>
			<select id="ve" class="select" name="veicolo_id" required>
				<option value="">— seleziona veicolo —</option>
				{#each data.veicoli as v}<option value={v.id}>{nomeVei(v)} — {nomeCli(v.cliente)}</option>{/each}
			</select>
		</div>
		<div class="field">
			<label for="do">Data e ora *</label>
			<input id="do" class="input" type="datetime-local" name="data_ora_promessa" required />
		</div>
		<div class="field">
			<label for="no">Note</label>
			<textarea id="no" class="textarea" name="note" placeholder="Es. lascia l'auto alle 8, ritira in giornata"></textarea>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalAperto = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-app">Programma</button>
	{/snippet}
</Modal>

<style>
	.giorni {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	.giorno-tit {
		font-size: 15px;
		text-transform: capitalize;
		margin-bottom: 10px;
		color: var(--grafite-700);
	}
	.app-riga {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 13px 16px;
		border-bottom: 1px solid var(--bordo);
	}
	.app-riga:last-child {
		border-bottom: none;
	}
	.app-ora {
		font-weight: 700;
		font-size: 15px;
		min-width: 48px;
	}
	.app-corpo {
		flex: 1;
		min-width: 0;
	}
	.app-cli {
		font-weight: 500;
	}
	.select-sm {
		padding: 4px 8px;
		font-size: 12.5px;
		width: auto;
	}
	@media (max-width: 700px) {
		.app-riga {
			flex-wrap: wrap;
		}
	}
</style>
