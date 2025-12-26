<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import FiltersPanel from '$lib/components/FiltersPanel.svelte';
	import ResultsGrid from '$lib/components/ResultsGrid.svelte';
	import { searchImages, ApiError } from '$lib/api/client';
	import type { SearchResult, SearchFilters } from '$lib/types';
	import { tid } from '$lib/testing/testid';
	import { setViewId } from '$lib/dev/viewId';

	// DEV: Set view ID for DevOverlay breadcrumb
	onMount(() => {
		if (import.meta.env.DEV) {
			return setViewId('page:/');
		}
	});

	let query = $state('');
	let filters = $state<SearchFilters>({});
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let hasSearched = $state(false);

	async function handleSearch(searchQuery: string) {
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

	function handleFilterChange(newFilters: SearchFilters) {
		filters = newFilters;
		// Re-run search if we already have a query
		if (query) {
			handleSearch(query);
		}
	}
</script>

<svelte:head>
	<title>Image Search Dashboard</title>
</svelte:head>

<div class="dashboard" data-testid={tid('page', 'home')}>
	<div class="search-section" data-testid={tid('page', 'home', 'search-section')}>
		<SearchBar onSearch={handleSearch} />
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
			<ResultsGrid {results} {loading} {hasSearched} />
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
