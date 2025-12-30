<script lang="ts">
	import { createSession, scanDirectory } from '$lib/api/training';
	import type { Category } from '$lib/api/categories';
	import DirectoryBrowser from './DirectoryBrowser.svelte';
	import CategorySelector from '../CategorySelector.svelte';
	import CategoryCreateModal from '../CategoryCreateModal.svelte';
	import { onMount } from 'svelte';

	interface Props {
		onClose: () => void;
		onSessionCreated: (sessionId: number) => void;
	}

	let { onClose, onSessionCreated }: Props = $props();

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
			onClose();
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
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
	<div
		class="modal-content"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal-header">
			<h2>Create Training Session</h2>
			<button class="close-btn" onclick={onClose}>&times;</button>
		</div>

		{#if step === 'info'}
			<div class="modal-body">
				<div class="form-group">
					<label for="session-name">Session Name</label>
					<input
						id="session-name"
						type="text"
						bind:value={sessionName}
						placeholder="My Training Session"
						class="form-input"
					/>
				</div>

				<div class="form-group">
					<label for="root-path">Root Path</label>
					<input
						id="root-path"
						type="text"
						bind:value={rootPath}
						placeholder="/path/to/images"
						class="form-input"
					/>
					<p class="form-help">
						Provide the absolute path to the directory containing images to train on.
					</p>
				</div>

				<div class="form-group">
					<CategorySelector
						bind:this={categorySelectorRef}
						selectedId={categoryId}
						onSelect={(id) => (categoryId = id)}
						onCreateNew={() => (showCategoryModal = true)}
						showCreateOption={true}
						label="Category"
					/>
					<p class="form-help">Categorize this training session for better organization.</p>
				</div>

				{#if error}
					<div class="error-message" role="alert">
						{error}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={onClose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleNextStep} disabled={loading}>
					{loading ? 'Scanning...' : 'Next'}
				</button>
			</div>
		{:else if step === 'subdirs'}
			<div class="modal-body">
				<p class="step-description">
					Select which subdirectories to include in training. Leave none selected to include all.
				</p>

				<DirectoryBrowser
					{rootPath}
					bind:selectedSubdirs
					onSelectionChange={(selected) => (selectedSubdirs = selected)}
				/>

				{#if error}
					<div class="error-message" role="alert">
						{error}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={handleBack} disabled={loading}>Back</button>
				<button class="btn btn-primary" onclick={handleCreate} disabled={loading}>
					{loading ? 'Creating...' : 'Create Session'}
				</button>
			</div>
		{/if}
	</div>
</div>

<CategoryCreateModal
	open={showCategoryModal}
	onClose={() => (showCategoryModal = false)}
	onCreated={handleCategoryCreated}
/>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
		border-radius: 8px;
		width: 90%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	@media (max-width: 480px) {
		.modal-content {
			width: 95%;
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-btn:hover {
		background-color: #f3f4f6;
	}

	.modal-body {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.form-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #1f2937;
		transition: border-color 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-help {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.step-description {
		margin-bottom: 1rem;
		color: #4b5563;
		font-size: 0.875rem;
	}

	.error-message {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background-color: #fee2e2;
		color: #991b1b;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #4b5563;
	}
</style>
