<script lang="ts">
	import { enhance } from '$app/forms';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_INTERVENTO, STATO_FABBISOGNO, ALIMENTAZIONE, ALIMENTAZIONI, voce, fmtData } from '$lib/dominio';

	let { data, form } = $props();
	let modifica = $state(false);

	$effect(() => {
		if (form?.ok) modifica = false;
	});

	const v = $derived(data.veicolo);
	const cli = $derived(v.cliente);
	const nomeCli = $derived(cli?.ragione_sociale || `${cli?.nome} ${cli?.cognome ?? ''}`);

	// Alimentazione selezionata nel form (per l'avviso live). Inizializzata dal veicolo.
	let alimSel = $state<string>('');
	$effect(() => {
		if (modifica) alimSel = v.alimentazione ?? '';
	});
	// Avviso non-bloccante: l'alimentazione scelta non è tra quelle trattate dall'officina.
	const alimNonTrattata = $derived(
		!!alimSel && !data.alimentazioniTrattate.includes(alimSel)
	);
</script>

<svelte:head><title>{v.targa} · Veicoli</title></svelte:head>

<div class="briciole small muted mb-2">
	<a href="/veicoli">Veicoli</a> / {v.targa}
</div>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Scheda veicolo</div>
		<h1 class="pagina-titolo flex items-center gap-2">
			<span class="targa grande">{v.targa}</span>
			<span>{v.marca ?? ''} {v.modello ?? ''}</span>
		</h1>
	</div>
	<div class="flex gap-1">
		<button class="btn" onclick={() => (modifica = !modifica)}>{modifica ? 'Chiudi' : 'Modifica'}</button>
		<a href={`/interventi?nuovo=1&veicolo=${v.id}`} class="btn btn-accent">+ Apri intervento</a>
	</div>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<div class="griglia layout">
	<div class="flex-col gap-3">
		<section class="panel panel-pad">
			<h2 class="mb-2">Dati veicolo</h2>
			{#if modifica}
				<form method="POST" action="?/aggiorna" use:enhance class="flex-col gap-2">
					<div class="griglia g-2">
						<div class="field"><label for="tg">Targa</label><input id="tg" class="input mono" name="targa" value={v.targa} /></div>
						<div class="field">
							<label for="cat">Categoria</label>
							<select id="cat" class="select" name="categoria_veicolo_id">
								{#each data.categorie as cat}<option value={cat.id} selected={cat.id === v.categoria_veicolo_id}>{cat.nome}</option>{/each}
							</select>
						</div>
					</div>
					<div class="griglia g-2">
						<div class="field"><label for="ma">Marca</label><input id="ma" class="input" name="marca" value={v.marca ?? ''} /></div>
						<div class="field"><label for="mo">Modello</label><input id="mo" class="input" name="modello" value={v.modello ?? ''} /></div>
					</div>
					<div class="griglia g-3">
						<div class="field"><label for="an">Anno</label><input id="an" class="input mono" type="number" name="anno" value={v.anno ?? ''} /></div>
						<div class="field"><label for="km">Km</label><input id="km" class="input mono" type="number" name="km" value={v.km ?? ''} /></div>
						<div class="field"><label for="te">Telaio</label><input id="te" class="input mono" name="telaio" value={v.telaio ?? ''} /></div>
					</div>
					<div class="field" style="max-width:220px">
						<label for="al">Alimentazione</label>
						<select id="al" class="select" name="alimentazione" bind:value={alimSel}>
							<option value="">— non indicata —</option>
							{#each ALIMENTAZIONI as chiave}<option value={chiave}>{ALIMENTAZIONE[chiave].label}</option>{/each}
						</select>
					</div>
					{#if alimNonTrattata}
						<div class="avviso ambra small">
							⚠️ Questa officina non ha indicato <strong>{ALIMENTAZIONE[alimSel]?.label ?? alimSel}</strong>
							tra le alimentazioni trattate. Puoi salvare comunque.
						</div>
					{/if}
					<div><button class="btn btn-accent" type="submit">Salva</button></div>
				</form>
			{:else}
				<dl class="scheda">
					<div><dt>Cliente</dt><dd><a class="link" href={`/clienti/${cli?.id}`}>{nomeCli}</a></dd></div>
					<div><dt>Categoria</dt><dd>{v.categoria?.nome ?? '—'}</dd></div>
					<div>
						<dt>Alimentazione</dt>
						<dd>
							{v.alimentazione ? (ALIMENTAZIONE[v.alimentazione]?.label ?? v.alimentazione) : '—'}
							{#if v.alimentazione && !data.alimentazioniTrattate.includes(v.alimentazione)}
								<span class="alim-flag" title="Alimentazione non trattata dall'officina">⚠️</span>
							{/if}
						</dd>
					</div>
					<div><dt>Anno</dt><dd class="mono">{v.anno ?? '—'}</dd></div>
					<div><dt>Km</dt><dd class="mono">{v.km ? v.km.toLocaleString('it-IT') : '—'}</dd></div>
					<div><dt>Telaio</dt><dd class="mono">{v.telaio ?? '—'}</dd></div>
				</dl>
				{#if v.alimentazione && !data.alimentazioniTrattate.includes(v.alimentazione)}
					<div class="avviso ambra small mt-2">
						⚠️ Questa officina non ha indicato <strong>{ALIMENTAZIONE[v.alimentazione]?.label ?? v.alimentazione}</strong>
						tra le alimentazioni trattate.
					</div>
				{/if}
			{/if}
		</section>

		<section class="panel">
			<header class="sez-head"><h2>Fabbisogni ricambi</h2></header>
			{#if data.fabbisogni.length === 0}
				<Vuoto titolo="Nessun fabbisogno" testo="I ricambi richiesti per questo veicolo compariranno qui." />
			{:else}
				<div class="tabella-wrap piatta">
					<table class="dati">
						<thead><tr><th>Ricambio</th><th>Q.tà</th><th>Stato</th></tr></thead>
						<tbody>
							{#each data.fabbisogni as fb}
								{@const s = voce(STATO_FABBISOGNO, fb.stato_fabbisogno)}
								<tr>
									<td><span class="mono">{fb.ricambio?.codice ?? '—'}</span> <span class="muted small">{fb.ricambio?.descrizione ?? ''}</span></td>
									<td class="mono">{fb.quantita_richiesta}</td>
									<td><Badge label={s.label} colore={s.colore} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	</div>

	<section class="panel">
		<header class="sez-head"><h2>Storico interventi</h2></header>
		{#if data.interventi.length === 0}
			<Vuoto titolo="Nessun intervento" />
		{:else}
			<ul class="storico">
				{#each data.interventi as i}
					{@const s = voce(STATO_INTERVENTO, i.stato_generale)}
					<li>
						<a href={`/interventi/${i.id}`} class="storico-riga">
							<div>
								<div class="storico-motivo">{i.motivo_iniziale || 'Intervento'}</div>
								<div class="muted small">{fmtData(i.data_apertura)}</div>
							</div>
							<Badge label={s.label} colore={s.colore} />
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.layout {
		grid-template-columns: 1.4fr 1fr;
		align-items: start;
	}
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
	.targa.grande {
		font-size: 20px;
		padding: 4px 12px;
	}
	.briciole a,
	.link {
		color: var(--blu);
	}
	.sez-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 15px 18px;
		border-bottom: 1px solid var(--bordo);
	}
	.sez-head h2 {
		font-size: 17px;
	}
	.scheda {
		margin: 0;
		display: grid;
		gap: 12px;
	}
	.scheda div {
		display: flex;
		justify-content: space-between;
		border-bottom: 1px solid var(--bordo);
		padding-bottom: 10px;
	}
	.scheda div:last-child {
		border-bottom: none;
	}
	.scheda dt {
		color: var(--testo-tenue);
	}
	.scheda dd {
		margin: 0;
		font-weight: 500;
	}
	.tabella-wrap.piatta {
		border: none;
	}
	.storico {
		list-style: none;
		margin: 0;
		padding: 6px;
	}
	.storico-riga {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 11px 12px;
		border-radius: var(--r);
	}
	.storico-riga:hover {
		background: var(--nebbia-50);
	}
	.storico-motivo {
		font-weight: 500;
	}
	.alim-flag {
		margin-left: 4px;
		font-size: 13px;
	}
</style>
