<script lang="ts">
	import type { DirectoryStats } from '$lib/api/vectors';

	interface Props {
		directories: DirectoryStats[];
		loading?: boolean;
		onDelete: (pathPrefix: string) => void;
		onRetrain: (pathPrefix: string) => void;
	}

	let { directories, loading = false, onDelete, onRetrain }: Props = $props();

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPath(path: string): string {
		// Extract meaningful part of path
		const parts = path.split('/');
		return parts.slice(-3).join('/');
	}
</script>

<div class="table-container">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading directory statistics...</p>
		</div>
	{:else if directories.length === 0}
		<div class="empty-state">
			<p>No directories with vectors found.</p>
		</div>
	{:else}
		<table class="stats-table">
			<thead>
				<tr>
					<th>Directory</th>
					<th>Vector Count</th>
					<th>Last Indexed</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each directories as dir (dir.pathPrefix)}
					<tr>
						<td class="path-cell" title={dir.pathPrefix}>
							{formatPath(dir.pathPrefix)}
						</td>
						<td class="count-cell">
							{dir.vectorCount.toLocaleString()}
						</td>
						<td class="date-cell">
							{formatDate(dir.lastIndexed)}
						</td>
						<td class="actions-cell">
							<button
								class="btn btn-warning"
								onclick={() => onRetrain(dir.pathPrefix)}
								title="Delete vectors and create new training session"
							>
								Retrain
							</button>
							<button
								class="btn btn-danger"
								onclick={() => onDelete(dir.pathPrefix)}
								title="Delete all vectors for this directory"
							>
								Delete
							</button>
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

	.stats-table {
		width: 100%;
		border-collapse: collapse;
	}

	.stats-table thead {
		background-color: #f9fafb;
		border-bottom: 2px solid #e5e7eb;
	}

	.stats-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stats-table tbody tr {
		border-bottom: 1px solid #e5e7eb;
		transition: background-color 0.15s;
	}

	.stats-table tbody tr:hover {
		background-color: #f9fafb;
	}

	.stats-table td {
		padding: 1rem;
		font-size: 0.875rem;
		color: #1f2937;
	}

	.path-cell {
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.8rem;
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count-cell {
		font-weight: 600;
		color: #3b82f6;
	}

	.date-cell {
		color: #6b7280;
		font-size: 0.8rem;
	}

	.actions-cell {
		display: flex;
		gap: 0.5rem;
	}

	.btn {
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.btn-warning {
		background-color: #f59e0b;
		color: white;
	}

	.btn-warning:hover {
		background-color: #d97706;
	}

	.btn-danger {
		background-color: #ef4444;
		color: white;
	}

	.btn-danger:hover {
		background-color: #dc2626;
	}
</style>
