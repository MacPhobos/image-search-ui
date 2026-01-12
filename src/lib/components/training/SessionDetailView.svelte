<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import type { TrainingSession, TrainingJob } from '$lib/types';
	import { getUnifiedProgress, listJobs } from '$lib/api/training';
	import type { components } from '$lib/api/generated';
	import StatusBadge from './StatusBadge.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import ETADisplay from './ETADisplay.svelte';
	import TrainingStats from './TrainingStats.svelte';
	import TrainingControlPanel from './TrainingControlPanel.svelte';
	import JobsTable from './JobsTable.svelte';
	import PhaseProgressBar from './PhaseProgressBar.svelte';

	type UnifiedProgressResponse = components['schemas']['UnifiedProgressResponse'];

	// Component tracking (DEV only)
	const cleanup = registerComponent('training/SessionDetailView', {
		filePath: 'src/lib/components/training/SessionDetailView.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		session: TrainingSession;
		onSessionUpdate: () => void;
	}

	let { session, onSessionUpdate }: Props = $props();

	let unifiedProgress = $state<UnifiedProgressResponse | null>(null);
	let jobs = $state<TrainingJob[]>([]);
	let jobsPage = $state(1);
	let jobsTotal = $state(0);
	let jobsPageSize = $state(20);
	let loadingProgress = $state(false);
	let loadingJobs = $state(false);
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let initialLoadDone = $state(false);

	const jobsTotalPages = $derived(Math.ceil(jobsTotal / jobsPageSize));

	async function fetchUnifiedProgress() {
		if (loadingProgress || !session?.id) return; // Guard against concurrent calls and undefined session
		loadingProgress = true;
		try {
			unifiedProgress = await getUnifiedProgress(session.id);
		} catch (err) {
			console.error('Failed to fetch unified progress:', err);
		} finally {
			loadingProgress = false;
		}
	}

	async function fetchJobs() {
		if (loadingJobs || !session?.id) return; // Guard against concurrent calls and undefined session
		loadingJobs = true;
		try {
			const response = await listJobs(session.id, jobsPage, jobsPageSize);
			jobs = response.items;
			jobsTotal = response.total;
		} catch (err) {
			console.error('Failed to fetch jobs:', err);
			jobs = [];
		} finally {
			loadingJobs = false;
		}
	}

	function startPolling() {
		stopPolling(); // Clear any existing interval first
		pollingInterval = setInterval(() => {
			untrack(() => {
				fetchUnifiedProgress();
			});
		}, 2000);
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	function handleJobsPageChange(page: number) {
		jobsPage = page;
		fetchJobs();
	}

	async function handleStatusChange() {
		await onSessionUpdate();
		await fetchUnifiedProgress();
		await fetchJobs(); // Also refresh jobs after status change
	}

	// Load initial data only once when session.id is available
	$effect(() => {
		if (!initialLoadDone && session?.id) {
			initialLoadDone = true;
			untrack(() => {
				fetchUnifiedProgress();
				fetchJobs();
			});
		}
	});

	// Start/stop polling based on overall status
	$effect(() => {
		const overallStatus = unifiedProgress?.overallStatus;

		untrack(() => {
			// Keep polling while any phase is running
			if (overallStatus === 'running' && session?.id) {
				startPolling();
			} else {
				stopPolling();
			}
		});

		// Cleanup on component destroy
		return () => stopPolling();
	});

	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return date.toLocaleString();
	}
</script>

<div class="session-detail">
	<div class="detail-header">
		<div class="header-top">
			<h1>{session.name}</h1>
			<StatusBadge status={session.status} size="lg" />
		</div>
		<div class="header-info">
			<div class="info-item">
				<span class="info-label">Root Path:</span>
				<span class="info-value">{session.rootPath}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Created:</span>
				<span class="info-value">{formatDate(session.createdAt)}</span>
			</div>
			{#if session.completedAt}
				<div class="info-item">
					<span class="info-label">Completed:</span>
					<span class="info-value">{formatDate(session.completedAt)}</span>
				</div>
			{/if}
		</div>
	</div>

	<TrainingControlPanel
		sessionId={session.id}
		status={session.status}
		onStatusChange={handleStatusChange}
	/>

	{#if unifiedProgress}
		{@const overall = unifiedProgress.overallProgress}
		{@const trainingPhase = unifiedProgress.phases.training}
		{@const facePhase = unifiedProgress.phases.face_detection}
		{@const clusterPhase = unifiedProgress.phases.clustering}

		<section class="progress-section">
			<h2>Overall Progress</h2>
			<div class="space-y-1 mb-4">
				<div class="flex justify-between text-sm text-gray-600">
					<span>
						{#if overall.currentPhase === 'training'}
							🎨 Training - Generating CLIP Embeddings
						{:else if overall.currentPhase === 'face_detection'}
							😊 Face Detection - Analyzing Faces
						{:else if overall.currentPhase === 'clustering'}
							🔗 Clustering - Grouping Similar Faces
						{:else if overall.currentPhase === 'completed'}
							✓ All Phases Complete
						{:else}
							Processing
						{/if}
					</span>
					<span class="font-semibold">{overall.percentage.toFixed(1)}%</span>
				</div>
				<Progress value={overall.percentage} max={100} class="h-2" />
			</div>

			{#if overall.etaSeconds}
				<ETADisplay eta={new Date(Date.now() + overall.etaSeconds * 1000).toISOString()} />
			{/if}

			<!-- Phase breakdown (collapsible details) -->
			<details class="mt-4">
				<summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
					View Phase Details
				</summary>
				<div class="mt-2 space-y-2 text-sm">
					<PhaseProgressBar phase={trainingPhase} label="Training (CLIP)" icon="🎨" />
					<PhaseProgressBar phase={facePhase} label="Face Detection" icon="😊" />
					<PhaseProgressBar phase={clusterPhase} label="Clustering" icon="🔗" />
				</div>
			</details>

			{#if trainingPhase.progress}
				<div class="mt-4">
					<TrainingStats stats={trainingPhase.progress} />
				</div>
			{/if}
		</section>
	{/if}

	<section class="jobs-section">
		<h2>Training Jobs</h2>
		<JobsTable
			{jobs}
			currentPage={jobsPage}
			totalPages={jobsTotalPages}
			onPageChange={handleJobsPageChange}
			loading={loadingJobs}
		/>
	</section>

	<div class="actions-footer">
		<a href="/training" class="btn-back">← Back to Sessions</a>
	</div>
</div>

<style>
	.session-detail {
		width: 100%;
	}

	.detail-header {
		background-color: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.header-top h1 {
		margin: 0;
		font-size: 1.75rem;
		color: #1f2937;
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-item {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.info-label {
		color: #6b7280;
		font-weight: 600;
		min-width: 100px;
	}

	.info-value {
		color: #1f2937;
		word-break: break-all;
	}

	.progress-section,
	.jobs-section {
		background-color: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.progress-section h2,
	.jobs-section h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.actions-footer {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn-back {
		display: inline-flex;
		align-items: center;
		padding: 0.625rem 1.25rem;
		background-color: #6b7280;
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		transition: background-color 0.2s;
	}

	.btn-back:hover {
		background-color: #4b5563;
	}
</style>
