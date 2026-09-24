<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getPhoto, getPlant } from '$lib/repo.svelte';
	import { formatDay } from '$lib/photo';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import type { Photo, Plant } from '$lib/types';

	let plant = $state<Plant | null>(null);
	let photoA = $state<Photo | null>(null);
	let photoB = $state<Photo | null>(null);
	let urlA = $state<string>('');
	let urlB = $state<string>('');
	let loading = $state(true);

	const plantId = $derived($page.params.id ?? '');
	const aId = $derived($page.url.searchParams.get('a') ?? '');
	const bId = $derived($page.url.searchParams.get('b') ?? '');

	onMount(() => {
		if (!aId || !bId || !plantId) {
			goto(`/plant/${plantId}`);
			return;
		}
		(async () => {
			const [p, a, b] = await Promise.all([
				getPlant(plantId),
				getPhoto(aId),
				getPhoto(bId)
			]);
			if (!p || !a || !b) {
				goto(`/plant/${plantId}`);
				return;
			}
			plant = p;
			photoA = a;
			photoB = b;
			urlA = URL.createObjectURL(a.medium);
			urlB = URL.createObjectURL(b.medium);
			loading = false;
		})();

		return () => {
			if (urlA) URL.revokeObjectURL(urlA);
			if (urlB) URL.revokeObjectURL(urlB);
		};
	});

	function swap() {
		goto(`/plant/${plantId}/compare?a=${bId}&b=${aId}`);
	}
</script>

<header
	class="sticky top-0 z-10 bg-soil-50/85 backdrop-blur border-b border-leaf-100 px-4 pt-safe"
>
	<div class="max-w-3xl mx-auto flex items-center justify-between py-3">
		<a href="/plant/{plantId}" class="text-leaf-700 text-sm flex items-center gap-1"
			>‹ {plant?.name ?? '返回'}</a
		>
		<h1 class="text-base font-semibold text-leaf-800">成长对比</h1>
		<button onclick={swap} class="text-leaf-700 text-sm">⇄ 互换</button>
	</div>
</header>

<main class="flex-1 px-4 pb-12">
	<div class="max-w-3xl mx-auto pt-4">
		{#if loading}
			<div class="text-center text-leaf-600/70 py-20">加载中…</div>
		{:else if photoA && photoB}
			<div class="text-center mb-3 text-sm text-leaf-700">
				<span class="font-medium">{formatDay(photoA.takenAt)}</span>
				<span class="mx-2 text-leaf-600/50">→</span>
				<span class="font-medium">{formatDay(photoB.takenAt)}</span>
				<span class="ml-2 text-leaf-600/50"
					>{Math.abs(
						Math.round((photoB.takenAt - photoA.takenAt) / 86400000)
					)} 天</span
				>
			</div>

			<CompareSlider
				beforeUrl={urlA}
				afterUrl={urlB}
				beforeLabel={formatDay(photoA.takenAt)}
				afterLabel={formatDay(photoB.takenAt)}
			/>

			<p class="text-center text-xs text-leaf-600/60 mt-3">
				左右拖动滑块查看变化
			</p>
		{/if}
	</div>
</main>