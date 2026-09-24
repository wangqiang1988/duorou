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
	import { composeTimeline, saveImage } from '$lib/compose';
	import Lightbox from '$lib/components/Lightbox.svelte';
	import type { Photo, PlantWithStats } from '$lib/types';

	let plant = $state<PlantWithStats | null>(null);
	let photos = $state<Photo[]>([]);
	let loading = $state(true);

	const plantId = $derived($page.params.id ?? '');

	// Lightbox
	let lightboxOpen = $state(false);
	let lightboxStart = $state(0);
	let composeIds = $state<Set<string>>(new Set());

	$effect(() => {
		// 默认勾选所有照片
		if (photos.length > 0 && composeIds.size === 0) {
			composeIds = new Set(photos.map((p) => p.id));
		}
	});

	function openLightbox(idx: number) {
		lightboxStart = idx;
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
	}

	function toggleCompose(id: string) {
		const next = new Set(composeIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		composeIds = next;
	}

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
		// 同步：删除的也从勾选集合移除
		const ids = new Set(photos.map((p) => p.id));
		for (const id of composeIds) {
			if (!ids.has(id)) composeIds.delete(id);
		}
	}

	let cameraRef = $state<HTMLInputElement | null>(null);
	let galleryRef = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let menuOpen = $state(false);
	type Toast =
		| {kind: 'success'; text: string}
		| {kind: 'warn'; text: string}
		| {kind: 'error'; text: string}
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
			showToast({kind: 'success', text: parts.join('')});

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
			showToast({kind: 'error', text: '导入失败：' + (err as Error).message});
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
		await updatePhoto(photo.id, plantId, {takenAt: d.getTime()});
		await refresh();
	}

	async function handleDeletePhoto(id: string) {
		const photo = photos.find((p) => p.id === id);
		const dateLabel = photo ? formatDay(photo.takenAt) : '';
		if (!confirm(`删除 ${dateLabel} 的这张照片？此操作无法撤销。`)) return;
		if (!confirm('确认删除？')) return;
		await deletePhoto(id, plantId);
		composeIds.delete(id);
		await refresh();
	}

	async function handleDeletePlant() {
		if (!plantId || !plant) return;
		const photoCount = plant.photoCount;
		if (
			!confirm(
				`确定删除「${plant.name}」？\n\n这会同时删除 ${photoCount} 张照片，此操作无法撤销。`
			)
		)
			return;
		if (
			!confirm(
				`最后确认：删除「${plant.name}」及其全部 ${photoCount} 张照片？\n\n真的要继续吗？`
			)
		)
			return;
		await deletePlant(plantId);
		goto('/');
	}

	let editing = $state(false);
	let editName = $state('');
	let editSpecies = $state('');
	let editAcquiredAt = $state('');
	let editNotes = $state('');
	let editSaving = $state(false);

	function openEdit() {
		if (!plant) return;
		editName = plant.name;
		editSpecies = plant.species;
		editNotes = plant.notes;
		editAcquiredAt = formatDay(plant.acquiredAt);
		editing = true;
	}

	async function saveEdit() {
		if (!plantId || !plant) return;
		const trimmedName = editName.trim();
		if (!trimmedName) {
			showToast({kind: 'error', text: '名字不能为空'});
			return;
		}
		const d = new Date(editAcquiredAt + 'T00:00:00');
		if (isNaN(d.getTime())) {
			showToast({kind: 'error', text: '日期格式无效，请用 YYYY-MM-DD'});
			return;
		}
		editSaving = true;
		try {
			await updatePlant(plantId, {
				name: trimmedName,
				species: editSpecies.trim(),
				notes: editNotes.trim(),
				acquiredAt: d.getTime()
			});
			editing = false;
			await refresh();
			showToast({kind: 'success', text: '已保存'});
		} catch (err) {
			showToast({kind: 'error', text: '保存失败：' + (err as Error).message});
		} finally {
			editSaving = false;
		}
	}

	function cancelEdit() {
		editing = false;
	}

	let composing = $state(false);

	async function composeSelected() {
		if (composeIds.size === 0 || !plant) {
			showToast({kind: 'warn', text: '请至少选 1 张照片'});
			return;
		}
		composing = true;
		try {
			const ordered = photos
				.filter((p) => composeIds.has(p.id))
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
			const result = await saveImage(blob, filename);
			if (result === 'shared') {
				showToast({
					kind: 'success',
					text: `已生成 ${ordered.length} 张（${(blob.size / 1024).toFixed(0)} KB），请选"存储图像"保存到相册`
				});
			} else {
				showToast({
					kind: 'success',
					text: `已生成 ${ordered.length} 张（${(blob.size / 1024).toFixed(0)} KB），已下载`
				});
			}
		} catch (err) {
			showToast({kind: 'error', text: '生成失败：' + (err as Error).message});
		} finally {
			composing = false;
		}
	}

	const sortedPhotos = $derived(
		photos.slice().sort((a, b) => b.takenAt - a.takenAt)
	);

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

