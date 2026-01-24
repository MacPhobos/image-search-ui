<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SearchModeToggle from '$lib/components/SearchModeToggle.svelte';
	import type { SearchMode } from '$lib/components/SearchModeToggle.svelte';
	import ImageUploadZone from '$lib/components/ImageUploadZone.svelte';
	import HybridSearchPanel from '$lib/components/HybridSearchPanel.svelte';
	import ComposedSearchPanel from '$lib/components/ComposedSearchPanel.svelte';
	import FiltersPanel from '$lib/components/FiltersPanel.svelte';
	import ResultsGrid from '$lib/components/ResultsGrid.svelte';
	import {
		searchImages,
		searchByImage,
		searchSimilar,
		searchHybrid,
		searchComposed,
		ApiError
	} from '$lib/api/client';
	import type { SearchResult, SearchFilters } from '$lib/types';
	import { searchHistory } from '$lib/stores/searchHistory.svelte';
	import { tid } from '$lib/testing/testid';
	import { setViewId } from '$lib/dev/viewId';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/+page', {
		filePath: 'src/routes/+page.svelte'
	});

	// DEV: Set view ID for DevOverlay breadcrumb and component cleanup
	onMount(() => {
		if (import.meta.env.DEV) {
			const clearViewId = setViewId('page:/');
			return () => {
				cleanup();
				clearViewId?.();
			};
		}
		return cleanup;
	});

	let searchMode = $state<SearchMode>('text');
	let query = $state('');
	let selectedImage = $state<File | null>(null);
	let filters = $state<SearchFilters>({});
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let hasSearched = $state(false);

	async function handleTextSearch(searchQuery: string) {
		query = searchQuery;
		loading = true;
		error = null;
		hasSearched = true;

		try {
			const response = await searchImages({
				query: searchQuery,
				filters
			});
			results = response.results;
			searchHistory.addTextSearch(searchQuery);
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.data?.message || err.message;
			} else {
				error = err instanceof Error ? err.message : 'An unexpected error occurred';
			}
			results = [];
		} finally {
			loading = false;
		}
	}

	async function handleImageSearch() {
		if (!selectedImage) return;

		loading = true;
		error = null;
		hasSearched = true;

		try {
			const response = await searchByImage({
				file: selectedImage,
				filters
			});
			results = response.results;
			searchHistory.addImageSearch(selectedImage.name);
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.data?.message || err.message;
			} else {
				error = err instanceof Error ? err.message : 'An unexpected error occurred';
			}
			results = [];
		} finally {
			loading = false;
		}
	}

	async function handleFindSimilar(assetId: number) {
		loading = true;
		error = null;
		hasSearched = true;
		searchMode = 'image'; // Switch to image mode to indicate visual search

		try {
			const response = await searchSimilar(assetId);
			results = response.results;
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.data?.message || err.message;
			} else {
				error = err instanceof Error ? err.message : 'An unexpected error occurred';
			}
			results = [];
		} finally {
			loading = false;
		}
	}

	async function handleHybridSearch(params: {
		textQuery: string | null;
		imageFile: File | null;
		textWeight: number;
	}) {
		loading = true;
		error = null;
		hasSearched = true;

		try {
			const response = await searchHybrid(
				params.textQuery,
				params.imageFile,
				params.textWeight,
				50
			);
			results = response.results;
			searchHistory.addHybridSearch(
				params.textQuery,
				params.imageFile?.name || null,
				params.textWeight
			);
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.data?.message || err.message;
			} else {
				error = err instanceof Error ? err.message : 'An unexpected error occurred';
			}
			results = [];
		} finally {
			loading = false;
		}
	}

	async function handleComposedSearch(params: {
		referenceImage: File;
		modifierText: string;
		alpha: number;
	}) {
		loading = true;
		error = null;
		hasSearched = true;

		try {
			const response = await searchComposed(
				params.referenceImage,
				params.modifierText,
				params.alpha,
				50
			);
			results = response.results;
			searchHistory.addComposedSearch(
				params.referenceImage.name,
				params.modifierText,
				params.alpha
			);
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.data?.message || err.message;
			} else {
				error = err instanceof Error ? err.message : 'An unexpected error occurred';
			}
			results = [];
		} finally {
			loading = false;
		}
	}

	function handleModeChange(mode: SearchMode) {
		searchMode = mode;
		// Clear inputs when switching modes
		if (mode === 'text') {
			selectedImage = null;
		} else if (mode === 'image') {
			query = '';
		}
	}

	function handleFilterChange(newFilters: SearchFilters) {
		filters = newFilters;
		// Re-run search if we already have a query or image
		if (searchMode === 'text' && query) {
			handleTextSearch(query);
		} else if (searchMode === 'image' && selectedImage) {
			handleImageSearch();
		}
	}
</script>

<svelte:head>
	<title>Image Search Dashboard</title>
</svelte:head>

<div class="dashboard" data-testid={tid('page', 'home')}>
	<div class="search-section" data-testid={tid('page', 'home', 'search-section')}>
		<div class="search-controls">
			<SearchModeToggle mode={searchMode} onModeChange={handleModeChange} />

			<div class="search-input-area">
				{#if searchMode === 'text'}
					<SearchBar onSearch={handleTextSearch} />
				{:else if searchMode === 'image'}
					<div class="image-search-container">
						<ImageUploadZone
							{selectedImage}
							onImageSelect={(file) => (selectedImage = file)}
							onClear={() => (selectedImage = null)}
							disabled={loading}
						/>
						<button
							type="button"
							class="search-image-btn"
							onclick={handleImageSearch}
							disabled={!selectedImage || loading}
							data-testid={tid('page', 'home', 'btn-search-image')}
						>
							{loading ? 'Searching...' : 'Search by Image'}
						</button>
					</div>
				{:else if searchMode === 'hybrid'}
					<HybridSearchPanel onSearch={handleHybridSearch} disabled={loading} />
				{:else if searchMode === 'composed'}
					<ComposedSearchPanel onSearch={handleComposedSearch} disabled={loading} />
				{/if}
			</div>
		</div>
	</div>

	<div class="content" data-testid={tid('page', 'home', 'content')}>
		<FiltersPanel onFilterChange={handleFilterChange} />

		<div class="results-section" data-testid={tid('page', 'home', 'results-section')}>
			{#if error}
				<div class="error-message" role="alert" data-testid={tid('page', 'home', 'error')}>
					<strong>Error:</strong>
					{error}
				</div>
			{/if}
			<ResultsGrid {results} {loading} {hasSearched} onFindSimilar={handleFindSimilar} />
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.search-section {
		display: flex;
		justify-content: center;
	}

	.search-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 600px;
	}

	.search-input-area {
		width: 100%;
	}

	.image-search-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.search-image-btn {
		padding: 0.75rem 1.5rem;
		background-color: #2563eb;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		white-space: nowrap;
	}

	.search-image-btn:hover:not(:disabled) {
		background-color: #1d4ed8;
	}

	.search-image-btn:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.content {
		display: grid;
		grid-template-columns: 250px 1fr;
		gap: 2rem;
	}

	.results-section {
		min-height: 400px;
	}

	.error-message {
		background-color: #fee2e2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		color: #dc2626;
	}

	@media (max-width: 768px) {
		.content {
			grid-template-columns: 1fr;
		}
	}
</style>
