<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import type { SubdirectoryInfo } from '$lib/types';
	import { listDirectories } from '$lib/api/training';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import DirectoryImagePreviewModal from './DirectoryImagePreviewModal.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('training/DirectoryBrowser', {
		filePath: 'src/lib/components/training/DirectoryBrowser.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		rootPath: string;
		selectedSubdirs?: string[];
		onSelectionChange: (selected: string[]) => void;
	}

	let { rootPath, selectedSubdirs = $bindable([]), onSelectionChange }: Props = $props();

	// Ensure selectedSubdirs is always an array (defensive for undefined/null)
	let safeSelectedSubdirs = $derived(selectedSubdirs ?? []);

	// Extended SubdirectoryInfo with training status (will come from backend after deployment)
	interface ExtendedSubdirectoryInfo extends SubdirectoryInfo {
		trainedCount?: number;
		lastTrainedAt?: string;
		trainingStatus?: 'never' | 'partial' | 'complete' | 'in_progress';
	}

	let subdirs = $state<ExtendedSubdirectoryInfo[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let filterText = $state('');
	let hideTrainedDirs = $state(false);

	// Image preview modal state
	let previewOpen = $state(false);
	let previewPath = $state('');

	// Filtered subdirectories based on filter text and training status
	let filteredSubdirs = $derived.by(() => {
		let results = subdirs;

		// Text filter
		if (filterText) {
			results = results.filter((d) => d.path.toLowerCase().includes(filterText.toLowerCase()));
		}

		// Training status filter (hide FULLY trained only, show partial and in_progress)
		if (hideTrainedDirs) {
			results = results.filter((d) => d.trainingStatus !== 'complete');
		}

		return results;
	});

	// Count of fully trained directories for display
	let fullyTrainedCount = $derived.by(
		() => subdirs.filter((d) => d.trainingStatus === 'complete').length
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

	function formatRelativeTime(isoString: string): string {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 60) return `${diffMins} min ago`;
		if (diffHours < 24) return `${diffHours} hours ago`;
		if (diffDays < 7) return `${diffDays} days ago`;

		return date.toLocaleDateString();
	}

	function showPreview(path: string) {
		previewPath = path;
		previewOpen = true;
	}
</script>

<div class="directory-browser">
	<div class="browser-header">
		<h3>Select Subdirectories</h3>
		<div class="actions">
			<button
				class="btn-action"
				onclick={selectAll}
				disabled={loading || filteredSubdirs.length === 0}
			>
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

			<!-- Hide fully trained switch -->
			<div class="switch-filter">
				<Switch bind:checked={hideTrainedDirs} id="hide-trained" />
				<Label for="hide-trained">Hide fully trained directories</Label>
			</div>

			{#if filterText || hideTrainedDirs}
				<div class="filter-count">
					Showing {filteredSubdirs.length} of {subdirs.length} directories
					{#if hideTrainedDirs && fullyTrainedCount > 0}
						({fullyTrainedCount} hidden)
					{/if}
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
				<label
					class="subdir-item"
					class:fully-trained={subdir.trainingStatus === 'complete'}
					class:partially-trained={subdir.trainingStatus === 'partial'}
					class:in-progress={subdir.trainingStatus === 'in_progress'}
				>
					<Checkbox
						checked={safeSelectedSubdirs.includes(subdir.path)}
						onCheckedChange={() => toggleSubdir(subdir.path)}
					/>
					<div class="subdir-info">
						<div class="subdir-header">
							<span class="subdir-path">{subdir.path}</span>

							<div class="subdir-actions">
								<button
									type="button"
									class="btn-preview"
									onclick={() => showPreview(subdir.path)}
									title="Show images in this directory"
									aria-label="Show images in {subdir.path}"
								>
									🖼️ Show Images
								</button>
							</div>

							{#if subdir.trainingStatus === 'in_progress'}
								<span class="training-badge in-progress" aria-label="Training in progress">
									<svg class="spinner-icon" viewBox="0 0 24 24" fill="none">
										<circle
											class="spinner-track"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="3"
										/>
										<circle
											class="spinner-head"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="3"
											stroke-dasharray="31.4 31.4"
											stroke-linecap="round"
										/>
									</svg>
									Training...
								</span>
							{:else if subdir.trainedCount && subdir.trainedCount > 0}
								<span class="training-badge" class:complete={subdir.trainingStatus === 'complete'}>
									{#if subdir.trainingStatus === 'complete'}
										✓ Fully Trained
									{:else}
										⚠ {subdir.trainedCount}/{subdir.imageCount} trained
									{/if}
								</span>
							{/if}
						</div>

						<div class="subdir-meta">
							<span class="image-count">{subdir.imageCount} images</span>

							{#if subdir.lastTrainedAt}
								<span class="last-trained">
									Last trained: {formatRelativeTime(subdir.lastTrainedAt)}
								</span>
							{/if}
						</div>
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

<DirectoryImagePreviewModal
	bind:open={previewOpen}
	directoryPath={previewPath}
	onClose={() => (previewOpen = false)}
/>

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

	.switch-filter {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 0;
		margin-top: 0.5rem;
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
		max-height: 60vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.subdir-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.subdir-item:hover {
		background-color: #f9fafb;
		border-color: #d1d5db;
	}

	/* Training status background colors */
	.subdir-item.fully-trained {
		background-color: #f0fdf4;
		border-left: 3px solid #22c55e;
	}

	.subdir-item.partially-trained {
		background-color: #fffbeb;
		border-left: 3px solid #f59e0b;
	}

	.subdir-item.in-progress {
		background-color: #eff6ff;
		border-left: 3px solid #3b82f6;
	}

	.subdir-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.subdir-header {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.subdir-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-preview {
		padding: 0.25rem 0.5rem;
		background-color: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.btn-preview:hover {
		background-color: #e5e7eb;
		border-color: #9ca3af;
	}

	.btn-preview:active {
		transform: scale(0.98);
	}

	.subdir-path {
		font-size: 0.875rem;
		color: #1f2937;
		font-weight: 500;
	}

	.training-badge {
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: 12px;
		background-color: #fef3c7;
		color: #92400e;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
	}

	.training-badge.complete {
		background-color: #d1fae5;
		color: #065f46;
	}

	.training-badge.in-progress {
		background-color: #dbeafe;
		color: #1e40af;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.spinner-icon {
		width: 12px;
		height: 12px;
		animation: spin 1s linear infinite;
	}

	.spinner-track {
		opacity: 0.25;
	}

	.spinner-head {
		transform-origin: center;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.subdir-meta {
		display: flex;
		gap: 12px;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.image-count {
		font-size: 0.8125rem;
	}

	.last-trained {
		font-size: 0.8125rem;
		font-style: italic;
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
