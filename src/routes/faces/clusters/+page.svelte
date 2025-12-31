<script lang="ts">
	import { goto } from '$app/navigation';
	import { listClusters } from '$lib/api/faces';
	import { getUnknownClusteringConfig } from '$lib/api/admin';
	import type { UnknownFaceClusteringConfig } from '$lib/api/admin';
	import { ApiError } from '$lib/api/client';
	import ClusterCard from '$lib/components/faces/ClusterCard.svelte';
	import type { ClusterSummary } from '$lib/types';
	import { onMount } from 'svelte';

	// State
	let clusters = $state<ClusterSummary[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let currentPage = $state(1);
	let totalClusters = $state(0);
	let hasMore = $state(false);

	// Configuration state
	let config = $state<UnknownFaceClusteringConfig | null>(null);

	// Sort state: 'faceCount' (default) or 'avgQuality'
	type SortOption = 'faceCount' | 'avgQuality';
	let sortBy = $state<SortOption>('faceCount');

	// Sorted clusters (derived from clusters and sortBy)
	let sortedClusters = $derived(() => {
		if (clusters.length === 0) return [];

		return [...clusters].sort((a, b) => {
			if (sortBy === 'faceCount') {
				// Sort by face count descending (most faces first)
				return b.faceCount - a.faceCount;
			} else {
				// Sort by average quality descending (highest quality first)
				const qualityA = a.avgQuality ?? 0;
				const qualityB = b.avgQuality ?? 0;
				return qualityB - qualityA;
			}
		});
	});

	const PAGE_SIZE = 100;

	// Load configuration and clusters on mount
	onMount(async () => {
		try {
			config = await getUnknownClusteringConfig();
		} catch (err) {
			console.error('Failed to load configuration:', err);
			// Use default values if config load fails (more permissive)
			config = { minConfidence: 0.70, minClusterSize: 2 };
		}
		loadClusters(true);
	});

	async function loadClusters(reset: boolean = false) {
		if (reset) {
			currentPage = 1;
			clusters = [];
		}

		loading = reset;
		loadingMore = !reset;
		error = null;

		try {
			// Always show only unlabeled clusters
			const includeLabeled = false;
			const response = await listClusters(
				currentPage,
				PAGE_SIZE,
				includeLabeled,
				config?.minConfidence,
				config?.minClusterSize
			);

			if (reset) {
				clusters = response.items;
			} else {
				clusters = [...clusters, ...response.items];
			}

			totalClusters = response.total;
			hasMore = clusters.length < response.total;
		} catch (err) {
			console.error('Failed to load clusters:', err);
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Failed to load clusters. Please try again.';
			}
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function handleLoadMore() {
		if (loadingMore || !hasMore) return;
		currentPage += 1;
		loadClusters(false);
	}

	function handleClusterClick(cluster: ClusterSummary) {
		goto(`/faces/clusters/${encodeURIComponent(cluster.clusterId)}`);
	}

	function handleSortChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		sortBy = target.value as SortOption;
	}

	function handleRetry() {
		loadClusters(true);
	}
</script>

<svelte:head>
	<title>Unknown Faces | Image Search</title>
</svelte:head>

<main class="clusters-page">
	<header class="page-header">
		<h1>Unknown Faces</h1>
		<p class="subtitle">
			Review and label face clusters to identify people in your photos. Showing clusters with at
			least {config?.minClusterSize ?? 2} faces and {((config?.minConfidence ?? 0.70) * 100).toFixed(0)}%
			similarity.
		</p>
	</header>

	<!-- Content -->
	<section class="content" aria-live="polite">
		{#if loading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading clusters...</p>
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
				<button type="button" class="retry-button" onclick={handleRetry}> Try Again </button>
			</div>
		{:else if clusters.length === 0}
			<div class="empty-state">
				<svg
					class="empty-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="12" cy="8" r="4" />
					<path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
				</svg>
				<h2>No Unknown Face Clusters</h2>
				<p>
					All faces have been labeled, or no clusters meet the current confidence threshold. Try
					adjusting the settings to see more clusters.
				</p>
				{#if config}
					<a href="/admin" class="settings-link">Adjust Settings</a>
				{/if}
			</div>
		{:else}
			<div class="results-header">
				<span class="results-count">
					Showing {clusters.length} of {totalClusters} clusters
				</span>
				<div class="sort-controls">
					<label for="sort-select" class="sort-label">Sort by:</label>
					<select id="sort-select" class="sort-select" value={sortBy} onchange={handleSortChange}>
						<option value="faceCount">Number of Faces</option>
						<option value="avgQuality">Average Quality</option>
					</select>
				</div>
			</div>

			<div class="clusters-grid">
				{#each sortedClusters() as cluster (cluster.clusterId)}
					<ClusterCard {cluster} onClick={() => handleClusterClick(cluster)} />
				{/each}
			</div>

			{#if hasMore}
				<div class="load-more">
					<button
						type="button"
						class="load-more-button"
						onclick={handleLoadMore}
						disabled={loadingMore}
					>
						{#if loadingMore}
							<span class="button-spinner"></span>
							Loading...
						{:else}
							Load More
						{/if}
					</button>
				</div>
			{/if}
		{/if}
	</section>
</main>

<style>
	.clusters-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #666;
		margin: 0;
		font-size: 1rem;
	}

	/* Content */
	.content {
		min-height: 400px;
	}

	/* Loading state */
	.loading-state {
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

	/* Error state */
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.error-icon {
		width: 48px;
		height: 48px;
		color: #e53e3e;
		margin-bottom: 1rem;
	}

	.error-state p {
		color: #666;
		margin: 0 0 1rem 0;
	}

	.retry-button {
		padding: 0.5rem 1.5rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.95rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-button:hover {
		background-color: #3a7bc8;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-icon {
		width: 64px;
		height: 64px;
		color: #ccc;
		margin-bottom: 1.5rem;
	}

	.empty-state h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		color: #666;
		margin: 0 0 1rem 0;
		max-width: 400px;
	}

	.settings-link {
		display: inline-block;
		padding: 0.5rem 1.5rem;
		background-color: #4a90e2;
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.95rem;
		transition: background-color 0.2s;
	}

	.settings-link:hover {
		background-color: #3a7bc8;
	}

	/* Results */
	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.results-count {
		font-size: 0.875rem;
		color: #666;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sort-label {
		font-size: 0.875rem;
		color: #666;
	}

	.sort-select {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background-color: white;
		color: #333;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.sort-select:hover {
		border-color: #9ca3af;
	}

	.sort-select:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
	}

	.clusters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	/* Load more */
	.load-more {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	.load-more-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 2rem;
		background-color: white;
		color: #4a90e2;
		border: 2px solid #4a90e2;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.load-more-button:hover:not(:disabled) {
		background-color: #4a90e2;
		color: white;
	}

	.load-more-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.button-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
</style>
