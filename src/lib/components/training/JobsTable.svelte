<script lang="ts">
	import type { TrainingJob } from '$lib/types';
	import StatusBadge from './StatusBadge.svelte';

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
		<table class="jobs-table">
			<thead>
				<tr>
					<th>Job ID</th>
					<th>Asset ID</th>
					<th>Status</th>
					<th>Progress</th>
					<th>Duration</th>
					<th>Completed At</th>
					<th>Error</th>
				</tr>
			</thead>
			<tbody>
				{#each jobs as job}
					<tr>
						<td>{job.id}</td>
						<td>{job.assetId}</td>
						<td>
							<StatusBadge status={job.status} size="sm" />
						</td>
						<td>{job.progress}%</td>
						<td>{formatDuration(job.processingTimeMs)}</td>
						<td>{formatTimestamp(job.completedAt)}</td>
						<td class="error-cell">
							{#if job.errorMessage}
								<span class="error-text" title={job.errorMessage}>
									{job.errorMessage.length > 50
										? job.errorMessage.substring(0, 50) + '...'
										: job.errorMessage}
								</span>
							{:else}
								-
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if totalPages > 1}
			<div class="pagination">
				<button
					class="pagination-btn"
					onclick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
				>
					Previous
				</button>
				<span class="pagination-info">
					Page {currentPage} of {totalPages}
				</span>
				<button
					class="pagination-btn"
					onclick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next
				</button>
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

	.jobs-table {
		width: 100%;
		border-collapse: collapse;
	}

	.jobs-table thead {
		background-color: #f9fafb;
	}

	.jobs-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		color: #4b5563;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 2px solid #e5e7eb;
	}

	.jobs-table td {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: #1f2937;
		border-bottom: 1px solid #f3f4f6;
	}

	.jobs-table tbody tr:hover {
		background-color: #f9fafb;
	}

	.error-cell {
		max-width: 200px;
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

	.pagination-btn {
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.pagination-btn:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.pagination-btn:disabled {
		background-color: #d1d5db;
		cursor: not-allowed;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #4b5563;
	}
</style>
