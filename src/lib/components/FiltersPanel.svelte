<script lang="ts">
	import type { SearchFilters } from '$lib/types';
	import { untrack } from 'svelte';

	interface Props {
		onFilterChange: (filters: SearchFilters) => void;
	}

	let { onFilterChange }: Props = $props();

	let dateFrom = $state('');
	let dateTo = $state('');
	let initialized = $state(false);

	// Reactive filters object
	let filters = $derived<SearchFilters>({
		...(dateFrom && { dateFrom }),
		...(dateTo && { dateTo })
	});

	// Notify parent when filters change (skip initial render)
	$effect(() => {
		// Read the filters to track changes
		const currentFilters = filters;

		// Only call callback after initial mount and when values actually change
		if (initialized) {
			untrack(() => onFilterChange(currentFilters));
		} else {
			initialized = true;
		}
	});

	function handleClearFilters() {
		dateFrom = '';
		dateTo = '';
	}

	function hasActiveFilters(): boolean {
		return Boolean(dateFrom || dateTo);
	}
</script>

<aside class="filters-panel">
	<div class="filters-header">
		<h2>Filters</h2>
		{#if hasActiveFilters()}
			<button type="button" class="clear-btn" onclick={handleClearFilters}>Clear all</button>
		{/if}
	</div>

	<div class="filter-group">
		<label for="dateFrom">Date From</label>
		<input type="date" id="dateFrom" bind:value={dateFrom} class="date-input" />
	</div>

	<div class="filter-group">
		<label for="dateTo">Date To</label>
		<input type="date" id="dateTo" bind:value={dateTo} class="date-input" />
	</div>

	<div class="filter-group">
		<label for="personFilter">
			Face Filter
			<span class="coming-soon-badge">Coming Soon</span>
		</label>
		<select id="personFilter" disabled class="disabled-select">
			<option value="">Select person...</option>
		</select>
		<p class="filter-help">Filter by detected faces in images.</p>
	</div>
</aside>

<style>
	.filters-panel {
		padding: 1.5rem;
		background-color: #f8f9fa;
		border-radius: 8px;
		min-width: 200px;
	}

	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #333;
	}

	.clear-btn {
		background: none;
		border: none;
		color: #4a90e2;
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
	}

	.clear-btn:hover {
		text-decoration: underline;
	}

	.filter-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #555;
	}

	.date-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		font-size: 0.95rem;
	}

	.date-input:focus {
		outline: none;
		border-color: #4a90e2;
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

	.disabled-select {
		background-color: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	.coming-soon-badge {
		background-color: #e0e0e0;
		color: #666;
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.filter-help {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #999;
	}
</style>
