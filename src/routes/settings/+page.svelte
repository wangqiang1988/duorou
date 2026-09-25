<script lang="ts">
	import { onMount } from 'svelte';
	import { photosApi } from '$lib/api';
	import { loadPlants } from '$lib/repo.svelte';
	import { appName, setAppName, resetAppName } from '$lib/appName.svelte';

	let plantsCount = $state(0);
	let photosCount = $state(0);
	let totalBytes = $state(0);
	let apiOnline = $state<boolean | null>(null);

	let nameInput = $state('');
	let nameSaving = $state(false);

	$effect(() => {
		nameInput = appName.value;
	});

	async function refresh() {
		try {
			const s = await photosApi.stats();
			plantsCount = s.plants;
			photosCount = s.photos;
			totalBytes = s.totalBytes;
			apiOnline = true;
		} catch {
			apiOnline = false;
		}
	}

	onMount(refresh);

	async function saveName() {
		nameSaving = true;
		try {
			setAppName(nameInput);
		} finally {
			nameSaving = false;
		}
	}

	function resetName() {
		if (!confirm('恢复默认名称「多肉成长记」？')) return;
		resetAppName();
		nameInput = '多肉成长记';
	}

	function formatBytes(n: number): string {
		if (n < 1024) return n + ' B';
		if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
		if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
		return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
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
			<h2 class="text-sm font-medium text-leaf-800 mb-1">应用名称</h2>
			<p class="text-xs text-leaf-600/70 leading-relaxed mb-3">
				修改后主页标题立即更新。仅本设备生效（PWA 桌面图标名称需重新构建）。
			</p>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={nameInput}
					maxlength="20"
					class="flex-1 px-3 py-2 rounded-xl bg-leaf-50 border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm"
					placeholder="多肉成长记"
				/>
				<button
					type="button"
					onclick={saveName}
					disabled={nameSaving || nameInput.trim() === appName.value}
					class="px-4 py-2 rounded-full bg-leaf-600 text-white text-sm font-medium disabled:opacity-40 active:bg-leaf-700"
				>
					保存
				</button>
			</div>
			<button
				type="button"
				onclick={resetName}
				class="mt-2 text-xs text-leaf-600/70 hover:text-leaf-800"
			>
				恢复默认
			</button>
		</section>

		<section
			class="bg-white rounded-2xl p-5 border"
			class:border-green-200={apiOnline === true}
			class:border-red-200={apiOnline === false}
			class:border-leaf-100={apiOnline === null}
		>
			<h2 class="text-sm font-medium text-leaf-800 mb-1 flex items-center gap-2">
				服务器状态
				{#if apiOnline === true}
					<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">在线</span>
				{:else if apiOnline === false}
					<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">离线</span>
				{/if}
			</h2>
			<p class="text-xs text-leaf-600/70 leading-relaxed">
				照片与元数据存于 Docker 容器内的本地服务器（SQLite + 文件系统）
			</p>
		</section>

		<section class="bg-white rounded-2xl p-5 border border-leaf-100">
			<h2 class="text-sm font-medium text-leaf-800 mb-1">数据统计</h2>
			<div class="text-xs text-leaf-600/70 leading-relaxed">
				共 <span class="text-leaf-800 font-semibold">{plantsCount}</span> 株多肉 ·
				<span class="text-leaf-800 font-semibold">{photosCount}</span> 张照片 ·
				占空间 <span class="text-leaf-800 font-semibold">{formatBytes(totalBytes)}</span>
			</div>
		</section>

		<section class="bg-white rounded-2xl p-5 border border-leaf-100">
			<h2 class="text-sm font-medium text-leaf-800 mb-2">多设备同步</h2>
			<p class="text-xs text-leaf-600/70 leading-relaxed mb-2">
				所有设备访问同一个 Docker 实例即可看到全部数据。
			</p>
			<ul class="text-xs text-leaf-700/80 leading-relaxed space-y-1 pl-4 list-disc">
				<li>同一 Docker → 数据自动共享</li>
				<li>换设备 → 重新部署 Docker 并挂载同一份 <code class="bg-leaf-50 px-1 rounded">./data</code></li>
				<li>数据安全 → 备份 <code class="bg-leaf-50 px-1 rounded">./data</code> 整个目录</li>
			</ul>
		</section>

		<section class="bg-white rounded-2xl p-5 border border-leaf-100">
			<h2 class="text-sm font-medium text-leaf-800 mb-1">关于</h2>
			<p class="text-xs text-leaf-600/70 leading-relaxed">
				多肉成长记 v0.4 · 数据存于本地服务器（Fastify + SQLite + 文件系统）·
				无鉴权模式仅适合内网使用
			</p>
		</section>
	</div>
</main>