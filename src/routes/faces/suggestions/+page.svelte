<script lang="ts">
	import { onMount } from 'svelte';
	import type { FaceSuggestion } from '$lib/api/faces';
	import {
		listSuggestions,
		bulkSuggestionAction,
		acceptSuggestion,
		rejectSuggestion
	} from '$lib/api/faces';
	import SuggestionGroupCard from '$lib/components/faces/SuggestionGroupCard.svelte';
	import SuggestionDetailModal from '$lib/components/faces/SuggestionDetailModal.svelte';

	interface SuggestionGroup {
		personId: string;
		personName: string | null;
		suggestions: FaceSuggestion[];
		pendingCount: number;
	}

	let suggestions = $state<FaceSuggestion[]>([]);
	let total = $state(0);
	let page = $state(1);
	let pageSize = $state(20);
	let statusFilter = $state<string>('pending');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedIds = $state<Set<number>>(new Set());
	let bulkLoading = $state(false);
	let selectedSuggestion = $state<FaceSuggestion | null>(null);

	// Group suggestions by person ID, sorted by confidence descending within each group
	let groupedSuggestions = $derived.by<SuggestionGroup[]>(() => {
		// Group by personId
		const groups = new Map<string, FaceSuggestion[]>();

		for (const suggestion of suggestions) {
			const personId = suggestion.suggestedPersonId;
			if (!groups.has(personId)) {
				groups.set(personId, []);
			}
			const group = groups.get(personId);
			if (group) {
				group.push(suggestion);
			}
		}

		// Convert to array and sort suggestions within each group by confidence descending
		const groupArray: SuggestionGroup[] = [];
		for (const [personId, groupSuggestions] of groups) {
			// Sort by confidence descending
			const sortedSuggestions = [...groupSuggestions].sort((a, b) => b.confidence - a.confidence);

			const pendingCount = sortedSuggestions.filter((s) => s.status === 'pending').length;

			groupArray.push({
				personId,
				personName: sortedSuggestions[0]?.personName || null,
				suggestions: sortedSuggestions,
				pendingCount
			});
		}

		// Sort groups by highest confidence first
		return groupArray.sort((a, b) => {
			const maxConfidenceA = Math.max(...a.suggestions.map((s) => s.confidence));
			const maxConfidenceB = Math.max(...b.suggestions.map((s) => s.confidence));
			return maxConfidenceB - maxConfidenceA;
		});
	});

	async function loadSuggestions() {
		isLoading = true;
		error = null;
		try {
			const response = await listSuggestions(page, pageSize, statusFilter || undefined);
			suggestions = response.items;
			total = response.total;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load suggestions';
		} finally {
			isLoading = false;
		}
	}

	function handleSuggestionUpdate(updated: FaceSuggestion) {
		suggestions = suggestions.map((s) => (s.id === updated.id ? updated : s));
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
		const pendingIds = suggestions.filter((s) => s.status === 'pending').map((s) => s.id);
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

	onMount(() => {
		loadSuggestions();
	});

	$effect(() => {
		// Reload when filter or page changes
		if (statusFilter !== undefined || page) {
			loadSuggestions();
		}
	});

	const totalPages = $derived(Math.ceil(total / pageSize));
	const pendingCount = $derived(suggestions.filter((s) => s.status === 'pending').length);
</script>

<svelte:head>
	<title>Face Suggestions | Image Search</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Face Suggestions</h1>
		<div class="text-sm text-gray-500">
			{total} total suggestion{total === 1 ? '' : 's'}
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
	{:else if suggestions.length === 0}
		<div class="text-center py-12 text-gray-500">No suggestions found</div>
	{:else}
		<!-- Grouped suggestions -->
		<div class="grid gap-4">
			{#each groupedSuggestions as group (group.personId)}
				<SuggestionGroupCard
					{group}
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
