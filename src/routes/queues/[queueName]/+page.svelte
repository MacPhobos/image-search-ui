<script lang="ts">
	import { goto } from '$app/navigation';
	import { getQueueDetail, type QueueDetailResponse } from '$lib/api/queues';
	import QueueJobsTable from '$lib/components/queues/QueueJobsTable.svelte';
	import JobStatusBadge from '$lib/components/queues/JobStatusBadge.svelte';

	interface Props {
		data: { queueName: string };
	}

	let { data }: Props = $props();

	let queueDetail = $state<QueueDetailResponse | null>(null);
	let loading = $state(true);
	let error = $state<Error | null>(null);
	let currentPage = $state(1);
	const pageSize = 20;

	const POLL_INTERVAL_MS = 3000;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchQueueDetail(page: number = currentPage) {
		try {
			const detail = await getQueueDetail(data.queueName, page, pageSize);
			queueDetail = detail;
			error = null;
		} catch (e) {
			error = e instanceof Error ? e : new Error('Failed to fetch queue');
		} finally {
			loading = false;
		}
	}

	function handlePageChange(page: number) {
		currentPage = page;
		loading = true;
		fetchQueueDetail(page);
	}

	function handleBack() {
		goto('/queues');
	}

	$effect(() => {
		// Initial fetch
		fetchQueueDetail();

		// Start polling
		pollingInterval = setInterval(() => {
			fetchQueueDetail();
		}, POLL_INTERVAL_MS);

		// Cleanup on destroy
		return () => {
			if (pollingInterval) {
				clearInterval(pollingInterval);
			}
		};
	});
</script>

<svelte:head>
	<title>{data.queueName} | Queue Monitoring</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<button class="back-btn" onclick={handleBack}> ← Back to Queues </button>
		<h1>{data.queueName}</h1>
	</header>

	{#if error}
		<div class="error-banner" role="alert">
			<span>{error.message}</span>
			<button onclick={() => fetchQueueDetail()}>Retry</button>
		</div>
	{/if}

	{#if queueDetail}
		<div class="stats-bar">
			<div class="stat">
				<span class="stat-value">{queueDetail.count}</span>
				<span class="stat-label">Pending</span>
			</div>
			<div class="stat">
				<span class="stat-value started">{queueDetail.startedJobs.length}</span>
				<span class="stat-label">Started</span>
			</div>
			<div class="stat">
				<span class="stat-value failed">{queueDetail.failedJobs.length}</span>
				<span class="stat-label">Failed</span>
			</div>
		</div>

		{#if queueDetail.startedJobs.length > 0}
			<section class="section">
				<h2>Currently Running</h2>
				<div class="running-jobs">
					{#each queueDetail.startedJobs as job}
						<div class="running-job">
							<span class="job-func">{job.funcName.split('.').pop()}</span>
							<JobStatusBadge status={job.status} size="sm" />
							<span class="job-id">{job.id.slice(0, 8)}...</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if queueDetail.failedJobs.length > 0}
			<section class="section">
				<h2>Recent Failures</h2>
				<div class="failed-jobs">
					{#each queueDetail.failedJobs as job}
						<div class="failed-job">
							<div class="job-header">
								<span class="job-func">{job.funcName.split('.').pop()}</span>
								<JobStatusBadge status={job.status} size="sm" />
							</div>
							{#if job.errorMessage}
								<div class="error-msg">{job.errorMessage}</div>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section class="section">
			<h2>Queue Jobs</h2>
			<QueueJobsTable
				jobs={queueDetail.jobs}
				page={currentPage}
				{pageSize}
				hasMore={queueDetail.hasMore}
				totalCount={queueDetail.count}
				{loading}
				onPageChange={handlePageChange}
			/>
		</section>
	{:else if loading}
		<div class="loading">Loading queue details...</div>
	{/if}
</div>

<style>
	.page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
	}
	.page-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.back-btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		color: #374151;
		cursor: pointer;
	}
	.back-btn:hover {
		background: #f3f4f6;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
		font-family: monospace;
	}
	.error-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		margin-bottom: 1.5rem;
		background: #fee2e2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		color: #991b1b;
	}
	.error-banner button {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		border: 1px solid #fecaca;
		border-radius: 0.25rem;
		background: white;
		color: #991b1b;
		cursor: pointer;
	}
	.stats-bar {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}
	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}
	.stat-value.started {
		color: #3b82f6;
	}
	.stat-value.failed {
		color: #dc2626;
	}
	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}
	.section {
		margin-bottom: 1.5rem;
	}
	.section h2 {
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 1rem 0;
	}
	.running-jobs,
	.failed-jobs {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.running-job {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 0.375rem;
	}
	.failed-job {
		padding: 0.75rem 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.375rem;
	}
	.job-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.job-func {
		font-family: monospace;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}
	.job-id {
		font-family: monospace;
		font-size: 0.75rem;
		color: #6b7280;
	}
	.error-msg {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: #991b1b;
		font-family: monospace;
	}
	.loading {
		padding: 3rem;
		text-align: center;
		color: #6b7280;
	}
</style>
