<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		getPlant,
		updatePlant,
		deletePlant,
		loadPhotos,
		addPhoto,
		deletePhoto
	} from '$lib/repo.svelte';
	import { processPhotoForPlant, formatMonth, formatDay, daysSince } from '$lib/photo';
	import type { Photo, Plant } from '$lib/types';

	let plant = $state<Plant | null>(null);
	let photos = $state<Photo[]>([]);
	let urls = $state<Record<string, string>>({});
	let loading = $state(true);

	const plantId = $derived($page.params.id ?? '');

	onMount(async () => {
		if (!plantId) {
			goto('/');
			return;
		}
		await refresh();
		loading = false;
	});

	async function refresh() {
		if (!plantId) return;
		const p = await getPlant(plantId);
		if (!p) {
			goto('/');
			return;
		}
		plant = p;
		const list = await loadPhotos(plantId);
		photos = list;
		revokeAll();
		const next: Record<string, string> = {};
		for (const ph of list) {
			next[ph.id] = URL.createObjectURL(ph.medium);
		}
		urls = next;
	}

	function revokeAll() {
		for (const url of Object.values(urls)) URL.revokeObjectURL(url);
	}

	$effect(() => {
		return () => revokeAll();
	});

	let fileRef = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);

	function openCamera() {
		fileRef?.click();
	}

	async function handleFiles(e: Event) {
		if (!plantId) return;
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;
		uploading = true;
		try {
			for (const file of files) {
				const photo = await processPhotoForPlant(file, plantId);
				await addPhoto(photo);
			}
			input.value = '';
			await refresh();
		} finally {
			uploading = false;
		}
	}

	async function handleDeletePhoto(id: string) {
		if (!confirm('删除这张照片？')) return;
		await deletePhoto(id);
		await refresh();
	}

	async function handleDeletePlant() {
		if (!plantId) return;
		if (!confirm(`确定删除「${plant?.name}」？相关照片会一并删除。`)) return;
		await deletePlant(plantId);
		goto('/');
	}

	async function handleEdit() {
		if (!plantId) return;
		const name = prompt('名字', plant?.name ?? '');
		if (name === null) return;
		const species = prompt('品种', plant?.species ?? '');
		if (species === null) return;
		const notes = prompt('备注', plant?.notes ?? '');
		if (notes === null) return;
		await updatePlant(plantId, {
			name: name.trim() || (plant?.name ?? ''),
			species: species.trim(),
			notes: notes.trim()
		});
		await refresh();
	}

	function pickCompare(id: string) {
		selected = selected.includes(id)
			? selected.filter((x) => x !== id)
			: selected.length < 2
				? [...selected, id]
				: [selected[1], id];
	}

	let selected = $state<string[]>([]);

	function goCompare() {
		if (selected.length !== 2 || !plantId) return;
		goto(`/plant/${plantId}/compare?a=${selected[0]}&b=${selected[1]}`);
	}

	const grouped = $derived.by(() => {
		const map = new Map<string, Photo[]>();
		for (const p of photos) {
			const key = formatMonth(p.takenAt);
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(p);
		}
		return Array.from(map.entries());
	});
</script>

<input
	type="file"
	accept="image/*"
	capture="environment"
	multiple
	bind:this={fileRef}
	onchange={handleFiles}
	class="hidden"
/>

<header
	class="sticky top-0 z-10 bg-soil-50/85 backdrop-blur border-b border-leaf-100 px-4 pt-safe"
>
	<div class="max-w-3xl mx-auto flex items-center justify-between py-3 gap-2">
		<a href="/" class="text-leaf-700 text-sm flex items-center gap-1">‹ 花园</a>
		<h1 class="text-base font-semibold text-leaf-800 truncate flex-1 text-center">
			{plant?.name ?? ''}
		</h1>
		<button
			onclick={handleEdit}
			class="text-leaf-700 text-sm px-1"
			aria-label="编辑"
		>
			编辑
		</button>
	</div>
</header>