<Lightbox
	{photos}
	startIndex={lightboxStart}
	selectedIds={composeIds}
	open={lightboxOpen}
	onclose={closeLightbox}
	ontoggle={toggleCompose}
/>

<!-- 编辑植物：底部抽屉 -->
{#if editing}
	<button
		type="button"
		aria-label="关闭编辑"
		onclick={cancelEdit}
		class="fixed inset-0 z-40 bg-black/40"
	></button>

	<div
		class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl pb-safe pt-3 px-4 max-h-[85vh] overflow-y-auto animate-pop-in"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-10 h-1 bg-leaf-200 rounded-full mx-auto mb-3"></div>
		<h3 class="text-base font-semibold text-leaf-800 mb-3">编辑植物信息</h3>

		<div class="space-y-3">
			<label class="block">
				<span class="text-xs text-leaf-600/70">名字 *</span>
				<input
					type="text"
					bind:value={editName}
					class="mt-1 w-full px-3 py-2.5 rounded-xl bg-leaf-50 border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm"
					maxlength="40"
					placeholder="给它起个名字吧"
				/>
			</label>

			<label class="block">
				<span class="text-xs text-leaf-600/70">品种</span>
				<input
					type="text"
					bind:value={editSpecies}
					class="mt-1 w-full px-3 py-2.5 rounded-xl bg-leaf-50 border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm"
					maxlength="60"
					placeholder="例：玉露、桃蛋、熊童子"
				/>
			</label>

			<label class="block">
				<span class="text-xs text-leaf-600/70">入手日期</span>
				<input
					type="date"
					bind:value={editAcquiredAt}
					class="mt-1 w-full px-3 py-2.5 rounded-xl bg-leaf-50 border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm"
				/>
			</label>

			<label class="block">
				<span class="text-xs text-leaf-600/70">备注</span>
				<textarea
					bind:value={editNotes}
					class="mt-1 w-full px-3 py-2.5 rounded-xl bg-leaf-50 border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm min-h-20 resize-none"
					maxlength="500"
					placeholder="来源、养护要点…"
				></textarea>
			</label>
		</div>

		<div class="flex gap-2 mt-5">
			<button
				type="button"
				onclick={cancelEdit}
				class="flex-1 py-2.5 rounded-full border border-leaf-200 text-leaf-700 text-sm active:bg-leaf-50"
			>
				取消
			</button>
			<button
				type="button"
				onclick={saveEdit}
				disabled={editSaving}
				class="flex-1 py-2.5 rounded-full bg-leaf-600 text-white text-sm font-medium active:bg-leaf-700 disabled:opacity-50"
			>
				{editSaving ? '保存中…' : '保存'}
			</button>
		</div>
	</div>
{/if}

<header
	class="sticky top-0 z-10 bg-soil-50/85 backdrop-blur border-b border-leaf-100 px-4 pt-safe"
>
	<div class="max-w-3xl mx-auto flex items-center justify-between py-3 gap-2">
		<a
			href="/"
			class="text-leaf-700 text-sm flex items-center gap-0.5 active:opacity-60"
			aria-label="返回花园"
		>
			<span class="text-lg leading-none">‹</span>
			<span>花园</span>
		</a>
		<h1 class="text-base font-semibold text-leaf-800 truncate flex-1 text-center">
			{plant?.name ?? ''}
		</h1>
		<button
			onclick={openEdit}
			class="flex items-center gap-1 px-3 py-1.5 rounded-full bg-leaf-100 text-leaf-700 text-xs font-medium active:bg-leaf-200"
			aria-label="编辑植物"
		>
			<span>✎</span>
			<span>编辑</span>
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
				<p class="text-xs text-leaf-600/60 text-center mb-3">
					时间倒序 · 点击照片浏览大图 · 底部生成成长长图
				</p>
				<div class="flex flex-col gap-2.5">
					{#each sortedPhotos as photo (photo.id)}
						{@const globalIdx = sortedPhotos.findIndex((p) => p.id === photo.id)}
						<div
							class="relative group bg-white rounded-xl overflow-hidden shadow-sm shadow-leaf-900/5"
							role="button"
							tabindex="0"
							onclick={() => openLightbox(globalIdx)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openLightbox(globalIdx);
								}
							}}
						>
							<!-- 微缩图：固定最大高度 160px，保留原图比例 -->
							<img
								src={blobUrl(photo.id, 'thumb')}
								alt=""
								class="w-full max-h-40 object-cover"
								loading="lazy"
							/>

							<!-- 日期 + 操作（叠在图片底部，半透明背景） -->
							<div
								class="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 py-1.5 text-[11px] text-white bg-gradient-to-t from-black/65 to-transparent"
							>
								<div class="flex items-center gap-1.5">
									<span class="font-medium drop-shadow">{formatDay(photo.takenAt)}</span>
									{#if photo.dateSource === 'exif'}
										<span class="opacity-70 text-[10px] bg-white/15 px-1 py-px rounded">EXIF</span>
									{/if}
									{#if isSuspiciousDate(photo.takenAt)}
										<span class="text-amber-300 text-[10px]">⚠</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											editPhotoDate(photo);
										}}
										class="opacity-80 hover:opacity-100"
										title="修改日期"
									>
										✎
									</button>
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											handleDeletePhoto(photo.id);
										}}
										class="opacity-80 hover:opacity-100"
										aria-label="删除"
									>
										✕
									</button>
								</div>
							</div>

							<!-- 拼接图勾选按钮（图片右上角） -->
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									toggleCompose(photo.id);
								}}
								class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center shadow-md active:scale-95 transition"
								class:bg-leaf-500={composeIds.has(photo.id)}
								class:bg-black={!composeIds.has(photo.id)}
								class:opacity-60={!composeIds.has(photo.id)}
								aria-label={composeIds.has(photo.id) ? '已加入拼接图，点此移除' : '未加入拼接图，点此加入'}
								title={composeIds.has(photo.id) ? '已加入拼接图，点此移除' : '未加入拼接图，点此加入'}
							>
								{composeIds.has(photo.id) ? '✓' : '○'}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</main>

