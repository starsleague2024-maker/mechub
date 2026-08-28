<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_INTERVENTO, ALIMENTAZIONE, ALIMENTAZIONI, voce, fmtData } from '$lib/dominio';

	let { data, form } = $props();
	let modalVeicolo = $state(false);
	let modifica = $state(false);
	// Alimentazione scelta nella modale nuovo veicolo (per l'avviso live).
	let nuovaAlim = $state('');

	$effect(() => {
		if (form?.ok && !form?.salvato) modalVeicolo = false;
		if (form?.salvato) modifica = false;
	});

	const alimNonTrattata = $derived(
		!!nuovaAlim && !data.alimentazioniTrattate.includes(nuovaAlim)
	);

	const c = $derived(data.cliente);
	const nomeVisual = $derived(c.ragione_sociale || `${c.nome} ${c.cognome ?? ''}`);
</script>

<svelte:head><title>{nomeVisual} · Clienti</title></svelte:head>

<div class="briciole small muted mb-2">
	<a href="/clienti">Clienti</a> / {nomeVisual}
</div>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Scheda cliente</div>
		<h1 class="pagina-titolo">{nomeVisual}</h1>
	</div>
	<button class="btn" onclick={() => (modifica = !modifica)}>
		{modifica ? 'Chiudi modifica' : 'Modifica dati'}
	</button>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<div class="griglia layout">
	<div class="flex-col gap-3">
		<!-- Anagrafica -->
		<section class="panel panel-pad">
			<h2 class="mb-2">Anagrafica</h2>
			{#if modifica}
				<form method="POST" action="?/aggiorna" use:enhance class="flex-col gap-2">
					<div class="griglia g-2">
						<div class="field"><label for="n">Nome</label><input id="n" class="input" name="nome" value={c.nome} /></div>
						<div class="field"><label for="cg">Cognome</label><input id="cg" class="input" name="cognome" value={c.cognome ?? ''} /></div>
					</div>
					<div class="field"><label for="rs">Ragione sociale</label><input id="rs" class="input" name="ragione_sociale" value={c.ragione_sociale ?? ''} /></div>
					<div class="griglia g-2">
						<div class="field"><label for="em">Email</label><input id="em" class="input" name="email" value={c.email ?? ''} /></div>
						<div class="field"><label for="tel">Telefono</label><input id="tel" class="input" name="telefono" value={c.telefono ?? ''} /></div>
					</div>
					<div class="field"><label for="wa">WhatsApp</label><input id="wa" class="input" name="canale_whatsapp" value={c.canale_whatsapp ?? ''} /></div>
					<div class="flex gap-1"><button class="btn btn-accent" type="submit">Salva</button></div>
				</form>
			{:else}
				<dl class="scheda">
					<div><dt>Email</dt><dd>{c.email || '—'}</dd></div>
					<div><dt>Telefono</dt><dd class="mono">{c.telefono || '—'}</dd></div>
					<div><dt>WhatsApp</dt><dd class="mono">{c.canale_whatsapp || '—'}</dd></div>
				</dl>
			{/if}
		</section>

		<!-- Veicoli -->
		<section class="panel">
			<header class="sez-head">
				<h2>Veicoli</h2>
				<button class="btn btn-sm" onclick={() => (modalVeicolo = true)}>+ Aggiungi</button>
			</header>
			{#if data.veicoli.length === 0}
				<Vuoto titolo="Nessun veicolo" testo="Aggiungi il primo veicolo del cliente." />
			{:else}
				<div class="tabella-wrap piatta">
					<table class="dati">
						<thead><tr><th>Targa</th><th>Veicolo</th><th>Categoria</th><th>Anno</th><th>Km</th></tr></thead>
						<tbody>
							{#each data.veicoli as v}
								<tr>
									<td><a class="riga-link" href={`/veicoli/${v.id}`}><span class="targa">{v.targa}</span></a></td>
									<td>{v.marca ?? ''} {v.modello ?? ''}</td>
									<td class="small muted">{v.categoria?.nome ?? '—'}</td>
									<td class="mono">{v.anno ?? '—'}</td>
									<td class="mono">{v.km ? v.km.toLocaleString('it-IT') : '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	</div>

	<!-- Storico interventi -->
	<section class="panel">
		<header class="sez-head"><h2>Storico interventi</h2></header>
		{#if data.interventi.length === 0}
			<Vuoto titolo="Nessun intervento" testo="Gli interventi del cliente appariranno qui." />
		{:else}
			<ul class="storico">
				{#each data.interventi as i}
					{@const s = voce(STATO_INTERVENTO, i.stato_generale)}
					<li>
						<a href={`/interventi/${i.id}`} class="storico-riga">
							<div>
								<div class="storico-motivo">{i.motivo_iniziale || 'Intervento'}</div>
								<div class="muted small">
									{fmtData(i.data_apertura)}
									{#if i.veicolo}· <span class="targa">{i.veicolo.targa}</span>{/if}
								</div>
							</div>
							<Badge label={s.label} colore={s.colore} />
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<Modal titolo="Nuovo veicolo" bind:aperto={modalVeicolo}>
	<form method="POST" action="?/creaVeicolo" use:enhance id="form-veicolo" class="flex-col gap-2">
		<div class="griglia g-2">
			<div class="field"><label for="tg">Targa *</label><input id="tg" class="input mono" name="targa" required style="text-transform:uppercase" /></div>
			<div class="field">
				<label for="cat">Categoria *</label>
				<select id="cat" class="select" name="categoria_veicolo_id" required>
					<option value="">— seleziona —</option>
					{#each data.categorie as cat}<option value={cat.id}>{cat.nome}</option>{/each}
				</select>
			</div>
		</div>
		<div class="griglia g-2">
			<div class="field"><label for="ma">Marca</label><input id="ma" class="input" name="marca" /></div>
			<div class="field"><label for="mo">Modello</label><input id="mo" class="input" name="modello" /></div>
		</div>
		<div class="griglia g-3">
			<div class="field"><label for="an">Anno</label><input id="an" class="input mono" name="anno" type="number" min="1900" max="2100" /></div>
			<div class="field"><label for="km">Km</label><input id="km" class="input mono" name="km" type="number" min="0" /></div>
			<div class="field"><label for="te">Telaio</label><input id="te" class="input mono" name="telaio" /></div>
		</div>
		<div class="field" style="max-width:220px">
			<label for="al">Alimentazione</label>
			<select id="al" class="select" name="alimentazione" bind:value={nuovaAlim}>
				<option value="">— non indicata —</option>
				{#each ALIMENTAZIONI as chiave}<option value={chiave}>{ALIMENTAZIONE[chiave].label}</option>{/each}
			</select>
		</div>
		{#if alimNonTrattata}
			<div class="avviso ambra small">
				⚠️ Questa officina non ha indicato <strong>{ALIMENTAZIONE[nuovaAlim]?.label ?? nuovaAlim}</strong>
				tra le alimentazioni trattate. Puoi salvare comunque.
			</div>
		{/if}
		{#if data.categorie.length === 0}
			<div class="avviso info small">Nessuna categoria veicolo definita. Creane in <a href="/impostazioni">Impostazioni</a>.</div>
		{/if}
	</form>
	{#snippet azioni()}
		<button class="btn" onclick={() => (modalVeicolo = false)}>Annulla</button>
		<button class="btn btn-accent" type="submit" form="form-veicolo">Salva veicolo</button>
	{/snippet}
</Modal>

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
	.briciole a {
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
		gap: 12px;
		border-bottom: 1px solid var(--bordo);
		padding-bottom: 10px;
	}
	.scheda div:last-child {
		border-bottom: none;
	}
	.scheda dt {
		color: var(--testo-tenue);
		font-size: 13px;
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
		gap: 12px;
		padding: 11px 12px;
		border-radius: var(--r);
	}
	.storico-riga:hover {
		background: var(--nebbia-50);
	}
	.storico-motivo {
		font-weight: 500;
	}
</style>
