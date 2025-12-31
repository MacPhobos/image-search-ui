<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { FaceSuggestion, SuggestionGroup } from '$lib/api/faces';
	import {
		listGroupedSuggestions,
		getFaceSuggestionSettings,
		bulkSuggestionAction,
		acceptSuggestion,
		rejectSuggestion,
		type GroupedSuggestionsResponse,
		type FaceSuggestionSettings
	} from '$lib/api/faces';
	import SuggestionGroupCard from '$lib/components/faces/SuggestionGroupCard.svelte';
	import SuggestionDetailModal from '$lib/components/faces/SuggestionDetailModal.svelte';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';

	let groupedResponse = $state<GroupedSuggestionsResponse | null>(null);
	let settings = $state<FaceSuggestionSettings>({ groupsPerPage: 10, itemsPerGroup: 20 });
	let page = $state(1);
	let statusFilter = $state<string>('pending');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedIds = $state<Set<number>>(new Set());
	let bulkLoading = $state(false);
	let selectedSuggestion = $state<FaceSuggestion | null>(null);

	async function loadSuggestions() {
		isLoading = true;
		error = null;
		try {
			groupedResponse = await listGroupedSuggestions({
				page,
				groupsPerPage: settings.groupsPerPage,
				suggestionsPerGroup: settings.itemsPerGroup,
				status: statusFilter || undefined
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load suggestions';
		} finally {
			isLoading = false;
		}
	}

	function handleSuggestionUpdate(updated: FaceSuggestion) {
		// Update suggestion in grouped response
		if (groupedResponse) {
			groupedResponse = {
				...groupedResponse,
				groups: groupedResponse.groups.map((group) => ({
					...group,
					suggestions: group.suggestions.map((s) => (s.id === updated.id ? updated : s))
				}))
			};
		}
		selectedIds.delete(updated.id);
		selectedIds = new Set(selectedIds);
	}

	function handleSelect(id: number, selected: boolean) {
		if (selected) {
			selectedIds.add(id);
		} else {
			selectedIds.delete(id);
		}
		selectedIds = new Set(selectedIds);
	}

	function handleSelectAllInGroup(ids: number[], selected: boolean) {
		if (selected) {
			ids.forEach((id) => selectedIds.add(id));
		} else {
			ids.forEach((id) => selectedIds.delete(id));
		}
		selectedIds = new Set(selectedIds);
	}

	function selectAll() {
		if (!groupedResponse) return;
		const pendingIds: number[] = [];
		for (const group of groupedResponse.groups) {
			for (const suggestion of group.suggestions) {
				if (suggestion.status === 'pending') {
					pendingIds.push(suggestion.id);
				}
			}
		}
		selectedIds = new Set(pendingIds);
	}

	function selectNone() {
		selectedIds = new Set();
	}

	async function handleBulkAction(action: 'accept' | 'reject') {
		if (selectedIds.size === 0) return;

		bulkLoading = true;
		try {
			await bulkSuggestionAction([...selectedIds], action);
			await loadSuggestions();
			selectedIds = new Set();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Bulk action failed';
		} finally {
			bulkLoading = false;
		}
	}

	async function handleGroupAcceptAll(ids: number[]) {
		if (ids.length === 0) return;
		await bulkSuggestionAction(ids, 'accept');
		await loadSuggestions();
		// Remove accepted IDs from selection
		ids.forEach((id) => selectedIds.delete(id));
		selectedIds = new Set(selectedIds);
	}

	async function handleGroupRejectAll(ids: number[]) {
		if (ids.length === 0) return;
		await bulkSuggestionAction(ids, 'reject');
		await loadSuggestions();
		// Remove rejected IDs from selection
		ids.forEach((id) => selectedIds.delete(id));
		selectedIds = new Set(selectedIds);
	}

	function handleThumbnailClick(suggestion: FaceSuggestion) {
		selectedSuggestion = suggestion;
	}

	function handleModalClose() {
		selectedSuggestion = null;
	}

	async function handleModalAccept(suggestion: FaceSuggestion) {
		try {
			const updated = await acceptSuggestion(suggestion.id);
			handleSuggestionUpdate(updated);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to accept suggestion';
		}
	}

	async function handleModalReject(suggestion: FaceSuggestion) {
		try {
			const updated = await rejectSuggestion(suggestion.id);
			handleSuggestionUpdate(updated);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reject suggestion';
		}
	}

	/**
	 * Extract all asset IDs from suggestions for batch thumbnail loading.
	 * Returns unique asset IDs from all faceThumbnailUrls.
	 */
	function extractAssetIds(response: GroupedSuggestionsResponse | null): number[] {
		if (!response) return [];
		const assetIds: number[] = [];
		for (const group of response.groups) {
			for (const suggestion of group.suggestions) {
				if (suggestion.faceThumbnailUrl) {
					const match = suggestion.faceThumbnailUrl.match(/\/images\/(\d+)\/thumbnail/);
					if (match) {
						assetIds.push(parseInt(match[1], 10));
					}
				}
			}
		}
		return [...new Set(assetIds)]; // Remove duplicates
	}

	onMount(async () => {
		try {
			settings = await getFaceSuggestionSettings();
		} catch (e) {
			// Use defaults if settings fetch fails
			console.error('Failed to load settings:', e);
		}
		await loadSuggestions();
	});

	onDestroy(() => {
		// Clear cache when page unmounts
		thumbnailCache.clear();
	});

	$effect(() => {
		// Reload when filter or page changes
		if (statusFilter !== undefined || page) {
			loadSuggestions();
		}
	});

	$effect(() => {
		// Batch-load thumbnails when suggestions change
		if (groupedResponse) {
			const assetIds = extractAssetIds(groupedResponse);
			if (assetIds.length > 0) {
				thumbnailCache.fetchBatch(assetIds);
			}
		}
	});

	const totalPages = $derived(groupedResponse ? Math.ceil(groupedResponse.totalGroups / settings.groupsPerPage) : 0);
	const pendingCount = $derived(() => {
		if (!groupedResponse) return 0;
		let count = 0;
		for (const group of groupedResponse.groups) {
			for (const suggestion of group.suggestions) {
				if (suggestion.status === 'pending') count++;
			}
		}
		return count;
	});
</script>

<svelte:head>
	<title>Face Suggestions | Image Search</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Face Suggestions</h1>
		<div class="text-sm text-gray-500">
			{groupedResponse?.totalSuggestions ?? 0} total suggestion{groupedResponse?.totalSuggestions === 1 ? '' : 's'}
			{#if groupedResponse}
				· {groupedResponse.totalGroups} group{groupedResponse.totalGroups === 1 ? '' : 's'}
			{/if}
		</div>
	</div>

	<!-- Filters and Bulk Actions -->
	<div class="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
		<div class="flex items-center gap-2">
			<label for="status" class="text-sm font-medium text-gray-700">Status:</label>
			<select id="status" bind:value={statusFilter} class="rounded border-gray-300 text-sm">
				<option value="">All</option>
				<option value="pending">Pending</option>
				<option value="accepted">Accepted</option>
				<option value="rejected">Rejected</option>
			</select>
		</div>

		{#if pendingCount > 0}
			<div class="flex items-center gap-2 ml-auto">
				<button onclick={selectAll} class="text-sm text-blue-600 hover:underline">
					Select All ({pendingCount})
				</button>
				<button onclick={selectNone} class="text-sm text-gray-600 hover:underline">
					Select None
				</button>
			</div>

			{#if selectedIds.size > 0}
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-600">{selectedIds.size} selected</span>
					<button
						onclick={() => handleBulkAction('accept')}
						disabled={bulkLoading}
						class="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
					>
						Accept All
					</button>
					<button
						onclick={() => handleBulkAction('reject')}
						disabled={bulkLoading}
						class="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
					>
						Reject All
					</button>
				</div>
			{/if}
		{/if}
	</div>

	{#if error}
		<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if !groupedResponse || groupedResponse.groups.length === 0}
		<div class="text-center py-12 text-gray-500">No suggestions found</div>
	{:else}
		<!-- Grouped suggestions -->
		<div class="grid gap-4">
			{#each groupedResponse.groups as group (group.personId)}
				{@const groupWithPendingCount = {
					...group,
					pendingCount: group.suggestions.filter((s) => s.status === 'pending').length
				}}
				<SuggestionGroupCard
					group={groupWithPendingCount}
					{selectedIds}
					onSelect={handleSelect}
					onSelectAllInGroup={handleSelectAllInGroup}
					onAcceptAll={handleGroupAcceptAll}
					onRejectAll={handleGroupRejectAll}
					onThumbnailClick={handleThumbnailClick}
				/>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex justify-center items-center gap-4 mt-8">
				<button
					onclick={() => (page = Math.max(1, page - 1))}
					disabled={page === 1}
					class="px-4 py-2 border rounded disabled:opacity-50"
				>
					Previous
				</button>
				<span class="text-sm text-gray-600">
					Page {page} of {totalPages}
					{#if groupedResponse}
						· Showing {groupedResponse.groups.length} of {groupedResponse.totalGroups} groups
					{/if}
				</span>
				<button
					onclick={() => (page = Math.min(totalPages, page + 1))}
					disabled={page === totalPages}
					class="px-4 py-2 border rounded disabled:opacity-50"
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- Detail Modal -->
<SuggestionDetailModal
	suggestion={selectedSuggestion}
	onClose={handleModalClose}
	onAccept={handleModalAccept}
	onReject={handleModalReject}
/>
