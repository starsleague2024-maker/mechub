<script lang="ts">
	// Campo di testo con salvataggio automatico su blur.
	// Mostra lo stato (salvato / in corso / errore) e consente il ripristino
	// all'ultimo valore salvato finché la modifica non è confermata.
	interface Props {
		campo: string;
		etichetta: string;
		valoreIniziale: string | null | undefined;
		placeholder?: string;
		mono?: boolean;
		type?: string;
		maxlength?: number;
	}
	let {
		campo,
		etichetta,
		valoreIniziale,
		placeholder = '',
		mono = false,
		type = 'text',
		maxlength
	}: Props = $props();

	let salvato = $state(valoreIniziale ?? '');
	let valore = $state(valoreIniziale ?? '');
	let stato = $state<'idle' | 'saving' | 'ok' | 'error'>('idle');
	let messaggio = $state('');

	const modificato = $derived(valore !== salvato);

	async function salva() {
		if (valore === salvato) return; // niente da salvare
		stato = 'saving';
		messaggio = '';
		try {
			const res = await fetch('/impostazioni/profilo', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ campo, valore })
			});
			if (!res.ok) {
				const t = await res.text();
				stato = 'error';
				messaggio = t || 'Errore di salvataggio';
				return;
			}
			const dati = await res.json();
			salvato = dati.valore ?? '';
			valore = salvato;
			stato = 'ok';
			setTimeout(() => {
				if (stato === 'ok') stato = 'idle';
			}, 1800);
		} catch (e) {
			stato = 'error';
			messaggio = 'Connessione assente';
		}
	}

	function ripristina() {
		valore = salvato;
		stato = 'idle';
		messaggio = '';
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && type !== 'textarea') {
			(e.target as HTMLInputElement).blur();
		}
		if (e.key === 'Escape') ripristina();
	}
</script>

<div class="field">
	<label for={`ca-${campo}`}>
		{etichetta}
		{#if stato === 'saving'}<span class="stato saving">salvataggio…</span>
		{:else if stato === 'ok'}<span class="stato ok">salvato ✓</span>
		{:else if stato === 'error'}<span class="stato err">{messaggio}</span>
		{:else if modificato}<span class="stato mod">non salvato</span>{/if}
	</label>
	<div class="riga">
		<input
			id={`ca-${campo}`}
			class="input"
			class:mono
			class:err={stato === 'error'}
			{type}
			{placeholder}
			maxlength={maxlength ?? null}
			bind:value={valore}
			onblur={salva}
			onkeydown={onKey}
		/>
		{#if modificato}
			<button type="button" class="ripr" onclick={ripristina} title="Ripristina ultimo valore salvato">↺</button>
		{/if}
	</div>
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	label {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--testo-tenue);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.stato {
		font-weight: 500;
		font-size: 11px;
		padding: 1px 7px;
		border-radius: 999px;
	}
	.stato.saving {
		color: var(--acciaio-500, #667);
		background: var(--acciaio-100, #eef);
	}
	.stato.ok {
		color: #1a7f4b;
		background: #e6f5ec;
	}
	.stato.err {
		color: var(--rosso, #c0392b);
		background: #fdecea;
	}
	.stato.mod {
		color: #9a6b00;
		background: var(--cantiere-tenue, #fdf3d7);
	}
	.riga {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.riga .input {
		flex: 1;
	}
	.input.err {
		border-color: var(--rosso, #c0392b);
	}
	.ripr {
		background: var(--nebbia-50, #f4f5f7);
		border: 1px solid var(--bordo, #dde);
		border-radius: var(--r, 8px);
		width: 34px;
		height: 34px;
		cursor: pointer;
		font-size: 16px;
		color: var(--testo-tenue);
		flex-shrink: 0;
	}
	.ripr:hover {
		background: var(--cantiere-tenue, #fdf3d7);
		color: var(--testo);
	}
</style>
