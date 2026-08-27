<script lang="ts">
	// Albero competenze collassabile e riutilizzabile.
	// - `competenze`: elenco piatto con id, nome, competenza_padre_id, selezionabile, ordine
	// - `attive`: Set di id competenza attualmente attivi (officina o persona)
	// - `ontoggle`: callback(id, nuovoStato) quando l'utente spunta/despunta un nodo
	// Non fa fetch: riceve i dati e notifica i cambiamenti al genitore.

	type Nodo = {
		id: string;
		nome: string;
		competenza_padre_id: string | null;
		selezionabile: boolean;
		ordine: number | null;
	};

	let {
		competenze = [],
		attive = new Set<string>(),
		ontoggle
	}: {
		competenze: Nodo[];
		attive: Set<string>;
		ontoggle: (id: string, nuovoStato: boolean) => void;
	} = $props();

	let ricerca = $state('');
	let espansi = $state<Record<string, boolean>>({});

	// indicizza figli per padre
	const figliDi = $derived.by(() => {
		const m = new Map<string | null, Nodo[]>();
		for (const c of competenze) {
			const k = c.competenza_padre_id;
			if (!m.has(k)) m.set(k, []);
			m.get(k)!.push(c);
		}
		for (const arr of m.values())
			arr.sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999) || a.nome.localeCompare(b.nome));
		return m;
	});

	const radici = $derived(figliDi.get(null) ?? []);

	// Con ricerca attiva: quali id mostrare (il nodo che matcha + i suoi antenati)
	const idVisibili = $derived.by(() => {
		const q = ricerca.trim().toLowerCase();
		if (!q) return null; // null = nessun filtro
		const perId = new Map(competenze.map((c) => [c.id, c]));
		const visibili = new Set<string>();
		for (const c of competenze) {
			if (c.nome.toLowerCase().includes(q)) {
				visibili.add(c.id);
				let p = c.competenza_padre_id;
				while (p) {
					visibili.add(p);
					p = perId.get(p)?.competenza_padre_id ?? null;
				}
			}
		}
		return visibili;
	});

	function haFigli(id: string): boolean {
		return (figliDi.get(id)?.length ?? 0) > 0;
	}
	function espanso(id: string): boolean {
		// in ricerca tutto espanso; altrimenti stato manuale
		if (idVisibili) return true;
		return !!espansi[id];
	}
	function toggleEspansione(id: string) {
		espansi[id] = !espansi[id];
	}
	function conteggioAttiveSotto(id: string): number {
		let n = 0;
		const stack = [...(figliDi.get(id) ?? [])];
		while (stack.length) {
			const c = stack.pop()!;
			if (attive.has(c.id)) n++;
			stack.push(...(figliDi.get(c.id) ?? []));
		}
		return n;
	}
</script>

<div class="albero-wrap">
	<input class="input ricerca" placeholder="Cerca competenza…" bind:value={ricerca} />

	<div class="albero" role="tree">
		{#each radici as nodo (nodo.id)}
			{@render ramo(nodo, 0)}
		{/each}
	</div>
</div>

{#snippet ramo(nodo: Nodo, livello: number)}
	{#if !idVisibili || idVisibili.has(nodo.id)}
		{@const figli = figliDi.get(nodo.id) ?? []}
		{@const conFigli = figli.length > 0}
		{@const sottoAttive = conteggioAttiveSotto(nodo.id)}
		<div class="nodo" style="--liv: {livello}">
			<div class="riga" class:contenitore={!nodo.selezionabile}>
				{#if conFigli}
					<button class="tog" onclick={() => toggleEspansione(nodo.id)} aria-label="Espandi">
						<span class="freccia" class:giu={espanso(nodo.id)}>▸</span>
					</button>
				{:else}
					<span class="tog-spazio"></span>
				{/if}

				{#if nodo.selezionabile}
					<label class="voce">
						<input
							type="checkbox"
							checked={attive.has(nodo.id)}
							onchange={(e) => ontoggle(nodo.id, e.currentTarget.checked)}
						/>
						<span class="nome">{nodo.nome}</span>
					</label>
				{:else}
					<button class="voce contenitore-btn" onclick={() => toggleEspansione(nodo.id)}>
						<span class="nome contenitore-nome">{nodo.nome}</span>
						{#if sottoAttive > 0}<span class="conta mono">{sottoAttive}</span>{/if}
					</button>
				{/if}
			</div>

			{#if conFigli && espanso(nodo.id)}
				<div class="figli">
					{#each figli as f (f.id)}
						{@render ramo(f, livello + 1)}
					{/each}
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

<style>
	.albero-wrap {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.ricerca {
		max-width: 320px;
	}
	.albero {
		border: 1px solid var(--bordo);
		border-radius: var(--r);
		padding: 6px;
		max-height: 460px;
		overflow-y: auto;
	}
	.riga {
		display: flex;
		align-items: center;
		gap: 4px;
		padding-left: calc(var(--liv, 0) * 20px);
		border-radius: var(--r-sm);
	}
	.riga:hover {
		background: var(--nebbia-50);
	}
	.tog {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 2px;
		color: var(--acciaio-400);
		flex-shrink: 0;
	}
	.tog-spazio {
		width: 16px;
		flex-shrink: 0;
	}
	.freccia {
		display: inline-block;
		transition: transform 0.12s;
		font-size: 11px;
	}
	.freccia.giu {
		transform: rotate(90deg);
	}
	.voce {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 6px;
		flex: 1;
		cursor: pointer;
		background: none;
		border: none;
		text-align: left;
		font-size: 13.5px;
	}
	.voce input[type='checkbox'] {
		width: 15px;
		height: 15px;
		cursor: pointer;
	}
	.contenitore-nome {
		font-family: var(--display);
		font-weight: 600;
		color: var(--grafite-700);
	}
	.conta {
		background: var(--verde-tenue);
		color: #1c7a45;
		border-radius: 999px;
		padding: 0 7px;
		font-size: 11px;
		font-weight: 600;
	}
	.nome {
		color: var(--testo);
	}
	@media (prefers-reduced-motion: reduce) {
		.freccia {
			transition: none;
		}
	}
</style>
