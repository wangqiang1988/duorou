<script lang="ts">
	import type { Photo } from '$lib/types';
	import { formatDay } from '$lib/photo';

	interface Props {
		photos: Photo[];
		startIndex: number;
		selectedIds: Set<string>;
		open: boolean;
		onclose: () => void;
		ontoggle: (id: string) => void;
	}

	let {photos, startIndex, selectedIds, open, onclose, ontoggle}: Props = $props();

	let index = $state(0);
	let touchStartX = $state<number | null>(null);

	$effect(() => {
		if (open) {
			index = startIndex;
		}
	});

	const current = $derived(photos[index]);

	function prev() {
		index = (index - 1 + photos.length) % photos.length;
	}
	function next() {
		index = (index + 1) % photos.length;
	}

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}
	function onTouchEnd(e: TouchEvent) {
		if (touchStartX === null) return;
		const dx = e.changedTouches[0].clientX - touchStartX;
		if (Math.abs(dx) > 50) {
			if (dx > 0) prev();
			else next();
		}
		touchStartX = null;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		else if (e.key === 'ArrowLeft') prev();
		else if (e.key === 'ArrowRight') next();
	}

	$effect(() => {
		if (!open) return;
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function blobUrl(id: string) {
		return `/api/photos/${id}/blob?v=orig`;
	}
</script>

{#if open && current}
	<!-- 背景 -->
	<button
		type="button"
		aria-label="关闭"
		onclick={onclose}
		class="fixed inset-0 z-40 bg-black/92 backdrop-blur-sm"
	></button>

	<!-- 主容器 -->
	<div
		class="fixed inset-0 z-50 flex flex-col"
		role="dialog"
		aria-modal="true"
	>
		<!-- 顶部栏 -->
		<div class="flex items-center justify-between px-4 pt-safe pb-2 text-white">
			<button
				type="button"
				onclick={onclose}
				class="flex items-center gap-1.5 px-3 h-10 rounded-full bg-white/15 active:bg-white/30 text-sm"
				aria-label="关闭"
			>
				<span class="text-xl leading-none">✕</span>
				<span>关闭</span>
			</button>
			<div class="text-sm tabular-nums opacity-90">
				{index + 1} / {photos.length}
			</div>
			<div class="w-16"></div>
		</div>

		<!-- 图片区 -->
		<div
			class="flex-1 flex items-center justify-center px-2 relative"
			role="region"
			aria-label="照片浏览区"
			ontouchstart={onTouchStart}
			ontouchend={onTouchEnd}
		>
			{#if photos.length > 1}
				<button
					type="button"
					onclick={prev}
					class="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white text-2xl z-10 active:bg-white/30"
					aria-label="上一张"
				>
					‹
				</button>
				<button
					type="button"
					onclick={next}
					class="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white text-2xl z-10 active:bg-white/30"
					aria-label="下一张"
				>
					›
				</button>
			{/if}

			<img
				src={blobUrl(current.id)}
				alt=""
				class="max-h-full max-w-full object-contain"
				draggable="false"
			/>
		</div>

		<!-- 底部信息 -->
		<div class="px-4 pb-6 pt-2 text-white">
			<div class="text-center text-sm mb-2">
				<span class="font-medium">{formatDay(current.takenAt)}</span>
				{#if current.dateSource === 'exif'}
					<span class="ml-2 opacity-60 text-xs">·EXIF</span>
				{/if}
			</div>

			<!-- 缩略图条 -->
			{#if photos.length > 1}
				<div class="flex gap-1 justify-center overflow-x-auto pb-2 no-scrollbar">
					{#each photos as p, i (p.id)}
						<button
							type="button"
							onclick={() => (index = i)}
							class="flex-shrink-0 w-10 h-10 rounded overflow-hidden transition"
							class:ring-2={i === index}
							class:ring-white={i === index}
							class:opacity-50={i !== index}
						>
							<img
								src={`/api/photos/${p.id}/blob?v=thumb`}
								alt=""
								class="w-full h-full object-cover"
							/>
						</button>
					{/each}
				</div>
			{/if}

			<!-- 拼接图 toggle -->
			<button
				type="button"
				onclick={() => ontoggle(current.id)}
				class="w-full mt-2 py-2.5 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
				class:bg-leaf-500={selectedIds.has(current.id)}
				class:text-white={selectedIds.has(current.id)}
				class:bg-white={!selectedIds.has(current.id)}
				class:text-leaf-800={!selectedIds.has(current.id)}
			>
				{#if selectedIds.has(current.id)}
					✓ 已加入拼接图（{selectedIds.size} 张）
				{:else}
					＋ 加入拼接图
				{/if}
			</button>
		</div>
	</div>
{/if}