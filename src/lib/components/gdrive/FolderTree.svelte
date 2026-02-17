<script lang="ts">
	import type { DriveFolderInfo } from '$lib/api/gdrive';
	import FolderNode from './FolderNode.svelte';

	interface Props {
		folders: DriveFolderInfo[];
		selectedFolderId: string | null;
		depth?: number;
		onSelect: (folder: DriveFolderInfo) => void;
	}

	let { folders, selectedFolderId, depth = 0, onSelect }: Props = $props();
</script>

{#if depth === 0}
	<ul role="tree" aria-label="Google Drive folders" class="space-y-0.5">
		{#each folders as folder (folder.id)}
			<FolderNode {folder} {depth} {selectedFolderId} {onSelect} />
		{/each}
	</ul>
{:else}
	<ul role="group" class="space-y-0.5">
		{#each folders as folder (folder.id)}
			<FolderNode {folder} {depth} {selectedFolderId} {onSelect} />
		{/each}
	</ul>
{/if}
