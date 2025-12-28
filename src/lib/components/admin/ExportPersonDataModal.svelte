<script lang="ts">
	import { exportPersonMetadata, type PersonMetadataExport } from '$lib/api/admin';

	interface Props {
		open: boolean;
		onClose: () => void;
		onSuccess: (result: PersonMetadataExport) => void;
	}

	let { open, onClose, onSuccess }: Props = $props();

	let maxFacesPerPerson = $state(100);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let isValidInput = $derived(maxFacesPerPerson >= 1 && maxFacesPerPerson <= 500);

	function downloadJson(data: unknown, filename: string): void {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function handleExport() {
		if (!isValidInput) return;

		loading = true;
		error = null;
		try {
			const result = await exportPersonMetadata(maxFacesPerPerson);

			// Trigger file download
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const filename = `person-metadata-${timestamp}.json`;
			downloadJson(result, filename);

			// Notify parent
			onSuccess(result);
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		if (loading) return;
		error = null;
		onClose();
	}
</script>

{#if open}
	<div
		class="modal-overlay"
		onclick={handleCancel}
		onkeydown={(e) => e.key === 'Escape' && handleCancel()}
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
				<h2>Export Person Data</h2>
				<button class="close-btn" onclick={handleCancel} disabled={loading}>&times;</button>
			</div>

			<div class="modal-body">
				<div class="info-banner">
					<span class="info-icon">ℹ️</span>
					<div class="info-content">
						<p class="info-title">Export Person-to-Face Mappings</p>
						<p class="info-text">
							This will export all persons and their associated face-to-image mappings as a JSON
							file. The export includes:
						</p>
						<ul class="info-list">
							<li>Person names and statuses</li>
							<li>Face bounding boxes and image paths</li>
							<li>Detection confidence and quality scores</li>
						</ul>
						<p class="info-text">Use this for backup or to migrate data between environments.</p>
					</div>
				</div>

				<div class="form-group">
					<label for="max-faces-input"> Maximum faces per person (1-500): </label>
					<input
						id="max-faces-input"
						type="number"
						bind:value={maxFacesPerPerson}
						class="form-input"
						class:invalid={!isValidInput}
						disabled={loading}
						min="1"
						max="500"
						step="1"
					/>
					{#if !isValidInput}
						<p class="validation-error">Must be between 1 and 500</p>
					{/if}
					<p class="help-text">
						Limits the number of face mappings exported per person. Default is 100.
					</p>
				</div>

				{#if error}
					<div class="error-message" role="alert">
						<strong>Error:</strong>
						{error}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={handleCancel} disabled={loading}>
					Cancel
				</button>
				<button class="btn btn-primary" onclick={handleExport} disabled={loading || !isValidInput}>
					{loading ? 'Exporting...' : 'Export'}
				</button>
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
		max-width: 600px;
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

	.info-banner {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background-color: #eff6ff;
		border: 2px solid #3b82f6;
		border-radius: 6px;
		margin-bottom: 1.5rem;
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
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #1e3a8a;
		line-height: 1.5;
	}

	.info-list {
		margin: 0.5rem 0;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: #1e3a8a;
		line-height: 1.6;
	}

	.info-list li {
		margin-bottom: 0.25rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.form-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #1f2937;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-input.invalid {
		border-color: #dc2626;
	}

	.form-input.invalid:focus {
		border-color: #dc2626;
		box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
	}

	.validation-error {
		margin: 0.5rem 0 0 0;
		font-size: 0.8rem;
		color: #dc2626;
		font-weight: 500;
	}

	.help-text {
		margin: 0.5rem 0 0 0;
		font-size: 0.8rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.error-message {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background-color: #fee2e2;
		color: #991b1b;
		border-radius: 6px;
		font-size: 0.875rem;
		border-left: 4px solid #dc2626;
	}

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

		.modal-footer {
			flex-direction: column-reverse;
		}

		.btn {
			width: 100%;
		}
	}
</style>
