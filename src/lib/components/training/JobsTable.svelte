<script lang="ts">
	import type { TrainingJob } from '$lib/types';
	import StatusBadge from './StatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { Progress } from '$lib/components/ui/progress';

	interface Props {
		jobs: TrainingJob[];
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
		loading?: boolean;
	}

	let { jobs, currentPage, totalPages, onPageChange, loading = false }: Props = $props();

	function formatDuration(milliseconds: number | null | undefined): string {
		if (!milliseconds) return 'N/A';
		const seconds = milliseconds / 1000;
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}m ${secs}s`;
	}

	function formatTimestamp(timestamp: string | null | undefined): string {
		if (!timestamp) return 'N/A';
		const date = new Date(timestamp);
		return date.toLocaleString();
	}
</script>

<div class="jobs-table-container">
	{#if loading}
		<div class="loading">Loading jobs...</div>
	{:else if jobs.length === 0}
		<div class="empty-state">No jobs found.</div>
	{:else}
		<div class="table-wrapper">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Job ID</Table.Head>
						<Table.Head>Asset ID</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Progress</Table.Head>
						<Table.Head>Duration</Table.Head>
						<Table.Head>Completed At</Table.Head>
						<Table.Head>Error</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each jobs as job}
						<Table.Row>
							<Table.Cell>{job.id}</Table.Cell>
							<Table.Cell>{job.assetId}</Table.Cell>
							<Table.Cell>
								<StatusBadge status={job.status} size="sm" />
							</Table.Cell>
							<Table.Cell>
								<div class="space-y-1 min-w-[120px]">
									<div class="flex justify-between text-xs text-gray-600">
										<span>{job.progress}%</span>
									</div>
									<Progress value={job.progress} max={100} class="h-1.5" />
								</div>
							</Table.Cell>
							<Table.Cell>{formatDuration(job.processingTimeMs)}</Table.Cell>
							<Table.Cell>{formatTimestamp(job.completedAt)}</Table.Cell>
							<Table.Cell class="max-w-[200px]">
								{#if job.errorMessage}
									<span class="error-text" title={job.errorMessage}>
										{job.errorMessage.length > 50
											? job.errorMessage.substring(0, 50) + '...'
											: job.errorMessage}
									</span>
								{:else}
									-
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				<Button
					variant="outline"
					size="sm"
					onclick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
				>
					Previous
				</Button>
				<span class="pagination-info">
					Page {currentPage} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.jobs-table-container {
		margin: 1rem 0;
		background-color: white;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.loading,
	.empty-state {
		padding: 2rem;
		text-align: center;
		color: #6b7280;
	}

	.table-wrapper {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	.error-text {
		color: #dc2626;
		font-size: 0.8125rem;
		cursor: help;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #4b5563;
	}
</style>
