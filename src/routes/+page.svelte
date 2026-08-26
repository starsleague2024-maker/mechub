<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import Vuoto from '$lib/components/Vuoto.svelte';
	import { STATO_LAVORAZIONE, STATO_APPUNTAMENTO, voce, fmtDataOra } from '$lib/dominio';

	let { data } = $props();

	const kpi = $derived(
		data.conteggi
			? [
					{ label: 'Interventi aperti', valore: data.conteggi.interventiAperti, href: '/interventi', accento: false },
					{ label: 'Lavori in corso', valore: data.conteggi.lavorazioniInCorso, href: '/planner', accento: true },
					{ label: 'Appuntamenti oggi', valore: data.conteggi.appuntamentiOggi, href: '/appuntamenti', accento: false },
					{ label: 'Ricambi da ordinare', valore: data.conteggi.fabbisogniDaOrdinare, href: '/magazzino', accento: false },
					{ label: 'Conflitti pianificazione', valore: data.conteggi.conflitti, href: '/planner', accento: data.conteggi.conflitti > 0 }
				]
			: []
	);
</script>

<svelte:head><title>Cruscotto · Gestionale Officina</title></svelte:head>

{#if data.serve_setup}
	<div class="pagina-head">
		<div>
			<div class="eyebrow">Primo avvio</div>
			<h1 class="pagina-titolo">Benvenuto</h1>
		</div>
	</div>
	<div class="panel panel-pad">
		<h3>Nessuna officina configurata</h3>
		<p class="muted mt-1">
			Per iniziare crea la tua officina e le anagrafiche di base (categorie veicolo,
			ruoli, competenze). Da lì potrai inserire clienti, veicoli e aprire il primo
			intervento.
		</p>
		<a href="/impostazioni" class="btn btn-accent mt-2">Configura officina</a>
	</div>
{:else}
	<div class="pagina-head">
		<div>
			<div class="eyebrow">Panoramica · {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
			<h1 class="pagina-titolo">Cruscotto</h1>
		</div>
		<div class="flex gap-1 wrap">
			<a href="/interventi?nuovo=1" class="btn btn-primary">+ Nuovo intervento</a>
			<a href="/appuntamenti?nuovo=1" class="btn">+ Appuntamento</a>
		</div>
	</div>

	<div class="griglia g-4 kpi-grid">
		{#each kpi as k}
			<a href={k.href} class="kpi panel" class:accento={k.accento}>
				<div class="kpi-valore mono">{k.valore}</div>
				<div class="kpi-label">{k.label}</div>
			</a>
		{/each}
	</div>

	<div class="griglia due-colonne mt-3">
		<section class="panel">
			<header class="sez-head">
				<h2>Lavori attivi</h2>
				<a href="/planner" class="small link-vedi">Apri planner →</a>
			</header>
			{#if data.lavorazioniAttive.length === 0}
				<Vuoto titolo="Nessun lavoro attivo" testo="Quando pianifichi o avvii una lavorazione comparirà qui." />
			{:else}
				<div class="tabella-wrap piatta">
					<table class="dati">
						<thead>
							<tr><th>Lavorazione</th><th>Veicolo</th><th>Stato</th></tr>
						</thead>
						<tbody>
							{#each data.lavorazioniAttive as l}
								{@const v = l.intervento?.veicolo}
								{@const s = voce(STATO_LAVORAZIONE, l.stato_operativo)}
								<tr>
									<td>
										<a class="riga-link" href={`/interventi/${l.intervento?.id}`}>{l.nome}</a>
									</td>
									<td>
										{#if v}
											<span class="targa">{v.targa}</span>
											<span class="muted small"> {v.marca ?? ''} {v.modello ?? ''}</span>
										{:else}—{/if}
									</td>
									<td><Badge label={s.label} colore={s.colore} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<section class="panel">
			<header class="sez-head">
				<h2>Appuntamenti di oggi</h2>
				<a href="/appuntamenti" class="small link-vedi">Tutti →</a>
			</header>
			{#if data.appuntamentiOggi.length === 0}
				<Vuoto titolo="Niente in agenda oggi" testo="Nessun veicolo atteso per la giornata." />
			{:else}
				<ul class="agenda">
					{#each data.appuntamentiOggi as a}
						{@const s = voce(STATO_APPUNTAMENTO, a.stato)}
						<li>
							<div class="agenda-ora mono">
								{new Date(a.data_ora_promessa).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
							</div>
							<div class="agenda-corpo">
								<div class="agenda-cliente">
									{a.cliente?.nome} {a.cliente?.cognome ?? ''}
									{#if a.veicolo}<span class="targa">{a.veicolo.targa}</span>{/if}
								</div>
							</div>
							<Badge label={s.label} colore={s.colore} />
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
{/if}

<style>
	.kpi-grid {
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	}
	.kpi {
		padding: 18px;
		display: block;
		transition: border-color 0.14s, transform 0.06s;
	}
	.kpi:hover {
		border-color: var(--acciaio-300);
		transform: translateY(-1px);
	}
	.kpi.accento {
		border-color: var(--cantiere);
		background: linear-gradient(180deg, var(--cantiere-tenue), var(--carta) 60%);
	}
	.kpi-valore {
		font-size: 34px;
		font-weight: 700;
		line-height: 1;
		color: var(--grafite-900);
	}
	.kpi-label {
		margin-top: 8px;
		font-size: 12.5px;
		color: var(--testo-tenue);
		font-weight: 500;
	}
	.due-colonne {
		grid-template-columns: 1.3fr 1fr;
	}
	@media (max-width: 900px) {
		.due-colonne {
			grid-template-columns: 1fr;
		}
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
	.link-vedi {
		color: var(--blu);
		font-weight: 600;
	}
	.tabella-wrap.piatta {
		border: none;
		border-radius: 0;
	}
	.agenda {
		list-style: none;
		margin: 0;
		padding: 6px;
	}
	.agenda li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--r);
	}
	.agenda li:hover {
		background: var(--nebbia-50);
	}
	.agenda-ora {
		font-weight: 700;
		font-size: 14px;
		color: var(--grafite-800);
		min-width: 46px;
	}
	.agenda-corpo {
		flex: 1;
	}
	.agenda-cliente {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 500;
		font-size: 13.5px;
	}
</style>
