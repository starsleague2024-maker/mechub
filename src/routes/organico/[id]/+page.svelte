<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AlberoCompetenze from '$lib/components/AlberoCompetenze.svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.ok) invalidateAll();
	});

	const p = $derived(data.persona);
	const possedute = $derived(new Set(data.possedute.map((pc: any) => pc.competenza_id)));

	let formToggle = $state<HTMLFormElement | null>(null);
	let toggleId = $state('');
	let togglePossiede = $state('true');

	function onToggle(id: string, nuovoStato: boolean) {
		toggleId = id;
		togglePossiede = String(nuovoStato);
		queueMicrotask(() => formToggle?.requestSubmit());
	}
</script>

<svelte:head><title>{p.cognome} {p.nome} · Organico</title></svelte:head>

<div class="briciole small muted mb-2">
	<a href="/organico">Organico</a> / {p.cognome} {p.nome}
</div>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Scheda staff</div>
		<h1 class="pagina-titolo">{p.cognome} {p.nome}</h1>
		<div class="muted small mt-1">{p.ruolo?.nome ?? 'Nessun ruolo'} · {p.stato}</div>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<!-- form nascosto per toggle competenza -->
<form method="POST" action="?/toggleCompetenza" use:enhance bind:this={formToggle} class="hidden-form">
	<input type="hidden" name="competenza_id" value={toggleId} />
	<input type="hidden" name="possiede" value={togglePossiede} />
</form>

<div class="panel panel-pad" style="max-width:720px">
	<h2 class="mb-2">Competenze</h2>
	<p class="muted small mb-2">
		Cosa sa fare questa persona. Le competenze provengono dallo stesso catalogo dell'officina.
		Il futuro Planner userà queste informazioni per capire chi può eseguire una lavorazione.
	</p>
	{#if data.competenze.length === 0}
		<div class="avviso info small">
			L'albero competenze non è ancora stato generato. Vai in <a href="/impostazioni">Impostazioni</a>
			e genera l'albero competenze dell'officina.
		</div>
	{:else}
		<AlberoCompetenze competenze={data.competenze} attive={possedute} ontoggle={onToggle} />
	{/if}
</div>

<style>
	.briciole a {
		color: var(--blu);
	}
	.hidden-form {
		display: none;
	}
</style>
