<script lang="ts">
	import { goto } from '$app/navigation';
	import { listPersons } from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import PersonCard from '$lib/components/faces/PersonCard.svelte';
	import type { Person } from '$lib/types';
	import { onMount } from 'svelte';

	// State
	let persons = $state<Person[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let currentPage = $state(1);
	let totalPersons = $state(0);
	let hasMore = $state(false);

	// Filter state
	let statusFilter = $state<'active' | 'merged' | 'hidden' | 'all'>('active');
	let searchQuery = $state('');

	const PAGE_SIZE = 20;

	// Filtered persons (client-side search)
	let filteredPersons = $derived.by<Person[]>(() => {
		if (!searchQuery.trim()) return persons;
		const query = searchQuery.toLowerCase();
		return persons.filter((p) => p.name.toLowerCase().includes(query));
	});

	onMount(() => {
		loadPersons(true);
	});

	// Reload when status filter changes
	$effect(() => {
		const status = statusFilter;
		loadPersons(true);
	});

	async function loadPersons(reset: boolean = false) {
		if (reset) {
			currentPage = 1;
			persons = [];
		}

		loading = reset;
		loadingMore = !reset;
		error = null;

		try {
			const status = statusFilter === 'all' ? undefined : statusFilter;
			const response = await listPersons(currentPage, PAGE_SIZE, status);

			if (reset) {
				persons = response.items;
			} else {
				persons = [...persons, ...response.items];
			}

			totalPersons = response.total;
			hasMore = persons.length < response.total;
		} catch (err) {
			console.error('Failed to load persons:', err);
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Failed to load persons. Please try again.';
			}
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function handleLoadMore() {
		if (loadingMore || !hasMore) return;
		currentPage += 1;
		loadPersons(false);
	}

	function handlePersonClick(person: Person) {
		goto(`/people/${person.id}`);
	}

	function handleStatusChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		statusFilter = target.value as 'active' | 'merged' | 'hidden' | 'all';
	}

	function handleRetry() {
		loadPersons(true);
	}
</script>

<svelte:head>
	<title>People | Image Search</title>
</svelte:head>

<main class="people-page">
	<header class="page-header">
		<div class="header-content">
			<h1>People</h1>
			<p class="subtitle">Browse and manage identified people in your photos.</p>
		</div>
		<a href="/faces/clusters" class="clusters-link">
			View Clusters
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M5 12h14M12 5l7 7-7 7" />
			</svg>
		</a>
	</header>

	<!-- Filters -->
	<div class="filters-bar">
		<div class="search-container">
			<svg
				class="search-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.35-4.35" />
			</svg>
			<input
				type="text"
				placeholder="Search people..."
				bind:value={searchQuery}
				class="search-input"
				aria-label="Search people by name"
			/>
		</div>

		<div class="filter-group">
			<label for="statusFilter">Status:</label>
			<select id="statusFilter" value={statusFilter} onchange={handleStatusChange}>
				<option value="active">Active</option>
				<option value="merged">Merged</option>
				<option value="hidden">Hidden</option>
				<option value="all">All</option>
			</select>
		</div>
	</div>

	<!-- Content -->
	<section class="content" aria-live="polite">
		{#if loading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading people...</p>
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
		{:else if filteredPersons.length === 0}
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
				<h2>No people found</h2>
				<p>
					{#if searchQuery}
						No people match your search. Try a different query.
					{:else}
						No people have been identified yet. Label face clusters to create people.
					{/if}
				</p>
				{#if !searchQuery}
					<a href="/faces/clusters" class="action-link">Go to Clusters</a>
				{/if}
			</div>
		{:else}
			<div class="results-header">
				<span class="results-count">
					{#if searchQuery}
						{filteredPersons.length} results for "{searchQuery}"
					{:else}
						Showing {persons.length} of {totalPersons} people
					{/if}
				</span>
			</div>

			<div class="people-grid">
				{#each filteredPersons as person (person.id)}
					<PersonCard {person} onClick={() => handlePersonClick(person)} />
				{/each}
			</div>

			{#if hasMore && !searchQuery}
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
	.people-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.header-content h1 {
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

	.clusters-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background-color: white;
		color: #4a90e2;
		border: 1px solid #4a90e2;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		text-decoration: none;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.clusters-link:hover {
		background-color: #4a90e2;
		color: white;
	}

	.clusters-link svg {
		width: 18px;
		height: 18px;
	}

	/* Filters */
	.filters-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.search-container {
		position: relative;
		flex: 1;
		min-width: 200px;
		max-width: 400px;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 18px;
		height: 18px;
		color: #999;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 0.75rem 0.625rem 2.5rem;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 0.95rem;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-group label {
		font-size: 0.875rem;
		color: #666;
	}

	.filter-group select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.95rem;
		background-color: white;
		cursor: pointer;
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
		cursor: pointer;
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

	.action-link {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 500;
	}

	.action-link:hover {
		text-decoration: underline;
	}

	/* Results */
	.results-header {
		margin-bottom: 1rem;
	}

	.results-count {
		font-size: 0.875rem;
		color: #666;
	}

	.people-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
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

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
		}

		.clusters-link {
			width: 100%;
			justify-content: center;
		}
	}
</style>
