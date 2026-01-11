<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { listUnifiedPeople } from '$lib/api/faces';
	import type { UnifiedPeopleListResponse, UnifiedPersonResponse } from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import UnifiedPersonCard from '$lib/components/faces/UnifiedPersonCard.svelte';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/people/+page', {
		filePath: 'src/routes/people/+page.svelte'
	});

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<UnifiedPeopleListResponse | null>(null);

	// Filters
	let showIdentified = $state(true);
	let showUnidentified = $state(false);
	let showNoise = $state(false);

	// Select component values (bits-ui v2 uses simple strings with bind:value)
	let sortBySelection = $state<string>('faceCount');
	let sortOrderSelection = $state<string>('desc');

	// Derived values for API calls
	let sortBy = $derived(sortBySelection as 'faceCount' | 'name');
	let sortOrder = $derived(sortOrderSelection as 'asc' | 'desc');

	// Derived labels for Select triggers
	let sortByLabel = $derived(
		sortBySelection === 'faceCount' ? 'Face Count' : sortBySelection === 'name' ? 'Name' : 'Sort by'
	);
	let sortOrderLabel = $derived(
		sortOrderSelection === 'desc' ? 'Descending' : sortOrderSelection === 'asc' ? 'Ascending' : 'Sort order'
	);

	// Derived - filter people by type
	let identifiedPeople = $derived(data?.people.filter((p) => p.type === 'identified') ?? []);
	let unidentifiedPeople = $derived(data?.people.filter((p) => p.type === 'unidentified') ?? []);
	let noisePeople = $derived(data?.people.filter((p) => p.type === 'noise') ?? []);

	async function loadPeople() {
		loading = true;
		error = null;
		try {
			data = await listUnifiedPeople({
				includeIdentified: showIdentified,
				includeUnidentified: showUnidentified,
				includeNoise: showNoise,
				sortBy,
				sortOrder
			});
		} catch (err) {
			console.error('Failed to load people:', err);
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Failed to load people. Please try again.';
			}
		} finally {
			loading = false;
		}
	}

	function handlePersonClick(person: UnifiedPersonResponse) {
		// Noise faces don't have a cluster detail page (cluster_id = "-1" or similar)
		if (person.type === 'noise') {
			// No navigation for noise faces - they need individual review
			return;
		}

		// Navigate to person detail page based on type
		if (person.type === 'identified') {
			goto(`/people/${person.id}`);
		} else {
			// For unidentified clusters, go to cluster detail page
			goto(`/faces/clusters/${person.id}`);
		}
	}

	function handleAssign(person: UnifiedPersonResponse) {
		// Noise faces can't be assigned (no cluster page)
		if (person.type === 'noise') {
			return;
		}
		// Open assign modal or navigate to assign page
		goto(`/faces/clusters/${person.id}?action=label`);
	}

	/**
	 * Extract all asset IDs from people for batch thumbnail loading.
	 * Returns unique asset IDs from all thumbnailUrls.
	 */
	function extractAssetIds(people: UnifiedPersonResponse[]): number[] {
		const ids: number[] = [];
		for (const person of people) {
			if (person.thumbnailUrl) {
				const match = person.thumbnailUrl.match(/\/images\/(\d+)\/thumbnail/);
				if (match) {
					ids.push(parseInt(match[1], 10));
				}
			}
		}
		return [...new Set(ids)]; // Remove duplicates
	}

	onMount(() => {
		loadPeople();
		return cleanup;
	});

	onDestroy(() => {
		// Clear cache when page unmounts
		thumbnailCache.clear();
	});

	// Reload when filters change
	$effect(() => {
		// Track all filter dependencies and reload
		void showIdentified;
		void showUnidentified;
		void showNoise;
		void sortBy;
		void sortOrder;
		loadPeople();
	});

	// Batch-load thumbnails when people data changes
	$effect(() => {
		if (data && data.people.length > 0) {
			const assetIds = extractAssetIds(data.people);
			if (assetIds.length > 0) {
				thumbnailCache.fetchBatch(assetIds);
			}
		}
	});
</script>

<svelte:head>
	<title>People | Image Search</title>
</svelte:head>

