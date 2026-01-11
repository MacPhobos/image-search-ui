<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import DeleteAllDataModal from './DeleteAllDataModal.svelte';
	import PersonDataManagement from './PersonDataManagement.svelte';
	import type { DeleteAllDataResponse } from '$lib/api/admin';

	// Component tracking (DEV only)
	const cleanup = registerComponent('admin/AdminDataManagement', {
		filePath: 'src/lib/components/admin/AdminDataManagement.svelte'
	});
	onMount(() => cleanup);

	let showDeleteModal = $state(false);
	let lastDeletionResult = $state<DeleteAllDataResponse | null>(null);
	let showSuccessMessage = $state(false);

	function handleDeleteClick() {
		showDeleteModal = true;
	}

	function handleDeleteSuccess(response: DeleteAllDataResponse) {
		lastDeletionResult = response;
		showDeleteModal = false;
		showSuccessMessage = true;

		// Auto-hide success message after 10 seconds
		setTimeout(() => {
			showSuccessMessage = false;
		}, 10000);
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
	}

	function formatTimestamp(timestamp: string): string {
		return new Date(timestamp).toLocaleString();
	}

	function getTotalVectorsDeleted(collections: Record<string, number> | undefined | null): number {
		if (!collections) return 0;
		return Object.values(collections).reduce((sum, count) => sum + count, 0);
	}

	function getTotalRowsDeleted(tables: Record<string, number> | undefined | null): number {
		if (!tables) return 0;
		return Object.values(tables).reduce((sum, count) => sum + count, 0);
	}
</script>

<section class="data-management">
	<div class="section-header">
		<h2>Data Management</h2>
		<p class="section-description">
			Manage all application data across the system. These operations affect both the vector
			database (Qdrant) and the metadata database (PostgreSQL).
		</p>
	</div>

	{#if showSuccessMessage && lastDeletionResult}
		<div class="success-banner" role="alert">
			<div class="success-header">
				<span class="success-icon">✓</span>
				<h3>Data Deletion Completed Successfully</h3>
			</div>
			<div class="success-details">
				<p class="success-message">{lastDeletionResult.message}</p>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">Vectors Deleted:</span>
						<span class="stat-value"
							>{getTotalVectorsDeleted(
								lastDeletionResult.qdrantCollectionsDeleted
							).toLocaleString()}</span
						>
					</div>
					<div class="stat-item">
						<span class="stat-label">Database Rows Deleted:</span>
						<span class="stat-value"
							>{getTotalRowsDeleted(lastDeletionResult.postgresTruncated).toLocaleString()}</span
						>
					</div>
					<div class="stat-item">
						<span class="stat-label">Schema Preserved:</span>
						<span class="stat-value">{lastDeletionResult.alembicVersionPreserved}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Completed At:</span>
						<span class="stat-value">{formatTimestamp(lastDeletionResult.timestamp)}</span>
					</div>
				</div>
				<button class="dismiss-btn" onclick={() => (showSuccessMessage = false)}>Dismiss</button>
			</div>
		</div>
	{/if}

	<!-- Person Data Management section -->
	<PersonDataManagement />

	<div class="danger-zone">
		<div class="danger-header">
			<h3>Danger Zone</h3>
			<p class="warning">These actions are destructive and cannot be undone.</p>
		</div>

		<div class="action-item">
			<div class="action-info">
				<h4>Delete All Application Data</h4>
				<p>Permanently delete all vectors and database records from the system.</p>
				<ul class="details-list">
					<li>Deletes all vector embeddings (main + faces collections)</li>
					<li>Truncates all database tables (preserves schema)</li>
					<li>Requires typing exact confirmation text</li>
					<li>Use for complete system reset or cleanup</li>
				</ul>
			</div>
			<button class="btn btn-danger" onclick={handleDeleteClick}>Delete All Data</button>
		</div>
	</div>
</section>

<DeleteAllDataModal
	open={showDeleteModal}
	onClose={handleDeleteCancel}
	onSuccess={handleDeleteSuccess}
/>

<style>
	.data-management {
		max-width: 1200px;
	}

	.section-header {
		margin-bottom: 2rem;
	}

	.section-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.section-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.success-banner {
		background-color: #d1fae5;
		border: 2px solid #10b981;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.success-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.success-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background-color: #10b981;
		color: white;
		border-radius: 50%;
		font-weight: 700;
		font-size: 1.25rem;
	}

	.success-header h3 {
		margin: 0;
		font-size: 1.125rem;
		color: #065f46;
	}

	.success-details {
		margin-left: 2.75rem;
	}

	.success-message {
		margin: 0 0 1rem 0;
		color: #047857;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.8rem;
		color: #065f46;
		font-weight: 600;
	}

	.stat-value {
		font-size: 0.9rem;
		color: #047857;
		font-family: monospace;
	}

	.dismiss-btn {
		padding: 0.5rem 1rem;
		background-color: #10b981;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.dismiss-btn:hover {
		background-color: #059669;
	}

	.danger-zone {
		border: 2px solid #ef4444;
		border-radius: 8px;
		padding: 1.5rem;
		background-color: #fef2f2;
	}

	.danger-header {
		margin-bottom: 1.5rem;
	}

	.danger-zone h3 {
		color: #dc2626;
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.danger-zone h3::before {
		content: '⚠️';
		font-size: 1.25rem;
	}

	.warning {
		color: #991b1b;
		font-size: 0.875rem;
		margin: 0;
		font-weight: 600;
	}

	.action-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		background: white;
		border-radius: 6px;
		border: 1px solid #fecaca;
		gap: 1.5rem;
	}

	.action-info {
		flex: 1;
	}

	.action-item h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.action-item p {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.5;
	}

	.details-list {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.8rem;
		color: #9ca3af;
		line-height: 1.6;
	}

	.details-list li {
		margin-bottom: 0.25rem;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background: #b91c1c;
	}

	@media (max-width: 768px) {
		.action-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.btn {
			width: 100%;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.success-details {
			margin-left: 0;
		}
	}
</style>
