<script lang="ts">
	import type { SubdirectoryInfo } from '$lib/types';
	import { listDirectories } from '$lib/api/training';

	interface Props {
		rootPath: string;
		selectedSubdirs?: string[];
		onSelectionChange: (selected: string[]) => void;
	}

	let { rootPath, selectedSubdirs = $bindable([]), onSelectionChange }: Props = $props();

	// Ensure selectedSubdirs is always an array (defensive for undefined/null)
	let safeSelectedSubdirs = $derived(selectedSubdirs ?? []);

	let subdirs = $state<SubdirectoryInfo[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let filterText = $state('');

	// Filtered subdirectories based on filter text
	let filteredSubdirs = $derived(
		filterText
			? subdirs.filter((d) => d.path.toLowerCase().includes(filterText.toLowerCase()))
			: subdirs
	);

	async function loadSubdirectories() {
		if (!rootPath) return;

		loading = true;
		error = null;
		try {
			subdirs = await listDirectories(rootPath);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load directories';
			subdirs = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (rootPath) {
			loadSubdirectories();
		}
	});

	function toggleSubdir(path: string) {
		if (safeSelectedSubdirs.includes(path)) {
			selectedSubdirs = safeSelectedSubdirs.filter((p) => p !== path);
		} else {
			selectedSubdirs = [...safeSelectedSubdirs, path];
		}
		onSelectionChange(selectedSubdirs);
	}

	function selectAll() {
		// Select only filtered subdirectories, preserving existing selections from other filter states
		const pathsToSelect = filteredSubdirs.map((d) => d.path);
		selectedSubdirs = [...new Set([...safeSelectedSubdirs, ...pathsToSelect])];
		onSelectionChange(selectedSubdirs);
	}

	function deselectAll() {
		selectedSubdirs = [];
		onSelectionChange(selectedSubdirs);
	}
</script>

<div class="directory-browser">
	<div class="browser-header">
		<h3>Select Subdirectories</h3>
		<div class="actions">
			<button class="btn-action" onclick={selectAll} disabled={loading || filteredSubdirs.length === 0}>
				Select All
			</button>
			<button
				class="btn-action"
				onclick={deselectAll}
				disabled={loading || safeSelectedSubdirs.length === 0}
			>
				Deselect All
			</button>
		</div>
	</div>

	{#if !loading && subdirs.length > 0}
		<div class="filter-container">
			<input
				type="text"
				bind:value={filterText}
				placeholder="Filter directories..."
				class="filter-input"
				aria-label="Filter directories"
			/>
			{#if filterText}
				<div class="filter-count">
					Showing {filteredSubdirs.length} of {subdirs.length} directories
				</div>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="loading">Loading directories...</div>
	{:else if error}
		<div class="error" role="alert">
			{error}
		</div>
	{:else if subdirs.length === 0}
		<div class="empty">No subdirectories found.</div>
	{:else if filteredSubdirs.length === 0}
		<div class="empty">No directories match the filter.</div>
	{:else}
		<div class="subdirs-list">
			{#each filteredSubdirs as subdir}
				<label class="subdir-item">
					<input
						type="checkbox"
						checked={safeSelectedSubdirs.includes(subdir.path)}
						onchange={() => toggleSubdir(subdir.path)}
					/>
					<div class="subdir-info">
						<div class="subdir-path">{subdir.path}</div>
						<div class="subdir-count">{subdir.imageCount} images</div>
					</div>
				</label>
			{/each}
		</div>
	{/if}

	{#if safeSelectedSubdirs.length > 0}
		<div class="selection-summary">
			{safeSelectedSubdirs.length} subdirectory(ies) selected
		</div>
	{/if}
</div>

<style>
	.directory-browser {
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.browser-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.browser-header h3 {
		margin: 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-action {
		padding: 0.375rem 0.75rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-action:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-action:disabled {
		background-color: #d1d5db;
		cursor: not-allowed;
	}

	.filter-container {
		margin-bottom: 1rem;
	}

	.filter-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #1f2937;
		background-color: white;
		transition: border-color 0.2s;
	}

	.filter-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.filter-input::placeholder {
		color: #9ca3af;
	}

	.filter-count {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: #6b7280;
		font-style: italic;
	}

	.loading,
	.error,
	.empty {
		padding: 2rem;
		text-align: center;
		color: #6b7280;
	}

	.error {
		color: #dc2626;
		background-color: #fee2e2;
		border-radius: 4px;
	}

	.subdirs-list {
		max-height: 400px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.subdir-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.subdir-item:hover {
		background-color: #f9fafb;
	}

	.subdir-item input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.subdir-info {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.subdir-path {
		font-size: 0.875rem;
		color: #1f2937;
		font-weight: 500;
	}

	.subdir-count {
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.selection-summary {
		margin-top: 1rem;
		padding: 0.75rem;
		background-color: #dbeafe;
		color: #1e40af;
		border-radius: 4px;
		font-size: 0.875rem;
		text-align: center;
		font-weight: 500;
	}
</style>
