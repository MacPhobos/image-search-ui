<script lang="ts">
	import { deleteAllData, type DeleteAllDataResponse } from '$lib/api/admin';

	interface Props {
		open: boolean;
		onClose: () => void;
		onSuccess: (response: DeleteAllDataResponse) => void;
	}

	let { open, onClose, onSuccess }: Props = $props();

	const REQUIRED_TEXT = 'DELETE ALL DATA';

	let confirmationText = $state('');
	let reason = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	let canConfirm = $derived(confirmationText === REQUIRED_TEXT);

	async function handleDelete() {
		if (!canConfirm) return;

		loading = true;
		error = null;
		try {
			const response = await deleteAllData({
				confirm: true,
				confirmationText,
				reason: reason || undefined
			});
			onSuccess(response);
			// Reset form
			confirmationText = '';
			reason = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		if (loading) return;
		confirmationText = '';
		reason = '';
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
				<h2>Delete All Application Data</h2>
				<button class="close-btn" onclick={handleCancel} disabled={loading}>&times;</button>
			</div>

			<div class="modal-body">
				<div class="warning-banner">
					<span class="warning-icon">⚠️</span>
					<div class="warning-content">
						<p class="warning-title">Destructive Action - Cannot Be Undone</p>
						<p class="warning-text">
							This will permanently delete ALL application data including:
						</p>
						<ul class="warning-list">
							<li>All vector embeddings in Qdrant (main + faces collections)</li>
							<li>All database records (images, training sessions, categories, etc.)</li>
							<li>All deletion logs and metadata</li>
						</ul>
						<p class="warning-text">
							<strong>Only the database schema will be preserved.</strong>
						</p>
					</div>
				</div>

				<div class="form-group">
					<label for="confirmation-input">
						Type <strong>{REQUIRED_TEXT}</strong> to confirm:
					</label>
					<input
						id="confirmation-input"
						type="text"
						bind:value={confirmationText}
						class="form-input"
						class:invalid={confirmationText && !canConfirm}
						disabled={loading}
						placeholder={REQUIRED_TEXT}
						autocomplete="off"
					/>
					{#if confirmationText && !canConfirm}
						<p class="validation-error">Text must exactly match "{REQUIRED_TEXT}"</p>
					{/if}
				</div>

				<div class="form-group">
					<label for="reason-input">Reason (optional):</label>
					<textarea
						id="reason-input"
						bind:value={reason}
						class="form-textarea"
						disabled={loading}
						rows="3"
						placeholder="Why are you deleting all data? (e.g., Development reset, Testing)"
					></textarea>
				</div>

				{#if error}
					<div class="error-message" role="alert">
						<strong>Error:</strong> {error}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={handleCancel} disabled={loading}>
					Cancel
				</button>
				<button class="btn btn-danger" onclick={handleDelete} disabled={loading || !canConfirm}>
					{loading ? 'Deleting...' : 'Delete All Data'}
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
		color: #dc2626;
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

	.warning-banner {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background-color: #fee2e2;
		border: 2px solid #dc2626;
		border-radius: 6px;
		margin-bottom: 1.5rem;
	}

	.warning-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.warning-content {
		flex: 1;
	}

	.warning-title {
		margin: 0 0 0.5rem 0;
		font-weight: 700;
		font-size: 0.95rem;
		color: #991b1b;
	}

	.warning-text {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #7f1d1d;
		line-height: 1.5;
	}

	.warning-list {
		margin: 0.5rem 0;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: #7f1d1d;
		line-height: 1.6;
	}

	.warning-list li {
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

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #1f2937;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.form-input:focus,
	.form-textarea:focus {
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

	.form-textarea {
		resize: vertical;
		min-height: 4rem;
	}

	.validation-error {
		margin: 0.5rem 0 0 0;
		font-size: 0.8rem;
		color: #dc2626;
		font-weight: 500;
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

	.btn-danger {
		background-color: #dc2626;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #b91c1c;
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