<main class="flex-1 px-4 pb-32">
	{#if loading}
		<div class="text-center text-leaf-600/70 py-20">加载中…</div>
	{:else if plant}
		<section class="max-w-3xl mx-auto pt-4 pb-6">
			<div class="text-center">
				{#if plant.species}
					<div class="text-sm text-leaf-600/70">{plant.species}</div>
				{/if}
				<div class="text-3xl font-light text-leaf-700 mt-1">
					陪伴 <span class="font-semibold">{daysSince(plant.acquiredAt)}</span> 天
				</div>
				<div class="text-xs text-leaf-600/60 mt-1">
					{formatDay(plant.acquiredAt)} 起
				</div>
				{#if plant.notes}
					<div
						class="mt-3 mx-auto max-w-xs text-sm text-leaf-700 bg-leaf-50 rounded-xl px-3 py-2 whitespace-pre-wrap"
					>
						{plant.notes}
					</div>
				{/if}
				<button
					onclick={handleDeletePlant}
					class="mt-4 text-xs text-red-500/70 hover:text-red-600"
				>
					删除这株多肉
				</button>
			</div>
		</section>

		<section class="max-w-3xl mx-auto">
			{#if photos.length === 0}
				<div
					class="text-center py-16 border-2 border-dashed border-leaf-200 rounded-2xl bg-white/40"
				>
					<div class="text-5xl mb-2">📷</div>
					<p class="text-sm text-leaf-600/70">还没有照片</p>
					<p class="text-xs text-leaf-600/50 mt-1">点击下方按钮拍下第一张</p>
				</div>
			{:else}
				{#if selected.length > 0}
					<div
						class="sticky top-[60px] z-[5] bg-leaf-50 border border-leaf-200 rounded-2xl p-3 mb-4 flex items-center justify-between"
					>
						<div class="text-sm text-leaf-700">
							已选 {selected.length}/2 张
						</div>
						<div class="flex gap-2">
							<button
								onclick={() => (selected = [])}
								class="text-xs px-3 py-1.5 rounded-full border border-leaf-200 text-leaf-600"
							>
								清空
							</button>
							<button
								onclick={goCompare}
								disabled={selected.length !== 2}
								class="text-xs px-3 py-1.5 rounded-full bg-leaf-600 text-white disabled:opacity-40"
							>
								对比 →
							</button>
						</div>
					</div>
				{/if}

				{#each grouped as [month, list] (month)}
					<div class="mb-6">
						<h2
							class="sticky top-[60px] z-[4] bg-soil-50/90 backdrop-blur-sm text-sm font-medium text-leaf-700 py-2 -mx-1 px-1"
						>
							{month}
						</h2>
						<div class="grid grid-cols-3 gap-1.5">
							{#each list as photo (photo.id)}
								<div class="relative group">
									<button
										type="button"
										onclick={() => pickCompare(photo.id)}
										class="block w-full aspect-square overflow-hidden rounded-lg bg-leaf-50 relative"
										class:ring-2={selected.includes(photo.id)}
										class:ring-leaf-500={selected.includes(photo.id)}
									>
										<img
											src={urls[photo.id]}
											alt=""
											class="w-full h-full object-cover"
											loading="lazy"
										/>
										<div
											class="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/45 px-1.5 py-0.5 rounded backdrop-blur-sm"
										>
											{formatDay(photo.takenAt)}
										</div>
										{#if selected.includes(photo.id)}
											<div
												class="absolute top-1 right-1 w-5 h-5 rounded-full bg-leaf-500 text-white text-xs flex items-center justify-center"
											>
												{selected.indexOf(photo.id) + 1}
											</div>
										{/if}
									</button>
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											handleDeletePhoto(photo.id);
										}}
										class="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/55 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center"
										aria-label="删除"
									>
										✕
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</section>
	{/if}
</main>

{#if plant}
	<button
		onclick={openCamera}
		disabled={uploading}
		aria-label="拍照"
		class="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-leaf-600 text-white text-2xl shadow-lg shadow-leaf-700/30 active:scale-95 transition flex items-center justify-center disabled:opacity-60"
	>
		{uploading ? '…' : '📷'}
	</button>
{/if}