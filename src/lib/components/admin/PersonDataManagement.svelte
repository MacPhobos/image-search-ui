<script lang="ts">
	import ExportPersonDataModal from './ExportPersonDataModal.svelte';
	import ImportPersonDataModal from './ImportPersonDataModal.svelte';
	import type { PersonMetadataExport, ImportResponse } from '$lib/api/admin';

	let showExportModal = $state(false);
	let showImportModal = $state(false);
	let lastExportResult = $state<PersonMetadataExport | null>(null);
	let lastImportResult = $state<ImportResponse | null>(null);
	let showSuccessMessage = $state(false);
	let successType = $state<'export' | 'import' | null>(null);

	function handleExportClick() {
		showExportModal = true;
	}

	function handleImportClick() {
		showImportModal = true;
	}

	function handleExportSuccess(result: PersonMetadataExport) {
		lastExportResult = result;
		showExportModal = false;
		successType = 'export';
		showSuccessMessage = true;

		// Auto-hide success message after 10 seconds
		setTimeout(() => {
			showSuccessMessage = false;
		}, 10000);
	}

	function handleImportSuccess(result: ImportResponse) {
		lastImportResult = result;
		showImportModal = false;
		successType = 'import';
		showSuccessMessage = true;

		// Auto-hide success message after 10 seconds
		setTimeout(() => {
			showSuccessMessage = false;
		}, 10000);
	}

	function handleExportCancel() {
		showExportModal = false;
	}

	function handleImportCancel() {
		showImportModal = false;
	}

	function formatTimestamp(timestamp: string): string {
		return new Date(timestamp).toLocaleString();
	}
</script>

<section class="person-data-management">
	<div class="section-header">
		<h2>Person Data Management</h2>
		<p class="section-description">
			Export and import person-to-face mappings for backup and migration. These operations allow
			you to preserve manual person labeling and restore it across environments.
		</p>
	</div>

	{#if showSuccessMessage && successType === 'export' && lastExportResult}
		<div class="success-banner" role="alert">
			<div class="success-header">
				<span class="success-icon">✓</span>
				<h3>Export Completed Successfully</h3>
			</div>
			<div class="success-details">
				<p class="success-message">Person metadata has been exported to JSON file.</p>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">Persons Exported:</span>
						<span class="stat-value"
							>{lastExportResult.metadata.totalPersons.toLocaleString()}</span
						>
					</div>
					<div class="stat-item">
						<span class="stat-label">Face Mappings:</span>
						<span class="stat-value"
							>{lastExportResult.metadata.totalFaceMappings.toLocaleString()}</span
						>
					</div>
					<div class="stat-item">
						<span class="stat-label">Format Version:</span>
						<span class="stat-value">{lastExportResult.version}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Exported At:</span>
						<span class="stat-value">{formatTimestamp(lastExportResult.exportedAt)}</span>
					</div>
				</div>
				<button class="dismiss-btn" onclick={() => (showSuccessMessage = false)}>Dismiss</button>
			</div>
		</div>
	{/if}

	{#if showSuccessMessage && successType === 'import' && lastImportResult}
		<div class="success-banner" role="alert">
			<div class="success-header">
				<span class="success-icon">✓</span>
				<h3>Import Completed Successfully</h3>
			</div>
			<div class="success-details">
				<p class="success-message">
					{lastImportResult.dryRun
						? 'Dry run completed. No data was modified.'
						: 'Person metadata has been imported successfully.'}
				</p>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">Persons Created:</span>
						<span class="stat-value">{lastImportResult.personsCreated.toLocaleString()}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Persons Existing:</span>
						<span class="stat-value">{lastImportResult.personsExisting.toLocaleString()}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Faces Matched:</span>
						<span class="stat-value">{lastImportResult.totalFacesMatched.toLocaleString()}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Faces Not Found:</span>
						<span class="stat-value"
							>{lastImportResult.totalFacesNotFound.toLocaleString()}</span
						>
					</div>
					<div class="stat-item">
						<span class="stat-label">Images Missing:</span>
						<span class="stat-value">{lastImportResult.totalImagesMissing.toLocaleString()}</span
						>
					</div>
					<div class="stat-item">
						<span class="stat-label">Completed At:</span>
						<span class="stat-value">{formatTimestamp(lastImportResult.timestamp)}</span>
					</div>
				</div>
				<button class="dismiss-btn" onclick={() => (showSuccessMessage = false)}>Dismiss</button>
			</div>
		</div>
	{/if}

	<div class="action-group">
		<div class="action-item">
			<div class="action-info">
				<h4>Export Person Data</h4>
				<p>Export all persons and their face-to-image mappings to a JSON file for backup.</p>
				<ul class="details-list">
					<li>Exports all labeled persons with their names and status</li>
					<li>Includes face bounding boxes and image references</li>
					<li>Download as JSON file for version control or migration</li>
					<li>Safe operation (read-only, no data modification)</li>
				</ul>
			</div>
			<button class="btn btn-primary" onclick={handleExportClick}>Export Data</button>
		</div>

		<div class="action-item">
			<div class="action-info">
				<h4>Import Person Data</h4>
				<p>Restore persons and face mappings from a previously exported JSON file.</p>
				<ul class="details-list">
					<li>Recreates persons and links them to detected faces</li>
					<li>Matches faces using bounding box proximity</li>
					<li>Dry run option to preview changes before applying</li>
					<li>Skips missing images or creates new persons as needed</li>
				</ul>
			</div>
			<button class="btn btn-secondary" onclick={handleImportClick}>Import Data</button>
		</div>
	</div>
</section>

<ExportPersonDataModal
	open={showExportModal}
	onClose={handleExportCancel}
	onSuccess={handleExportSuccess}
/>

<ImportPersonDataModal
	open={showImportModal}
	onClose={handleImportCancel}
	onSuccess={handleImportSuccess}
/>

<style>
	.person-data-management {
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

	.action-group {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		border: 2px solid #3b82f6;
		border-radius: 8px;
		padding: 1.5rem;
		background-color: #eff6ff;
	}

	.action-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		background: white;
		border-radius: 6px;
		border: 1px solid #bfdbfe;
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

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		background: #64748b;
		color: white;
	}

	.btn-secondary:hover {
		background: #475569;
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
