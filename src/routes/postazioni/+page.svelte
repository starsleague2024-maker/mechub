<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';

	let { data, form } = $props();
	let modalPost = $state(false);
	let modalTipo = $state(false);

	$effect(() => {
		if (form?.ok) {
			modalPost = false;
			modalTipo = false;
		}
	});

	const statoColore: Record<string, string> = { disponibile: 'verde', in_manutenzione: 'ambra', fuori_servizio: 'rosso' };
	const statoLabel: Record<string, string> = { disponibile: 'Disponibile', in_manutenzione: 'In manutenzione', fuori_servizio: 'Fuori servizio' };
</script>

<svelte:head><title>Postazioni · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Anagrafiche</div>
		<h1 class="pagina-titolo">Postazioni</h1>
	</div>
	<div class="flex gap-1">
		<button class="btn" onclick={() => (modalTipo = true)}>+ Tipo risorsa</button>
		<button class="btn btn-primary" onclick={() => (modalPost = true)}>+ Nuova postazione</button>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.postazioni.length === 0}
	<Vuoto titolo="Nessuna postazione" testo="Definisci ponti, banchi e aree di lavoro per poterli assegnare nel planner.">
		<button class="btn btn-accent" onclick={() => (modalPost = true)}>+ Nuova postazione</button>
	</Vuoto>
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead><tr><th>Postazione</th><th>Tipo</th><th>Zona</th><th>Capacità</th><th>Stato</th></tr></thead>
			<tbody>
				{#each data.postazioni as p}
					<tr>
						<td class="riga-link">{p.nome}</td>
						<td class="small muted">{p.tipo?.nome ?? '—'}</td>
						<td class="small muted">{p.zona ?? '—'}</td>
						<td class="mono">{p.capacita_simultanea ?? 1}</td>
						<td>
							<form method="POST" action="?/cambiaStato" use:enhance class="flex items-center gap-1">
								<input type="hidden" name="id" value={p.id} />
								<Badge label={statoLabel[p.stato] ?? p.stato} colore={statoColore[p.stato] ?? 'neutro'} />
								<select name="stato" class="select select-sm" value={p.stato} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
									<option value="disponibile">Disponibile</option>
									<option value="in_manutenzione">In manutenzione</option>
									<option value="fuori_servizio">Fuori servizio</option>
								</select>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<Modal titolo="Nuova postazione" bind:aperto={modalPost}>
	<form method="POST" action="?/crea" use:enhance id="form-post" class="flex-col gap-2">
		<input type="hidden" name="officina_id" value={data.officinaId ?? ''} />
		<div class="field"><label for="n">Nome *</label><input id="n" class="input" name="nome" required placeholder="Es. Ponte 1" /></div>
		<div class="griglia g-2">
			<div class="field">
				<label for="tr">Tipo risorsa *</label>
				<select id="tr" class="select" name="tipo_risorsa_id" required>
					<option value="">— seleziona —</option>
					{#each data.tipi as t}<option value={t.id}>{t.nome}</option>{/each}
				</select>
			</div>
			<div class="field"><label for="z">Zona</label><input id="z" class="input" name="zona" placeholder="Es. Reparto A" /></div>
		</div>
		<div class="griglia g-2">
			<div class="field"><label for="cap">Capacità simultanea</label><input id="cap" class="input mono" type="number" name="capacita_simultanea" value="1" min="1" /></div>
			<div class="field">
				<label for="st">Stato</label>
				<select id="st" class="select" name="stato">
					<option value="disponibile">Disponibile</option>
					<option value="in_manutenzione">In manutenzione</option>
					<option value="fuori_servizio">Fuori servizio</option>
				</select>
			</div>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalPost = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-post">Salva</button>
	{/snippet}
</Modal>

<Modal titolo="Nuovo tipo risorsa" bind:aperto={modalTipo}>
	<form method="POST" action="?/creaTipo" use:enhance id="form-tipo" class="flex-col gap-2">
		<input type="hidden" name="officina_id" value={data.officinaId ?? ''} />
		<div class="field"><label for="tn">Nome tipo *</label><input id="tn" class="input" name="nome" required placeholder="Es. Ponte sollevatore, Banco elettrauto" /></div>
		<span class="hint">I tipi raggruppano postazioni con caratteristiche simili (ponti, banchi, aree diagnosi).</span>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalTipo = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-tipo">Salva</button>
	{/snippet}
</Modal>

<style>
	.select-sm {
		padding: 4px 8px;
		font-size: 12.5px;
		width: auto;
	}
</style>
