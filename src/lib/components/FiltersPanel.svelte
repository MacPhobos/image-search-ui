<script lang="ts">
	import type { SearchFilters } from '$lib/types';

	interface Props {
		onFilterChange: (filters: SearchFilters) => void;
	}

	let { onFilterChange }: Props = $props();

	let category = $state('');
	let sortBy = $state<'relevance' | 'date' | 'popularity'>('relevance');

	// Reactive filters object
	let filters = $derived<SearchFilters>({
		...(category && { category }),
		sortBy
	});

	// Notify parent when filters change
	$effect(() => {
		onFilterChange(filters);
	});
</script>

<aside class="filters-panel">
	<h2>Filters</h2>

	<div class="filter-group">
		<label for="category">Category</label>
		<select id="category" bind:value={category}>
			<option value="">All Categories</option>
			<option value="nature">Nature</option>
			<option value="architecture">Architecture</option>
			<option value="people">People</option>
			<option value="technology">Technology</option>
		</select>
	</div>

	<div class="filter-group">
		<label for="sortBy">Sort By</label>
		<select id="sortBy" bind:value={sortBy}>
			<option value="relevance">Relevance</option>
			<option value="date">Date</option>
			<option value="popularity">Popularity</option>
		</select>
	</div>
</aside>

<style>
	.filters-panel {
		padding: 1.5rem;
		background-color: #f8f9fa;
		border-radius: 8px;
		min-width: 200px;
	}

	h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		font-size: 1.25rem;
		color: #333;
	}

	.filter-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #555;
	}

	select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		font-size: 0.95rem;
		cursor: pointer;
	}

	select:focus {
		outline: none;
		border-color: #4a90e2;
	}
</style>
