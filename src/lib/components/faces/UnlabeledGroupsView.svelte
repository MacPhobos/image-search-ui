<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { localSettings } from '$lib/stores/localSettings.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import SimilarityThresholdControl from './SimilarityThresholdControl.svelte';
	import UnlabeledGroupCard from './UnlabeledGroupCard.svelte';
	import CreatePersonFromGroupDialog from './CreatePersonFromGroupDialog.svelte';
	import MergeGroupsDialog from './MergeGroupsDialog.svelte';
	import {
		listUnknownPersonCandidates,
		triggerDiscovery,
		getDiscoveryStats,
		getMergeSuggestions,
		toAbsoluteUrl,
		type UnknownPersonCandidatesResponse,
		type UnknownPersonCandidateGroup,
		type UnknownPersonsStats,
		type MergeSuggestion
	} from '$lib/api/faces';

	// --- localStorage keys ---
	const THRESHOLD_KEY = 'unlabeledGroups.threshold';
	const PAGE_KEY = 'unlabeledGroups.page';

	// Component tracking (DEV only)
	const trackingCleanup = registerComponent('faces/UnlabeledGroupsView', {
		filePath: 'src/lib/components/faces/UnlabeledGroupsView.svelte'
	});

	// --- State ---
	let threshold = $state(localSettings.get<number>(THRESHOLD_KEY, 0.7));
	let page = $state(localSettings.get<number>(PAGE_KEY, 1));
	let groupsPerPage = $state(50);
	let sortBy = $state<'face_count' | 'confidence' | 'quality'>('face_count');
	let sortOrder = $state<'asc' | 'desc'>('desc');

	// Response data -- use $state.raw() for large arrays
	let response = $state.raw<UnknownPersonCandidatesResponse | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Discovery job state
	let discoveryProgress = $state<string | null>(null);
	let isDiscovering = $state(false);

	// Dialog state
	let showCreateDialog = $state(false);
	let selectedGroup = $state<UnknownPersonCandidateGroup | null>(null);
	let excludedFaceIds = $state<string[]>([]);

	// Merge dialog state
	let mergeDialogOpen = $state(false);
	let mergeGroupA = $state<UnknownPersonCandidateGroup | null>(null);
	let mergeGroupB = $state<UnknownPersonCandidateGroup | null>(null);
	let mergeSimilarity = $state(0);

	// Stats
	let stats = $state.raw<UnknownPersonsStats | null>(null);

	// Merge suggestions
	let mergeSuggestions = $state.raw<MergeSuggestion[]>([]);

	// --- Derived ---
	let groups = $derived(response?.groups ?? []);
	let totalPages = $derived(Math.ceil((response?.totalGroups ?? 0) / groupsPerPage));
	let hasGroups = $derived(groups.length > 0);
	let showEmptyState = $derived(!loading && !hasGroups && !isDiscovering);

	// --- Effects ---

	// Persist settings to localStorage (with untrack to avoid loops)
	$effect(() => {
		const t = threshold;
		const p = page;
		untrack(() => {
			localSettings.set(THRESHOLD_KEY, t);
			localSettings.set(PAGE_KEY, p);
		});
	});

	// Debounced fetch when dependencies change
	let fetchTimeout: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		// Track reactive dependencies
		void [threshold, page, sortBy, sortOrder];

		// Debounce fetch to avoid flooding on slider drag
		if (fetchTimeout) clearTimeout(fetchTimeout);
		fetchTimeout = setTimeout(() => {
			untrack(() => {
				fetchCandidates();
			});
		}, 300);
	});

	// --- Functions ---

	async function fetchCandidates() {
		loading = true;
		error = null;
		try {
			response = await listUnknownPersonCandidates({
				page,
				groupsPerPage,
				minConfidence: threshold,
				sortBy,
				sortOrder
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load candidates';
		} finally {
			loading = false;
		}
	}

	async function handleDiscover() {
		isDiscovering = true;
		discoveryProgress = 'Starting discovery...';
		try {
			const result = await triggerDiscovery({
				minClusterSize: response?.minGroupSizeSetting ?? 5,
				minClusterConfidence: threshold
			});
			pollJobProgress(result.progressKey);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to start discovery';
			isDiscovering = false;
		}
	}

	let pollIntervalId: ReturnType<typeof setInterval> | null = null;

	function pollJobProgress(progressKey: string) {
		pollIntervalId = setInterval(async () => {
			try {
				const response = await fetch(
					toAbsoluteUrl(
						`/api/v1/job-progress/status?progress_key=${encodeURIComponent(progressKey)}`
					)
				);

				// Handle HTTP errors gracefully
				if (!response.ok) {
					// 404 means job is still queued - just continue polling
					if (response.status === 404) {
						return;
					}
					// For other errors (500, etc.), log warning but keep polling for resilience
					console.warn(`Job progress endpoint returned ${response.status}, continuing to poll...`);
					return;
				}

				const progressResp = await response.json();

				if (progressResp.phase === 'complete' || progressResp.phase === 'completed') {
					if (pollIntervalId) clearInterval(pollIntervalId);
					pollIntervalId = null;
					isDiscovering = false;
					discoveryProgress = null;
					await fetchCandidates();
					// Refresh stats after discovery completes
					getDiscoveryStats()
						.then((s) => (stats = s))
						.catch(() => {});
				} else if (progressResp.phase === 'failed' || progressResp.phase === 'error') {
					if (pollIntervalId) clearInterval(pollIntervalId);
					pollIntervalId = null;
					isDiscovering = false;
					error = progressResp.message || 'Discovery job failed';
				} else {
					discoveryProgress =
						progressResp.message ||
						`${progressResp.phase ?? 'Processing'}: ${progressResp.current ?? '?'}/${progressResp.total ?? '?'}`;
				}
			} catch {
				// Silently retry on network errors
			}
		}, 3000);
	}

	onMount(() => {
		fetchCandidates();
		fetchMergeSuggestions();
		getDiscoveryStats()
			.then((s) => (stats = s))
			.catch(() => {});
	});

	async function fetchMergeSuggestions() {
		try {
			const result = await getMergeSuggestions();
			mergeSuggestions = result.suggestions;
		} catch (e) {
			console.error('Failed to load merge suggestions:', e);
			mergeSuggestions = [];
		}
	}

	function openMergeDialog(suggestion: MergeSuggestion) {
		const groupA = groups.find((g) => g.groupId === suggestion.groupAId);
		const groupB = groups.find((g) => g.groupId === suggestion.groupBId);

		if (groupA && groupB) {
			mergeGroupA = groupA;
			mergeGroupB = groupB;
			mergeSimilarity = suggestion.similarity;
			mergeDialogOpen = true;
		}
	}

	async function handleMergeComplete() {
		mergeDialogOpen = false;
		mergeGroupA = null;
		mergeGroupB = null;
		mergeSimilarity = 0;
		await fetchCandidates();
		await fetchMergeSuggestions();
	}

	onDestroy(() => {
		if (pollIntervalId) clearInterval(pollIntervalId);
		if (fetchTimeout) clearTimeout(fetchTimeout);
		trackingCleanup();
	});

	function handleCreatePerson(group: UnknownPersonCandidateGroup, excluded: string[]) {
		selectedGroup = group;
		excludedFaceIds = excluded;
		showCreateDialog = true;
	}

	async function handleGroupDismissed() {
		await fetchCandidates();
	}

	async function handlePersonCreated() {
		showCreateDialog = false;
		selectedGroup = null;
		excludedFaceIds = [];
		await fetchCandidates();
		// Refresh stats after person creation
		getDiscoveryStats()
			.then((s) => (stats = s))
			.catch(() => {});
	}

	function handleCreateDialogOpenChange(open: boolean) {
		if (!open) {
			showCreateDialog = false;
			selectedGroup = null;
			excludedFaceIds = [];
		}
	}
</script>

<div class="space-y-4">
	<!-- Header with stats and discover button -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-base font-semibold text-[#333]">Suggested New Persons</h2>
			{#if stats}
				<p class="text-xs text-[#666]">
					{stats.totalUnassignedFaces.toLocaleString()} unassigned faces
					{#if stats.lastDiscoveryAt}
						&middot; Last scan: {new Date(stats.lastDiscoveryAt).toLocaleDateString()}
					{/if}
				</p>
			{/if}
		</div>
		<div class="flex gap-2">
			<button
				type="button"
				class="action-btn outline-btn"
				onclick={handleDiscover}
				disabled={isDiscovering}
			>
				{isDiscovering ? 'Discovering...' : 'Discover New Persons'}
			</button>
			<a href="/faces/clusters" class="action-btn ghost-btn"> Advanced Mode </a>
		</div>
	</div>

	<!-- Discovery progress -->
	{#if isDiscovering && discoveryProgress}
		<div class="rounded-md border bg-muted p-3">
			<p class="text-sm">{discoveryProgress}</p>
		</div>
	{/if}

	<!-- Threshold slider -->
	<SimilarityThresholdControl bind:value={threshold} min={0.7} max={0.95} step={0.01} />

	<!-- Merge suggestions -->
	{#if mergeSuggestions && mergeSuggestions.length > 0}
		<div class="space-y-2">
			<h3 class="text-sm font-medium text-muted-foreground">Suggested Merges</h3>
			{#each mergeSuggestions as suggestion (suggestion.groupAId + suggestion.groupBId)}
				<button
					class="w-full rounded-md border p-3 text-left hover:bg-muted/50 transition-colors"
					onclick={() => openMergeDialog(suggestion)}
				>
					<div class="flex items-center justify-between">
						<span class="text-sm">
							Group ({suggestion.groupAFaceCount} faces) ↔ Group ({suggestion.groupBFaceCount} faces)
						</span>
						<Badge variant="outline">{(suggestion.similarity * 100).toFixed(0)}% similar</Badge>
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Error state -->
	{#if error}
		<div
			class="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-md text-[#dc2626] text-sm"
			role="alert"
		>
			{error}
		</div>
	{/if}

	<!-- Loading state -->
	{#if loading}
		<div class="space-y-4">
			{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
				<div class="h-40 animate-pulse rounded-lg bg-muted"></div>
			{/each}
		</div>
	{:else if showEmptyState}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<p class="text-lg font-medium">No candidate groups found</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Try lowering the confidence threshold or run a new discovery scan.
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each groups as group (group.groupId)}
				<UnlabeledGroupCard
					{group}
					onCreatePerson={handleCreatePerson}
					onDismissed={handleGroupDismissed}
				/>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-4 py-4">
				<button
					type="button"
					class="px-4 py-2 border border-[#e0e0e0] rounded-md hover:border-[#d0d0d0] disabled:opacity-50"
					disabled={page <= 1}
					onclick={() => (page = Math.max(1, page - 1))}
				>
					Previous
				</button>
				<span class="text-sm text-[#666]">
					Page {page} of {totalPages}
					({response?.totalGroups ?? 0} groups)
				</span>
				<button
					type="button"
					class="px-4 py-2 border border-[#e0e0e0] rounded-md hover:border-[#d0d0d0] disabled:opacity-50"
					disabled={page >= totalPages}
					onclick={() => (page = Math.min(totalPages, page + 1))}
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>

<CreatePersonFromGroupDialog
	open={showCreateDialog}
	group={selectedGroup}
	{excludedFaceIds}
	onOpenChange={handleCreateDialogOpenChange}
	onAccepted={handlePersonCreated}
/>

{#if mergeDialogOpen && mergeGroupA && mergeGroupB}
	<MergeGroupsDialog
		open={mergeDialogOpen}
		groupA={mergeGroupA}
		groupB={mergeGroupB}
		similarity={mergeSimilarity}
		onOpenChange={(open) => (mergeDialogOpen = open)}
		onMerged={handleMergeComplete}
	/>
{/if}

<style>
	.action-btn {
		padding: 0.5rem 0.875rem;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s,
			border-color 0.2s,
			transform 0.1s;
		white-space: nowrap;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.action-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.outline-btn {
		background-color: white;
		color: #374151;
		border: 1px solid #e0e0e0;
	}

	.outline-btn:hover:not(:disabled) {
		background-color: #f9fafb;
		border-color: #d0d0d0;
	}

	.ghost-btn {
		background-color: transparent;
		color: #6b7280;
		border: none;
		padding: 0.375rem 0.5rem;
	}

	.ghost-btn:hover {
		background-color: #f3f4f6;
		color: #374151;
	}
</style>
