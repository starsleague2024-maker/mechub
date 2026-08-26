<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Vuoto from '$lib/components/Vuoto.svelte';

	let { data, form } = $props();

	// dopo la creazione officina, ricarica tutto (sidebar, dashboard…)
	$effect(() => {
		if (form?.ok) invalidateAll();
	});
</script>

<svelte:head><title>Impostazioni · Gestionale Officina</title></svelte:head>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Sistema</div>
		<h1 class="pagina-titolo">Impostazioni</h1>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if !data.officina}
	<!-- Primo avvio -->
	<div class="panel panel-pad setup">
		<div class="eyebrow">Primo avvio</div>
		<h2 class="mt-1 mb-2">Crea la tua officina</h2>
		<p class="muted mb-2">
			È il primo passo: definisce il contenitore di clienti, veicoli, organico e
			interventi. Potrai aggiungere altre sedi in seguito.
		</p>
		<form method="POST" action="?/creaOfficina" use:enhance class="flex-col gap-2" style="max-width:440px">
			<div class="field"><label for="no">Nome officina *</label><input id="no" class="input" name="nome" required placeholder="Es. Autofficina Rossi" /></div>
			<div class="field"><label for="in">Indirizzo</label><input id="in" class="input" name="indirizzo" /></div>
			<button class="btn btn-accent" type="submit">Crea officina</button>
		</form>
	</div>
{:else}
	<div class="flex-col gap-3">
		<!-- Dati officina -->
		<section class="panel panel-pad">
			<h2 class="mb-2">Officina</h2>
			<form method="POST" action="?/aggiornaOfficina" use:enhance class="flex-col gap-2" style="max-width:480px">
				<input type="hidden" name="id" value={data.officina.id} />
				<div class="field"><label for="no">Nome</label><input id="no" class="input" name="nome" value={data.officina.nome} /></div>
				<div class="field"><label for="in">Indirizzo</label><input id="in" class="input" name="indirizzo" value={data.officina.indirizzo ?? ''} /></div>
				<div><button class="btn btn-accent" type="submit">Salva</button></div>
			</form>
		</section>

		<div class="griglia g-2 align-start">
			<!-- Categorie veicolo -->
			<section class="panel">
				<header class="sez-head"><h2>Categorie veicolo</h2></header>
				<div class="panel-pad">
					{#if data.categorie.length === 0}
						<p class="muted small mb-2">Nessuna categoria. Servono per classificare i veicoli.</p>
					{:else}
						<div class="chips mb-2">
							{#each data.categorie as c}
								<span class="chip-el">
									{c.nome}
									<form method="POST" action="?/scollegaCategoria" use:enhance class="inline-x">
										<input type="hidden" name="officina_id" value={data.officina.id} />
										<input type="hidden" name="categoria_id" value={c.id} />
										<button type="submit" aria-label="Rimuovi">×</button>
									</form>
								</span>
							{/each}
						</div>
					{/if}
					<form method="POST" action="?/creaCategoria" use:enhance class="flex gap-1">
						<input type="hidden" name="officina_id" value={data.officina.id} />
						<input class="input" name="nome" placeholder="Es. Auto, Moto, Furgone" required />
						<button class="btn btn-accent" type="submit">+</button>
					</form>
				</div>
			</section>

			<!-- Ruoli -->
			<section class="panel">
				<header class="sez-head"><h2>Ruoli</h2></header>
				<div class="panel-pad">
					{#if data.ruoli.length === 0}
						<p class="muted small mb-2">Nessun ruolo definito.</p>
					{:else}
						<ul class="lista-el mb-2">
							{#each data.ruoli as r}
								<li>
									<span>{r.nome}</span>
									<form method="POST" action="?/eliminaRuolo" use:enhance class="inline-x">
										<input type="hidden" name="id" value={r.id} />
										<button type="submit" aria-label="Elimina">×</button>
									</form>
								</li>
							{/each}
						</ul>
					{/if}
					<form method="POST" action="?/creaRuolo" use:enhance class="flex gap-1">
						<input type="hidden" name="officina_id" value={data.officina.id} />
						<input class="input" name="nome" placeholder="Es. Meccanico, Capofficina" required />
						<button class="btn btn-accent" type="submit">+</button>
					</form>
				</div>
			</section>
		</div>

		<!-- Competenze -->
		<section class="panel">
			<header class="sez-head"><h2>Competenze</h2></header>
			<div class="panel-pad">
				{#if data.competenze.length === 0}
					<p class="muted small mb-2">Nessuna competenza. Catalogo unico, riutilizzabile tra le categorie veicolo.</p>
				{:else}
					<div class="chips mb-2">
						{#each data.competenze as c}
							<span class="chip-el">
								{c.nome}{#if c.famiglia}<span class="muted small"> · {c.famiglia}</span>{/if}
								<form method="POST" action="?/eliminaCompetenza" use:enhance class="inline-x">
									<input type="hidden" name="id" value={c.id} />
									<button type="submit" aria-label="Elimina">×</button>
								</form>
							</span>
						{/each}
					</div>
				{/if}
				<form method="POST" action="?/creaCompetenza" use:enhance class="flex gap-1 wrap">
					<input type="hidden" name="officina_id" value={data.officina.id} />
					<input class="input" name="nome" placeholder="Es. Diagnosi elettronica" required style="flex:1;min-width:180px" />
					<input class="input" name="famiglia" placeholder="Famiglia (es. elettrica)" style="flex:1;min-width:140px" />
					<button class="btn btn-accent" type="submit">Aggiungi</button>
				</form>
			</div>
		</section>
	</div>
{/if}

<style>
	.setup {
		max-width: 640px;
	}
	.align-start {
		align-items: start;
	}
	.sez-head {
		padding: 14px 18px;
		border-bottom: 1px solid var(--bordo);
	}
	.sez-head h2 {
		font-size: 16px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.chip-el {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: var(--acciaio-100);
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
	}
	.lista-el {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.lista-el li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 10px;
		background: var(--nebbia-50);
		border-radius: var(--r);
		font-size: 13.5px;
		font-weight: 500;
	}
	.inline-x {
		display: inline;
	}
	.inline-x button {
		background: none;
		border: none;
		color: var(--acciaio-400);
		cursor: pointer;
		font-size: 15px;
		line-height: 1;
		padding: 0 0 0 4px;
	}
	.inline-x button:hover {
		color: var(--rosso);
	}
</style>
