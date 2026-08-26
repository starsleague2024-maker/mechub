<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';

	let { data, form } = $props();

	let modalAperto = $state($page.url.searchParams.get('nuovo') === '1');
	let ricerca = $state(data.q);

	function cerca(e: Event) {
		e.preventDefault();
		goto(`/clienti?q=${encodeURIComponent(ricerca)}`, { keepFocus: true });
	}

	$effect(() => {
		if (form?.ok) modalAperto = false;
	});
</script>

<svelte:head><title>Clienti · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Anagrafiche</div>
		<h1 class="pagina-titolo">Clienti</h1>
	</div>
	<button class="btn btn-primary" onclick={() => (modalAperto = true)}>+ Nuovo cliente</button>
</div>

<form class="toolbar" onsubmit={cerca}>
	<input
		class="input"
		placeholder="Cerca per nome, azienda o email…"
		bind:value={ricerca}
	/>
	<button class="btn" type="submit">Cerca</button>
	{#if data.q}<a href="/clienti" class="btn btn-ghost">Azzera</a>{/if}
</form>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.clienti.length === 0}
	<Vuoto titolo={data.q ? 'Nessun risultato' : 'Ancora nessun cliente'} testo={data.q ? 'Prova con un altro termine di ricerca.' : 'Aggiungi il primo cliente per iniziare a registrare veicoli e interventi.'}>
		{#if !data.q}
			<button class="btn btn-accent" onclick={() => (modalAperto = true)}>+ Nuovo cliente</button>
		{/if}
	</Vuoto>
{:else}
	<div class="tabella-wrap">
		<table class="dati">
			<thead>
				<tr>
					<th>Nome / Azienda</th>
					<th>Contatti</th>
					<th>Veicoli</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.clienti as c}
					<tr>
						<td>
							<a class="riga-link" href={`/clienti/${c.id}`}>
								{c.ragione_sociale || `${c.nome} ${c.cognome ?? ''}`}
							</a>
							{#if c.ragione_sociale && c.nome}
								<div class="muted small">{c.nome} {c.cognome ?? ''}</div>
							{/if}
						</td>
						<td class="small">
							{#if c.email}<div>{c.email}</div>{/if}
							{#if c.telefono}<div class="mono muted">{c.telefono}</div>{/if}
							{#if !c.email && !c.telefono}<span class="muted">—</span>{/if}
						</td>
						<td class="mono">{c.veicoli?.[0]?.count ?? 0}</td>
						<td class="text-right">
							<form
								method="POST"
								action="?/elimina"
								use:enhance
								onsubmit={(e) => {
									if (!confirm('Eliminare questo cliente e i suoi veicoli?')) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={c.id} />
								<button class="btn btn-ghost btn-sm btn-danger" type="submit">Elimina</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<Modal titolo="Nuovo cliente" bind:aperto={modalAperto}>
	<form method="POST" action="?/crea" use:enhance id="form-cliente" class="flex-col gap-2">
		<input type="hidden" name="officina_id" value={data.officina?.id ?? ''} />
		<div class="griglia g-2">
			<div class="field">
				<label for="nome">Nome *</label>
				<input id="nome" class="input" name="nome" required />
			</div>
			<div class="field">
				<label for="cognome">Cognome</label>
				<input id="cognome" class="input" name="cognome" />
			</div>
		</div>
		<div class="field">
			<label for="rs">Ragione sociale <span class="muted">(per aziende)</span></label>
			<input id="rs" class="input" name="ragione_sociale" />
		</div>
		<div class="griglia g-2">
			<div class="field">
				<label for="email">Email</label>
				<input id="email" class="input" type="email" name="email" />
			</div>
			<div class="field">
				<label for="tel">Telefono</label>
				<input id="tel" class="input" name="telefono" />
			</div>
		</div>
		<div class="field">
			<label for="wa">Canale WhatsApp</label>
			<input id="wa" class="input" name="canale_whatsapp" placeholder="+39…" />
			<span class="hint">Usato in Fase 4 per reminder e conferme arrivo.</span>
		</div>
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalAperto = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-cliente">Salva cliente</button>
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
