<script lang="ts">
	let {
		titolo,
		testo,
		children
	}: { titolo: string; testo?: string; children?: import('svelte').Snippet } = $props();
</script>

<div class="vuoto">
	<h3>{titolo}</h3>
	{#if testo}<p>{testo}</p>{/if}
	{#if children}<div class="mt-2">{@render children()}</div>{/if}
</div>
