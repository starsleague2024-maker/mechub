<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { fmtEuro } from '$lib/dominio';

	let { data, form } = $props();
	let modalRic = $state(false);
	let modalForn = $state(false);
	let ricerca = $state(data.q);

	$effect(() => {
		if (form?.ok) {
			modalRic = false;
			modalForn = false;
		}
	});

	function cerca(e: Event) {
		e.preventDefault();
		goto(`/ricambi?q=${encodeURIComponent(ricerca)}`, { keepFocus: true });
	}

	function sottoScorta(r: any): boolean {
		const g = r.giacenza?.[0];
		if (!g) return false;
		return g.quantita_disponibile <= g.scorta_minima && g.scorta_minima > 0;
	}
</script>

<svelte:head><title>Catalogo ricambi · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Preventivi e ricambi</div>
		<h1 class="pagina-titolo">Catalogo ricambi</h1>
	</div>
	<div class="flex gap-1">
		<button class="btn" onclick={() => (modalForn = true)}>+ Fornitore</button>
		<button class="btn btn-primary" onclick={() => (modalRic = true)}>+ Nuovo ricambio</button>
	</div>
</div>

<form class="toolbar" onsubmit={cerca}>
	<input class="input" placeholder="Cerca per codice o descrizione…" bind:value={ricerca} />
	<button class="btn" type="submit">Cerca</button>
	{#if data.q}<a href="/ricambi" class="btn btn-ghost">Azzera</a>{/if}
</form>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.ricambi.length === 0}
	<Vuoto titolo={data.q ? 'Nessun risultato' : 'Catalogo vuoto'} testo={data.q ? 'Prova con un altro termine.' : 'Aggiungi i ricambi che usi più spesso, con prezzo e scorta minima.'}>
		{#if !data.q}<button class="btn btn-accent" onclick={() => (modalRic = true)}>+ Nuovo ricambio</button>{/if}
	</Vuoto>
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead><tr><th>Codice</th><th>Descrizione</th><th>Categoria</th><th>Fornitore</th><th>Prezzo</th><th>Giacenza</th><th></th></tr></thead>
			<tbody>
				{#each data.ricambi as r}
					{@const g = r.giacenza?.[0]}
					<tr>
						<td class="mono riga-link">{r.codice}</td>
						<td class="small">{r.descrizione ?? '—'}</td>
						<td class="small muted">{r.categoria?.nome ?? '—'}</td>
						<td class="small muted">{r.fornitore?.nome ?? '—'}</td>
						<td class="mono">{fmtEuro(r.prezzo)}</td>
						<td class="mono">
							{g?.quantita_disponibile ?? 0}
							{#if sottoScorta(r)}<span class="badge ambra" style="margin-left:6px">sotto scorta</span>{/if}
						</td>
						<td class="text-right">
							<form method="POST" action="?/elimina" use:enhance onsubmit={(e) => { if (!confirm('Eliminare il ricambio?')) e.preventDefault(); }}>
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

<Modal titolo="Nuovo ricambio" bind:aperto={modalRic}>
	<form method="POST" action="?/crea" use:enhance id="form-ric" class="flex-col gap-2">
		<input type="hidden" name="officina_id" value={data.officinaId ?? ''} />
		<div class="griglia g-2">
			<div class="field"><label for="co">Codice *</label><input id="co" class="input mono" name="codice" required /></div>
			<div class="field"><label for="pr">Prezzo (€)</label><input id="pr" class="input mono" type="number" name="prezzo" min="0" step="0.01" /></div>
		</div>
		<div class="field"><label for="de">Descrizione</label><input id="de" class="input" name="descrizione" /></div>
		<div class="griglia g-2">
			<div class="field">
				<label for="fo">Fornitore preferito</label>
				<select id="fo" class="select" name="fornitore_preferito_id">
					<option value="">— nessuno —</option>
					{#each data.fornitori as f}<option value={f.id}>{f.nome}</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="ca">Categoria veicolo</label>
				<select id="ca" class="select" name="categoria_veicolo_id">
					<option value="">— nessuna —</option>
					{#each data.categorie as c}<option value={c.id}>{c.nome}</option>{/each}
				</select>
			</div>
		</div>
		<div class="griglia g-2">
			<div class="field"><label for="gi">Giacenza iniziale</label><input id="gi" class="input mono" type="number" name="giacenza_iniziale" value="0" min="0" /></div>
			<div class="field"><label for="sc">Scorta minima</label><input id="sc" class="input mono" type="number" name="scorta_minima" value="0" min="0" /></div>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalRic = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-ric">Salva</button>
	{/snippet}
</Modal>

<Modal titolo="Nuovo fornitore" bind:aperto={modalForn}>
	<form method="POST" action="?/creaFornitore" use:enhance id="form-forn" class="flex-col gap-2">
		<input type="hidden" name="officina_id" value={data.officinaId ?? ''} />
		<div class="field"><label for="fn">Nome fornitore *</label><input id="fn" class="input" name="nome" required /></div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalForn = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-forn">Salva</button>
	{/snippet}
</Modal>

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
</style>
