<script lang="ts">
	import { createDriveFolder, type CreateFolderResponse } from '$lib/api/gdrive';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		parentFolderId: string | null;
		onCreated: (folder: CreateFolderResponse) => void;
		onCancel: () => void;
	}

	let { parentFolderId = null, onCreated, onCancel }: Props = $props();

	let folderName = $state('');
	let creating = $state(false);
	let error = $state<string | null>(null);

	let isValid = $derived(
		folderName.trim().length > 0 && !folderName.includes('/') && folderName.length <= 255
	);

	async function handleSubmit() {
		if (!isValid || creating) return;

		creating = true;
		error = null;

		try {
			const result = await createDriveFolder(parentFolderId, folderName.trim());
			onCreated(result);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create folder';
		} finally {
			creating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && isValid) {
			handleSubmit();
		} else if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

<div class="flex items-center gap-2 py-2 px-1">
	<Input
		type="text"
		bind:value={folderName}
		placeholder="New folder name"
		aria-label="New folder name"
		onkeydown={handleKeydown}
		class="h-8 text-sm flex-1"
		maxlength={255}
		disabled={creating}
	/>
	<Button size="sm" variant="default" onclick={handleSubmit} disabled={!isValid || creating}>
		{creating ? 'Creating...' : 'Create'}
	</Button>
	<Button size="sm" variant="ghost" onclick={onCancel} disabled={creating}>Cancel</Button>
</div>
{#if error}
	<p class="text-sm text-red-600 px-1 mt-1" role="alert">{error}</p>
{/if}
{#if folderName.includes('/')}
	<p class="text-sm text-red-600 px-1 mt-1" role="alert">Folder name cannot contain slashes</p>
{/if}
