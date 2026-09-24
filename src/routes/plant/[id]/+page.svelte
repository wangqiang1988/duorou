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
		deletePhoto,
		updatePhoto
	} from '$lib/repo.svelte';
	import {
		processPhotoFile,
		formatMonth,
		formatDay,
		daysSince,
		isSuspiciousDate
	} from '$lib/photo';
	import { composeTimeline, downloadBlob } from '$lib/compose';
	import type { Photo, PlantWithStats } from '$lib/types';

	let plant = $state<PlantWithStats | null>(null);
	let photos = $state<Photo[]>([]);
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
		photos = await loadPhotos(plantId);
	}

	let cameraRef = $state<HTMLInputElement | null>(null);
	let galleryRef = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let menuOpen = $state(false);
	type Toast =
		| { kind: 'success'; text: string }
		| { kind: 'warn'; text: string }
		| { kind: 'error'; text: string }
		| null;
	let toast = $state<Toast>(null);
	let toastTimer: number | undefined;

	function showToast(t: Toast, ms = 3200) {
		toast = t;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = window.setTimeout(() => (toast = null), ms);
	}

	function openMenu() {
		menuOpen = !menuOpen;
	}
	function closeMenu() {
		menuOpen = false;
	}

	function pickCamera() {
		closeMenu();
		cameraRef?.click();
	}
	function pickGallery() {
		closeMenu();
		galleryRef?.click();
	}

	async function handleFiles(e: Event) {
		if (!plantId) return;
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (files.length === 0) return;

		uploading = true;
		let exifCount = 0;
		let fileCount = 0;
		let nowCount = 0;
		try {
			for (const file of files) {
				const p = await processPhotoFile(file);
				if (p.dateSource === 'exif') exifCount++;
				else if (p.dateSource === 'file') fileCount++;
				else nowCount++;
				await addPhoto({
					plantId,
					takenAt: p.takenAt,
					width: p.width,
					height: p.height,
					mime: p.mime,
					dateSource: p.dateSource,
					orig: p.orig,
					medium: p.medium,
					thumb: p.thumb
				});
			}
			await refresh();

			const parts: string[] = [`已添加 ${files.length} 张`];
			const detail: string[] = [];
			if (exifCount) detail.push(`${exifCount} 张读取了拍摄日期`);
			if (fileCount) detail.push(`${fileCount} 张用了文件时间`);
			if (nowCount) detail.push(`${nowCount} 张用当前时间`);
			if (detail.length) parts.push(`（${detail.join('，')}）`);
			showToast({ kind: 'success', text: parts.join('') });

			const suspicious = photos.filter((p) => isSuspiciousDate(p.takenAt));
			if (suspicious.length > 0) {
				showToast(
					{
						kind: 'warn',
						text: `有 ${suspicious.length} 张照片日期看起来不对，可点照片日期修正`
					},
					5000
				);
			}
		} catch (err) {
			showToast({ kind: 'error', text: '导入失败：' + (err as Error).message });
		} finally {
			uploading = false;
		}
	}

	async function editPhotoDate(photo: Photo) {
		const current = formatDay(photo.takenAt);
		const input = prompt(
			`修改照片日期（YYYY-MM-DD）\n当前：${current}\n来源：${
				photo.dateSource === 'exif'
					? 'EXIF 拍摄日期'
					: photo.dateSource === 'file'
						? '文件修改时间'
						: '当前时间'
			}`,
			current
		);
		if (input === null) return;
		const d = new Date(input + 'T12:00:00');
		if (isNaN(d.getTime())) {
			alert('日期格式无效，请用 YYYY-MM-DD');
			return;
		}
		await updatePhoto(photo.id, plantId, { takenAt: d.getTime() });
		await refresh();
	}

	async function handleDeletePhoto(id: string) {
		if (!confirm('删除这张照片？')) return;
		await deletePhoto(id, plantId);
		await refresh();
	}

	async function handleDeletePlant() {
		if (!plantId) return;
		if (!confirm(`确定删除「${plant?.name}」？相关照片会一并删除。`)) return;
		await deletePlant(plantId);
		goto('/');
	}

	async function handleEdit() {
		if (!plantId || !plant) return;
		const name = prompt('名字', plant.name);
		if (name === null) return;
		const species = prompt('品种', plant.species);
		if (species === null) return;
		const notes = prompt('备注', plant.notes);
		if (notes === null) return;
		await updatePlant(plantId, {
			name: name.trim() || plant.name,
			species: species.trim(),
			notes: notes.trim()
		});
		await refresh();
	}

	function toggleSelect(id: string) {
		selected = selected.includes(id)
			? selected.filter((x) => x !== id)
			: [...selected, id];
	}

	function selectAll() {
		selected = photos.map((p) => p.id);
	}

	function clearSelection() {
		selected = [];
	}

	let selected = $state<string[]>([]);

	function goCompare() {
		if (selected.length !== 2 || !plantId) return;
		goto(`/plant/${plantId}/compare?a=${selected[0]}&b=${selected[1]}`);
	}

	let composing = $state(false);

	async function composeSelected() {
		if (selected.length === 0 || !plant) return;
		composing = true;
		try {
			// 倒序：最新在上
			const ordered = photos
				.filter((p) => selected.includes(p.id))
				.slice()
				.sort((a, b) => b.takenAt - a.takenAt);
			const blob = await composeTimeline({
				plantName: plant.name,
				photos: ordered.map((p) => ({
					id: p.id,
					takenAt: p.takenAt,
					loadBlob: async () => {
						const res = await fetch(`/api/photos/${p.id}/blob?v=medium`);
						return res.blob();
					}
				}))
			});
			const stamp = formatDay(Date.now()).replace(/-/g, '');
			const filename = `${plant.name}-成长-${ordered.length}张-${stamp}.png`;
			downloadBlob(blob, filename);
			showToast({
				kind: 'success',
				text: `已生成 ${ordered.length} 张的拼接图（${(blob.size / 1024).toFixed(0)} KB）`
			});
		} catch (err) {
			showToast({kind: 'error', text: '生成失败：' + (err as Error).message});
		} finally {
			composing = false;
		}
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

	function blobUrl(id: string, v: 'thumb' | 'medium' | 'orig' = 'medium') {
		return `/api/photos/${id}/blob?v=${v}`;
	}
</script>

<input
	bind:this={cameraRef}
	type="file"
	accept="image/*"
	capture="environment"
	onchange={handleFiles}
	class="hidden"
/>
<input
	bind:this={galleryRef}
	type="file"
	accept="image/*"
	multiple
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
				<p class="text-xs text-leaf-600/60 text-center mb-2">
					点击照片可多选 · 顶部生成拼接图或对比
				</p>
				{#if selected.length > 0}
					<div
						class="sticky top-[60px] z-[5] bg-leaf-50 border border-leaf-200 rounded-2xl p-3 mb-4"
					>
						<div class="flex items-center justify-between gap-2 mb-2">
							<div class="text-sm text-leaf-700">
								已选 <span class="font-semibold">{selected.length}</span> 张
							</div>
							<div class="flex gap-1.5">
								{#if selected.length < photos.length}
									<button
										onclick={selectAll}
										class="text-xs px-2.5 py-1.5 rounded-full border border-leaf-200 text-leaf-600 active:bg-leaf-100"
									>
										全选
									</button>
								{/if}
								<button
									onclick={clearSelection}
									class="text-xs px-2.5 py-1.5 rounded-full border border-leaf-200 text-leaf-600 active:bg-leaf-100"
								>
									清空
								</button>
							</div>
						</div>
						<div class="flex gap-2">
							<button
								onclick={composeSelected}
								disabled={composing}
								class="flex-1 text-xs px-3 py-2 rounded-full bg-leaf-600 text-white font-medium disabled:opacity-50 active:bg-leaf-700"
							>
								{composing ? '生成中…' : `📥 生成拼接图（${selected.length} 张）`}
							</button>
							<button
								onclick={goCompare}
								disabled={selected.length !== 2}
								class="text-xs px-3 py-2 rounded-full border border-leaf-300 text-leaf-700 disabled:opacity-40 active:bg-leaf-100"
								title="需要恰好选中 2 张"
							>
								⇆ 对比
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
								<div
									class="relative group"
									role="button"
									tabindex="0"
									onclick={() => toggleSelect(photo.id)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											toggleSelect(photo.id);
										}
									}}
								>
									<div
										class="block w-full aspect-square overflow-hidden rounded-lg bg-leaf-50 relative"
										class:ring-2={selected.includes(photo.id)}
										class:ring-leaf-500={selected.includes(photo.id)}
									>
										<img
											src={blobUrl(photo.id, 'medium')}
											alt=""
											class="w-full h-full object-cover"
											loading="lazy"
										/>
										<button
											type="button"
											onclick={(e) => {
												e.stopPropagation();
												editPhotoDate(photo);
											}}
											class="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/55 px-1.5 py-0.5 rounded backdrop-blur-sm text-left hover:bg-black/75"
											title="点击修改日期"
										>
											{formatDay(photo.takenAt)}
											{#if photo.dateSource === 'exif'}
												<span class="opacity-60">·EXIF</span>
											{/if}
										</button>
										{#if isSuspiciousDate(photo.takenAt)}
											<div
												class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-medium pointer-events-none"
												title="日期看起来不对"
											>
												⚠
											</div>
										{/if}
										{#if selected.includes(photo.id)}
											<div
												class="absolute top-1 right-1 w-5 h-5 rounded-full bg-leaf-500 text-white text-xs flex items-center justify-center pointer-events-none"
											>
												{selected.indexOf(photo.id) + 1}
											</div>
										{/if}
									</div>
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											handleDeletePhoto(photo.id);
										}}
										class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center"
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
	<div class="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-2">
		{#if menuOpen}
			<div
				class="bg-white rounded-2xl shadow-xl shadow-leaf-900/15 border border-leaf-100 overflow-hidden animate-pop-in"
			>
				<button
					type="button"
					onclick={pickCamera}
					disabled={uploading}
					class="flex items-center gap-3 px-4 py-3 w-full text-left text-sm text-leaf-800 hover:bg-leaf-50 active:bg-leaf-100 disabled:opacity-50"
				>
					<span class="text-xl">📷</span>
					<div>
						<div class="font-medium">拍一张</div>
						<div class="text-[11px] text-leaf-600/60">调起相机</div>
					</div>
				</button>
				<div class="border-t border-leaf-100"></div>
				<button
					type="button"
					onclick={pickGallery}
					disabled={uploading}
					class="flex items-center gap-3 px-4 py-3 w-full text-left text-sm text-leaf-800 hover:bg-leaf-50 active:bg-leaf-100 disabled:opacity-50"
				>
					<span class="text-xl">🖼️</span>
					<div>
						<div class="font-medium">从相册选</div>
						<div class="text-[11px] text-leaf-600/60">可多选</div>
					</div>
				</button>
			</div>
		{/if}

		<button
			onclick={openMenu}
			disabled={uploading}
			aria-label="添加照片"
			aria-expanded={menuOpen}
			class="w-14 h-14 rounded-full bg-leaf-600 text-white text-2xl shadow-lg shadow-leaf-700/30 active:scale-95 transition flex items-center justify-center disabled:opacity-60"
			class:rotate-45={menuOpen}
			style="transition: transform 0.18s;"
		>
			{uploading ? '…' : '+'}
		</button>
	</div>

	{#if toast}
		<div
			class="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 max-w-sm px-4 py-2.5 rounded-2xl shadow-lg text-sm animate-pop-in"
			class:bg-white={toast.kind === 'success'}
			class:text-leaf-800={toast.kind === 'success'}
			class:bg-amber-50={toast.kind === 'warn'}
			class:text-amber-800={toast.kind === 'warn'}
			class:bg-red-50={toast.kind === 'error'}
			class:text-red-700={toast.kind === 'error'}
		>
			{toast.text}
		</div>
	{/if}
{/if}