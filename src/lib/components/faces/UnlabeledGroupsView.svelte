<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { localSettings } from '$lib/stores/localSettings.svelte';
	import { Button } from '$lib/components/ui/button';
	import SimilarityThresholdControl from './SimilarityThresholdControl.svelte';
	import UnlabeledGroupCard from './UnlabeledGroupCard.svelte';
	import CreatePersonFromGroupDialog from './CreatePersonFromGroupDialog.svelte';
	import {
		listUnknownPersonCandidates,
		triggerDiscovery,
		getDiscoveryStats,
		toAbsoluteUrl,
		type UnknownPersonCandidatesResponse,
		type UnknownPersonCandidateGroup,
		type UnknownPersonsStats
	} from '$lib/api/faces';

	// --- localStorage keys ---
	const THRESHOLD_KEY = 'unlabeledGroups.threshold';
	const PAGE_KEY = 'unlabeledGroups.page';

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

	// Stats
	let stats = $state.raw<UnknownPersonsStats | null>(null);

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
			pollJobProgress(result.jobId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to start discovery';
			isDiscovering = false;
		}
	}

	let pollIntervalId: ReturnType<typeof setInterval> | null = null;

	function pollJobProgress(jobId: string) {
		pollIntervalId = setInterval(async () => {
			try {
				const progressResp = await fetch(toAbsoluteUrl(`/api/v1/jobs/${jobId}/progress`)).then(
					(r) => r.json()
				);

				if (progressResp.phase === 'complete' || progressResp.status === 'completed') {
					if (pollIntervalId) clearInterval(pollIntervalId);
					pollIntervalId = null;
					isDiscovering = false;
					discoveryProgress = null;
					await fetchCandidates();
					// Refresh stats after discovery completes
					getDiscoveryStats()
						.then((s) => (stats = s))
						.catch(() => {});
				} else if (progressResp.status === 'error' || progressResp.status === 'failed') {
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
		getDiscoveryStats()
			.then((s) => (stats = s))
			.catch(() => {});
	});

	onDestroy(() => {
		if (pollIntervalId) clearInterval(pollIntervalId);
		if (fetchTimeout) clearTimeout(fetchTimeout);
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
			<h2 class="text-lg font-semibold">Suggested New Persons</h2>
			{#if stats}
				<p class="text-sm text-muted-foreground">
					{stats.totalUnassignedFaces.toLocaleString()} unassigned faces
					{#if stats.lastDiscoveryAt}
						&middot; Last scan: {new Date(stats.lastDiscoveryAt).toLocaleDateString()}
					{/if}
				</p>
			{/if}
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={handleDiscover} disabled={isDiscovering}>
				{isDiscovering ? 'Discovering...' : 'Discover New Persons'}
			</Button>
			<Button variant="ghost" size="sm" href="/faces/clusters">Advanced Mode</Button>
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

	<!-- Error state -->
	{#if error}
		<div class="rounded-md border-destructive bg-destructive/10 p-3" role="alert">
			<p class="text-sm text-destructive">{error}</p>
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
			<div class="flex items-center justify-center gap-2 py-4">
				<Button size="sm" disabled={page <= 1} onclick={() => (page = Math.max(1, page - 1))}>
					Previous
				</Button>
				<span class="text-sm text-muted-foreground">
					Page {page} of {totalPages}
					({response?.totalGroups ?? 0} groups)
				</span>
				<Button
					size="sm"
					disabled={page >= totalPages}
					onclick={() => (page = Math.min(totalPages, page + 1))}
				>
					Next
				</Button>
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
