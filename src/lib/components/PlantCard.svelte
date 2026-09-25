<script lang="ts">
	import { daysSince } from '$lib/photo';
	import type { PlantWithStats } from '$lib/types';

	interface Props {
		plant: PlantWithStats;
		onDelete?: (id: string) => void;
	}

	let { plant, onDelete }: Props = $props();

	let days = $derived(daysSince(plant.acquiredAt));
	let memorial = $derived(plant.diedAt != null);
	let memorialDays = $derived(plant.diedAt ? daysSince(plant.diedAt) : 0);
</script>

<a
	href="/plant/{plant.id}"
	class="block bg-white rounded-2xl overflow-hidden shadow-sm shadow-leaf-900/5 hover:shadow-md transition active:scale-[0.98]"
	class:opacity-75={memorial}
>
	<div class="aspect-square bg-leaf-50 overflow-hidden relative">
		{#if plant.coverPhotoId}
			<img
				src={'/api/photos/' + plant.coverPhotoId + '/blob?v=thumb'}
				alt={plant.name}
				class="w-full h-full object-cover"
				class:grayscale={memorial}
				loading="lazy"
			/>
		{:else}
			<div class="w-full h-full flex items-center justify-center text-5xl">
				{memorial ? '🪦' : '🪴'}
			</div>
		{/if}
		{#if plant.photoCount > 0}
			<div
				class="absolute bottom-1.5 right-1.5 bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm"
			>
				📷 {plant.photoCount}
			</div>
		{/if}
		{#if memorial}
			<div
				class="absolute top-1.5 left-1.5 bg-leaf-900/70 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm"
			>
				🪦 纪念
			</div>
		{/if}
	</div>
	<div class="p-2.5">
		<div class="text-sm font-medium text-leaf-800 truncate">{plant.name}</div>
		{#if plant.species}
			<div class="text-[11px] text-leaf-600/70 truncate">{plant.species}</div>
		{/if}
		<div class="text-[10px] text-leaf-600/50 mt-0.5">
			{#if memorial}
				陪伴 {days} 天 · 已离去 {memorialDays} 天
			{:else}
				陪伴 {days} 天
			{/if}
		</div>
	</div>
</a>