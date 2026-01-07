<script lang="ts">
	import { getPersonPhotos, bulkRemoveFromPerson, bulkMoveToPerson } from '$lib/api/faces';
	import type { PersonPhotoGroup } from '$lib/api/faces';
	import { API_BASE_URL } from '$lib/api/client';
	import PersonPickerModal from './PersonPickerModal.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		personId: string;
		personName: string;
		onPhotoClick?: (photoId: number) => void;
	}

	let { personId, personName, onPhotoClick }: Props = $props();

	// State
	let photos = $state<PersonPhotoGroup[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedPhotoIds = $state<Set<number>>(new Set());
	let page = $state(1);
	let total = $state(0);
	let pageSize = 20;

	// Bulk action state
	let showMoveModal = $state(false);
	let bulkActionInProgress = $state(false);

	// Derived
	let hasSelection = $derived(selectedPhotoIds.size > 0);
	let allSelected = $derived(selectedPhotoIds.size === photos.length && photos.length > 0);
	let totalPages = $derived(Math.ceil(total / pageSize));

	// Load photos when component mounts or personId/page changes
	$effect(() => {
		const id = personId;
		const currentPage = page;
		if (id && currentPage) {
			loadPhotos();
		}
	});

	async function loadPhotos() {
		loading = true;
		error = null;
		try {
			const response = await getPersonPhotos(personId, page, pageSize);
			photos = response.items;
			total = response.total;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load photos';
		} finally {
			loading = false;
		}
	}

	function toggleSelection(photoId: number) {
		const newSet = new Set(selectedPhotoIds);
		if (newSet.has(photoId)) {
			newSet.delete(photoId);
		} else {
			newSet.add(photoId);
		}
		selectedPhotoIds = newSet;
	}

	function toggleSelectAll() {
		if (allSelected) {
			selectedPhotoIds = new Set();
		} else {
			selectedPhotoIds = new Set(photos.map((p) => p.photoId));
		}
	}

	function clearSelection() {
		selectedPhotoIds = new Set();
	}

	function goToPage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages) {
			page = newPage;
			// Clear selection when changing pages
			selectedPhotoIds = new Set();
		}
	}

	async function handleBulkRemove() {
		if (!confirm(`Remove ${selectedPhotoIds.size} photos from ${personName}?`)) return;

		bulkActionInProgress = true;
		try {
			const result = await bulkRemoveFromPerson(personId, [...selectedPhotoIds]);
			alert(
				`Removed ${result.updatedFaces} faces from ${result.updatedPhotos} photos` +
					(result.skippedFaces > 0 ? ` (${result.skippedFaces} faces skipped)` : '')
			);
			selectedPhotoIds = new Set();
			await loadPhotos(); // Refresh
		} catch (e) {
			alert('Failed to remove: ' + (e instanceof Error ? e.message : 'Unknown error'));
		} finally {
			bulkActionInProgress = false;
		}
	}

	async function handleBulkMove(destination: { toPersonId: string } | { toPersonName: string }) {
		bulkActionInProgress = true;
		showMoveModal = false;

		try {
			const result = await bulkMoveToPerson(personId, [...selectedPhotoIds], destination);
			alert(
				`Moved ${result.updatedFaces} faces from ${result.updatedPhotos} photos to ${result.toPersonName}` +
					(result.skippedFaces > 0 ? ` (${result.skippedFaces} faces skipped)` : '') +
					(result.personCreated ? ' (new person created)' : '')
			);
			selectedPhotoIds = new Set();
			await loadPhotos(); // Refresh
		} catch (e) {
			alert('Failed to move: ' + (e instanceof Error ? e.message : 'Unknown error'));
		} finally {
			bulkActionInProgress = false;
		}
	}

	function getImageUrl(url: string): string {
		if (!url) return '';
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}
		return `${API_BASE_URL}${url}`;
	}
</script>

