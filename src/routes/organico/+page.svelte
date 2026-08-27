<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';

	let { data, form } = $props();
	let modalAperto = $state(false);

	$effect(() => {
		if (form?.ok) modalAperto = false;
	});

	const statoColore: Record<string, string> = { attivo: 'verde', in_prova: 'ambra', cessato: 'neutro' };
	const statoLabel: Record<string, string> = { attivo: 'Attivo', in_prova: 'In prova', cessato: 'Cessato' };
</script>

<svelte:head><title>Organico · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Anagrafiche</div>
		<h1 class="pagina-titolo">Organico</h1>
	</div>
	<button class="btn btn-primary" onclick={() => (modalAperto = true)}>+ Nuova persona</button>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.persone.length === 0}
	<Vuoto titolo="Nessuna persona" testo="Aggiungi meccanici e personale per poterli assegnare alle lavorazioni nel planner.">
		<button class="btn btn-accent" onclick={() => (modalAperto = true)}>+ Nuova persona</button>
	</Vuoto>
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead><tr><th>Nome</th><th>Ruolo</th><th>Contatti</th><th>Stato</th><th></th></tr></thead>
			<tbody>
				{#each data.persone as p}
					<tr>
						<td><a class="riga-link" href={`/organico/${p.id}`}>{p.cognome} {p.nome}</a></td>
						<td class="small muted">{p.ruolo?.nome ?? '—'}</td>
						<td class="small">
							{#if p.email}<div>{p.email}</div>{/if}
							{#if p.telefono}<div class="mono muted">{p.telefono}</div>{/if}
						</td>
						<td><Badge label={statoLabel[p.stato] ?? p.stato} colore={statoColore[p.stato] ?? 'neutro'} /></td>
						<td class="text-right">
							<form method="POST" action="?/cambiaStato" use:enhance>
								<input type="hidden" name="id" value={p.id} />
								<select name="stato" class="select select-sm" value={p.stato} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
									<option value="attivo">Attivo</option>
									<option value="in_prova">In prova</option>
									<option value="cessato">Cessato</option>
								</select>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<Modal titolo="Nuova persona" bind:aperto={modalAperto}>
	<form method="POST" action="?/crea" use:enhance id="form-pers" class="flex-col gap-2">
		<input type="hidden" name="officina_id" value={data.officinaId ?? ''} />
		<div class="griglia g-2">
			<div class="field"><label for="n">Nome *</label><input id="n" class="input" name="nome" required /></div>
			<div class="field"><label for="c">Cognome *</label><input id="c" class="input" name="cognome" required /></div>
		</div>
		<div class="griglia g-2">
			<div class="field"><label for="e">Email</label><input id="e" class="input" type="email" name="email" /></div>
			<div class="field"><label for="t">Telefono</label><input id="t" class="input" name="telefono" /></div>
		</div>
		<div class="griglia g-2">
			<div class="field">
				<label for="r">Ruolo</label>
				<select id="r" class="select" name="ruolo_id">
					<option value="">— nessuno —</option>
					{#each data.ruoli as r}<option value={r.id}>{r.nome}</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="s">Stato</label>
				<select id="s" class="select" name="stato">
					<option value="attivo">Attivo</option>
					<option value="in_prova">In prova</option>
					<option value="cessato">Cessato</option>
				</select>
			</div>
		</div>
		{#if data.ruoli.length === 0}
			<div class="avviso info small">Nessun ruolo definito. Puoi crearli in <a href="/impostazioni">Impostazioni</a>.</div>
		{/if}
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalAperto = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-pers">Salva</button>
	{/snippet}
</Modal>

<style>
	.select-sm {
		padding: 4px 8px;
		font-size: 12.5px;
		width: auto;
	}
</style>
