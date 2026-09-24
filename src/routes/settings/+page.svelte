<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listPlants } from '$lib/repo.svelte';
	import { exportAll, importAll } from '$lib/backup';

	let plantsCount = $state(0);
	let photosCount = $state(0);
	let busy = $state(false);
	let lastImport = $state<string>('');

	async function refreshStats() {
		const { db } = await import('$lib/db');
		plantsCount = await db.plants.count();
		photosCount = await db.photos.count();
	}

	onMount(refreshStats);

	async function handleExport() {
		busy = true;
		try {
			await exportAll();
		} catch (e) {
			alert('导出失败：' + (e as Error).message);
		} finally {
			busy = false;
		}
	}

	let importRef = $state<HTMLInputElement | null>(null);
	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		busy = true;
		try {
			const result = await importAll(file);
			lastImport = `导入完成：新增 ${result.plants} 株多肉、${result.photos} 张照片`;
			await listPlants();
			await refreshStats();
		} catch (err) {
			alert('导入失败：' + (err as Error).message);
		} finally {
			busy = false;
			input.value = '';
		}
	}
</script>

<header
	class="sticky top-0 z-10 bg-soil-50/85 backdrop-blur border-b border-leaf-100 px-4 pt-safe"
>
	<div class="max-w-3xl mx-auto flex items-center justify-between py-3">
		<a href="/" class="text-leaf-700 text-sm flex items-center gap-1">‹ 花园</a>
		<h1 class="text-base font-semibold text-leaf-800">设置</h1>
		<span class="w-12"></span>
	</div>
</header>

<main class="flex-1 px-4 pb-12">
	<div class="max-w-3xl mx-auto pt-6 space-y-4">
		<section class="bg-white rounded-2xl p-5 border border-leaf-100">
			<h2 class="text-sm font-medium text-leaf-800 mb-1">数据统计</h2>
			<div class="text-xs text-leaf-600/70 leading-relaxed">
				共 <span class="text-leaf-800 font-semibold">{plantsCount}</span> 株多肉 ·
				<span class="text-leaf-800 font-semibold">{photosCount}</span> 张照片
			</div>
		</section>

		<section class="bg-white rounded-2xl p-5 border border-leaf-100">
			<h2 class="text-sm font-medium text-leaf-800 mb-1">备份与恢复</h2>
			<p class="text-xs text-leaf-600/70 mb-4 leading-relaxed">
				所有数据都在本地浏览器中。建议定期导出备份 ZIP，
				换手机或清缓存前一定记得备份一次。
			</p>
			<div class="flex gap-2">
				<button
					onclick={handleExport}
					disabled={busy}
					class="flex-1 py-2.5 rounded-xl bg-leaf-600 text-white text-sm disabled:opacity-60"
				>
					{busy ? '处理中…' : '📦 导出备份'}
				</button>
				<button
					onclick={() => importRef?.click()}
					disabled={busy}
					class="flex-1 py-2.5 rounded-xl border border-leaf-300 text-leaf-700 text-sm disabled:opacity-60"
				>
					📥 导入备份
				</button>
			</div>
			<input
				bind:this={importRef}
				type="file"
				accept=".zip,application/zip"
				onchange={handleImport}
				class="hidden"
			/>
			{#if lastImport}
				<div class="mt-3 text-xs text-leaf-600/80">{lastImport}</div>
			{/if}
		</section>

		<section class="bg-white rounded-2xl p-5 border border-leaf-100">
			<h2 class="text-sm font-medium text-leaf-800 mb-1">关于</h2>
			<p class="text-xs text-leaf-600/70 leading-relaxed">
				多肉成长记 v0.1 · 数据完全保存在你的设备本地 ·
				本应用不会上传任何数据到服务器
			</p>
		</section>
	</div>
</main>