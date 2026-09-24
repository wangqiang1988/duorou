<script lang="ts">
	import { photoCovers, photoCounts } from '$lib/repo.svelte';
	import { daysSince } from '$lib/photo';
	import type { Plant } from '$lib/types';

	interface Props {
		plant: Plant;
		onDelete?: (id: string) => void;
	}

	let { plant, onDelete }: Props = $props();
	let coverUrl = $derived(photoCovers[plant.id]);
	let count = $derived(photoCounts[plant.id] ?? 0);
	let days = $derived(daysSince(plant.acquiredAt));
</script>

<a
	href="/plant/{plant.id}"
	class="block bg-white rounded-2xl overflow-hidden shadow-sm shadow-leaf-900/5 hover:shadow-md transition active:scale-[0.98]"
>
	<div class="aspect-square bg-leaf-50 overflow-hidden relative">
		{#if coverUrl}
			<img
				src={coverUrl}
				alt={plant.name}
				class="w-full h-full object-cover"
				loading="lazy"
			/>
		{:else}
			<div class="w-full h-full flex items-center justify-center text-5xl">
				🪴
			</div>
		{/if}
		{#if count > 0}
			<div
				class="absolute bottom-1.5 right-1.5 bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm"
			>
				📷 {count}
			</div>
		{/if}
	</div>
	<div class="p-2.5">
		<div class="text-sm font-medium text-leaf-800 truncate">{plant.name}</div>
		{#if plant.species}
			<div class="text-[11px] text-leaf-600/70 truncate">{plant.species}</div>
		{/if}
		<div class="text-[10px] text-leaf-600/50 mt-0.5">
			陪伴 {days} 天
		</div>
	</div>
</a>