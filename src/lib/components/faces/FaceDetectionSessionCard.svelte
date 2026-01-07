<script lang="ts">
	import type { FaceDetectionSession } from '$lib/api/faces';
	import {
		pauseFaceDetectionSession,
		resumeFaceDetectionSession,
		cancelFaceDetectionSession,
		subscribeFaceDetectionProgress
	} from '$lib/api/faces';
	import { Badge } from '$lib/components/ui/badge';
	import type { BadgeVariant } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';

	let { session, onUpdate } = $props<{
		session: FaceDetectionSession;
		onUpdate?: () => void;
	}>();

	let isLoading = $state(false);
	// Note: cleanup is NOT $state - it doesn't need reactivity and making it $state
	// would cause an infinite loop since the effect reads and writes to it
	let cleanup: (() => void) | null = null;

	// Local state for real-time updates (prevents infinite loop)
	let liveSession = $state(session);

	// Sync local state when prop changes (but not during processing to preserve SSE updates)
	$effect(() => {
		if (session.status !== 'processing') {
			liveSession = session;
		}
	});

	// Computed values (use liveSession for real-time reactivity)
	let progress = $derived(liveSession.progressPercent);

	// Map status to Badge variant
	function getStatusVariant(status: string): BadgeVariant {
		switch (status) {
			case 'completed':
				return 'success';
			case 'failed':
				return 'destructive';
			case 'processing':
				return 'default';
			case 'paused':
				return 'warning';
			case 'cancelled':
				return 'secondary';
			case 'pending':
				return 'outline';
			default:
				return 'outline';
		}
	}

	let statusVariant = $derived(getStatusVariant(liveSession.status));

	// Subscribe to SSE when processing (check session prop, mutate liveSession)
	$effect(() => {
		if (session.status === 'processing' && !cleanup) {
			cleanup = subscribeFaceDetectionProgress(
				session.id,
				(data) => {
					// Update liveSession with progress data, mapping snake_case to camelCase for new fields
					liveSession = {
						...liveSession,
						...data,
						// Map new fields if they exist in SSE response
						facesAssignedToPersons:
							data.facesAssignedToPersons ?? liveSession.facesAssignedToPersons,
						clustersCreated: data.clustersCreated ?? liveSession.clustersCreated,
						suggestionsCreated: data.suggestionsCreated ?? liveSession.suggestionsCreated,
						currentBatch: data.currentBatch ?? liveSession.currentBatch,
						totalBatches: data.totalBatches ?? liveSession.totalBatches
					};
				},
				() => {
					// On complete, trigger refresh
					onUpdate?.();
				}
			);
		}

		return () => {
			cleanup?.();
			cleanup = null;
		};
	});

	async function handlePause() {
		isLoading = true;
		try {
			await pauseFaceDetectionSession(session.id);
			onUpdate?.();
		} finally {
			isLoading = false;
		}
	}

	async function handleResume() {
		isLoading = true;
		try {
			await resumeFaceDetectionSession(session.id);
			onUpdate?.();
		} finally {
			isLoading = false;
		}
	}

	async function handleCancel() {
		if (!confirm('Are you sure you want to cancel this session?')) return;
		isLoading = true;
		try {
			await cancelFaceDetectionSession(session.id);
			onUpdate?.();
		} finally {
			isLoading = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleString();
	}
</script>

<div class="bg-white rounded-lg shadow-md p-4 border border-gray-200">
	<!-- Header -->
	<div class="flex justify-between items-center mb-3">
		<h3 class="font-semibold text-gray-800">Face Detection Session</h3>
		<Badge variant={statusVariant}>
			{liveSession.status}
		</Badge>
	</div>

	<!-- Pending State Indicator -->
	{#if liveSession.status === 'pending'}
		<div class="flex items-center gap-2 text-sm text-blue-600 mb-3">
			<div class="relative">
				<div class="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
				<div class="absolute inset-0 h-2 w-2 bg-blue-400 rounded-full animate-ping"></div>
			</div>
			<span>Queued for processing...</span>
		</div>
	{/if}

	<!-- Progress Bar -->
	{#if liveSession.status === 'processing' || liveSession.status === 'paused'}
		<div class="mb-3">
			<div class="space-y-1">
				<div class="flex justify-between text-sm text-gray-500">
					<span
						>{liveSession.processedImages} / {liveSession.totalImages} images ({progress.toFixed(
							1
						)}%)</span
					>
					{#if liveSession.totalBatches && liveSession.totalBatches > 0}
						<span>Batch {liveSession.currentBatch || 0} of {liveSession.totalBatches}</span>
					{/if}
				</div>
				<Progress value={progress} max={100} class="h-2" />
			</div>
		</div>
	{/if}

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
		<div class="flex items-center gap-1">
			<span class="text-gray-500">Faces detected:</span>
			<span class="font-medium">{liveSession.facesDetected}</span>
		</div>

		{#if liveSession.status === 'completed' || liveSession.facesAssignedToPersons !== undefined || liveSession.clustersCreated !== undefined}
			<div class="flex items-center gap-1">
				<span class="text-gray-500">Matched to persons:</span>
				<span class="font-medium text-green-600">{liveSession.facesAssignedToPersons ?? 0}</span>
			</div>

			<div class="flex items-center gap-1">
				<span class="text-gray-500">Clusters created:</span>
				<span class="font-medium text-blue-600">{liveSession.clustersCreated ?? 0}</span>
			</div>

			<div class="flex items-center gap-1">
				<span class="text-gray-500">For review:</span>
				<span class="font-medium text-amber-600">{liveSession.suggestionsCreated ?? 0}</span>
			</div>
		{:else if liveSession.facesAssigned !== undefined}
			<!-- Fallback for old data without breakdown -->
			<div class="flex items-center gap-1">
				<span class="text-gray-500">Organized:</span>
				<span class="font-medium">{liveSession.facesAssigned}</span>
				<span class="text-xs text-gray-400">(persons + clusters)</span>
			</div>
		{/if}

		<div class="flex items-center gap-1">
			<span class="text-gray-500">Failed:</span>
			<span class="font-medium text-red-600">{liveSession.failedImages}</span>
		</div>
		<div class="flex items-center gap-1">
			<span class="text-gray-500">Started:</span>
			<span class="font-medium">{formatDate(liveSession.startedAt)}</span>
		</div>
	</div>

	<!-- Unassigned Count (for completed sessions) -->
	{#if liveSession.status === 'completed'}
		{@const assigned = liveSession.facesAssignedToPersons ?? 0}
		{@const clustered = (liveSession.clustersCreated ?? 0) * 3}
		{@const unassigned = Math.max(0, liveSession.facesDetected - assigned - clustered)}
		{#if unassigned > 0}
			<div class="mt-2 text-sm text-gray-500">
				<span class="text-amber-600 font-medium">{unassigned}</span> faces may need manual review
			</div>
		{/if}
	{/if}

	<!-- Error Message -->
	{#if liveSession.lastError}
		<div class="bg-red-50 border border-red-200 rounded p-2 mb-3">
			<p class="text-sm text-red-700">{liveSession.lastError}</p>
		</div>
	{/if}

	<!-- Post-Completion Action Links -->
	{#if liveSession.status === 'completed'}
		<div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
			{#if (liveSession.clustersCreated ?? 0) > 0}
				<a href="/faces/clusters" class="text-sm text-blue-600 hover:text-blue-800 hover:underline">
					View clusters →
				</a>
			{/if}
			{#if (liveSession.suggestionsCreated ?? 0) > 0}
				<a
					href="/faces/suggestions"
					class="text-sm text-amber-600 hover:text-amber-800 hover:underline"
				>
					Review suggestions →
				</a>
			{/if}
		</div>
	{/if}

	<!-- Actions -->
	{#if liveSession.status === 'processing' || liveSession.status === 'paused'}
		<div class="flex gap-2 mt-4">
			{#if liveSession.status === 'processing'}
				<button
					class="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
					onclick={handlePause}
					disabled={isLoading}
				>
					Pause
				</button>
			{:else if liveSession.status === 'paused'}
				<button
					class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
					onclick={handleResume}
					disabled={isLoading}
				>
					Resume
				</button>
			{/if}
			<button
				class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
				onclick={handleCancel}
				disabled={isLoading}
			>
				Cancel
			</button>
		</div>
	{/if}
</div>
