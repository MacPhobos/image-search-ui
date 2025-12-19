<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import FiltersPanel from '$lib/components/FiltersPanel.svelte';
	import ResultsGrid from '$lib/components/ResultsGrid.svelte';
	import { searchImages, ApiError } from '$lib/api/client';
	import type { SearchResult, SearchFilters } from '$lib/types';

	let query = $state('');
	let filters = $state<SearchFilters>({});
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let hasSearched = $state(false);
	let totalResults = $state(0);

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
			totalResults = response.total;
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.data?.message || err.message;
			} else {
				error = err instanceof Error ? err.message : 'An unexpected error occurred';
			}
			results = [];
			totalResults = 0;
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

<div class="dashboard">
	<div class="search-section">
		<SearchBar onSearch={handleSearch} />
	</div>

	<div class="content">
		<FiltersPanel onFilterChange={handleFilterChange} />

		<div class="results-section">
			{#if error}
				<div class="error-message" role="alert">
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
