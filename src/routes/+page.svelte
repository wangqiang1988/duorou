<script lang="ts">
	import { plants, loadPlants, deletePlant } from '$lib/repo.svelte';
	import { daysSince } from '$lib/photo';
	import PlantCard from '$lib/components/PlantCard.svelte';

	let loaded = $state(false);

	onMount(async () => {
		await loadPlants();
		loaded = true;
	});

	async function handleDelete(id: string) {
		if (!confirm('确定删除这株多肉？相关照片会一并删除。')) return;
		await deletePlant(id);
	}

	function handleNew() {
		goto('/plant/new');
	}

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
</script>

<header
	class="sticky top-0 z-10 bg-soil-50/85 backdrop-blur border-b border-leaf-100 px-4 pt-safe"
>
	<div class="max-w-3xl mx-auto flex items-center justify-between py-3">
		<div>
			<h1 class="text-xl font-semibold text-leaf-800">多肉成长记</h1>
			<p class="text-xs text-leaf-600/70">记录每一片叶子的时光</p>
		</div>
		<a
			href="/settings"
			class="w-9 h-9 rounded-full bg-white border border-leaf-100 flex items-center justify-center text-leaf-700"
			aria-label="设置"
		>
			⚙
		</a>
	</div>
</header>

<main class="flex-1 px-4 pb-24">
	<div class="max-w-3xl mx-auto pt-4">
		{#if !loaded}
			<div class="text-center text-leaf-600/70 py-20">加载中…</div>
		{:else if plants.length === 0}
			<div class="text-center py-24">
				<div class="text-7xl mb-4">🪴</div>
				<h2 class="text-lg text-leaf-700 mb-2">还没有多肉</h2>
				<p class="text-sm text-leaf-600/70 mb-6">
					添加你的第一株多肉，开始记录它的成长
				</p>
				<button
					onclick={handleNew}
					class="px-5 py-2.5 rounded-full bg-leaf-600 text-white text-sm font-medium shadow-sm active:scale-95 transition"
				>
					+ 添加多肉
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{#each plants as plant (plant.id)}
					<PlantCard {plant} onDelete={handleDelete} />
				{/each}
			</div>
		{/if}
	</div>
</main>

{#if loaded && plants.length > 0}
	<button
		onclick={handleNew}
		aria-label="添加多肉"
		class="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-leaf-600 text-white text-2xl shadow-lg shadow-leaf-700/30 active:scale-95 transition flex items-center justify-center"
	>
		+
	</button>
{/if}