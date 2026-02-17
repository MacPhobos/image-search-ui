<script lang="ts">
	import { listDriveFolders, type DriveFolderInfo } from '$lib/api/gdrive';
	import FolderNode from './FolderNode.svelte';

	interface Props {
		folder: DriveFolderInfo;
		depth: number;
		selectedFolderId: string | null;
		onSelect: (folder: DriveFolderInfo) => void;
	}

	let { folder, depth, selectedFolderId, onSelect }: Props = $props();

	let expanded = $state(false);
	let children = $state<DriveFolderInfo[]>([]);
	let childrenLoading = $state(false);
	let childrenLoaded = $state(false);

	let isSelected = $derived(selectedFolderId === folder.id);

	async function toggleExpand(e: Event) {
		e.stopPropagation();
		if (!folder.hasChildren) return;

		if (!childrenLoaded) {
			childrenLoading = true;
			try {
				const result = await listDriveFolders(folder.id);
				children = result.folders;
				childrenLoaded = true;
			} catch {
				// Silently fail - user can retry by collapsing and expanding
			} finally {
				childrenLoading = false;
			}
		}
		expanded = !expanded;
	}

	function handleSelect() {
		onSelect(folder);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' && folder.hasChildren && !expanded) {
			toggleExpand(e);
		} else if (e.key === 'ArrowLeft' && expanded) {
			expanded = false;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleSelect();
		}
	}
</script>

<li
	role="treeitem"
	aria-selected={isSelected}
	aria-expanded={folder.hasChildren ? expanded : undefined}
	aria-level={depth + 1}
>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer hover:bg-gray-100 transition-colors {isSelected
			? 'bg-blue-50 ring-1 ring-blue-300'
			: ''}"
		style="padding-left: {depth * 1.5 + 0.5}rem"
		onclick={handleSelect}
		onkeydown={handleKeydown}
		tabindex="0"
	>
		{#if folder.hasChildren}
			<button
				type="button"
				class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
				onclick={toggleExpand}
				aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
			>
				{#if childrenLoading}
					<span
						class="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"
					></span>
				{:else}
					<svg
						class="w-4 h-4 transition-transform {expanded ? 'rotate-90' : ''}"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<polyline points="9 18 15 12 9 6" />
					</svg>
				{/if}
			</button>
		{:else}
			<span class="w-5"></span>
		{/if}

		<svg class="w-4 h-4 flex-shrink-0 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
			/>
		</svg>

		<span class="text-sm truncate {isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}">
			{folder.name}
		</span>
	</div>

	{#if expanded && children.length > 0}
		<ul role="group">
			{#each children as child (child.id)}
				<FolderNode folder={child} depth={depth + 1} {selectedFolderId} {onSelect} />
			{/each}
		</ul>
	{/if}
</li>
