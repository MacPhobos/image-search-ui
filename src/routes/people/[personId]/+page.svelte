<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { listPersons, mergePersons, getPersonPhotos } from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import PersonPhotosTab from '$lib/components/faces/PersonPhotosTab.svelte';
	import PhotoPreviewModal from '$lib/components/faces/PhotoPreviewModal.svelte';
	import type { Person } from '$lib/types';
	import type { PersonPhotoGroup } from '$lib/api/faces';
	import { onMount } from 'svelte';

	// Get person ID from route params
	let personId = $derived($page.params.personId);

	// Initialize tab from URL
	let activeTab = $state<'faces' | 'photos'>(
		($page.url.searchParams.get('tab') as 'faces' | 'photos') || 'faces'
	);

	// State
	let person = $state<Person | null>(null);
	let photos = $state<PersonPhotoGroup[]>([]);
	let loading = $state(true);
	let loadingPhotos = $state(true);
	let error = $state<string | null>(null);
	let photoError = $state<string | null>(null);

	// Merge modal state
	let showMergeModal = $state(false);
	let mergeTargetPersons = $state<Person[]>([]);
	let selectedMergeTarget = $state<Person | null>(null);
	let merging = $state(false);
	let mergeError = $state<string | null>(null);

	// Lightbox state
	let showLightbox = $state(false);
	let lightboxPhoto = $state<PersonPhotoGroup | null>(null);
	let lightboxPhotos = $state<PersonPhotoGroup[]>([]);
	let lightboxIndex = $state(0);

	onMount(() => {
		loadPerson();
	});

	// Reload when personId changes
	$effect(() => {
		const id = personId;
		if (id) {
			loadPerson();
		}
	});

	async function loadPerson() {
		loading = true;
		error = null;

		try {
			// The API doesn't have a get single person endpoint, so we list and find
			const response = await listPersons(1, 100, 'active');
			person = response.items.find((p) => p.id === personId) || null;

			if (!person) {
				// Try merged/hidden
				const mergedResponse = await listPersons(1, 100, 'merged');
				person = mergedResponse.items.find((p) => p.id === personId) || null;
			}

			if (!person) {
				error = 'Person not found.';
			} else {
				// Load photos for this person
				loadPhotos();
				// Load other persons for merge target selection
				loadMergeTargets();
			}
		} catch (err) {
			console.error('Failed to load person:', err);
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Failed to load person. Please try again.';
			}
		} finally {
			loading = false;
		}
	}

	async function loadPhotos() {
		if (!person) return;

		loadingPhotos = true;
		photoError = null;

		try {
			// Get photos with faces for this person
			const response = await getPersonPhotos(person.id, 1, 50);
			photos = response.items;
		} catch (err) {
			console.error('Failed to load photos:', err);
			// Don't show error if it's just empty results
			if (err instanceof ApiError && err.status !== 404) {
				photoError = 'Failed to load photos for this person.';
			}
		} finally {
			loadingPhotos = false;
		}
	}

	async function loadMergeTargets() {
		try {
			const response = await listPersons(1, 100, 'active');
			// Exclude current person
			mergeTargetPersons = response.items.filter((p) => p.id !== personId);
		} catch (err) {
			console.error('Failed to load merge targets:', err);
		}
	}

	function handleBack() {
		goto('/people');
	}

	function handleOpenMergeModal() {
		showMergeModal = true;
		selectedMergeTarget = null;
		mergeError = null;
	}

	function handleCloseMergeModal() {
		showMergeModal = false;
	}

	async function handleMerge() {
		if (!selectedMergeTarget || !person || merging) return;

		merging = true;
		mergeError = null;

		try {
			await mergePersons(person.id, selectedMergeTarget.id);
			// Navigate to target person
			goto(`/people/${selectedMergeTarget.id}`);
		} catch (err) {
			console.error('Failed to merge:', err);
			if (err instanceof ApiError) {
				mergeError = err.message;
			} else {
				mergeError = 'Failed to merge. Please try again.';
			}
		} finally {
			merging = false;
		}
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	}

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	}

	// Update URL when tab changes
	function setTab(tab: 'faces' | 'photos') {
		activeTab = tab;
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	async function handlePhotoClick(photoId: number) {
		if (!person) return;

		// Load photos if not already loaded
		if (lightboxPhotos.length === 0) {
			try {
				const response = await getPersonPhotos(person.id, 1, 100);
				lightboxPhotos = response.items;
			} catch (err) {
				console.error('Failed to load photos for lightbox:', err);
				return;
			}
		}

		// Find the clicked photo
		const index = lightboxPhotos.findIndex((p) => p.photoId === photoId);
		if (index >= 0) {
			lightboxIndex = index;
			lightboxPhoto = lightboxPhotos[index];
			showLightbox = true;
		}
	}

	function handleLightboxNext() {
		if (lightboxIndex < lightboxPhotos.length - 1) {
			lightboxIndex++;
			lightboxPhoto = lightboxPhotos[lightboxIndex];
		}
	}

	function handleLightboxPrev() {
		if (lightboxIndex > 0) {
			lightboxIndex--;
			lightboxPhoto = lightboxPhotos[lightboxIndex];
		}
	}

	function closeLightbox() {
		showLightbox = false;
		lightboxPhoto = null;
	}
</script>

<svelte:head>
	<title>{person?.name || 'Person'} | Image Search</title>
</svelte:head>

<main class="person-detail-page">
	<!-- Navigation -->
	<nav class="breadcrumb">
		<button type="button" class="back-link" onclick={handleBack}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
			Back to People
		</button>
	</nav>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading person...</p>
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
			<button type="button" class="retry-button" onclick={loadPerson}>Try Again</button>
		</div>
	{:else if person}
		<!-- Header -->
		<header class="person-header">
			<div class="person-avatar-large">
				{getInitials(person.name)}
			</div>

			<div class="person-info">
				<h1>{person.name}</h1>
				<div class="person-meta">
					<span class="stat"><strong>{person.faceCount}</strong> detected faces</span>
					<span class="stat"><strong>{person.prototypeCount}</strong> prototypes</span>
					<span class="stat">Created {formatDate(person.createdAt)}</span>
				</div>
				<div class="person-status">
					<span class="status-badge status-{person.status}">{person.status}</span>
				</div>
			</div>

			<div class="person-actions">
				{#if person.status === 'active'}
					<button type="button" class="secondary-button" onclick={handleOpenMergeModal}>
						Merge into Another Person
					</button>
				{/if}
			</div>
		</header>

		<!-- Tab Navigation -->
		<div class="tabs">
			<button
				type="button"
				class="tab"
				class:active={activeTab === 'faces'}
				onclick={() => setTab('faces')}
			>
				Faces
			</button>
			<button
				type="button"
				class="tab"
				class:active={activeTab === 'photos'}
				onclick={() => setTab('photos')}
			>
				Photos
			</button>
		</div>

		<!-- Tab Content -->
		{#if activeTab === 'faces'}
			<!-- Faces Tab (Original Photos Section) -->
			<section class="photos-section">
				<h2>Photos containing {person.name}</h2>

				{#if loadingPhotos}
					<div class="loading-photos">
						<div class="spinner-small"></div>
						<span>Loading photos...</span>
					</div>
				{:else if photoError}
					<div class="photo-error">
						{photoError}
					</div>
				{:else if photos.length === 0}
					<div class="no-photos">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<polyline points="21 15 16 10 5 21" />
						</svg>
						<p>No photos found with this person.</p>
						<p class="hint">
							Photos will appear here once they are indexed and the person is detected.
						</p>
					</div>
				{:else}
					<div class="photos-grid">
						{#each photos as photo (photo.photoId)}
							<article class="photo-card">
								<div class="photo-image-container">
									<img src={photo.thumbnailUrl} alt="" loading="lazy" class="photo-image" />
									<span class="face-count-badge"
										>{photo.faceCount} {photo.faceCount === 1 ? 'face' : 'faces'}</span
									>
								</div>
								<div class="photo-info">
									<span class="photo-date">
										{photo.takenAt ? formatDate(photo.takenAt) : ''}
									</span>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		{:else}
			<!-- Photos Tab (New Person Photos Review) -->
			<PersonPhotosTab
				personId={person.id}
				personName={person.name}
				onPhotoClick={handlePhotoClick}
			/>
		{/if}
	{/if}
</main>

<!-- Lightbox modal -->
{#if showLightbox && lightboxPhoto && person}
	<PhotoPreviewModal
		photo={lightboxPhoto}
		currentPersonId={person.id}
		currentPersonName={person.name}
		onClose={closeLightbox}
		onNext={lightboxIndex < lightboxPhotos.length - 1 ? handleLightboxNext : undefined}
		onPrevious={lightboxIndex > 0 ? handleLightboxPrev : undefined}
	/>
{/if}

<!-- Merge Modal -->
{#if showMergeModal && person}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleCloseMergeModal}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<header class="modal-header">
				<h2>Merge Person</h2>
				<button
					type="button"
					class="close-button"
					onclick={handleCloseMergeModal}
					aria-label="Close modal"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</header>

			<div class="modal-body">
				{#if mergeError}
					<div class="merge-error" role="alert">{mergeError}</div>
				{/if}

				<p>
					Select a person to merge <strong>{person.name}</strong> into. All faces will be moved to the
					target person.
				</p>

				<div class="merge-targets">
					{#if mergeTargetPersons.length === 0}
						<p class="no-targets">No other persons available to merge into.</p>
					{:else}
						{#each mergeTargetPersons as target (target.id)}
							<button
								type="button"
								class="target-option"
								class:selected={selectedMergeTarget?.id === target.id}
								onclick={() => (selectedMergeTarget = target)}
							>
								<div class="target-avatar">{getInitials(target.name)}</div>
								<div class="target-info">
									<span class="target-name">{target.name}</span>
									<span class="target-meta">{target.faceCount} faces</span>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</div>

			<footer class="modal-footer">
				<button
					type="button"
					class="cancel-button"
					onclick={handleCloseMergeModal}
					disabled={merging}
				>
					Cancel
				</button>
				<button
					type="button"
					class="merge-button"
					onclick={handleMerge}
					disabled={!selectedMergeTarget || merging}
				>
					{#if merging}
						Merging...
					{:else}
						Merge Person
					{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.person-detail-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.breadcrumb {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		border: none;
		background: none;
		color: #4a90e2;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.back-link:hover {
		color: #3a7bc8;
	}

	.back-link svg {
		width: 20px;
		height: 20px;
	}

	/* Loading & Error States */
	.loading-state,
	.error-state {
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

	.spinner-small {
		width: 20px;
		height: 20px;
		border: 2px solid #f0f0f0;
		border-top-color: #4a90e2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
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

	.retry-button {
		margin-top: 0.5rem;
		padding: 0.5rem 1.5rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.tab {
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: #6b7280;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.95rem;
	}

	.tab:hover {
		color: #374151;
	}

	.tab.active {
		color: #4a90e2;
		border-bottom-color: #4a90e2;
	}

	/* Header */
	.person-header {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		align-items: flex-start;
	}

	.person-avatar-large {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 2rem;
		flex-shrink: 0;
	}

	.person-info {
		flex: 1;
		min-width: 200px;
	}

	.person-info h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.5rem 0;
	}

	.person-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.stat {
		font-size: 0.95rem;
		color: #666;
	}

	.stat strong {
		color: #333;
	}

	.status-badge {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.25rem 0.75rem;
		border-radius: 16px;
	}

	.status-active {
		background-color: #e8f5e9;
		color: #2e7d32;
	}

	.status-merged {
		background-color: #e3f2fd;
		color: #1565c0;
	}

	.status-hidden {
		background-color: #f5f5f5;
		color: #666;
	}

	.person-actions {
		display: flex;
		gap: 0.75rem;
	}

	.secondary-button {
		padding: 0.625rem 1.25rem;
		background-color: white;
		color: #666;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.secondary-button:hover {
		background-color: #f5f5f5;
	}

	/* Photos Section */
	.photos-section {
		margin-top: 2rem;
	}

	.photos-section h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 1rem 0;
	}

	.loading-photos {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem;
		color: #666;
	}

	.photo-error {
		padding: 1rem;
		background-color: #fef2f2;
		color: #dc2626;
		border-radius: 6px;
	}

	.no-photos {
		text-align: center;
		padding: 3rem;
		color: #666;
	}

	.no-photos svg {
		width: 48px;
		height: 48px;
		color: #ccc;
		margin-bottom: 1rem;
	}

	.no-photos p {
		margin: 0;
	}

	.no-photos .hint {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #999;
	}

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.photo-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		overflow: hidden;
		transition: box-shadow 0.2s;
	}

	.photo-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.photo-image-container {
		position: relative;
		aspect-ratio: 1;
		background-color: #f0f0f0;
	}

	.photo-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.face-count-badge {
		position: absolute;
		bottom: 8px;
		right: 8px;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		backdrop-filter: blur(4px);
	}

	.photo-info {
		padding: 0.75rem;
	}

	.photo-path {
		display: block;
		font-size: 0.875rem;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.photo-date {
		display: block;
		font-size: 0.75rem;
		color: #999;
		margin-top: 0.25rem;
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.close-button {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		color: #666;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
	}

	.merge-error {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.merge-targets {
		margin-top: 1rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		max-height: 300px;
		overflow-y: auto;
	}

	.no-targets {
		padding: 1rem;
		text-align: center;
		color: #666;
	}

	.target-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s;
	}

	.target-option:hover {
		background-color: #f5f5f5;
	}

	.target-option.selected {
		background-color: #e8f4fd;
	}

	.target-option:not(:last-child) {
		border-bottom: 1px solid #f0f0f0;
	}

	.target-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.target-info {
		display: flex;
		flex-direction: column;
	}

	.target-name {
		font-weight: 500;
		color: #333;
	}

	.target-meta {
		font-size: 0.75rem;
		color: #999;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.cancel-button,
	.merge-button {
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
	}

	.cancel-button {
		background: none;
		border: 1px solid #ddd;
		color: #666;
	}

	.merge-button {
		background-color: #4a90e2;
		border: none;
		color: white;
	}

	.merge-button:disabled,
	.cancel-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.person-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.person-meta {
			justify-content: center;
		}

		.person-actions {
			width: 100%;
			justify-content: center;
		}
	}
</style>
