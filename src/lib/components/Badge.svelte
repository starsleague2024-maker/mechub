<script lang="ts">
	let { label, colore = 'neutro' }: { label: string; colore?: string } = $props();
</script>

<span class="badge {colore}">{label}</span>
