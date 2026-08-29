<script lang="ts">
	// Griglia orari 7 giorni (lun→dom). Ogni giorno: aperto/chiuso, entrata,
	// uscita, pausa. Tasto "applica a tutti" copia il primo giorno compilato.
	// Emette i dati via callback onChange; il salvataggio è gestito dal padre.
	interface Giorno {
		aperto: boolean;
		entrata: string;
		uscita: string;
		pausa_inizio: string;
		pausa_fine: string;
	}
	interface Props {
		valore?: Record<string, Giorno> | null;
		onChange?: (dati: Record<string, Giorno>) => void;
	}
	let { valore = null, onChange }: Props = $props();

	const NOMI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

	function vuoto(): Giorno {
		return { aperto: false, entrata: '', uscita: '', pausa_inizio: '', pausa_fine: '' };
	}

	// stato locale: 7 giorni
	let giorni = $state<Giorno[]>(
		Array.from({ length: 7 }, (_, i) => {
			const g = valore?.[String(i)];
			return g ? { ...vuoto(), ...g } : vuoto();
		})
	);

	function emit() {
		const out: Record<string, Giorno> = {};
		giorni.forEach((g, i) => (out[String(i)] = { ...g }));
		onChange?.(out);
	}

	function applicaATutti(da: number) {
		const modello = giorni[da];
		giorni = giorni.map(() => ({ ...modello }));
		emit();
	}
</script>

<div class="orari">
	{#each giorni as g, i}
		<div class="riga" class:chiuso={!g.aperto}>
			<label class="giorno">
				<input type="checkbox" bind:checked={g.aperto} onchange={emit} />
				<span>{NOMI[i]}</span>
			</label>
			{#if g.aperto}
				<div class="campi">
					<div class="campo">
						<span class="lab">Entrata</span>
						<input type="time" bind:value={g.entrata} onchange={emit} class="input mono" />
					</div>
					<div class="campo">
						<span class="lab">Uscita</span>
						<input type="time" bind:value={g.uscita} onchange={emit} class="input mono" />
					</div>
					<div class="campo pausa">
						<span class="lab">Pausa</span>
						<div class="pausa-campi">
							<input type="time" bind:value={g.pausa_inizio} onchange={emit} class="input mono" />
							<span class="sep">–</span>
							<input type="time" bind:value={g.pausa_fine} onchange={emit} class="input mono" />
						</div>
					</div>
					<button type="button" class="applica" onclick={() => applicaATutti(i)} title="Applica questo orario a tutti i giorni">
						↧ tutti
					</button>
				</div>
			{:else}
				<span class="chiuso-lab">Chiuso</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.orari {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.riga {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 8px 10px;
		background: var(--nebbia-50, #f6f7f9);
		border: 1px solid var(--bordo, #e2e5ea);
		border-radius: var(--r, 8px);
		flex-wrap: wrap;
	}
	.riga.chiuso {
		opacity: 0.65;
	}
	.giorno {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 120px;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
	}
	.campi {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		flex-wrap: wrap;
	}
	.campo {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.lab {
		font-size: 11px;
		color: var(--testo-tenue, #7a828e);
		font-weight: 500;
	}
	.pausa-campi {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.sep {
		color: var(--testo-tenue, #7a828e);
	}
	.input {
		padding: 5px 8px;
	}
	.applica {
		background: var(--cantiere-tenue, #fdf3d7);
		border: 1px solid var(--bordo, #e2e5ea);
		border-radius: var(--r, 8px);
		padding: 6px 10px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		height: 32px;
	}
	.applica:hover {
		background: var(--cantiere, #f5b301);
	}
	.chiuso-lab {
		font-size: 13px;
		color: var(--testo-tenue, #7a828e);
		font-style: italic;
	}
</style>
