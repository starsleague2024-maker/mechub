<script lang="ts">
	import { onMount } from 'svelte';

	let {
		titolo,
		aperto = $bindable(),
		onchiudi,
		children,
		azioni
	}: {
		titolo: string;
		aperto: boolean;
		onchiudi?: () => void;
		children: import('svelte').Snippet;
		azioni?: import('svelte').Snippet;
	} = $props();

	function chiudi() {
		aperto = false;
		onchiudi?.();
	}

	function keydown(e: KeyboardEvent) {
		if (e.key === 'Escape') chiudi();
	}

	onMount(() => {
		document.addEventListener('keydown', keydown);
		return () => document.removeEventListener('keydown', keydown);
	});
</script>

{#if aperto}
	<div
		class="overlay"
		role="button"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) chiudi();
		}}
		onkeydown={() => {}}
	>
		<div class="modal panel" role="dialog" aria-modal="true" aria-label={titolo}>
			<header>
				<h2>{titolo}</h2>
				<button class="btn btn-ghost btn-sm" onclick={chiudi} aria-label="Chiudi">✕</button>
			</header>
			<div class="corpo">
				{@render children()}
			</div>
			{#if azioni}
				<footer>{@render azioni()}</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(22, 24, 29, 0.55);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 48px 16px;
		z-index: 100;
		overflow-y: auto;
	}
	.modal {
		width: 100%;
		max-width: 560px;
		box-shadow: var(--ombra-lg);
		animation: sali 0.16s ease-out;
	}
	@keyframes sali {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--bordo);
	}
	header h2 {
		font-size: 18px;
	}
	.corpo {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 14px 20px;
		border-top: 1px solid var(--bordo);
		background: var(--nebbia-50);
		border-radius: 0 0 var(--r-lg) var(--r-lg);
	}
	@media (prefers-reduced-motion: reduce) {
		.modal {
			animation: none;
		}
	}
</style>
