<script lang="ts">
	import {
		listDriveFolders,
		type DriveFolderInfo,
		type CreateFolderResponse
	} from '$lib/api/gdrive';
	import { localSettings } from '$lib/stores/localSettings.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import FolderTree from './FolderTree.svelte';
	import CreateFolderInline from './CreateFolderInline.svelte';

	interface Props {
		personName: string;
		initialFolderId?: string | null;
		onSelect: (folderId: string, folderPath: string) => void;
	}

	let { personName, initialFolderId = null, onSelect }: Props = $props();

	let rootFolders = $state<DriveFolderInfo[]>([]);
	let selectedFolderId = $state<string | null>(null);
	let selectedFolderName = $state<string>('');

	// Sync initialFolderId when prop changes
	$effect(() => {
		if (initialFolderId) {
			selectedFolderId = initialFolderId;
		}
	});
	let searchFilter = $state('');
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateFolder = $state(false);

	let filteredRootFolders = $derived.by(() => {
		if (!searchFilter) return rootFolders;
		const q = searchFilter.toLowerCase();
		return rootFolders.filter((f) => f.name.toLowerCase().includes(q));
	});

	let hasSelection = $derived(selectedFolderId !== null);

	$effect(() => {
		loadFolders();
	});

	async function loadFolders() {
		loading = true;
		error = null;
		try {
			const result = await listDriveFolders();
			rootFolders = result.folders;

			// Auto-highlight folder matching person name
			const match = rootFolders.find((f) => f.name.toLowerCase() === personName.toLowerCase());
			if (match && !selectedFolderId) {
				selectedFolderId = match.id;
				selectedFolderName = match.name;
				onSelect(match.id, match.name);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load folders';
		} finally {
			loading = false;
		}
	}

	function handleFolderSelect(folder: DriveFolderInfo) {
		selectedFolderId = folder.id;
		selectedFolderName = folder.name;

		// Save to recent folders
		const recentKey = 'gdrive.recentFolderIds';
		const recent = localSettings.get<string[]>(recentKey, []);
		const updated = [folder.id, ...recent.filter((id) => id !== folder.id)].slice(0, 3);
		localSettings.set(recentKey, updated);
		localSettings.set('gdrive.lastFolderId', folder.id);
		localSettings.set('gdrive.lastFolderPath', folder.name);

		onSelect(folder.id, folder.name);
	}

	function handleFolderCreated(folder: CreateFolderResponse) {
		// Add to root folders and select it
		const newFolder: DriveFolderInfo = {
			id: folder.folderId,
			name: folder.name,
			parentId: folder.parentId,
			hasChildren: false
		};
		rootFolders = [...rootFolders, newFolder];
		selectedFolderId = folder.folderId;
		selectedFolderName = folder.name;
		showCreateFolder = false;
	}
</script>

<div class="flex flex-col gap-3">
	<p class="text-sm text-gray-600">
		Choose a destination folder for {personName}'s photos.
	</p>

	<!-- Search + Create -->
	<div class="flex items-center gap-2">
		<Input
			type="text"
			bind:value={searchFilter}
			placeholder="Filter folders..."
			aria-label="Filter folders"
			class="h-8 text-sm flex-1"
		/>
		<Button size="sm" variant="outline" onclick={() => (showCreateFolder = !showCreateFolder)}>
			{showCreateFolder ? 'Cancel' : 'New Folder'}
		</Button>
	</div>

	<!-- Create Folder Inline -->
	{#if showCreateFolder}
		<CreateFolderInline
			parentFolderId={selectedFolderId}
			onCreated={handleFolderCreated}
			onCancel={() => (showCreateFolder = false)}
		/>
	{/if}

	<!-- Folder Tree -->
	<div class="border rounded-md max-h-[320px] overflow-y-auto p-2 bg-white">
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<span
					class="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
				></span>
				<span class="ml-2 text-sm text-gray-500">Loading folders...</span>
			</div>
		{:else if error}
			<div class="text-center py-8" role="alert">
				<p class="text-sm text-red-600">{error}</p>
				<Button size="sm" variant="outline" class="mt-2" onclick={loadFolders}>Retry</Button>
			</div>
		{:else if filteredRootFolders.length === 0}
			<div class="text-center py-8">
				<p class="text-sm text-gray-500">
					{searchFilter
						? 'No folders match your search.'
						: 'No folders found. Create one to get started.'}
				</p>
			</div>
		{:else}
			<FolderTree folders={filteredRootFolders} {selectedFolderId} onSelect={handleFolderSelect} />
		{/if}
	</div>

	<!-- Selection summary -->
	{#if hasSelection && selectedFolderName}
		<p class="text-sm text-gray-600">
			Selected: <span class="font-medium text-gray-800">{selectedFolderName}</span>
		</p>
	{/if}
</div>
