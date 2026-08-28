<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Sezione from '$lib/components/Sezione.svelte';
	import AlberoCompetenze from '$lib/components/AlberoCompetenze.svelte';
	import { ALIMENTAZIONE, ALIMENTAZIONI } from '$lib/dominio';

	let { data, form } = $props();

	$effect(() => {
		if (form?.ok) invalidateAll();
	});

	// Le 7 alimentazioni, in ordine canonico, unite allo stato dal DB.
	// Il seed automatico (trigger + backfill, migration 0018) garantisce che
	// le righe esistano sempre; il fallback copre solo casi anomali, senza
	// alcun pulsante di generazione manuale.
	const alimentazioni = $derived(
		ALIMENTAZIONI.map((chiave) => {
			const riga = data.alimentazioni.find((a: any) => a.alimentazione === chiave);
			return {
				chiave,
				label: ALIMENTAZIONE[chiave].label,
				id: riga?.id ?? null,
				attiva: riga?.attiva ?? false
			};
		})
	);
	const alimentazioniAttiveCount = $derived(alimentazioni.filter((a) => a.attiva).length);

	// toggle alimentazione: stesso pattern del form nascosto usato per le competenze
	let formToggleAlim = $state<HTMLFormElement | null>(null);
	let alimId = $state('');
	let alimAttiva = $state('true');

	function onToggleAlimentazione(id: string, nuovoStato: boolean) {
		if (!id) return;
		alimId = id;
		alimAttiva = String(nuovoStato);
		queueMicrotask(() => formToggleAlim?.requestSubmit());
	}

	// competenze attive (flag `attiva`) come Set per l'albero
	const attive = $derived(new Set(data.competenze.filter((c: any) => c.attiva).map((c: any) => c.id)));

	// toggle competenza officina: invia il form nascosto via fetch (enhance manuale)
	let formToggle = $state<HTMLFormElement | null>(null);
	let toggleId = $state('');
	let toggleAttiva = $state('true');

	function onToggleCompetenza(id: string, nuovoStato: boolean) {
		toggleId = id;
		toggleAttiva = String(nuovoStato);
		// invia al submit successivo
		queueMicrotask(() => formToggle?.requestSubmit());
	}

	const competenzeAttiveCount = $derived(data.competenze.filter((c: any) => c.attiva).length);
	const albeoVuoto = $derived(data.competenze.length === 0);
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
	<!-- form nascosto per il toggle competenza officina -->
	<form
		method="POST"
		action="?/toggleCompetenza"
		use:enhance
		bind:this={formToggle}
		class="hidden-form"
	>
		<input type="hidden" name="id" value={toggleId} />
		<input type="hidden" name="attiva" value={toggleAttiva} />
	</form>

	<!-- form nascosto per il toggle alimentazione officina -->
	<form
		method="POST"
		action="?/toggleAlimentazione"
		use:enhance
		bind:this={formToggleAlim}
		class="hidden-form"
	>
		<input type="hidden" name="id" value={alimId} />
		<input type="hidden" name="attiva" value={alimAttiva} />
	</form>

	<div class="sezioni">
		<!-- ─── Dati officina ─── -->
		<Sezione titolo="Officina" descrizione="Nome e indirizzo" aperta={true}>
			<form method="POST" action="?/aggiornaOfficina" use:enhance class="flex-col gap-2" style="max-width:480px">
				<input type="hidden" name="id" value={data.officina.id} />
				<div class="field"><label for="no">Nome</label><input id="no" class="input" name="nome" value={data.officina.nome} /></div>
				<div class="field"><label for="in">Indirizzo</label><input id="in" class="input" name="indirizzo" value={data.officina.indirizzo ?? ''} /></div>
				<div><button class="btn btn-accent" type="submit">Salva</button></div>
			</form>
		</Sezione>

		<!-- ─── Veicoli trattati ─── -->
		<Sezione titolo="Veicoli trattati" descrizione="Categorie di veicolo" badge={data.categorie.length}>
			<p class="muted small mb-2">Le categorie di veicolo che l'officina tratta. Utile al Planner per assegnare le risorse giuste.</p>
			{#if data.categorie.length > 0}
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
				<input class="input" name="nome" placeholder="Es. Auto, Moto, Furgone, Camper" required />
				<button class="btn btn-accent" type="submit">+</button>
			</form>
		</Sezione>

		<!-- ─── Alimentazioni trattate ─── -->
		<Sezione
			titolo="Alimentazioni trattate"
			descrizione="Cosa sa gestire l'officina"
			badge={alimentazioniAttiveCount}
		>
			<p class="muted small mb-2">
				Indica quali alimentazioni l'officina è in grado di gestire. Quando entra un veicolo con
				un'alimentazione non attiva, il desk riceve un avviso; il salvataggio resta comunque possibile.
			</p>
			<ul class="alim-lista">
				{#each alimentazioni as a}
					<li>
						<label class="alim-riga">
							<input
								type="checkbox"
								checked={a.attiva}
								disabled={!a.id}
								onchange={(e) => onToggleAlimentazione(a.id, e.currentTarget.checked)}
							/>
							<span class="alim-nome">{a.label}</span>
							<span class="alim-stato" class:on={a.attiva}>{a.attiva ? 'Attiva' : 'Non attiva'}</span>
						</label>
					</li>
				{/each}
			</ul>
		</Sezione>

		<!-- ─── Competenze officina (ALBERO) ─── -->
		<Sezione titolo="Competenze e lavorazioni dell'officina" descrizione="Cosa fa questa officina" badge={competenzeAttiveCount} aperta={true}>
			<p class="muted small mb-2">
				Spunta le competenze che l'officina è in grado di offrire. Le macro-aree (in grassetto)
				sono contenitori: attiva le competenze specifiche al loro interno. La stessa struttura
				sarà usata per lo staff e per le lavorazioni.
			</p>
			{#if albeoVuoto}
				<div class="avviso info mb-2">
					L'albero delle competenze non è ancora stato generato per questa officina.
					<form method="POST" action="?/generaAlbero" use:enhance class="mt-1">
						<input type="hidden" name="officina_id" value={data.officina.id} />
						<button class="btn btn-accent btn-sm" type="submit">Genera albero competenze</button>
					</form>
				</div>
			{:else}
				<AlberoCompetenze competenze={data.competenze} {attive} ontoggle={onToggleCompetenza} />
			{/if}
		</Sezione>

		<!-- ─── Ruoli ─── -->
		<Sezione titolo="Ruoli" descrizione="Ruoli del personale" badge={data.ruoli.length}>
			{#if data.ruoli.length > 0}
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
		</Sezione>

		<!-- ─── Certificazioni e abilitazioni (predisposta, Blocco 3) ─── -->
		<Sezione titolo="Certificazioni e abilitazioni" descrizione="Blocco successivo">
			<div class="avviso info small">
				La gestione completa di certificazioni e abilitazioni (F-gas, PES/PAV, GPL/metano, ganci
				traino) arriverà in un blocco dedicato. Una competenza indica cosa una persona sa fare;
				un'abilitazione indica cosa è autorizzata a fare legalmente.
			</div>
		</Sezione>
	</div>
{/if}

<style>
	.setup {
		max-width: 640px;
	}
	.sezioni {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 900px;
	}
	.hidden-form {
		display: none;
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
	.alim-lista {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-width: 420px;
	}
	.alim-riga {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		background: var(--nebbia-50);
		border-radius: var(--r);
		cursor: pointer;
	}
	.alim-riga:hover {
		background: var(--acciaio-100);
	}
	.alim-riga input {
		accent-color: var(--cantiere);
		width: 16px;
		height: 16px;
		cursor: pointer;
	}
	.alim-nome {
		font-weight: 500;
		font-size: 14px;
	}
	.alim-stato {
		margin-left: auto;
		font-size: 12px;
		font-weight: 600;
		color: var(--testo-tenue);
	}
	.alim-stato.on {
		color: var(--verde);
	}
</style>
