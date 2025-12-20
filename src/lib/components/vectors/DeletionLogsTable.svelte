<script lang="ts">
	import type { DeletionLogEntry } from '$lib/api/vectors';

	interface Props {
		logs: DeletionLogEntry[];
		loading?: boolean;
	}

	let { logs, loading = false }: Props = $props();

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getTypeColor(type: string): string {
		const colors: Record<string, string> = {
			DIRECTORY: '#3b82f6',
			SESSION: '#10b981',
			CATEGORY: '#8b5cf6',
			ASSET: '#f59e0b',
			ORPHAN: '#ef4444',
			FULL_RESET: '#dc2626'
		};
		return colors[type] || '#6b7280';
	}

	function getTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			DIRECTORY: 'Directory',
			SESSION: 'Session',
			CATEGORY: 'Category',
			ASSET: 'Asset',
			ORPHAN: 'Orphan',
			FULL_RESET: 'Full Reset'
		};
		return labels[type] || type;
	}
</script>

<div class="table-container">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading deletion logs...</p>
		</div>
	{:else if logs.length === 0}
		<div class="empty-state">
			<p>No deletion history found.</p>
		</div>
	{:else}
		<table class="logs-table">
			<thead>
				<tr>
					<th>Type</th>
					<th>Target</th>
					<th>Count</th>
					<th>Reason</th>
					<th>Date</th>
				</tr>
			</thead>
			<tbody>
				{#each logs as log (log.id)}
					<tr>
						<td class="type-cell">
							<span class="type-badge" style="background-color: {getTypeColor(log.deletionType)}">
								{getTypeLabel(log.deletionType)}
							</span>
						</td>
						<td class="target-cell" title={log.deletionTarget}>
							{log.deletionTarget}
						</td>
						<td class="count-cell">
							{log.vectorCount.toLocaleString()}
						</td>
						<td class="reason-cell">
							{log.deletionReason || '-'}
						</td>
						<td class="date-cell">
							{formatDate(log.createdAt)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.table-container {
		width: 100%;
		overflow-x: auto;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		color: #6b7280;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.logs-table {
		width: 100%;
		border-collapse: collapse;
	}

	.logs-table thead {
		background-color: #f9fafb;
		border-bottom: 2px solid #e5e7eb;
	}

	.logs-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.logs-table tbody tr {
		border-bottom: 1px solid #e5e7eb;
		transition: background-color 0.15s;
	}

	.logs-table tbody tr:hover {
		background-color: #f9fafb;
	}

	.logs-table td {
		padding: 1rem;
		font-size: 0.875rem;
		color: #1f2937;
	}

	.type-cell {
		width: 120px;
	}

	.type-badge {
		display: inline-block;
		padding: 0.25rem 0.625rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.target-cell {
		max-width: 250px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.8rem;
	}

	.count-cell {
		font-weight: 600;
		color: #ef4444;
		text-align: right;
		width: 100px;
	}

	.reason-cell {
		color: #6b7280;
		font-style: italic;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.date-cell {
		color: #6b7280;
		font-size: 0.8rem;
		white-space: nowrap;
		width: 150px;
	}
</style>