<div class="photos-tab">
	<!-- Header with select all -->
	<div class="photos-header">
		<span class="photo-count">{total} {total === 1 ? 'photo' : 'photos'}</span>
		{#if photos && photos.length > 0}
			<button type="button" class="select-all-btn" onclick={toggleSelectAll}>
				{allSelected ? 'Deselect All' : 'Select All'}
			</button>
		{/if}
	</div>

	<!-- Photo grid -->
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading photos...</p>
		</div>
	{:else if error}
		<div class="error-state" role="alert">
			<svg
				class="error-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<p>{error}</p>
			<button type="button" class="retry-button" onclick={loadPhotos}>Retry</button>
		</div>
	{:else if !photos || photos.length === 0}
		<div class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
				<circle cx="8.5" cy="8.5" r="1.5" />
				<polyline points="21 15 16 10 5 21" />
			</svg>
			<p>No photos found</p>
		</div>
	{:else}
		<div class="photos-grid">
			{#each photos as photo (photo.photoId)}
				{@const isSelected = selectedPhotoIds.has(photo.photoId)}
				<div class="photo-card" class:selected={isSelected}>
					<Checkbox
						class="photo-checkbox"
						checked={isSelected}
						onCheckedChange={() => toggleSelection(photo.photoId)}
						aria-label="Select photo {photo.photoId}"
					/>
					<button
						type="button"
						class="photo-thumbnail"
						onclick={() => onPhotoClick?.(photo.photoId)}
					>
						<img src={getImageUrl(photo.thumbnailUrl)} alt="" loading="lazy" />
						<div class="badges">
							<span class="face-count-badge"
								>{photo.faceCount} {photo.faceCount === 1 ? 'face' : 'faces'}</span
							>
							{#if photo.hasNonPersonFaces}
								<span class="mixed-badge">Mixed</span>
							{/if}
						</div>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Pagination -->
	{#if total > pageSize && !loading}
		<div class="pagination">
			<button
				type="button"
				class="pagination-btn"
				disabled={page === 1}
				onclick={() => goToPage(page - 1)}
			>
				Previous
			</button>
			<span class="page-info">
				Page {page} of {totalPages}
			</span>
			<button
				type="button"
				class="pagination-btn"
				disabled={page >= totalPages}
				onclick={() => goToPage(page + 1)}
			>
				Next
			</button>
		</div>
	{/if}

	<!-- Bulk action toolbar (sticky bottom) -->
	{#if hasSelection}
		<div class="bulk-toolbar">
			<span class="selection-count">{selectedPhotoIds.size} selected</span>
			<div class="bulk-actions">
				<button
					type="button"
					class="action-btn remove-btn"
					onclick={handleBulkRemove}
					disabled={bulkActionInProgress}
				>
					Remove from {personName}
				</button>
				<button
					type="button"
					class="action-btn move-btn"
					onclick={() => (showMoveModal = true)}
					disabled={bulkActionInProgress}
				>
					Move to...
				</button>
				<button type="button" class="action-btn clear-btn" onclick={clearSelection}> Clear </button>
			</div>
		</div>
	{/if}
</div>

<!-- Move Modal -->
{#if showMoveModal}
	<PersonPickerModal
		onSelect={handleBulkMove}
		onClose={() => (showMoveModal = false)}
		excludePersonId={personId}
	/>
{/if}

<style>
	.photos-tab {
		position: relative;
		min-height: 400px;
	}

	.photos-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding: 0.75rem 0;
	}

	.photo-count {
		font-size: 0.95rem;
		color: #666;
		font-weight: 500;
	}

	.select-all-btn {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #4a90e2;
		cursor: pointer;
		transition: all 0.2s;
	}

	.select-all-btn:hover {
		background: #f5f5f5;
		border-color: #4a90e2;
	}

	/* Loading & Error States */
	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: #666;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #f0f0f0;
		border-top-color: #4a90e2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-icon {
		width: 48px;
		height: 48px;
		color: #e53e3e;
		margin-bottom: 1rem;
	}

	.empty-state svg {
		width: 48px;
		height: 48px;
		color: #ccc;
		margin-bottom: 1rem;
	}

	.retry-button {
		margin-top: 1rem;
		padding: 0.625rem 1.5rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-button:hover {
		background-color: #3a7bc8;
	}

	/* Photos Grid */
	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.photo-card {
		position: relative;
		border: 2px solid transparent;
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.2s;
		background: white;
	}

	.photo-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.photo-card.selected {
		border-color: #4a90e2;
		background: #e8f4fd;
	}

	:global(.photo-card .photo-checkbox) {
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: 2;
		cursor: pointer;
	}

	.photo-thumbnail {
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		display: block;
		position: relative;
	}

	.photo-thumbnail img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		display: block;
		background-color: #f0f0f0;
	}

	.badges {
		position: absolute;
		bottom: 8px;
		right: 8px;
		display: flex;
		gap: 4px;
		flex-direction: column;
		align-items: flex-end;
	}

	.face-count-badge,
	.mixed-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		backdrop-filter: blur(4px);
	}

	.mixed-badge {
		background: rgba(251, 146, 60, 0.9);
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem 0;
		margin-bottom: 4rem; /* Space for bulk toolbar */
	}

	.pagination-btn {
		padding: 0.625rem 1.25rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #333;
		cursor: pointer;
		transition: all 0.2s;
	}

	.pagination-btn:hover:not(:disabled) {
		background: #f5f5f5;
		border-color: #4a90e2;
		color: #4a90e2;
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-info {
		font-size: 0.875rem;
		color: #666;
		font-weight: 500;
	}

	/* Bulk Toolbar */
	.bulk-toolbar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		padding: 1rem 2rem;
		border-top: 2px solid #4a90e2;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
		z-index: 100;
	}

	.selection-count {
		font-weight: 600;
		color: #4a90e2;
		font-size: 1rem;
	}

	.bulk-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.action-btn {
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: all 0.2s;
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.remove-btn {
		background-color: #dc2626;
		color: white;
	}

	.remove-btn:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.move-btn {
		background-color: #4a90e2;
		color: white;
	}

	.move-btn:hover:not(:disabled) {
		background-color: #3a7bc8;
	}

	.clear-btn {
		background: white;
		border: 1px solid #ddd;
		color: #666;
	}

	.clear-btn:hover {
		background: #f5f5f5;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.photos-grid {
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			gap: 0.75rem;
		}

		.bulk-toolbar {
			padding: 0.75rem 1rem;
			flex-direction: column;
			gap: 0.75rem;
			align-items: stretch;
		}

		.bulk-actions {
			justify-content: stretch;
		}

		.action-btn {
			flex: 1;
		}
	}
</style>
