<script lang="ts">
	import { daysSince } from '$lib/photo';
	import type { PlantWithStats } from '$lib/types';

	interface Props {
		plant: PlantWithStats;
		onDelete?: (id: string) => void;
	}

	let { plant, onDelete }: Props = $props();
	let days = $derived(daysSince(plant.acquiredAt));
</script>

<a
	href="/plant/{plant.id}"
	class="block bg-white rounded-2xl overflow-hidden shadow-sm shadow-leaf-900/5 hover:shadow-md transition active:scale-[0.98]"
>
	<div class="aspect-square bg-leaf-50 overflow-hidden relative">
		{#if plant.coverPhotoId}
			<img
				src={'/api/photos/' + plant.coverPhotoId + '/blob?v=thumb'}
				alt={plant.name}
				class="w-full h-full object-cover"
				loading="lazy"
			/>
		{:else}
			<div class="w-full h-full flex items-center justify-center text-5xl">
				🪴
			</div>
		{/if}
		{#if plant.photoCount > 0}
			<div
				class="absolute bottom-1.5 right-1.5 bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm"
			>
				📷 {plant.photoCount}
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