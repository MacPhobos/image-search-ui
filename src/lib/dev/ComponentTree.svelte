<!--
  DEV-ONLY: Component Tree Visualization

  Displays a hierarchical tree of currently mounted components.

  Features:
  - Tree-like indented display based on mount order
  - Color coding by component type (route/layout/component)
  - Mount time display (relative to now)
  - File path tooltip on hover
  - Copy file path button
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import type { ComponentInfo } from './componentRegistry';
	import { getComponentType } from './componentRegistry';

	interface Props {
		components: ComponentInfo[];
		maxDepth?: number;
	}

	let { components, maxDepth = 10 }: Props = $props();

	/**
	 * Determine nesting level based on component index
	 * Simple heuristic: mount order indicates hierarchy depth
	 */
	function getDepth(component: ComponentInfo, index: number): number {
		return Math.min(index, maxDepth);
	}

	/**
	 * Format mount time relative to now
	 */
	function formatTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		if (diff < 1000) return `${diff}ms`;
		if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
		return `${Math.floor(diff / 60000)}m`;
	}

	/**
	 * Copy file path to clipboard
	 */
	async function copyPath(filePath?: string) {
		if (!browser || !filePath) return;

		try {
			await navigator.clipboard.writeText(filePath);
		} catch (err) {
			console.error('Failed to copy path:', err);
		}
	}
</script>

<div class="component-tree">
	{#each components as component, i}
		{@const depth = getDepth(component, i)}
		{@const type = getComponentType(component.name)}

		<div
			class="tree-node"
			class:route={type === 'route'}
			class:layout={type === 'layout'}
			class:component={type === 'component'}
			style="padding-left: {depth * 12}px"
			title={component.filePath}
		>
			<span class="node-icon">
				{#if type === 'route'}📄
				{:else if type === 'layout'}📐
				{:else}🧩
				{/if}
			</span>

			<span class="node-name">{component.name}</span>

			<span class="node-time">{formatTime(component.mountedAt)}</span>

			{#if component.filePath}
				<button
					class="node-copy"
					onclick={() => copyPath(component.filePath)}
					title="Copy file path"
				>
					📋
				</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.component-tree {
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 3px;
		padding: 6px 4px;
		font-size: 10px;
		max-height: 200px;
		overflow-y: auto;
	}

	.tree-node {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 2px 4px;
		border-radius: 2px;
		margin: 1px 0;
	}

	.tree-node:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.node-icon {
		font-size: 10px;
		flex-shrink: 0;
	}

	.node-name {
		flex: 1;
		color: #fbbf24;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tree-node.route .node-name {
		color: #93c5fd;
	}

	.tree-node.layout .node-name {
		color: #a78bfa;
	}

	.node-time {
		color: #9ca3af;
		font-size: 9px;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.node-copy {
		background: none;
		border: none;
		color: #9ca3af;
		cursor: pointer;
		padding: 0 2px;
		font-size: 10px;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.tree-node:hover .node-copy {
		opacity: 1;
	}

	.node-copy:hover {
		color: #e0e0e0;
	}
</style>
