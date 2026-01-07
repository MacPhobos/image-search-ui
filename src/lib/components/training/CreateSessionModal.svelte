<script lang="ts">
	import { createSession, scanDirectory } from '$lib/api/training';
	import type { Category } from '$lib/api/categories';
	import DirectoryBrowser from './DirectoryBrowser.svelte';
	import CategorySelector from '../CategorySelector.svelte';
	import CategoryCreateModal from '../CategoryCreateModal.svelte';
	import { onMount } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	interface Props {
		open: boolean;
		onClose: () => void;
		onSessionCreated: (sessionId: number) => void;
	}

	let { open = $bindable(false), onClose, onSessionCreated }: Props = $props();

	// Storage keys for persisting last used values (per-user scope for future auth)
	const STORAGE_KEYS = {
		LAST_ROOT_PATH: 'training.lastRootPath',
		LAST_CATEGORY_ID: 'training.lastCategoryId'
	};

	let sessionName = $state('');
	let rootPath = $state('');
	let categoryId = $state<number | null>(null);
	let selectedSubdirs = $state<string[]>([]);
	let step = $state<'info' | 'subdirs'>('info');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let showCategoryModal = $state(false);
	let categorySelectorRef: any; // Component reference for refresh

	// Load last-used values from localStorage on mount
	onMount(() => {
		try {
			const lastRootPath = localStorage.getItem(STORAGE_KEYS.LAST_ROOT_PATH);
			if (lastRootPath) {
				rootPath = lastRootPath;
			}

			const lastCategoryId = localStorage.getItem(STORAGE_KEYS.LAST_CATEGORY_ID);
			if (lastCategoryId) {
				const categoryIdNum = parseInt(lastCategoryId, 10);
				if (!isNaN(categoryIdNum)) {
					categoryId = categoryIdNum;
				}
			}
		} catch (err) {
			// Ignore localStorage errors (private browsing, quota exceeded)
			console.warn('Failed to load last-used values from localStorage:', err);
		}
	});

	async function handleNextStep() {
		if (!sessionName || !rootPath) {
			error = 'Please provide session name and root path';
			return;
		}

		if (!categoryId) {
			error = 'Please select a category';
			return;
		}

		loading = true;
		error = null;

		try {
			// Scan directory to verify it exists and has images
			await scanDirectory(rootPath, true);
			step = 'subdirs';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to scan directory';
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		if (!categoryId) {
			error = 'Please select a category';
			return;
		}

		loading = true;
		error = null;

		try {
			// Save to localStorage for next time
			try {
				localStorage.setItem(STORAGE_KEYS.LAST_ROOT_PATH, rootPath);
				if (categoryId !== null) {
					localStorage.setItem(STORAGE_KEYS.LAST_CATEGORY_ID, categoryId.toString());
				}
			} catch (err) {
				// Ignore save errors
				console.warn('Failed to save last-used values to localStorage:', err);
			}

			const session = await createSession({
				name: sessionName,
				rootPath: rootPath,
				categoryId: categoryId,
				subdirectories: selectedSubdirs.length > 0 ? selectedSubdirs : undefined
			});
			onSessionCreated(session.id);
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create session';
		} finally {
			loading = false;
		}
	}

	function handleCategoryCreated(category: Category) {
		categoryId = category.id;
		showCategoryModal = false;

		// Refresh the category dropdown to show the new category
		if (categorySelectorRef?.refresh) {
			categorySelectorRef.refresh();
		}
	}

	function handleBack() {
		step = 'info';
	}

	function handleClose() {
		step = 'info';
		error = null;
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<Dialog.Content data-testid="modal__create-session">
		<Dialog.Header data-testid="modal__create-session__header">
			<Dialog.Title>Create Training Session</Dialog.Title>
			<Dialog.Description>
				{#if step === 'info'}
					Configure the training session by providing a name, root directory path, and category.
				{:else}
					Select which subdirectories to include in training. Leave none selected to include all.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if step === 'info'}
			<div
				style="display: grid; gap: 1rem; padding: 0.5rem 0;"
				data-testid="modal__create-session__body"
			>
				<div>
					<Label for="session-name">Session Name</Label>
					<Input
						id="session-name"
						bind:value={sessionName}
						placeholder="My Training Session"
						disabled={loading}
						data-testid="modal__create-session__input-name"
					/>
				</div>

				<div>
					<Label for="root-path">Root Path</Label>
					<Input
						id="root-path"
						bind:value={rootPath}
						placeholder="/path/to/images"
						disabled={loading}
						data-testid="modal__create-session__input-path"
					/>
					<p style="margin-top: 0.5rem; font-size: 0.8125rem; color: hsl(var(--muted-foreground));">
						Provide the absolute path to the directory containing images to train on.
					</p>
				</div>

				<div>
					<CategorySelector
						bind:this={categorySelectorRef}
						selectedId={categoryId}
						onSelect={(id) => (categoryId = id)}
						onCreateNew={() => (showCategoryModal = true)}
						showCreateOption={true}
						label="Category"
					/>
					<p style="margin-top: 0.5rem; font-size: 0.8125rem; color: hsl(var(--muted-foreground));">
						Categorize this training session for better organization.
					</p>
				</div>

				{#if error}
					<Alert variant="destructive" data-testid="modal__create-session__error">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}
			</div>

			<Dialog.Footer data-testid="modal__create-session__footer">
				<Button
					variant="outline"
					onclick={handleClose}
					disabled={loading}
					data-testid="modal__create-session__btn-cancel"
				>
					Cancel
				</Button>
				<Button
					onclick={handleNextStep}
					disabled={loading}
					data-testid="modal__create-session__btn-next"
				>
					{loading ? 'Scanning...' : 'Next'}
				</Button>
			</Dialog.Footer>
		{:else if step === 'subdirs'}
			<div
				style="display: grid; gap: 1rem; padding: 0.5rem 0;"
				data-testid="modal__create-session__body"
			>
				<DirectoryBrowser
					{rootPath}
					bind:selectedSubdirs
					onSelectionChange={(selected) => (selectedSubdirs = selected)}
				/>

				{#if error}
					<Alert variant="destructive" data-testid="modal__create-session__error">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}
			</div>

			<Dialog.Footer data-testid="modal__create-session__footer">
				<Button
					variant="outline"
					onclick={handleBack}
					disabled={loading}
					data-testid="modal__create-session__btn-back"
				>
					Back
				</Button>
				<Button
					onclick={handleCreate}
					disabled={loading}
					data-testid="modal__create-session__btn-create"
				>
					{loading ? 'Creating...' : 'Create Session'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<CategoryCreateModal
	open={showCategoryModal}
	onClose={() => (showCategoryModal = false)}
	onCreated={handleCategoryCreated}
/>