{#if plant}
	<!-- 底部固定操作条 -->
	<div
		class="fixed bottom-0 left-0 right-0 z-20 bg-soil-50/95 backdrop-blur border-t border-leaf-100 px-4 pb-safe pt-2"
	>
		<div class="max-w-3xl mx-auto flex items-center gap-2">
			<div class="flex-1 text-xs text-leaf-600/70">
				{#if composeIds.size === photos.length && photos.length > 0}
					已选全部 {photos.length} 张
				{:else}
					已选 {composeIds.size} / {photos.length} 张
				{/if}
			</div>
			<button
				onclick={() => {
					if (composeIds.size === photos.length) composeIds = new Set();
					else composeIds = new Set(photos.map((p) => p.id));
				}}
				class="text-xs px-3 py-2 rounded-full border border-leaf-300 text-leaf-700 active:bg-leaf-100"
			>
				{composeIds.size === photos.length && photos.length > 0 ? '全不选' : '全选'}
			</button>
			<button
				onclick={composeSelected}
				disabled={composing || composeIds.size === 0}
				class="text-xs px-4 py-2 rounded-full bg-leaf-600 text-white font-medium disabled:opacity-50 active:bg-leaf-700"
			>
				{composing ? '生成中…' : '📥 生成成长长图'}
			</button>
		</div>
	</div>

	<!-- 右下角拍照按钮 -->
	<div class="fixed bottom-20 right-6 z-20 flex flex-col items-end gap-2">
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
			class="w-12 h-12 rounded-full bg-leaf-600 text-white text-2xl shadow-lg shadow-leaf-700/30 active:scale-95 transition flex items-center justify-center disabled:opacity-60"
			class:rotate-45={menuOpen}
			style="transition: transform 0.18s;"
		>
			{uploading ? '…' : '+'}
		</button>
	</div>

	{#if toast}
		<div
			class="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 max-w-sm px-4 py-2.5 rounded-2xl shadow-lg text-sm animate-pop-in"
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