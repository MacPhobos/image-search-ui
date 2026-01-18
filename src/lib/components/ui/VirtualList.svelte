<script lang="ts" generics="T">
	/* eslint-disable no-undef */
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	interface Props {
		items: T[];
		itemHeight: number;
		height?: string;
		children: Snippet<[{ item: T; index: number }]>;
	}
	/* eslint-enable no-undef */

	let { items, itemHeight, height = '100%', children }: Props = $props();

	let scrollTop = $state(0);
	let containerHeight = $state(0);
	let container: HTMLDivElement;

	// Calculate visible range with buffer
	let visibleRange = $derived.by(() => {
		const buffer = 3;
		const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
		const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2;
		const endIndex = Math.min(items.length, startIndex + visibleCount);
		return { startIndex, endIndex };
	});

	// Visible items with their positions
	let visibleItems = $derived.by(() => {
		const { startIndex, endIndex } = visibleRange;
		return items.slice(startIndex, endIndex).map((item, i) => ({
			item,
			index: startIndex + i,
			offset: (startIndex + i) * itemHeight
		}));
	});

	// Total height for scroll
	let totalHeight = $derived(items.length * itemHeight);

	function handleScroll(e: Event) {
		scrollTop = (e.target as HTMLDivElement).scrollTop;
	}

	onMount(() => {
		if (container) {
			containerHeight = container.clientHeight;
		}
	});
</script>

<div bind:this={container} class="virtual-list-container" style:height onscroll={handleScroll}>
	<div class="virtual-list-inner" style:height="{totalHeight}px">
		{#each visibleItems as { item, index, offset } (index)}
			<div class="virtual-list-item" style:transform="translateY({offset}px)">
				{@render children({ item, index })}
			</div>
		{/each}
	</div>
</div>

<style>
	.virtual-list-container {
		overflow-y: auto;
		position: relative;
	}

	.virtual-list-inner {
		position: relative;
		width: 100%;
	}

	.virtual-list-item {
		position: absolute;
		width: 100%;
		left: 0;
		top: 0;
		will-change: transform;
	}
</style>
