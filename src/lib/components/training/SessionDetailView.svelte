<script lang="ts">
	import { untrack } from 'svelte';
	import type { TrainingSession, TrainingProgress, TrainingJob } from '$lib/types';
	import { getProgress, listJobs } from '$lib/api/training';
	import type { FaceDetectionSession } from '$lib/api/faces';
	import { listFaceDetectionSessions } from '$lib/api/faces';
	import FaceDetectionSessionCard from '../faces/FaceDetectionSessionCard.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import ETADisplay from './ETADisplay.svelte';
	import TrainingStats from './TrainingStats.svelte';
	import TrainingControlPanel from './TrainingControlPanel.svelte';
	import JobsTable from './JobsTable.svelte';

	interface Props {
		session: TrainingSession;
		onSessionUpdate: () => void;
	}

	let { session, onSessionUpdate }: Props = $props();

	let progress = $state<TrainingProgress | null>(null);
	let jobs = $state<TrainingJob[]>([]);
	let jobsPage = $state(1);
	let jobsTotal = $state(0);
	let jobsPageSize = $state(20);
	let loadingProgress = $state(false);
	let loadingJobs = $state(false);
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let initialLoadDone = $state(false);
	let faceSession = $state<FaceDetectionSession | null>(null);
	let loadingFaceSession = $state(false);

	const jobsTotalPages = $derived(Math.ceil(jobsTotal / jobsPageSize));

	async function fetchProgress() {
		if (loadingProgress || !session?.id) return; // Guard against concurrent calls and undefined session
		loadingProgress = true;
		try {
			progress = await getProgress(session.id);
		} catch (err) {
			console.error('Failed to fetch progress:', err);
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

	async function fetchFaceSession() {
		if (loadingFaceSession || !session?.id) return;
		loadingFaceSession = true;
		try {
			const response = await listFaceDetectionSessions(1, 10);
			// Find session linked to this training session
			faceSession = response.items.find((s) => s.trainingSessionId === session.id) ?? null;
		} catch (err) {
			console.error('Failed to fetch face detection session:', err);
			faceSession = null;
		} finally {
			loadingFaceSession = false;
		}
	}

	function startPolling() {
		stopPolling(); // Clear any existing interval first
		pollingInterval = setInterval(() => {
			untrack(() => fetchProgress());
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
		await fetchProgress();
		await fetchJobs(); // Also refresh jobs after status change
	}

	// Load initial data only once when session.id is available
	$effect(() => {
		if (!initialLoadDone && session?.id) {
			initialLoadDone = true;
			untrack(() => {
				fetchProgress();
				fetchJobs();
				fetchFaceSession();
			});
		}
	});

	// Load face session when training completes
	$effect(() => {
		if (session?.status === 'completed') {
			untrack(() => fetchFaceSession());
		}
	});

	// Start/stop polling based on session status
	$effect(() => {
		const status = session?.status;

		untrack(() => {
			if (status === 'running' && session?.id) {
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

	{#if progress}
		{@const current = progress.progress.current}
		{@const total = progress.progress.total}
		{@const percentage = total > 0 ? Math.round((current / total) * 100) : 0}
		<section class="progress-section">
			<h2>Progress</h2>
			<div class="space-y-1 mb-4">
				<div class="flex justify-between text-sm text-gray-600">
					<span>Processing Images</span>
					<span>{percentage}% ({current.toLocaleString()} / {total.toLocaleString()})</span>
				</div>
				<Progress value={percentage} max={100} class="h-2" />
			</div>
			{#if progress.progress.etaSeconds}
				<ETADisplay
					eta={new Date(Date.now() + progress.progress.etaSeconds * 1000).toISOString()}
				/>
			{/if}
			<TrainingStats stats={progress.progress} />
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

	{#if faceSession}
		<section class="face-detection-section">
			<h2>Face Detection</h2>
			<FaceDetectionSessionCard session={faceSession} onUpdate={fetchFaceSession} />
		</section>
	{/if}

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
	.jobs-section,
	.face-detection-section {
		background-color: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.progress-section h2,
	.jobs-section h2,
	.face-detection-section h2 {
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
