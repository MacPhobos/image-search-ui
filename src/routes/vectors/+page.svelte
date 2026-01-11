<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DirectoryStatsTable,
		DeleteConfirmationModal,
		RetrainModal,
		DangerZone,
		DeletionLogsTable
	} from '$lib/components/vectors';
	import {
		getDirectoryStats,
		getDeletionLogs,
		deleteVectorsByDirectory,
		retrainDirectory,
		cleanupOrphanVectors,
		resetCollection,
		type DirectoryStats,
		type DeletionLogEntry
	} from '$lib/api/vectors';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/vectors/+page', {
		filePath: 'src/routes/vectors/+page.svelte'
	});

	// State
	let directories = $state<DirectoryStats[]>([]);
	let totalVectors = $state(0);
	let logs = $state<DeletionLogEntry[]>([]);
	let logsTotal = $state(0);
	let loadingStats = $state(true);
	let loadingLogs = $state(true);
	let error = $state<string | null>(null);

	// Modal state
	let showDeleteModal = $state(false);
	let showRetrainModal = $state(false);
	let showOrphanModal = $state(false);
	let showResetModal = $state(false);
	let selectedDirectory = $state<string | null>(null);

	// Pagination
	let logsPage = $state(1);
	const logsPageSize = 10;

	async function loadDirectoryStats() {
		loadingStats = true;
		error = null;
		try {
			const response = await getDirectoryStats();
			directories = response.directories;
			totalVectors = response.totalVectors;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load directory stats';
		} finally {
			loadingStats = false;
		}
	}

	async function loadLogs() {
		loadingLogs = true;
		try {
			const response = await getDeletionLogs(logsPage, logsPageSize);
			logs = response.logs;
			logsTotal = response.total;
		} catch (e) {
			console.error('Failed to load deletion logs:', e);
		} finally {
			loadingLogs = false;
		}
	}

	function handleDeleteClick(pathPrefix: string) {
		selectedDirectory = pathPrefix;
		showDeleteModal = true;
	}

	function handleRetrainClick(pathPrefix: string) {
		selectedDirectory = pathPrefix;
		showRetrainModal = true;
	}

	async function handleDeleteConfirm(reason?: string) {
		if (!selectedDirectory) return;
		await deleteVectorsByDirectory({
			pathPrefix: selectedDirectory,
			deletionReason: reason,
			confirm: true
		});
		showDeleteModal = false;
		selectedDirectory = null;
		await loadDirectoryStats();
		await loadLogs();
	}

	async function handleRetrainConfirm(categoryId: number, reason?: string) {
		if (!selectedDirectory) return;
		await retrainDirectory({
			pathPrefix: selectedDirectory,
			categoryId,
			deletionReason: reason
		});
		showRetrainModal = false;
		selectedDirectory = null;
		await loadDirectoryStats();
		await loadLogs();
	}

	async function handleOrphanCleanup() {
		showOrphanModal = true;
	}

	async function handleOrphanConfirm(reason?: string) {
		await cleanupOrphanVectors({
			confirm: true,
			deletionReason: reason
		});
		showOrphanModal = false;
		await loadDirectoryStats();
		await loadLogs();
	}

	async function handleFullReset() {
		showResetModal = true;
	}

	async function handleResetConfirm(reason?: string) {
		await resetCollection({
			confirm: true,
			confirmationText: 'DELETE ALL VECTORS',
			deletionReason: reason
		});
		showResetModal = false;
		await loadDirectoryStats();
		await loadLogs();
	}

	onMount(() => {
		loadDirectoryStats();
		loadLogs();
		return cleanup;
	});
</script>

<svelte:head>
	<title>Vector Management - Image Search</title>
</svelte:head>

<main class="container">
	<h1>Vector Management</h1>
	<p class="subtitle">Manage Qdrant vector database - delete, retrain, and cleanup operations</p>

	{#if error}
		<div class="error-banner" role="alert">
			{error}
			<button onclick={() => (error = null)}>Dismiss</button>
		</div>
	{/if}

	<section class="stats-section">
		<div class="section-header">
			<h2>Directory Statistics</h2>
			<span class="total-count">Total Vectors: {totalVectors.toLocaleString()}</span>
		</div>
		<DirectoryStatsTable
			{directories}
			loading={loadingStats}
			onDelete={handleDeleteClick}
			onRetrain={handleRetrainClick}
		/>
	</section>

	<DangerZone onOrphanCleanup={handleOrphanCleanup} onFullReset={handleFullReset} />

	<section class="logs-section">
		<h2>Deletion History</h2>
		<DeletionLogsTable {logs} loading={loadingLogs} />
		{#if logsTotal > logsPageSize}
			<div class="pagination">
				<button
					onclick={() => {
						logsPage--;
						loadLogs();
					}}
					disabled={logsPage === 1}>Previous</button
				>
				<span>Page {logsPage} of {Math.ceil(logsTotal / logsPageSize)}</span>
				<button
					onclick={() => {
						logsPage++;
						loadLogs();
					}}
					disabled={logsPage >= Math.ceil(logsTotal / logsPageSize)}>Next</button
				>
			</div>
		{/if}
	</section>
</main>

<!-- Modals -->
{#if showDeleteModal && selectedDirectory}
	<DeleteConfirmationModal
		title="Delete Directory Vectors"
		message="Are you sure you want to delete all vectors for directory: {selectedDirectory}?"
		confirmText="Delete Vectors"
		onConfirm={handleDeleteConfirm}
		onCancel={() => {
			showDeleteModal = false;
			selectedDirectory = null;
		}}
	/>
{/if}

{#if selectedDirectory}
	<RetrainModal
		bind:open={showRetrainModal}
		pathPrefix={selectedDirectory}
		onConfirm={handleRetrainConfirm}
		onCancel={() => {
			showRetrainModal = false;
			selectedDirectory = null;
		}}
	/>
{/if}

{#if showOrphanModal}
	<DeleteConfirmationModal
		title="Cleanup Orphan Vectors"
		message="This will remove all vectors that don't have corresponding database records. This cannot be undone."
		confirmText="Cleanup Orphans"
		onConfirm={handleOrphanConfirm}
		onCancel={() => (showOrphanModal = false)}
	/>
{/if}

{#if showResetModal}
	<DeleteConfirmationModal
		title="Reset Vector Collection"
		message="This will delete ALL vectors from the collection. All images will need to be retrained. This action cannot be undone."
		confirmText="Reset Collection"
		requireInput="DELETE ALL VECTORS"
		onConfirm={handleResetConfirm}
		onCancel={() => (showResetModal = false)}
	/>
{/if}

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		margin: 0 0 0.5rem 0;
		color: #1a1a2e;
	}

	.subtitle {
		color: #666;
		margin-bottom: 2rem;
	}

	.error-banner {
		background: #fee2e2;
		color: #dc2626;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-banner button {
		background: transparent;
		border: 1px solid #dc2626;
		color: #dc2626;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.stats-section,
	.logs-section {
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
	}

	.total-count {
		background: #e0e7ff;
		color: #4338ca;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.logs-section h2 {
		margin-bottom: 1rem;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.pagination button {
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.pagination button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination button:not(:disabled):hover {
		background: #e5e7eb;
	}
</style>
