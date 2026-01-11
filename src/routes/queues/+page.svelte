<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		getQueuesOverview,
		getWorkers,
		type QueuesOverviewResponse,
		type WorkersResponse
	} from '$lib/api/queues';
	import QueueCard from '$lib/components/queues/QueueCard.svelte';
	import WorkersPanel from '$lib/components/queues/WorkersPanel.svelte';
	import ConnectionIndicator from '$lib/components/queues/ConnectionIndicator.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { onMount, onDestroy } from 'svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/queues/+page', {
		filePath: 'src/routes/queues/+page.svelte'
	});

	let overview = $state<QueuesOverviewResponse | null>(null);
	let workers = $state<WorkersResponse | null>(null);
	let loading = $state(true);
	let error = $state<Error | null>(null);
	let lastUpdated = $state<Date | null>(null);

	const POLL_INTERVAL_MS = 3000;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchData() {
		try {
			const [overviewData, workersData] = await Promise.all([getQueuesOverview(), getWorkers()]);
			overview = overviewData;
			workers = workersData;
			error = null;
			lastUpdated = new Date();
		} catch (e) {
			error = e instanceof Error ? e : new Error('Failed to fetch data');
		} finally {
			loading = false;
		}
	}

	function handleRefresh() {
		loading = true;
		fetchData();
	}

	function handleQueueClick(queueName: string) {
		goto(`/queues/${encodeURIComponent(queueName)}`);
	}

	function formatLastUpdated(date: Date | null): string {
		if (!date) return '';
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 5) return 'just now';
		return `${seconds}s ago`;
	}

	$effect(() => {
		// Initial fetch
		fetchData();

		// Start polling
		pollingInterval = setInterval(() => {
			fetchData();
		}, POLL_INTERVAL_MS);

		// Cleanup on destroy (clear interval and component tracking)
		return () => {
			if (pollingInterval) {
				clearInterval(pollingInterval);
			}
			cleanup();
		};
	});
</script>

<svelte:head>
	<title>Queue Monitoring | Image Search</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<div class="header-left">
			<h1>Queue Monitoring</h1>
			{#if overview}
				<ConnectionIndicator connected={overview.redisConnected} />
			{/if}
		</div>
		<div class="header-right">
			{#if lastUpdated}
				<span class="last-updated">Updated {formatLastUpdated(lastUpdated)}</span>
			{/if}
			<button class="refresh-btn" onclick={handleRefresh} disabled={loading}>
				{loading ? 'Refreshing...' : 'Refresh'}
			</button>
		</div>
	</header>

	{#if error}
		<div class="error-banner" role="alert">
			<span>{error.message}</span>
			<button onclick={handleRefresh}>Retry</button>
		</div>
	{/if}

	{#if loading}
		<div class="stats-bar">
			{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
				<div class="stat">
					<Skeleton class="h-8 w-16 mb-1" />
					<Skeleton class="h-4 w-20" />
				</div>
			{/each}
		</div>

		<section class="section">
			<h2>Queues</h2>
			<div class="queues-grid">
				{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
					<div class="skeleton-queue-card">
						<Skeleton class="h-32 w-full rounded-lg" />
					</div>
				{/each}
			</div>
		</section>
	{:else if overview}
		<div class="stats-bar">
			<div class="stat">
				<span class="stat-value">{overview.totalJobs}</span>
				<span class="stat-label">Total Jobs</span>
			</div>
			<div class="stat">
				<span class="stat-value">{overview.totalWorkers}</span>
				<span class="stat-label">Workers</span>
			</div>
			<div class="stat">
				<span class="stat-value busy">{overview.workersBusy}</span>
				<span class="stat-label">Busy</span>
			</div>
			<div class="stat">
				<span class="stat-value idle">{overview.totalWorkers - overview.workersBusy}</span>
				<span class="stat-label">Idle</span>
			</div>
		</div>

		<section class="section">
			<h2>Queues</h2>
			<div class="queues-grid">
				{#each overview.queues as queue}
					<QueueCard {queue} onClick={() => handleQueueClick(queue.name)} />
				{/each}
			</div>
		</section>
	{/if}

	{#if workers}
		<section class="section">
			<WorkersPanel
				workers={workers.workers}
				total={workers.total}
				active={workers.active}
				idle={workers.idle}
				{loading}
			/>
		</section>
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
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.header-left h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
	}
	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.last-updated {
		font-size: 0.875rem;
		color: #6b7280;
	}
	.refresh-btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		color: #374151;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.refresh-btn:hover:not(:disabled) {
		background: #f3f4f6;
		border-color: #9ca3af;
	}
	.refresh-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.stats-bar .stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}
	.stats-bar .stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}
	.stats-bar .stat-value.busy {
		color: #3b82f6;
	}
	.stats-bar .stat-value.idle {
		color: #10b981;
	}
	.stats-bar .stat-label {
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
	.queues-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}
	.loading {
		padding: 3rem;
		text-align: center;
		color: #6b7280;
	}
	@media (max-width: 640px) {
		.stats-bar {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
