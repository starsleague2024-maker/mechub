<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_ORDINE, voce, fmtData } from '$lib/dominio';

	let { data, form } = $props();
	let modalOrdine = $state($page.url.searchParams.get('nuovo') === '1');
	let modalRiga = $state(false);
	let ordineCorrente = $state<string | null>(null);
	let espansi = $state<Record<string, boolean>>({});

	$effect(() => {
		if (form?.ok) {
			modalOrdine = false;
			modalRiga = false;
			if (form?.id) espansi[form.id] = true;
		}
	});

	function apriRiga(ordineId: string) {
		ordineCorrente = ordineId;
		modalRiga = true;
	}
	function toggle(id: string) {
		espansi[id] = !espansi[id];
	}

	const statiOrdine = Object.keys(STATO_ORDINE);
</script>

<svelte:head><title>Ordini fornitori · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Preventivi e ricambi</div>
		<h1 class="pagina-titolo">Ordini fornitori</h1>
	</div>
	<button class="btn btn-primary" onclick={() => (modalOrdine = true)}>+ Nuovo ordine</button>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.ordini.length === 0}
	<Vuoto titolo="Nessun ordine" testo="Crea un ordine a un fornitore e aggiungi le righe dei ricambi da acquistare.">
		<button class="btn btn-accent" onclick={() => (modalOrdine = true)}>+ Nuovo ordine</button>
	</Vuoto>
{:else}
	<div class="ordini">
		{#each data.ordini as o}
			{@const s = voce(STATO_ORDINE, o.stato_ordine)}
			{@const righe = o.righe ?? []}
			<div class="panel ordine">
				<button class="ordine-head" onclick={() => toggle(o.id)}>
					<div class="flex items-center gap-2">
						<span class="freccia" class:giu={espansi[o.id]}>▸</span>
						<div>
							<div class="ordine-forn">{o.fornitore?.nome ?? 'Fornitore'}</div>
							<div class="muted small">{fmtData(o.data_ordine)} · {righe.length} righe</div>
						</div>
					</div>
					<Badge label={s.label} colore={s.colore} />
				</button>

				{#if espansi[o.id]}
					<div class="ordine-corpo">
						{#if righe.length === 0}
							<p class="muted small">Nessuna riga. Aggiungi i ricambi da ordinare.</p>
						{:else}
							<div class="tabella-wrap piatta">
								<table class="dati">
									<thead><tr><th>Ricambio</th><th>Ordinata</th><th>Evasa</th><th>Stato riga</th><th></th></tr></thead>
									<tbody>
										{#each righe as r}
											<tr>
												<td><span class="mono">{r.ricambio?.codice ?? '—'}</span> <span class="muted small">{r.ricambio?.descrizione ?? ''}</span></td>
												<td class="mono">{r.quantita_ordinata}</td>
												<td class="mono">{r.quantita_evasa}</td>
												<td class="small muted">{r.stato_riga}</td>
												<td class="text-right">
													<form method="POST" action="?/eliminaRiga" use:enhance>
														<input type="hidden" name="id" value={r.id} />
														<button class="btn btn-ghost btn-sm btn-danger" type="submit">✕</button>
													</form>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
						<div class="ordine-azioni">
							<button class="btn btn-sm" onclick={() => apriRiga(o.id)}>+ Aggiungi riga</button>
							<form method="POST" action="?/cambiaStato" use:enhance class="flex gap-1 items-center">
								<input type="hidden" name="id" value={o.id} />
								<select name="stato" class="select select-sm" value={o.stato_ordine} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
									{#each statiOrdine as st}<option value={st}>{voce(STATO_ORDINE, st).label}</option>{/each}
								</select>
							</form>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<Modal titolo="Nuovo ordine fornitore" bind:aperto={modalOrdine}>
	<form method="POST" action="?/crea" use:enhance id="form-ord" class="flex-col gap-2">
		<div class="field">
			<label for="fo">Fornitore *</label>
			<select id="fo" class="select" name="fornitore_id" required>
				<option value="">— seleziona —</option>
				{#each data.fornitori as f}<option value={f.id}>{f.nome}</option>{/each}
			</select>
			{#if data.fornitori.length === 0}
				<span class="hint">Nessun fornitore. Aggiungine in <a href="/ricambi">Catalogo ricambi</a>.</span>
			{/if}
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalOrdine = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-ord">Crea ordine</button>
	{/snippet}
</Modal>

<Modal titolo="Aggiungi riga" bind:aperto={modalRiga}>
	<form method="POST" action="?/aggiungiRiga" use:enhance id="form-riga" class="flex-col gap-2">
		<input type="hidden" name="ordine_id" value={ordineCorrente ?? ''} />
		<div class="field">
			<label for="ri">Ricambio *</label>
			<select id="ri" class="select" name="ricambio_catalogo_id" required>
				<option value="">— seleziona —</option>
				{#each data.ricambi as r}<option value={r.id}>{r.codice} — {r.descrizione ?? ''}</option>{/each}
			</select>
		</div>
		<div class="griglia g-2">
			<div class="field"><label for="qo">Quantità *</label><input id="qo" class="input mono" type="number" name="quantita_ordinata" min="1" value="1" required /></div>
			<div class="field"><label for="dc">Consegna prevista</label><input id="dc" class="input" type="date" name="data_consegna_prevista" /></div>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalRiga = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-riga">Aggiungi</button>
	{/snippet}
</Modal>

<style>
	.ordini {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.ordine-head {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 15px 18px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}
	.freccia {
		display: inline-block;
		transition: transform 0.15s;
		color: var(--acciaio-400);
	}
	.freccia.giu {
		transform: rotate(90deg);
	}
	.ordine-forn {
		font-family: var(--display);
		font-weight: 600;
		font-size: 15px;
	}
	.ordine-corpo {
		padding: 0 18px 16px;
		border-top: 1px solid var(--bordo);
	}
	.tabella-wrap.piatta {
		border: none;
		margin-top: 8px;
	}
	.ordine-azioni {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 12px;
		flex-wrap: wrap;
	}
	.select-sm {
		padding: 4px 8px;
		font-size: 12.5px;
		width: auto;
	}
</style>
