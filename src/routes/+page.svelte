<script lang="ts">
	import {
		plants,
		plantsState,
		loadPlants,
		setPlantsMode,
		deletePlant
	} from '$lib/repo.svelte';
	import PlantCard from '$lib/components/PlantCard.svelte';
	import { groupBySpecies, type SpeciesGroup } from '$lib/grouping';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let loaded = $state(false);
	let activeFilter = $state<'all' | string>('all');

	const groups = $derived(loaded ? groupBySpecies(plants) : []);
	const hasUnclassified = $derived(plants.some((p) => !p.species.trim()));

	onMount(async () => {
		await loadPlants();
		loaded = true;
	});

	async function handleDelete(id: string) {
		if (!confirm('确定删除这株多肉？相关照片会一并删除。此操作无法撤销。')) return;
		if (!confirm('确认删除？')) return;
		await deletePlant(id);
	}

	function handleNew() {
		goto('/plant/new');
	}

	function setFilter(name: 'all' | string) {
		activeFilter = name;
	}

	async function switchMode(mode: 'alive' | 'dead') {
		if (mode === plantsState.mode) return;
		activeFilter = 'all';
		await setPlantsMode(mode);
	}

	const visiblePlants = $derived(
		activeFilter === 'all'
			? plants
			: activeFilter === '__unclassified__'
				? plants.filter((p) => !p.species.trim())
				: plants.filter((p) => p.species.trim() === activeFilter)
	);
</script>

<header
	class="sticky top-0 z-20 bg-soil-50/85 backdrop-blur border-b border-leaf-100 px-4 pt-safe"
>
	<div class="max-w-3xl mx-auto py-3 flex items-center justify-between gap-2">
		<div class="min-w-0">
			<h1 class="text-xl font-semibold text-leaf-800">多肉成长记</h1>
			<p class="text-xs text-leaf-600/70">记录每一片叶子的时光</p>
		</div>
		<a
			href="/settings"
			class="w-9 h-9 rounded-full bg-white border border-leaf-100 flex items-center justify-center text-leaf-700 flex-shrink-0"
			aria-label="设置"
		>
			⚙
		</a>
	</div>

	<!-- 花园 / 纪念碑 tab -->
	<div class="max-w-3xl mx-auto pb-2 flex gap-1">
		<button
			type="button"
			onclick={() => switchMode('alive')}
			class="flex-1 text-sm py-1.5 rounded-full font-medium transition"
			class:bg-leaf-600={plantsState.mode === 'alive'}
			class:text-white={plantsState.mode === 'alive'}
			class:bg-white={plantsState.mode !== 'alive'}
			class:border={plantsState.mode !== 'alive'}
			class:border-leaf-200={plantsState.mode !== 'alive'}
			class:text-leaf-700={plantsState.mode !== 'alive'}
		>
			🌱 花园
		</button>
		<button
			type="button"
			onclick={() => switchMode('dead')}
			class="flex-1 text-sm py-1.5 rounded-full font-medium transition"
			class:bg-leaf-600={plantsState.mode === 'dead'}
			class:text-white={plantsState.mode === 'dead'}
			class:bg-white={plantsState.mode !== 'dead'}
			class:border={plantsState.mode !== 'dead'}
			class:border-leaf-200={plantsState.mode !== 'dead'}
			class:text-leaf-700={plantsState.mode !== 'dead'}
		>
			🪦 纪念碑
		</button>
	</div>

	{#if loaded && plants.length > 0}
		<div class="max-w-3xl mx-auto pb-2 -mx-4 px-4 overflow-x-auto no-scrollbar">
			<div class="flex gap-1.5 w-max">
				<button
					type="button"
					onclick={() => setFilter('all')}
					class="text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition"
					class:bg-leaf-600={activeFilter === 'all'}
					class:text-white={activeFilter === 'all'}
					class:bg-white={activeFilter !== 'all'}
					class:border={activeFilter !== 'all'}
					class:border-leaf-200={activeFilter !== 'all'}
					class:text-leaf-700={activeFilter !== 'all'}
				>
					全部 {plants.length}
				</button>
				{#each groups as g (g.species)}
					<button
						type="button"
						onclick={() => setFilter(g.species)}
						class="text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition"
						class:bg-leaf-600={activeFilter === g.species}
						class:text-white={activeFilter === g.species}
						class:bg-white={activeFilter !== g.species}
						class:border={activeFilter !== g.species}
						class:border-leaf-200={activeFilter !== g.species}
						class:text-leaf-700={activeFilter !== g.species}
					>
						{g.species} {g.plants.length}
					</button>
				{/each}
				{#if hasUnclassified}
					<button
						type="button"
						onclick={() => setFilter('__unclassified__')}
						class="text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition"
						class:bg-leaf-600={activeFilter === '__unclassified__'}
						class:text-white={activeFilter === '__unclassified__'}
						class:bg-white={activeFilter !== '__unclassified__'}
						class:border={activeFilter !== '__unclassified__'}
						class:border-leaf-200={activeFilter !== '__unclassified__'}
						class:text-leaf-700={activeFilter !== '__unclassified__'}
					>
						其他 {plants.filter((p) => !p.species.trim()).length}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</header>

<main class="flex-1 px-4 pb-24">
	<div class="max-w-3xl mx-auto pt-4">
		{#if !loaded}
			<div class="text-center text-leaf-600/70 py-20">加载中…</div>
		{:else if plants.length === 0}
			<div class="text-center py-24">
				<div class="text-7xl mb-4">{plantsState.mode === 'dead' ? '🪦' : '🪴'}</div>
				<h2 class="text-lg text-leaf-700 mb-2">
					{plantsState.mode === 'dead' ? '还没有纪念碑' : '还没有多肉'}
				</h2>
				<p class="text-sm text-leaf-600/70 mb-6">
					{plantsState.mode === 'dead'
						? '希望这里永远是空的'
						: '添加你的第一株多肉，开始记录它的成长'}
				</p>
				{#if plantsState.mode === 'alive'}
					<button
						onclick={handleNew}
						class="px-5 py-2.5 rounded-full bg-leaf-600 text-white text-sm font-medium shadow-sm active:scale-95 transition"
					>
						+ 添加多肉
					</button>
				{/if}
			</div>
		{:else if visiblePlants.length === 0}
			<div class="text-center py-16 text-leaf-600/70 text-sm">
				这个分类下还没有{plantsState.mode === 'dead' ? '纪念碑' : '多肉'}
			</div>
		{:else}
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{#each visiblePlants as plant (plant.id)}
					<PlantCard {plant} onDelete={handleDelete} />
				{/each}
			</div>
		{/if}
	</div>
</main>

{#if loaded && plants.length > 0 && plantsState.mode === 'alive'}
	<button
		onclick={handleNew}
		aria-label="添加多肉"
		class="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-leaf-600 text-white text-2xl shadow-lg shadow-leaf-700/30 active:scale-95 transition flex items-center justify-center"
	>
		+
	</button>
{/if}