<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getCluster,
		splitCluster,
		getFacesForAsset,
		transformFaceInstancesToFaceInPhoto
	} from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import FaceThumbnail from '$lib/components/faces/FaceThumbnail.svelte';
	import LabelClusterModal from '$lib/components/faces/LabelClusterModal.svelte';
	import PhotoPreviewModal from '$lib/components/faces/PhotoPreviewModal.svelte';
	import type { ClusterDetailResponse, FaceInstance } from '$lib/types';
	import type { PersonPhotoGroup } from '$lib/api/faces';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	// Type assertion needed due to SvelteKit's dynamic env types
	const API_BASE_URL =
		(env as Record<string, string | undefined>).VITE_API_BASE_URL || 'http://localhost:8000';

	// Get cluster ID from route params
	let clusterId = $derived($page.params.clusterId as string);

	// State
	let cluster = $state<ClusterDetailResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showLabelModal = $state(false);
	let splitting = $state(false);
	let splitError = $state<string | null>(null);

	// Photo preview modal state
	let showPhotoModal = $state(false);
	let selectedPhoto = $state<PersonPhotoGroup | null>(null);
	let loadingPhoto = $state(false);

	// Pagination for faces (client-side)
	let visibleFaceCount = $state(24);
	const FACES_PER_PAGE = 24;

	// Derived
	let visibleFaces = $derived<FaceInstance[]>(cluster?.faces.slice(0, visibleFaceCount) ?? []);
	let hasMoreFaces = $derived(cluster ? visibleFaceCount < cluster.faces.length : false);
	let qualityStats = $derived(calculateQualityStats(cluster?.faces ?? []));

	onMount(() => {
		loadCluster();
	});

	// Reload when clusterId changes
	$effect(() => {
		const id = clusterId;
		if (id) {
			loadCluster();
		}
	});

	async function loadCluster() {
		if (!clusterId) return;

		loading = true;
		error = null;
		visibleFaceCount = FACES_PER_PAGE;

		try {
			cluster = await getCluster(clusterId);
		} catch (err) {
			console.error('Failed to load cluster:', err);
			if (err instanceof ApiError) {
				if (err.status === 404) {
					error = 'Cluster not found. It may have been deleted or merged.';
				} else {
					error = err.message;
				}
			} else {
				error = 'Failed to load cluster. Please try again.';
			}
		} finally {
			loading = false;
		}
	}

	function calculateQualityStats(faces: FaceInstance[]): {
		excellent: number;
		good: number;
		fair: number;
		poor: number;
	} {
		const stats = { excellent: 0, good: 0, fair: 0, poor: 0 };
		for (const face of faces) {
			const q = face.qualityScore ?? 0;
			if (q >= 0.8) stats.excellent++;
			else if (q >= 0.6) stats.good++;
			else if (q >= 0.4) stats.fair++;
			else stats.poor++;
		}
		return stats;
	}

	function handleLoadMoreFaces() {
		visibleFaceCount += FACES_PER_PAGE;
	}

	function handleOpenLabelModal() {
		showLabelModal = true;
	}

	function handleCloseLabelModal() {
		showLabelModal = false;
	}

	function handleLabelSuccess(personName: string, personId: string) {
		showLabelModal = false;
		// Update local state
		if (cluster) {
			cluster = {
				...cluster,
				personId,
				personName
			};
		}
	}

	async function handleSplit() {
		if (splitting || !cluster || !clusterId) return;

		// Confirm action
		if (!confirm('This will attempt to split this cluster into smaller sub-clusters. Continue?')) {
			return;
		}

		splitting = true;
		splitError = null;

		try {
			const result = await splitCluster(clusterId, 3);
			if (result.newClusters.length > 0) {
				// Navigate to the first new cluster or back to list
				goto('/faces/clusters');
			} else {
				splitError = 'Cluster could not be split further.';
			}
		} catch (err) {
			console.error('Failed to split cluster:', err);
			if (err instanceof ApiError) {
				splitError = err.message;
			} else {
				splitError = 'Failed to split cluster. Please try again.';
			}
		} finally {
			splitting = false;
		}
	}

	function handleBack() {
		goto('/faces/clusters');
	}

	function shortenClusterId(id: string): string {
		if (id.length <= 12) return id;
		return id.substring(0, 12) + '...';
	}

	async function handleFaceClick(face: FaceInstance) {
		if (loadingPhoto) return;

		loadingPhoto = true;
		try {
			// Always fetch ALL faces for this asset from API
			const facesData = await getFacesForAsset(face.assetId);

			// Merge with any updated assignments from cluster state
			// (cluster.faces may have newer personId/personName from recent assignments)
			const mergedFaces = facesData.items.map((apiFace) => {
				if (cluster) {
					const clusterFace = cluster.faces.find((cf) => cf.id === apiFace.id);
					if (
						clusterFace &&
						(clusterFace.personId !== apiFace.personId ||
							clusterFace.personName !== apiFace.personName)
					) {
						// Use cluster state's assignment (more recent)
						return {
							...apiFace,
							personId: clusterFace.personId,
							personName: clusterFace.personName
						};
					}
				}
				return apiFace;
			});

			const facesInPhoto = transformFaceInstancesToFaceInPhoto(mergedFaces);

			// Calculate counts
			const faceCount = facesInPhoto.length;
			const hasNonPersonFaces = facesInPhoto.some(
				(f) => f.personId === null || (cluster?.personId && f.personId !== cluster.personId)
			);

			// Build PersonPhotoGroup
			selectedPhoto = {
				photoId: face.assetId,
				takenAt: null, // Not available in face instance
				thumbnailUrl: `${API_BASE_URL}/api/v1/images/${face.assetId}/thumbnail`,
				fullUrl: `${API_BASE_URL}/api/v1/images/${face.assetId}/full`,
				faces: facesInPhoto,
				faceCount,
				hasNonPersonFaces
			};

			showPhotoModal = true;
		} catch (err) {
			console.error('Failed to load photo faces:', err);
			// Show error to user (could add error state if needed)
		} finally {
			loadingPhoto = false;
		}
	}

	function handleClosePhotoModal() {
		showPhotoModal = false;
		selectedPhoto = null;
	}

	function handleFaceAssigned(faceId: string, personId: string | null, personName: string | null) {
		if (!cluster) return;

		// Find and update the face in the cluster's faces array
		const faceIndex = cluster.faces.findIndex((f) => f.id === faceId);
		if (faceIndex !== -1) {
			// Update the face with new assignment
			cluster.faces[faceIndex] = {
				...cluster.faces[faceIndex],
				personId,
				personName
			};

			// Trigger Svelte reactivity by reassigning cluster
			cluster = { ...cluster };
		}
	}
