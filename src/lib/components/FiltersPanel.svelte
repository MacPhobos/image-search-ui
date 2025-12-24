<script lang="ts">
	import type { SearchFilters, Category, Person } from '$lib/types';
	import { listCategories } from '$lib/api/categories';
	import { listPersons } from '$lib/api/faces';
	import { untrack } from 'svelte';
	import { onMount } from 'svelte';

	interface Props {
		onFilterChange: (filters: SearchFilters) => void;
	}

	let { onFilterChange }: Props = $props();

	// Date filters
	let dateFrom = $state('');
	let dateTo = $state('');

	// Category filter
	let categoryId = $state<number | null>(null);
	let categories = $state<Category[]>([]);
	let categoriesLoading = $state(true);

	// Person filter (multi-select)
	let selectedPersonIds = $state<string[]>([]);
	let persons = $state<Person[]>([]);
	let personsLoading = $state(true);
	let personSearchQuery = $state('');
	let showPersonDropdown = $state(false);

	let initialized = $state(false);

	// Filtered persons for dropdown
	let filteredPersons = $derived.by<Person[]>(() => {
		if (!personSearchQuery.trim()) return persons ?? [];
		const query = personSearchQuery.toLowerCase();
		return persons?.filter((p) => p.name.toLowerCase().includes(query)) ?? [];
	});

	// Selected persons for display
	let selectedPersons = $derived.by<Person[]>(() =>
		persons?.filter((p) => selectedPersonIds.includes(p.id)) ?? []
	);

	// Load data on mount
	onMount(async () => {
		// Load categories and persons in parallel
		await Promise.all([loadCategories(), loadPersons()]);
	});

	async function loadCategories() {
		try {
			const response = await listCategories(1, 100);
			categories = response.items;
		} catch (err) {
			console.error('Failed to load categories:', err);
		} finally {
			categoriesLoading = false;
		}
	}

	async function loadPersons() {
		try {
			const response = await listPersons(1, 100, 'active');
			persons = response.items;
		} catch (err) {
			console.error('Failed to load persons:', err);
		} finally {
			personsLoading = false;
		}
	}

	// Reactive filters object - include first personId for backward compatibility
	let filters = $derived<SearchFilters>({
		...(dateFrom && { dateFrom }),
		...(dateTo && { dateTo }),
		...(categoryId && { categoryId }),
		...(selectedPersonIds.length > 0 && { personId: selectedPersonIds[0] })
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
		categoryId = null;
		selectedPersonIds = [];
	}

	function hasActiveFilters(): boolean {
		return Boolean(dateFrom || dateTo || categoryId || selectedPersonIds.length > 0);
	}

	function handleCategoryChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		categoryId = value ? parseInt(value, 10) : null;
	}

	function handlePersonSelect(person: Person) {
		if (selectedPersonIds.includes(person.id)) {
			// Remove if already selected
			selectedPersonIds = selectedPersonIds.filter((id) => id !== person.id);
		} else {
			// Add to selection
			selectedPersonIds = [...selectedPersonIds, person.id];
		}
	}

	function handleRemovePerson(personId: string) {
		selectedPersonIds = selectedPersonIds.filter((id) => id !== personId);
	}

	function handlePersonInputFocus() {
		showPersonDropdown = true;
	}

	function handlePersonInputBlur() {
		// Delay to allow click on dropdown items
		setTimeout(() => {
			showPersonDropdown = false;
			personSearchQuery = '';
		}, 200);
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
		<label for="categoryFilter">Category</label>
		{#if categoriesLoading}
			<select id="categoryFilter" disabled class="disabled-select">
				<option value="">Loading categories...</option>
			</select>
		{:else}
			<select
				id="categoryFilter"
				value={categoryId?.toString() ?? ''}
				onchange={handleCategoryChange}
			>
				<option value="">All categories</option>
				{#each categories as category (category.id)}
					<option value={category.id.toString()}>
						{category.name}
					</option>
				{/each}
			</select>
		{/if}
	</div>

	<div class="filter-group">
		<label for="personFilter">People Filter</label>

		<!-- Selected persons as chips -->
		{#if selectedPersons.length > 0}
			<div class="selected-chips">
				{#each selectedPersons as person (person.id)}
					<span class="person-chip">
						{person.name}
						<button
							type="button"
							class="chip-remove"
							onclick={() => handleRemovePerson(person.id)}
							aria-label="Remove {person.name}"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<!-- Person search/select -->
		{#if personsLoading}
			<input
				type="text"
				id="personFilter"
				placeholder="Loading people..."
				disabled
				class="person-input disabled"
			/>
		{:else if (persons?.length ?? 0) === 0}
			<div class="no-persons-message">
				<span>No people identified yet.</span>
				<a href="/faces/clusters" class="label-link">Label face clusters</a>
			</div>
		{:else}
			<div class="person-select-container">
				<input
					type="text"
					id="personFilter"
					placeholder="Search people to add..."
					bind:value={personSearchQuery}
					onfocus={handlePersonInputFocus}
					onblur={handlePersonInputBlur}
					class="person-input"
					autocomplete="off"
				/>

				{#if showPersonDropdown && filteredPersons.length > 0}
					<ul class="person-dropdown" role="listbox">
						{#each filteredPersons as person (person.id)}
							<li>
								<button
									type="button"
									class="person-option"
									class:selected={selectedPersonIds.includes(person.id)}
									onmousedown={() => handlePersonSelect(person)}
									role="option"
									aria-selected={selectedPersonIds.includes(person.id)}
								>
									<span class="person-name">{person.name}</span>
									<span class="person-count">{person.faceCount} faces</span>
									{#if selectedPersonIds.includes(person.id)}
										<svg
											class="check-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		<p class="filter-help">Filter photos by people detected in them.</p>
	</div>

	<!-- Quick link to faces pages -->
	<div class="filter-links">
		<a href="/faces/clusters" class="filter-link">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="8" r="4" />
				<path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
			</svg>
			Manage Face Clusters
		</a>
		<a href="/people" class="filter-link">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
			Browse People
		</a>
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

	/* Person filter styles */
	.selected-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.person-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background-color: #e8f4fd;
		color: #1565c0;
		padding: 0.25rem 0.5rem;
		border-radius: 16px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		padding: 0;
		border: none;
		background: none;
		color: #1565c0;
		cursor: pointer;
		border-radius: 50%;
		transition: background-color 0.2s;
	}

	.chip-remove:hover {
		background-color: rgba(21, 101, 192, 0.2);
	}

	.chip-remove svg {
		width: 12px;
		height: 12px;
	}

	.person-select-container {
		position: relative;
	}

	.person-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		font-size: 0.95rem;
	}

	.person-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.person-input.disabled {
		background-color: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	.person-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		background-color: white;
		border: 1px solid #ddd;
		border-top: none;
		border-radius: 0 0 4px 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-height: 200px;
		overflow-y: auto;
		z-index: 100;
	}

	.person-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.person-option:hover {
		background-color: #f5f5f5;
	}

	.person-option.selected {
		background-color: #e8f4fd;
	}

	.person-name {
		flex: 1;
		font-weight: 500;
		color: #333;
	}

	.person-count {
		font-size: 0.75rem;
		color: #999;
	}

	.check-icon {
		width: 16px;
		height: 16px;
		color: #4a90e2;
	}

	.no-persons-message {
		padding: 0.75rem;
		background-color: #f0f0f0;
		border-radius: 4px;
		font-size: 0.85rem;
		color: #666;
	}

	.label-link {
		display: block;
		margin-top: 0.5rem;
		color: #4a90e2;
		text-decoration: none;
	}

	.label-link:hover {
		text-decoration: underline;
	}

	.filter-help {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #999;
	}

	/* Quick links */
	.filter-links {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		color: #4a90e2;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 500;
		transition: color 0.2s;
	}

	.filter-link:hover {
		color: #3a7bc8;
	}

	.filter-link svg {
		width: 16px;
		height: 16px;
	}
</style>
