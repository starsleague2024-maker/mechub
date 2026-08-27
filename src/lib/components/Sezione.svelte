<script lang="ts">
	let {
		titolo,
		descrizione = '',
		aperta = $bindable(false),
		badge = '',
		children
	}: {
		titolo: string;
		descrizione?: string;
		aperta?: boolean;
		badge?: string | number;
		children: import('svelte').Snippet;
	} = $props();
</script>

<section class="sez panel">
	<button class="sez-head" onclick={() => (aperta = !aperta)} aria-expanded={aperta}>
		<span class="freccia" class:giu={aperta}>▸</span>
		<span class="sez-titolo">{titolo}</span>
		{#if badge !== '' && badge !== 0}<span class="sez-badge mono">{badge}</span>{/if}
		{#if descrizione}<span class="sez-desc">{descrizione}</span>{/if}
	</button>
	{#if aperta}
		<div class="sez-corpo">
			{@render children()}
		</div>
	{/if}
</section>

<style>
	.sez {
		overflow: hidden;
	}
	.sez-head {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 15px 18px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}
	.sez-head:hover {
		background: var(--nebbia-50);
	}
	.freccia {
		color: var(--acciaio-400);
		transition: transform 0.15s;
		flex-shrink: 0;
	}
	.freccia.giu {
		transform: rotate(90deg);
	}
	.sez-titolo {
		font-family: var(--display);
		font-weight: 600;
		font-size: 16px;
		color: var(--grafite-900);
	}
	.sez-badge {
		background: var(--cantiere-tenue);
		color: #97690a;
		border-radius: 999px;
		padding: 1px 9px;
		font-size: 12px;
		font-weight: 600;
	}
	.sez-desc {
		color: var(--testo-tenue);
		font-size: 12.5px;
		margin-left: auto;
	}
	.sez-corpo {
		padding: 4px 18px 20px;
		border-top: 1px solid var(--bordo);
	}
	@media (prefers-reduced-motion: reduce) {
		.freccia {
			transition: none;
		}
	}
</style>