</script>

<svelte:head>
	<title>Cluster Details | Image Search</title>
</svelte:head>

<main class="cluster-detail-page">
	<!-- Navigation -->
	<nav class="breadcrumb">
		<button type="button" class="back-link" onclick={handleBack}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
			Back to Clusters
		</button>
	</nav>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading cluster...</p>
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
			<button type="button" class="retry-button" onclick={loadCluster}>Try Again</button>
		</div>
	{:else if cluster}
		<!-- Header -->
		<header class="cluster-header">
			<div class="header-info">
				<h1>
					{#if cluster.personName}
						{cluster.personName}
					{:else}
						Unlabeled Cluster
					{/if}
				</h1>
				<div class="cluster-meta">
					<span class="cluster-id" title={cluster.clusterId}>
						ID: {shortenClusterId(cluster.clusterId)}
					</span>
					<span class="face-count">{cluster.faces.length} faces</span>
				</div>
			</div>
			<div class="header-actions">
				{#if !cluster.personName}
					<button type="button" class="primary-button" onclick={handleOpenLabelModal}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path
								d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
							/>
							<line x1="7" y1="7" x2="7.01" y2="7" />
						</svg>
						Label as Person
					</button>
				{:else}
					<span class="labeled-badge">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Labeled
					</span>
				{/if}
				<button
					type="button"
					class="secondary-button"
					onclick={handleSplit}
					disabled={splitting || cluster.faces.length < 6}
					title={cluster.faces.length < 6
						? 'Cluster too small to split'
						: 'Split into sub-clusters'}
				>
					{#if splitting}
						Splitting...
					{:else}
						Split Cluster
					{/if}
				</button>
			</div>
		</header>

		{#if splitError}
			<div class="split-error" role="alert">
				{splitError}
			</div>
		{/if}

		<!-- Quality Stats -->
		<section class="quality-stats">
			<h2>Quality Distribution</h2>
			<div class="stats-grid">
				<div class="stat-item excellent">
					<span class="stat-value">{qualityStats.excellent}</span>
					<span class="stat-label">Excellent</span>
				</div>
				<div class="stat-item good">
					<span class="stat-value">{qualityStats.good}</span>
					<span class="stat-label">Good</span>
				</div>
				<div class="stat-item fair">
					<span class="stat-value">{qualityStats.fair}</span>
					<span class="stat-label">Fair</span>
				</div>
				<div class="stat-item poor">
					<span class="stat-value">{qualityStats.poor}</span>
					<span class="stat-label">Poor</span>
				</div>
			</div>
		</section>

		<!-- Faces Grid -->
		<section class="faces-section">
			<h2>Faces in Cluster</h2>
			<div class="faces-grid">
				{#each visibleFaces as face (face.id)}
					<button
						type="button"
						class="face-item"
						title="Quality: {((face.qualityScore ?? 0) * 100).toFixed(0)}% - Click to view photo"
						onclick={() => handleFaceClick(face)}
						disabled={loadingPhoto}
					>
						<FaceThumbnail
							thumbnailUrl={`/api/v1/images/${face.assetId}/thumbnail`}
							bbox={face.bbox}
							size={140}
							alt="Face from asset {face.assetId}"
						/>
						<div class="face-quality">
							{((face.qualityScore ?? 0) * 100).toFixed(0)}%
						</div>
					</button>
				{/each}
			</div>

			{#if hasMoreFaces}
				<div class="load-more">
					<button type="button" class="load-more-button" onclick={handleLoadMoreFaces}>
						Load More ({cluster.faces.length - visibleFaceCount} remaining)
					</button>
				</div>
			{/if}
		</section>
	{/if}
</main>

<!-- Label Modal -->
{#if showLabelModal && cluster}
	<LabelClusterModal
		clusterId={cluster.clusterId}
		onSuccess={handleLabelSuccess}
		onClose={handleCloseLabelModal}
	/>
{/if}

<!-- Photo Preview Modal -->
{#if showPhotoModal && selectedPhoto}
	<PhotoPreviewModal
		photo={selectedPhoto}
		currentPersonId={cluster?.personId ?? null}
		currentPersonName={cluster?.personName ?? null}
		onClose={handleClosePhotoModal}
		onFaceAssigned={handleFaceAssigned}
	/>
{/if}

<style>
	.cluster-detail-page {
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
		transition: color 0.2s;
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

	/* Header */
	.cluster-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.header-info h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.5rem 0;
	}

	.cluster-meta {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.cluster-id {
		font-family: monospace;
		font-size: 0.8rem;
		color: #999;
		background-color: #f5f5f5;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.face-count {
		font-size: 0.95rem;
		color: #666;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.primary-button,
	.secondary-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			opacity 0.2s;
	}

	.primary-button {
		background-color: #4a90e2;
		color: white;
		border: none;
	}

	.primary-button:hover {
		background-color: #3a7bc8;
	}

	.primary-button svg {
		width: 18px;
		height: 18px;
	}

	.secondary-button {
		background-color: white;
		color: #666;
		border: 1px solid #ddd;
	}

	.secondary-button:hover:not(:disabled) {
		background-color: #f5f5f5;
	}

	.secondary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.labeled-badge {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background-color: #e8f5e9;
		color: #2e7d32;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.labeled-badge svg {
		width: 16px;
		height: 16px;
	}

	.split-error {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	/* Quality Stats */
	.quality-stats {
		background-color: #f8f9fa;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.quality-stats h2 {
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 1rem 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.stat-item {
		text-align: center;
		padding: 0.75rem;
		border-radius: 8px;
		background-color: white;
	}

	.stat-item.excellent {
		border-left: 3px solid #10b981;
	}

	.stat-item.good {
		border-left: 3px solid #3b82f6;
	}

	.stat-item.fair {
		border-left: 3px solid #f59e0b;
	}

	.stat-item.poor {
		border-left: 3px solid #ef4444;
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
	}

	.stat-label {
		display: block;
		font-size: 0.75rem;
		color: #666;
		margin-top: 0.25rem;
	}

	/* Faces Grid */
	.faces-section h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 1rem 0;
	}

	.faces-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
	}

	.face-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		border: none;
		background: none;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 8px;
		transition:
			background-color 0.2s,
			transform 0.1s;
	}

	.face-item:hover:not(:disabled) {
		background-color: #f5f5f5;
		transform: scale(1.02);
	}

	.face-item:active:not(:disabled) {
		transform: scale(0.98);
	}

	.face-item:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.face-quality {
		font-size: 0.75rem;
		color: #666;
	}

	.load-more {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	.load-more-button {
		padding: 0.75rem 2rem;
		background-color: white;
		color: #4a90e2;
		border: 2px solid #4a90e2;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.load-more-button:hover {
		background-color: #4a90e2;
		color: white;
	}

	@media (max-width: 640px) {
		.cluster-header {
			flex-direction: column;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-start;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
