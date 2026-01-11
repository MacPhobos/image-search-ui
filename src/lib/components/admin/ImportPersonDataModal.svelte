<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import {
		importPersonMetadata,
		type PersonMetadataExport,
		type ImportResponse
	} from '$lib/api/admin';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		open: boolean;
		onClose: () => void;
		onSuccess: (result: ImportResponse) => void;
	}

	let { open, onClose, onSuccess }: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('ImportPersonDataModal', {
					filePath: 'src/lib/components/admin/ImportPersonDataModal.svelte'
				})
			);
		} else if (trackingCleanup) {
			trackingCleanup();
			trackingCleanup = null;
		}
		return () => {
			if (trackingCleanup) {
				trackingCleanup();
				trackingCleanup = null;
			}
		};
	});

	type Step = 'upload' | 'preview' | 'importing' | 'results';

	let step = $state<Step>('upload');
	let exportData = $state<PersonMetadataExport | null>(null);
	let previewResult = $state<ImportResponse | null>(null);
	let importResult = $state<ImportResponse | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let tolerancePixels = $state(10);
	let skipMissingImages = $state(true);
	let autoIngestImages = $state(true);

	let canProceed = $derived(exportData !== null);
	let fileStats = $derived(
		exportData
			? {
					personsCount: exportData.metadata.totalPersons,
					faceMappingsCount: exportData.metadata.totalFaceMappings,
					exportedAt: new Date(exportData.exportedAt).toLocaleString()
				}
			: null
	);

	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const data = JSON.parse(text) as PersonMetadataExport;

			// Validate structure
			if (!data.version || !data.persons || !Array.isArray(data.persons)) {
				throw new Error('Invalid export file format');
			}

			exportData = data;
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to parse file';
			exportData = null;
		}
	}

	async function handlePreview() {
		if (!exportData) return;

		loading = true;
		error = null;
		try {
			const preview = await importPersonMetadata(exportData, {
				dryRun: true,
				tolerancePixels: tolerancePixels,
				skipMissingImages: skipMissingImages,
				autoIngestImages: autoIngestImages
			});
			previewResult = preview;
			step = 'preview';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to preview import';
		} finally {
			loading = false;
		}
	}

	async function handleImport() {
		if (!exportData) return;

		step = 'importing';
		loading = true;
		error = null;
		try {
			const result = await importPersonMetadata(exportData, {
				dryRun: false,
				tolerancePixels: tolerancePixels,
				skipMissingImages: skipMissingImages,
				autoIngestImages: autoIngestImages
			});
			importResult = result;
			step = 'results';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to import data';
			step = 'preview'; // Go back to preview on error
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		if (loading) return;
		resetState();
		onClose();
	}

	function handleFinish() {
		if (importResult) {
			onSuccess(importResult);
			resetState();
		}
	}

	function resetState() {
		step = 'upload';
		exportData = null;
		previewResult = null;
		importResult = null;
		error = null;
		loading = false;
	}

	function goBackToUpload() {
		if (loading) return;
		step = 'upload';
		previewResult = null;
		error = null;
	}
</script>

{#if open}
	<div
		class="modal-overlay"
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="presentation"
	>
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>Import Person Data</h2>
				<button class="close-btn" onclick={handleClose} disabled={loading}>&times;</button>
			</div>

			<div class="modal-body">
				{#if step === 'upload'}
					<div class="step-content">
						<div class="info-banner">
							<span class="info-icon">ℹ️</span>
							<div class="info-content">
								<p class="info-title">Import Person Metadata</p>
								<p class="info-text">
									Upload a previously exported JSON file to restore person names and face-to-image
									mappings.
								</p>
							</div>
						</div>

						<div class="form-group">
							<label for="file-input">Select export file (.json):</label>
							<input
								id="file-input"
								type="file"
								accept=".json,application/json"
								onchange={handleFileSelect}
								class="form-input-file"
								disabled={loading}
							/>
						</div>

						{#if fileStats}
							<div class="stats-box">
								<h3>File Information</h3>
								<ul class="stats-list">
									<li><strong>Persons:</strong> {fileStats.personsCount}</li>
									<li><strong>Face Mappings:</strong> {fileStats.faceMappingsCount}</li>
									<li><strong>Exported At:</strong> {fileStats.exportedAt}</li>
								</ul>
							</div>
						{/if}

						{#if error}
							<div class="error-message" role="alert">
								<strong>Error:</strong>
								{error}
							</div>
						{/if}
					</div>
				{:else if step === 'preview'}
					<div class="step-content">
						<div class="info-banner">
							<span class="info-icon">🔍</span>
							<div class="info-content">
								<p class="info-title">Preview Import</p>
								<p class="info-text">
									Review the changes before importing. This is a dry-run preview.
								</p>
							</div>
						</div>

						<div class="options-section">
							<h3>Import Options</h3>
							<div class="form-group">
								<label for="tolerance-input">
									Tolerance (pixels): <span class="value-display">{tolerancePixels}px</span>
								</label>
								<input
									id="tolerance-input"
									type="range"
									min="0"
									max="50"
									step="1"
									bind:value={tolerancePixels}
									class="form-range"
									disabled={loading}
								/>
								<p class="input-help">
									Maximum pixel difference allowed when matching face bounding boxes
								</p>
							</div>

							<div class="setting-item">
								<div class="setting-info">
									<Label for="skip-missing-images" class="setting-label">
										Skip faces for missing images
									</Label>
									<p class="setting-description">
										Continue import even if some images are not found in the database
									</p>
								</div>
								<Switch id="skip-missing-images" bind:checked={skipMissingImages} disabled={loading} />
							</div>

							<div class="setting-item">
								<div class="setting-info">
									<Label for="auto-ingest-images" class="setting-label">
										Auto-ingest missing images
									</Label>
									<p class="setting-description">
										Automatically ingest images that exist on the filesystem but are not yet in the
										database. This enables seamless seed data restoration.
									</p>
								</div>
								<Switch id="auto-ingest-images" bind:checked={autoIngestImages} disabled={loading} />
							</div>
						</div>

						{#if previewResult}
							<div class="preview-results">
								<h3>Preview Results</h3>
								<div class="stats-grid">
									<div class="stat-item">
										<span class="stat-label">Persons to Create</span>
										<span class="stat-value">{previewResult.personsCreated}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Existing Persons</span>
										<span class="stat-value">{previewResult.personsExisting}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Faces to Match</span>
										<span class="stat-value success">{previewResult.totalFacesMatched}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Faces Not Found</span>
										<span class="stat-value warning">{previewResult.totalFacesNotFound}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Images Missing</span>
										<span class="stat-value warning">{previewResult.totalImagesMissing}</span>
									</div>
								</div>

								{#if previewResult.errors.length > 0}
									<div class="error-list">
										<h4>Warnings:</h4>
										<ul>
											{#each previewResult.errors as err}
												<li>{err}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/if}

						{#if error}
							<div class="error-message" role="alert">
								<strong>Error:</strong>
								{error}
							</div>
						{/if}
					</div>
				{:else if step === 'importing'}
					<div class="step-content">
						<div class="loading-state">
							<div class="spinner"></div>
							<p>Importing person data...</p>
							<p class="loading-subtext">This may take a few moments.</p>
						</div>
					</div>
				{:else if step === 'results'}
					<div class="step-content">
						{#if importResult}
							<div
								class="result-banner"
								class:success={importResult.success}
								class:error={!importResult.success}
							>
								<span class="result-icon">{importResult.success ? '✅' : '❌'}</span>
								<div class="result-content">
									<p class="result-title">
										{importResult.success ? 'Import Successful' : 'Import Failed'}
									</p>
									<p class="result-text">
										{importResult.success
											? 'Person data has been imported successfully.'
											: 'There were errors during the import process.'}
									</p>
								</div>
							</div>

							<div class="final-results">
								<h3>Import Results</h3>
								<div class="stats-grid">
									<div class="stat-item">
										<span class="stat-label">Persons Created</span>
										<span class="stat-value success">{importResult.personsCreated}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Existing Persons</span>
										<span class="stat-value">{importResult.personsExisting}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Faces Matched</span>
										<span class="stat-value success">{importResult.totalFacesMatched}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Faces Not Found</span>
										<span class="stat-value warning">{importResult.totalFacesNotFound}</span>
									</div>
									<div class="stat-item">
										<span class="stat-label">Images Missing</span>
										<span class="stat-value warning">{importResult.totalImagesMissing}</span>
									</div>
								</div>

								{#if importResult.errors.length > 0}
									<div class="error-list">
										<h4>Errors:</h4>
										<ul>
											{#each importResult.errors as err}
												<li>{err}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				{#if step === 'upload'}
					<button class="btn btn-secondary" onclick={handleClose} disabled={loading}>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={handlePreview} disabled={loading || !canProceed}>
						{loading ? 'Processing...' : 'Next: Preview'}
					</button>
				{:else if step === 'preview'}
					<button class="btn btn-secondary" onclick={goBackToUpload} disabled={loading}>
						Back
					</button>
					<button class="btn btn-primary" onclick={handleImport} disabled={loading}>
						{loading ? 'Importing...' : 'Import'}
					</button>
				{:else if step === 'importing'}
					<!-- No buttons during import -->
				{:else if step === 'results'}
					<button class="btn btn-primary" onclick={handleFinish}>Close</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
		border-radius: 8px;
		max-width: 700px;
		width: 90%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-btn:hover:not(:disabled) {
		background-color: #f3f4f6;
	}

	.close-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal-body {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Info Banner */
	.info-banner {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background-color: #dbeafe;
		border: 2px solid #3b82f6;
		border-radius: 6px;
	}

	.info-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.info-content {
		flex: 1;
	}

	.info-title {
		margin: 0 0 0.5rem 0;
		font-weight: 700;
		font-size: 0.95rem;
		color: #1e40af;
	}

	.info-text {
		margin: 0;
		font-size: 0.875rem;
		color: #1e3a8a;
		line-height: 1.5;
	}

	/* Result Banner */
	.result-banner {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		border-radius: 6px;
		border: 2px solid;
	}

	.result-banner.success {
		background-color: #d1fae5;
		border-color: #10b981;
	}

	.result-banner.error {
		background-color: #fee2e2;
		border-color: #dc2626;
	}

	.result-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.result-content {
		flex: 1;
	}

	.result-title {
		margin: 0 0 0.5rem 0;
		font-weight: 700;
		font-size: 0.95rem;
	}

	.result-banner.success .result-title {
		color: #065f46;
	}

	.result-banner.error .result-title {
		color: #991b1b;
	}

	.result-text {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.result-banner.success .result-text {
		color: #047857;
	}

	.result-banner.error .result-text {
		color: #7f1d1d;
	}

	/* Form Elements */
	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.form-input-file {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #1f2937;
		transition: border-color 0.2s;
		cursor: pointer;
	}

	.form-input-file:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-input-file:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-range {
		width: 100%;
		accent-color: #3b82f6;
	}

	.value-display {
		float: right;
		color: #6b7280;
		font-weight: 500;
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.setting-info {
		flex: 1;
	}

	.setting-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		cursor: pointer;
	}

	.setting-description {
		margin: 0.375rem 0 0 0;
		font-size: 0.8rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.input-help {
		margin: 0.375rem 0 0 0;
		font-size: 0.8rem;
		color: #6b7280;
		line-height: 1.4;
	}

	/* Stats */
	.stats-box {
		padding: 1rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.stats-box h3 {
		margin: 0 0 0.75rem 0;
		font-size: 0.9rem;
		font-weight: 700;
		color: #374151;
	}

	.stats-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stats-list li {
		font-size: 0.875rem;
		color: #4b5563;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		padding: 1rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-value.success {
		color: #10b981;
	}

	.stat-value.warning {
		color: #f59e0b;
	}

	/* Options Section */
	.options-section {
		padding: 1rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.options-section h3 {
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
		font-weight: 700;
		color: #374151;
	}

	/* Preview and Final Results */
	.preview-results,
	.final-results {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.preview-results h3,
	.final-results h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: #374151;
	}

	/* Error List */
	.error-list {
		padding: 1rem;
		background-color: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 6px;
	}

	.error-list h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 700;
		color: #92400e;
	}

	.error-list ul {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.8rem;
		color: #78350f;
		line-height: 1.6;
	}

	.error-list li {
		margin-bottom: 0.25rem;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
	}

	.spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state p {
		margin: 0.25rem 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: #374151;
	}

	.loading-subtext {
		font-size: 0.8rem;
		color: #6b7280;
		font-weight: 400;
	}

	/* Error Message */
	.error-message {
		padding: 0.75rem 1rem;
		background-color: #fee2e2;
		color: #991b1b;
		border-radius: 6px;
		font-size: 0.875rem;
		border-left: 4px solid #dc2626;
	}

	/* Footer */
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #4b5563;
	}

	@media (max-width: 768px) {
		.modal-content {
			max-width: 95%;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.modal-footer {
			flex-direction: column-reverse;
		}

		.btn {
			width: 100%;
		}
	}
</style>
