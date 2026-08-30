<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();

	let modalNuovo = $state(false);

	const STATO_LABEL: Record<string, string> = {
		attivo: 'Attivo',
		in_prova: 'In prova',
		cessato: 'Cessato'
	};

	function iniziali(nome: string, cognome: string) {
		return `${(nome?.[0] ?? '').toUpperCase()}${(cognome?.[0] ?? '').toUpperCase()}`;
	}
</script>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Impostazioni · Personale</div>
		<h1 class="pagina-titolo">Ruoli & Staff</h1>
	</div>
	<div class="head-azioni">
		<a href="/impostazioni" class="btn btn-ghost">← Impostazioni</a>
		<button class="btn btn-accent" onclick={() => (modalNuovo = true)}>+ Nuova persona</button>
	</div>
</div>

<p class="intro muted mb-2">
	Gestisci le persone dell'officina: ruolo, orari, veicoli, competenze, mansioni, certificazioni e permessi.
	Clicca una card per aprire la scheda completa.
</p>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

{#if data.persone.length === 0}
	<div class="vuoto">
		<p>Nessuna persona ancora inserita.</p>
		<button class="btn btn-accent" onclick={() => (modalNuovo = true)}>+ Aggiungi la prima persona</button>
	</div>
{:else}
	<div class="griglia-card">
		{#each data.persone as p}
			<a class="card-persona" href={`/impostazioni/staff/${p.id}`}>
				<div class="card-foto">
					{#if p.foto_url}
						<img src={p.foto_url} alt={`${p.nome} ${p.cognome}`} />
					{:else}
						<span class="iniziali">{iniziali(p.nome, p.cognome)}</span>
					{/if}
				</div>
				<div class="card-nome">{p.nome} {p.cognome}</div>
				<div class="card-ruolo">{p.ruoloNome ?? 'Senza ruolo'}</div>
				<div class="card-indicatori">
					<span class="ind">✓ {p.n_mansioni} mansioni</span>
					<span class="ind">✓ {p.n_competenze} competenze</span>
				</div>
				<div class="card-stato stato-{p.stato}">{STATO_LABEL[p.stato] ?? p.stato}</div>
			</a>
		{/each}
	</div>
{/if}

<Modal aperto={modalNuovo} titolo="Nuova persona" onchiudi={() => (modalNuovo = false)}>
	<form
		method="POST"
		action="?/crea"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					modalNuovo = false;
				}
				await update();
			};
		}}
		class="flex-col gap-2"
	>
		<input type="hidden" name="officina_id" value={data.officinaId} />
		<div class="griglia g-2">
			<div class="field"><label for="n">Nome *</label><input id="n" class="input" name="nome" required /></div>
			<div class="field"><label for="c">Cognome *</label><input id="c" class="input" name="cognome" required /></div>
		</div>
		<div class="field">
			<label for="r">Ruolo principale</label>
			<select id="r" class="select" name="ruolo_id">
				<option value="">— nessuno —</option>
				{#each data.ruoli as r}
					<option value={r.id}>{r.nome}</option>
				{/each}
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
		<p class="muted small">Dopo aver creato la persona potrai aggiungere foto, orari, veicoli, competenze, mansioni e permessi dalla sua scheda.</p>
		<div class="flex gap-1">
			<button class="btn btn-accent" type="submit">Crea persona</button>
			<button class="btn btn-ghost" type="button" onclick={() => (modalNuovo = false)}>Annulla</button>
		</div>
	</form>
</Modal>

<style>
	.pagina-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 8px;
		flex-wrap: wrap;
	}
	.head-azioni {
		display: flex;
		gap: 8px;
	}
	.griglia-card {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 14px;
	}
	.card-persona {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 18px 14px;
		background: var(--carta, #fff);
		border: 1px solid var(--bordo, #e2e5ea);
		border-radius: var(--r, 10px);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, transform 0.1s;
	}
	.card-persona:hover {
		border-color: var(--cantiere, #f5b301);
		transform: translateY(-2px);
	}
	.card-foto {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--grafite-900, #2a2d33);
		color: #fff;
		font-weight: 700;
		font-size: 24px;
		font-family: var(--display);
	}
	.card-foto img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.card-nome {
		font-weight: 600;
		font-size: 15px;
		text-align: center;
	}
	.card-ruolo {
		font-size: 13px;
		color: var(--cantiere-scuro, #b5850a);
		font-weight: 500;
	}
	.card-indicatori {
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: center;
		font-size: 12px;
		color: var(--testo-tenue, #7a828e);
	}
	.card-stato {
		margin-top: 4px;
		font-size: 11px;
		font-weight: 600;
		padding: 2px 10px;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.stato-attivo {
		background: #e6f5ec;
		color: #1a7f4b;
	}
	.stato-in_prova {
		background: var(--cantiere-tenue, #fdf3d7);
		color: #9a6b00;
	}
	.stato-cessato {
		background: #f0f1f3;
		color: #7a828e;
	}
	.vuoto {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 48px 20px;
		background: var(--nebbia-50, #f6f7f9);
		border: 1px dashed var(--bordo, #e2e5ea);
		border-radius: var(--r, 10px);
		color: var(--testo-tenue, #7a828e);
	}
</style>
