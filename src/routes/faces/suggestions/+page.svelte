<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { FaceSuggestion, Person } from '$lib/api/faces';
	import {
		listGroupedSuggestions,
		getFaceSuggestionSettings,
		bulkSuggestionAction,
		acceptSuggestion,
		rejectSuggestion,
		listPersons,
		type GroupedSuggestionsResponse,
		type FaceSuggestionSettings,
		type FindMoreJobInfo
	} from '$lib/api/faces';
	import { jobProgressStore } from '$lib/stores/jobProgressStore.svelte';
	import { toast } from 'svelte-sonner';
	import SuggestionGroupCard from '$lib/components/faces/SuggestionGroupCard.svelte';
	import SuggestionDetailModal from '$lib/components/faces/SuggestionDetailModal.svelte';
	import PersonSearchBar from '$lib/components/faces/PersonSearchBar.svelte';
	import RecentlyAssignedPanel, {
		type RecentAssignment
	} from '$lib/components/faces/RecentlyAssignedPanel.svelte';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';
	import { localSettings } from '$lib/stores/localSettings.svelte';
	import { unassignFace } from '$lib/api/faces';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/faces/suggestions/+page', {
		filePath: 'src/routes/faces/suggestions/+page.svelte'
	});

	// localStorage key for persisting groups per page preference
	const GROUPS_PER_PAGE_KEY = 'suggestions.groupsPerPage';
	const GROUPS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
	type GroupsPerPageOption = (typeof GROUPS_PER_PAGE_OPTIONS)[number];

	let groupedResponse = $state<GroupedSuggestionsResponse | null>(null);
	let settings = $state<FaceSuggestionSettings>({ groupsPerPage: 20, itemsPerGroup: 20 });
	// Initialize groupsPerPage from localStorage (default 10 per user request)
	let groupsPerPage = $state<GroupsPerPageOption>(
		localSettings.get<GroupsPerPageOption>(GROUPS_PER_PAGE_KEY, 10)
	);
	let page = $state(1);
	let statusFilter = $state<string>('pending');
	let personFilter = $state<string | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedIds = $state<Set<number>>(new Set());
	let bulkLoading = $state(false);
	let selectedSuggestion = $state<FaceSuggestion | null>(null);
	let persons = $state<Person[]>([]);
	let personsLoading = $state(false);
	let recentAssignments = $state<RecentAssignment[]>([]);

	async function loadPersons() {
		personsLoading = true;
		try {
			// Fetch all active persons with pagination (API limits page_size to 100)
			const allPersons: Person[] = [];
			let currentPage = 1;
			const pageSize = 200;
			let hasMore = true;

			while (hasMore) {
				const response = await listPersons(currentPage, pageSize, 'active');
				allPersons.push(...response.items);
				hasMore = response.items.length === pageSize && allPersons.length < response.total;
				currentPage++;
			}

			persons = allPersons;
		} catch (e) {
			console.error('Failed to load persons:', e);
			persons = [];
		} finally {
			personsLoading = false;
		}
	}

	async function loadSuggestions() {
		isLoading = true;
		error = null;
		try {
			groupedResponse = await listGroupedSuggestions({
				page,
				groupsPerPage: groupsPerPage,
				suggestionsPerGroup: settings.itemsPerGroup,
				status: statusFilter || undefined,
				personId: personFilter || undefined
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load suggestions';
		} finally {
			isLoading = false;
		}
	}

	function handleGroupsPerPageChange(value: number) {
		const validValue = GROUPS_PER_PAGE_OPTIONS.includes(value as GroupsPerPageOption)
			? (value as GroupsPerPageOption)
			: 10;
		groupsPerPage = validValue;
		localSettings.set(GROUPS_PER_PAGE_KEY, validValue);
		page = 1; // Reset to first page when changing page size
	}

	function handlePersonSelect(personId: string | null) {
		personFilter = personId;
		page = 1; // Reset to first page when filter changes
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
			// Track assignments before API call (while we still have suggestion data)
			if (action === 'accept' && groupedResponse) {
				const acceptedSuggestions: FaceSuggestion[] = [];
				for (const group of groupedResponse.groups) {
					for (const suggestion of group.suggestions) {
						if (selectedIds.has(suggestion.id)) {
							acceptedSuggestions.push(suggestion);
						}
					}
				}
				// Track all accepted suggestions
				acceptedSuggestions.forEach((s) => trackAssignment(s));
			}

			// Call API with auto-find-more enabled for accept actions
			const response = await bulkSuggestionAction([...selectedIds], action, {
				autoFindMore: action === 'accept',
				findMorePrototypeCount: 50
			});

			// Track any auto-triggered find-more jobs
			if (response.findMoreJobs && response.findMoreJobs.length > 0) {
				handleFindMoreJobs(response.findMoreJobs);
			}

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

		// Track assignments before API call (while we still have suggestion data)
		if (groupedResponse) {
			const acceptedSuggestions: FaceSuggestion[] = [];
			for (const group of groupedResponse.groups) {
				for (const suggestion of group.suggestions) {
					if (ids.includes(suggestion.id)) {
						acceptedSuggestions.push(suggestion);
					}
				}
			}
			// Track all accepted suggestions
			acceptedSuggestions.forEach((s) => trackAssignment(s));
		}

		// Call API with auto-find-more enabled
		const response = await bulkSuggestionAction(ids, 'accept', {
			autoFindMore: true,
			findMorePrototypeCount: 50
		});

		// Track any auto-triggered find-more jobs
		if (response.findMoreJobs && response.findMoreJobs.length > 0) {
			handleFindMoreJobs(response.findMoreJobs);
		}

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

			// Track this assignment in recent list
			trackAssignment(suggestion);
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

	function handleFaceUnassigned() {
		// Reload suggestions after undoing an assignment
		// The face should now appear in the suggestions again
		loadSuggestions();
	}

	/**
	 * Handle face assignment from All Faces list in SuggestionDetailModal.
	 * Adds the assignment to the recently assigned panel.
	 */
	function handleFaceAssigned(assignment: {
		faceId: string;
		personId: string;
		personName: string;
		thumbnailUrl: string;
		photoFilename: string;
	}) {
		const recentAssignment: RecentAssignment = {
			faceId: assignment.faceId,
			personId: assignment.personId,
			personName: assignment.personName,
			thumbnailUrl: assignment.thumbnailUrl,
			photoFilename: assignment.photoFilename,
			assignedAt: new Date()
		};

		// Add to front, keep max 10
		recentAssignments = [recentAssignment, ...recentAssignments].slice(0, 10);
	}

	/**
	 * Track a face assignment in the recent assignments list.
	 */
	function trackAssignment(suggestion: FaceSuggestion) {
		if (!suggestion.personName) return;

		const assignment: RecentAssignment = {
			faceId: suggestion.faceInstanceId,
			personId: suggestion.suggestedPersonId,
			personName: suggestion.personName,
			thumbnailUrl:
				suggestion.faceThumbnailUrl || `/api/v1/faces/faces/${suggestion.faceInstanceId}/thumbnail`,
			photoFilename: suggestion.path.split('/').pop() || 'Unknown',
			assignedAt: new Date()
		};

		// Add to front, keep max 10
		recentAssignments = [assignment, ...recentAssignments].slice(0, 10);
	}

	/**
	 * Handle undo from recently assigned panel.
	 */
	async function handleRecentUndo(faceId: string) {
		try {
			await unassignFace(faceId);

			// Remove from recent list
			recentAssignments = recentAssignments.filter((a) => a.faceId !== faceId);

			// Reload suggestions to show the face again
			await loadSuggestions();
		} catch (err) {
			console.error('Failed to undo assignment:', err);
			error = err instanceof Error ? err.message : 'Failed to undo assignment';
		}
	}

	/**
	 * Handle completion of "Find More" job.
	 * Refreshes suggestions to show newly discovered faces.
	 */
	async function handleFindMoreComplete() {
		// Reload suggestions to show the new suggestions
		await loadSuggestions();
	}

	/**
	 * Handle auto-triggered find-more jobs from bulk accept.
	 * Tracks each job with progress and shows toasts.
	 */
	function handleFindMoreJobs(jobs: FindMoreJobInfo[]) {
		for (const job of jobs) {
			// Look up person name from persons list
			const person = persons.find((p) => p.id === job.personId);
			const personName = person?.name || 'Unknown';

			// Track job with progress store
			jobProgressStore.trackJob(
				job.jobId,
				job.progressKey,
				job.personId,
				personName,
				(completedJob) => {
					// Success callback
					const count = completedJob.result?.suggestionsCreated || 0;
					toast.success(`Found ${count} new suggestions for ${personName}`, {
						id: `find-more-${job.jobId}`
					});
					loadSuggestions(); // Refresh to show new suggestions
				},
				(errorMsg) => {
					// Error callback
					toast.error(`Find more failed for ${personName}: ${errorMsg}`, {
						id: `find-more-${job.jobId}`
					});
				}
			);

			// Show loading toast
			toast.loading(`Finding more suggestions for ${personName}...`, {
				id: `find-more-${job.jobId}`
			});
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
		await loadPersons();
		await loadSuggestions();
		return cleanup;
	});

	onDestroy(() => {
		// Clear cache when page unmounts
		thumbnailCache.clear();
	});

	$effect(() => {
		// Reload when filter, page, or groupsPerPage changes
		if (statusFilter !== undefined || page || personFilter !== undefined || groupsPerPage) {
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

	const totalPages = $derived(
		groupedResponse ? Math.ceil(groupedResponse.totalGroups / groupsPerPage) : 0
	);
	const totalPendingCount = $derived.by(() => {
		if (!groupedResponse) return 0;
		// When filtering by pending, totalSuggestions IS the total pending count
		if (statusFilter === 'pending') {
			return groupedResponse.totalSuggestions;
		}
		// Otherwise, count pending in currently displayed suggestions
		let count = 0;
		for (const group of groupedResponse.groups) {
			for (const suggestion of group.suggestions) {
				if (suggestion.status === 'pending') count++;
			}
		}
		return count;
	});
	const displayedPendingCount = $derived.by(() => {
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
	<div class="page-layout">
		<!-- Main content area -->
		<div class="main-content">
			<div class="flex items-center justify-between mb-6">
				<h1 class="text-2xl font-bold text-gray-900">Face Suggestions</h1>
				<div class="text-sm text-gray-500">
					{groupedResponse?.totalSuggestions ?? 0} total suggestion{groupedResponse?.totalSuggestions ===
					1
						? ''
						: 's'}
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

		<div class="flex items-center gap-2 flex-1 min-w-0 max-w-xs">
			<label for="person-filter" class="text-sm font-medium text-gray-700 shrink-0">Person:</label>
			<div class="flex-1 min-w-0">
				<PersonSearchBar
					{persons}
					loading={personsLoading}
					selectedPersonId={personFilter}
					onSelect={handlePersonSelect}
					placeholder="Filter by person..."
					testId="suggestion-person-filter"
				/>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<label for="groups-per-page" class="text-sm font-medium text-gray-700">Show:</label>
			<select
				id="groups-per-page"
				value={groupsPerPage}
				onchange={(e) => handleGroupsPerPageChange(parseInt(e.currentTarget.value, 10))}
				class="rounded border-gray-300 text-sm"
			>
				{#each GROUPS_PER_PAGE_OPTIONS as option}
					<option value={option}>{option} persons</option>
				{/each}
			</select>
		</div>

		{#if totalPendingCount > 0}
			<div class="flex items-center gap-2 ml-auto">
				<button onclick={selectAll} class="text-sm text-blue-600 hover:underline">
					Select All ({displayedPendingCount})
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
					// When filtering by pending, suggestionCount IS the pending count for this person.
					// Otherwise, count pending in displayed suggestions.
					pendingCount: statusFilter === 'pending'
						? group.suggestionCount
						: group.suggestions.filter((s) => s.status === 'pending').length,
					// Get labeled face count for this person (from persons list)
					labeledFaceCount: persons.find((p) => p.id === group.personId)?.faceCount
				}}
				<SuggestionGroupCard
					group={groupWithPendingCount}
					{selectedIds}
					onSelect={handleSelect}
					onSelectAllInGroup={handleSelectAllInGroup}
					onAcceptAll={handleGroupAcceptAll}
					onRejectAll={handleGroupRejectAll}
					onThumbnailClick={handleThumbnailClick}
					onFindMoreComplete={handleFindMoreComplete}
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

		<!-- Sidebar with Recently Assigned Panel -->
		<aside class="sidebar">
			<RecentlyAssignedPanel assignments={recentAssignments} onUndo={handleRecentUndo} />
		</aside>
	</div>
</div>

<!-- Detail Modal -->
<SuggestionDetailModal
	suggestion={selectedSuggestion}
	onClose={handleModalClose}
	onAccept={handleModalAccept}
	onReject={handleModalReject}
	onFaceAssigned={handleFaceAssigned}
	onFaceUnassigned={handleFaceUnassigned}
/>

<style>
	.page-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 1.5rem;
		align-items: start;
	}

	.main-content {
		min-width: 0;
	}

	.sidebar {
		position: relative;
	}

	/* Responsive layout */
	@media (max-width: 1024px) {
		.page-layout {
			grid-template-columns: 1fr;
		}

		.sidebar {
			order: -1; /* Show panel above main content on mobile */
		}
	}
</style>
