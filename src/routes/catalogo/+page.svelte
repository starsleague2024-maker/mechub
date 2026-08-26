<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { MODALITA_OPERATIVA, fmtMinuti } from '$lib/dominio';

	let { data, form } = $props();
	let modalAperto = $state(false);

	$effect(() => {
		if (form?.ok) modalAperto = false;
	});
</script>

<svelte:head><title>Catalogo lavorazioni · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Anagrafiche</div>
		<h1 class="pagina-titolo">Catalogo lavorazioni</h1>
	</div>
	<button class="btn btn-primary" onclick={() => (modalAperto = true)}>+ Nuovo tipo</button>
</div>

<p class="intro muted mb-2">
	I tipi di lavorazione sono modelli riutilizzabili con tempi standard e modalità
	operativa. Quando apri una lavorazione in un intervento puoi partire da uno di questi.
</p>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.tipi.length === 0}
	<Vuoto titolo="Catalogo vuoto" testo="Aggiungi i tipi di lavorazione ricorrenti: tagliando, freni, distribuzione…">
		<button class="btn btn-accent" onclick={() => (modalAperto = true)}>+ Nuovo tipo</button>
	</Vuoto>
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead><tr><th>Lavorazione</th><th>Tempo standard</th><th>Persone</th><th>Modalità</th><th></th></tr></thead>
			<tbody>
				{#each data.tipi as t}
					<tr>
						<td class="riga-link">{t.nome}</td>
						<td class="mono">{fmtMinuti(t.tempo_standard_default_min)}</td>
						<td class="mono">{t.numero_persone_richieste ?? 1}</td>
						<td class="small muted">{MODALITA_OPERATIVA[t.modalita_operativa] ?? t.modalita_operativa ?? '—'}</td>
						<td class="text-right">
							<form method="POST" action="?/elimina" use:enhance onsubmit={(e) => { if (!confirm('Eliminare il tipo?')) e.preventDefault(); }}>
								<input type="hidden" name="id" value={t.id} />
								<button class="btn btn-ghost btn-sm btn-danger" type="submit">Elimina</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<Modal titolo="Nuovo tipo di lavorazione" bind:aperto={modalAperto}>
	<form method="POST" action="?/crea" use:enhance id="form-tl" class="flex-col gap-2">
		<input type="hidden" name="officina_id" value={data.officinaId ?? ''} />
		<div class="field"><label for="n">Nome *</label><input id="n" class="input" name="nome" required placeholder="Es. Tagliando completo" /></div>
		<div class="griglia g-2">
			<div class="field"><label for="te">Tempo standard (min)</label><input id="te" class="input mono" type="number" name="tempo" min="0" step="15" placeholder="90" /></div>
			<div class="field"><label for="pe">Persone richieste</label><input id="pe" class="input mono" type="number" name="persone" value="1" min="1" /></div>
		</div>
		<div class="field">
			<label for="mo">Modalità operativa</label>
			<select id="mo" class="select" name="modalita">
				<option value="lasciabile">Può essere lasciato e ripreso</option>
				<option value="da_finire_senza_fermarsi">Da finire senza fermarsi</option>
			</select>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalAperto = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-tl">Salva</button>
	{/snippet}
</Modal>

<style>
	.intro {
		max-width: 72ch;
		font-size: 13.5px;
	}
</style>
