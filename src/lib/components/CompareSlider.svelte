<script lang="ts">
	interface Props {
		beforeUrl: string;
		afterUrl: string;
		beforeLabel?: string;
		afterLabel?: string;
	}

	let { beforeUrl, afterUrl, beforeLabel = '', afterLabel = '' }: Props = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let pct = $state(50);
	let dragging = $state(false);

	function updateFromEvent(clientX: number) {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
		pct = (x / rect.width) * 100;
	}

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		updateFromEvent(e.clientX);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		updateFromEvent(e.clientX);
	}

	function onPointerUp(e: PointerEvent) {
		dragging = false;
		(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
	}
</script>

<div
	bind:this={containerRef}
	class="relative w-full overflow-hidden rounded-2xl bg-leaf-50 touch-none select-none"
	style="aspect-ratio: 1 / 1;"
	role="slider"
	aria-label="对比滑块"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={Math.round(pct)}
	tabindex="0"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	<img
		src={afterUrl}
		alt=""
		class="absolute inset-0 w-full h-full object-cover pointer-events-none"
		draggable="false"
	/>

	<div
		class="absolute inset-0 overflow-hidden pointer-events-none"
		style="clip-path: inset(0 {100 - pct}% 0 0);"
	>
		<img
			src={beforeUrl}
			alt=""
			class="absolute inset-0 w-full h-full object-cover"
			draggable="false"
		/>
	</div>

	<div
		class="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.45)] pointer-events-none"
		style="left: {pct}%; transform: translateX(-50%);"
	></div>

	<div
		class="absolute top-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-leaf-700 text-lg cursor-ew-resize"
		style="left: {pct}%; transform: translate(-50%, -50%);"
	>
		⇆
	</div>

	{#if beforeLabel}
		<div
			class="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] backdrop-blur-sm pointer-events-none"
		>
			{beforeLabel}
		</div>
	{/if}
	{#if afterLabel}
		<div
			class="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] backdrop-blur-sm pointer-events-none"
		>
			{afterLabel}
		</div>
	{/if}
</div>