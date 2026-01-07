<script lang="ts">
	import type { TrainingSession } from '$lib/types';
	import { deleteSession } from '$lib/api/training';
	import StatusBadge from './StatusBadge.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { toast } from 'svelte-sonner';

	interface Props {
		sessions: TrainingSession[];
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
		onSessionDeleted: () => void;
		onCreateSession: () => void;
		loading?: boolean;
	}

	let {
		sessions,
		currentPage,
		totalPages,
		onPageChange,
		onSessionDeleted,
		onCreateSession,
		loading = false
	}: Props = $props();

	let deletingId = $state<number | null>(null);

	async function handleDelete(sessionId: number) {
		if (!confirm('Are you sure you want to delete this training session?')) {
			return;
		}

		deletingId = sessionId;
		try {
			await deleteSession(sessionId);
			onSessionDeleted();
			toast.success('Training session deleted successfully');
		} catch (err) {
			toast.error('Failed to delete session', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			deletingId = null;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}
</script>

<div class="session-list-container">
	<div class="header">
		<h2>Training Sessions</h2>
		<button class="btn-create" onclick={onCreateSession}>Create Session</button>
	</div>

	{#if loading}
		<div class="loading">Loading sessions...</div>
	{:else if sessions.length === 0}
		<div class="empty-state">
			<p>No training sessions found.</p>
			<p>Create a new session to get started.</p>
		</div>
	{:else}
		<div class="sessions-grid">
			{#each sessions as session}
				<div class="session-card">
					<div class="session-header">
						<h3>
							<a href="/training/{session.id}">{session.name}</a>
						</h3>
						<StatusBadge status={session.status} />
					</div>

					<div class="session-info">
						<div class="info-row">
							<span class="info-label">Root Path:</span>
							<span class="info-value">{session.rootPath}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Created:</span>
							<span class="info-value">{formatDate(session.createdAt)}</span>
						</div>
						{#if session.completedAt}
							<div class="info-row">
								<span class="info-label">Completed:</span>
								<span class="info-value">{formatDate(session.completedAt)}</span>
							</div>
						{/if}
					</div>

					{#if session.status === 'running'}
						{@const processed = session.processedImages || 0}
						{@const total = session.totalImages || 0}
						{@const percentage = total > 0 ? Math.round((processed / total) * 100) : 0}
						<div class="progress-section">
							<div class="space-y-1">
								<div class="flex justify-between text-sm text-gray-600">
									<span>Processing</span>
									<span
										>{percentage}% ({processed.toLocaleString()} / {total.toLocaleString()})</span
									>
								</div>
								<Progress value={percentage} max={100} class="h-2" />
							</div>
						</div>
					{/if}

					<div class="session-actions">
						<a href="/training/{session.id}" class="btn-view">View Details</a>
						<button
							class="btn-delete"
							onclick={() => handleDelete(session.id)}
							disabled={deletingId === session.id}
						>
							{deletingId === session.id ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>
			{/each}
		</div>

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
	.session-list-container {
		width: 100%;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.btn-create {
		padding: 0.625rem 1.25rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-create:hover {
		background-color: #2563eb;
	}

	.loading,
	.empty-state {
		padding: 3rem;
		text-align: center;
		color: #6b7280;
		background-color: white;
		border-radius: 8px;
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.sessions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.session-card {
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.session-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.session-header h3 {
		margin: 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.session-header h3 a {
		color: #3b82f6;
		text-decoration: none;
	}

	.session-header h3 a:hover {
		text-decoration: underline;
	}

	.session-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-row {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.info-label {
		color: #6b7280;
		font-weight: 500;
	}

	.info-value {
		color: #1f2937;
		word-break: break-all;
	}

	.progress-section {
		margin-top: 0.5rem;
	}

	.session-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid #f3f4f6;
	}

	.btn-view {
		flex: 1;
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-view:hover {
		background-color: #2563eb;
	}

	.btn-delete {
		padding: 0.5rem 1rem;
		background-color: #dc2626;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-delete:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.btn-delete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 2rem;
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
