<script lang="ts">
	import { goto } from '$app/navigation';
	import { createPlant } from '$lib/repo.svelte';

	let name = $state('');
	let species = $state('');
	let acquiredAt = $state(formatInputDate(Date.now()));
	let notes = $state('');
	let saving = $state(false);
	let error = $state('');

	function formatInputDate(ts: number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function parseDate(s: string): number {
		const d = new Date(s + 'T00:00:00');
		return isNaN(d.getTime()) ? Date.now() : d.getTime();
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		if (!name.trim()) {
			error = '请填写名字';
			return;
		}
		saving = true;
		try {
			const plant = await createPlant({
				name: name.trim(),
				species: species.trim(),
				acquiredAt: parseDate(acquiredAt),
				notes: notes.trim(),
				diedAt: null
			});
			goto(`/plant/${plant.id}`);
		} catch (err) {
			error = (err as Error).message || '保存失败';
			saving = false;
		}
	}
</script>

<header
	class="sticky top-0 z-10 bg-soil-50/85 backdrop-blur border-b border-leaf-100 px-4 pt-safe"
>
	<div class="max-w-3xl mx-auto flex items-center justify-between py-3">
		<a href="/" class="text-leaf-700 text-sm flex items-center gap-1">‹ 花园</a>
		<h1 class="text-base font-semibold text-leaf-800">添加多肉</h1>
		<span class="w-12"></span>
	</div>
</header>

<main class="flex-1 px-4 pb-12">
	<form
		onsubmit={handleSubmit}
		class="max-w-3xl mx-auto pt-6 space-y-5"
	>
		<div>
			<label for="name" class="block text-sm text-leaf-700 mb-1.5"
				>名字 <span class="text-red-500">*</span></label
			>
			<input
				id="name"
				type="text"
				bind:value={name}
				placeholder="给它起个名字吧"
				class="w-full px-3 py-2.5 rounded-xl bg-white border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm"
				maxlength="40"
				required
			/>
		</div>

		<div>
			<label for="species" class="block text-sm text-leaf-700 mb-1.5">品种</label>
			<input
				id="species"
				type="text"
				bind:value={species}
				placeholder="例：玉露、桃蛋、熊童子…"
				class="w-full px-3 py-2.5 rounded-xl bg-white border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm"
				maxlength="60"
			/>
		</div>

		<div>
			<label for="acquiredAt" class="block text-sm text-leaf-700 mb-1.5"
				>入手日期</label
			>
			<input
				id="acquiredAt"
				type="date"
				bind:value={acquiredAt}
				class="w-full px-3 py-2.5 rounded-xl bg-white border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm"
			/>
		</div>

		<div>
			<label for="notes" class="block text-sm text-leaf-700 mb-1.5">备注</label>
			<textarea
				id="notes"
				bind:value={notes}
				placeholder="来源、养护要点…"
				class="w-full px-3 py-2.5 rounded-xl bg-white border border-leaf-100 focus:border-leaf-400 focus:outline-none text-sm min-h-24 resize-none"
				maxlength="60"
			></textarea>
		</div>

		{#if error}
			<div class="text-sm text-red-500 px-3">{error}</div>
		{/if}

		<div class="flex gap-3 pt-2">
			<a
				href="/"
				class="flex-1 py-3 rounded-full text-center text-sm border border-leaf-200 text-leaf-700"
			>
				取消
			</a>
			<button
				type="submit"
				disabled={saving}
				class="flex-1 py-3 rounded-full bg-leaf-600 text-white text-sm font-medium shadow-sm disabled:opacity-60"
			>
				{saving ? '保存中…' : '保存'}
			</button>
		</div>
	</form>
</main>