<main class="people-page">
	<header class="page-header">
		<div class="header-content">
			<h1>People</h1>
			<p class="subtitle">Browse identified people and face groups in your photos.</p>
		</div>

		{#if data}
			<div class="stats-summary">
				<div class="stat-item stat-success">
					<span class="stat-label">Identified</span>
					<span class="stat-value">{data.identifiedCount}</span>
				</div>
				<div class="stat-item stat-warning">
					<span class="stat-label">Unidentified</span>
					<span class="stat-value">{data.unidentifiedCount}</span>
				</div>
				{#if showNoise}
					<div class="stat-item stat-error">
						<span class="stat-label">Unknown</span>
						<span class="stat-value">{data.noiseCount}</span>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Filters -->
	<section class="filters-bar">
		<div class="filter-group">
			<div class="flex items-center space-x-2">
				<Checkbox id="show-identified" bind:checked={showIdentified} />
				<Label for="show-identified" class="cursor-pointer">Show Identified</Label>
			</div>
			<div class="flex items-center space-x-2">
				<Checkbox id="show-unidentified" bind:checked={showUnidentified} />
				<Label for="show-unidentified" class="cursor-pointer">Show Unidentified</Label>
			</div>
			<div class="flex items-center space-x-2">
				<Checkbox id="show-noise" bind:checked={showNoise} />
				<Label for="show-noise" class="cursor-pointer">Show Unknown Faces</Label>
			</div>
		</div>

		<Separator orientation="vertical" class="h-8" />

		<div class="sort-controls">
			<Label for="sortBy" class="sort-label">Sort by:</Label>
			<Select.Root type="single" bind:value={sortBySelection}>
				<Select.Trigger id="sortBy" class="w-[160px]">
					{sortByLabel}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="faceCount" label="Face Count">Face Count</Select.Item>
					<Select.Item value="name" label="Name">Name</Select.Item>
				</Select.Content>
			</Select.Root>

			<Select.Root type="single" bind:value={sortOrderSelection}>
				<Select.Trigger class="w-[140px]" aria-label="Sort order">
					{sortOrderLabel}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="desc" label="Descending">Descending</Select.Item>
					<Select.Item value="asc" label="Ascending">Ascending</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</section>

	<!-- Content -->
	<section class="content">
		{#if loading}
			<div class="people-grid">
				{#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
					<div class="skeleton-card">
						<Skeleton class="h-48 w-full rounded-lg mb-3" />
						<Skeleton class="h-4 w-3/4 mb-2" />
						<Skeleton class="h-3 w-1/2" />
					</div>
				{/each}
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
				<button type="button" class="retry-button" onclick={loadPeople}>Try Again</button>
			</div>
		{:else if data?.total === 0}
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
				<p>Upload images with faces to get started.</p>
				<a href="/faces/sessions" class="action-link">Start Face Detection</a>
			</div>
		{:else}
			<!-- Identified People Section -->
			{#if showIdentified && identifiedPeople.length > 0}
				<section class="people-section">
					<div class="section-header">
						<h2 class="section-title">
							<Badge variant="default">Identified</Badge>
							<span class="section-count">{identifiedPeople.length} people</span>
						</h2>
					</div>
					<div class="people-grid">
						{#each identifiedPeople as person (person.id)}
							<UnifiedPersonCard {person} onClick={() => handlePersonClick(person)} />
						{/each}
					</div>
				</section>
			{/if}

			<!-- Unidentified People Section -->
			{#if showUnidentified && unidentifiedPeople.length > 0}
				<section class="people-section">
					<div class="section-header">
						<h2 class="section-title">
							<Badge variant="secondary">Needs Names</Badge>
							<span class="section-count">{unidentifiedPeople.length} groups</span>
						</h2>
						<p class="section-description">
							These are groups of similar faces detected in your photos. Assign names to help the
							system recognize them.
						</p>
					</div>
					<div class="people-grid">
						{#each unidentifiedPeople as person (person.id)}
							<UnifiedPersonCard
								{person}
								showAssignButton={true}
								onClick={() => handlePersonClick(person)}
								onAssign={() => handleAssign(person)}
							/>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Noise/Unknown Faces Section -->
			{#if showNoise && noisePeople.length > 0}
				<section class="people-section">
					<div class="section-header">
						<h2 class="section-title">
							<Badge variant="destructive">Unknown Faces</Badge>
							<span class="section-count">{noisePeople[0]?.faceCount ?? 0} ungrouped faces</span>
						</h2>
						<p class="section-description">
							These faces couldn't be confidently grouped. Review and assign manually.
						</p>
					</div>
					<div class="people-grid">
						{#each noisePeople as person (person.id)}
							<UnifiedPersonCard
								{person}
								showAssignButton={true}
								onClick={() => handlePersonClick(person)}
								onAssign={() => handleAssign(person)}
							/>
						{/each}
					</div>
				</section>
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
		margin-bottom: 2rem;
	}

	.header-content h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #666;
		margin: 0 0 1rem 0;
		font-size: 1rem;
	}

	.stats-summary {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		background: white;
		border: 1px solid #e0e0e0;
		min-width: 100px;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #666;
		text-transform: uppercase;
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.stat-success .stat-value {
		color: #2e7d32;
	}

	.stat-warning .stat-value {
		color: #e65100;
	}

	.stat-error .stat-value {
		color: #c62828;
	}

	/* Filters */
	.filters-bar {
		display: flex;
		gap: 1.5rem;
		padding: 1rem;
		background: white;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.filter-group {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.95rem;
		color: #333;
	}

	.checkbox-label input[type='checkbox'] {
		cursor: pointer;
		width: 16px;
		height: 16px;
	}

	.divider {
		width: 1px;
		height: 24px;
		background-color: #e0e0e0;
	}

	.sort-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.sort-label {
		font-size: 0.875rem;
		color: #666;
	}

	.sort-select {
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
		font-size: 0.95rem;
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

	.action-link {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border: 1px solid #4a90e2;
		border-radius: 6px;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.action-link:hover {
		background-color: #4a90e2;
		color: white;
	}

	/* People sections */
	.people-section {
		margin-bottom: 3rem;
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.5rem 0;
	}

	.section-count {
		font-size: 1rem;
		font-weight: 400;
		color: #666;
	}

	.section-description {
		color: #666;
		font-size: 0.875rem;
		margin: 0;
		max-width: 600px;
	}

	.people-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.people-page {
			padding: 1rem;
		}

		.filters-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.divider {
			display: none;
		}

		.people-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
