<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>多肉成长记</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
	{@render children()}
</div>