<script lang="ts">
	interface Props {
		title: string;
		message: string;
		confirmText?: string;
		requireInput?: string; // If set, user must type this text to confirm
		onConfirm: (reason?: string) => Promise<void>;
		onCancel: () => void;
	}

	let {
		title,
		message,
		confirmText = 'Delete',
		requireInput,
		onConfirm,
		onCancel
	}: Props = $props();

	let reason = $state('');
	let inputValue = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	let canConfirm = $derived(requireInput ? inputValue === requireInput : true);

	async function handleConfirm() {
		if (!canConfirm) return;

		loading = true;
		error = null;
		try {
			await onConfirm(reason || undefined);
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<div
	class="modal-overlay"
	onclick={onCancel}
	onkeydown={(e) => e.key === 'Escape' && onCancel()}
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
			<h2>{title}</h2>
			<button class="close-btn" onclick={onCancel}>&times;</button>
		</div>

		<div class="modal-body">
			<p class="message">{message}</p>

			{#if requireInput}
				<div class="form-group">
					<label for="confirmation-input">
						Type <strong>{requireInput}</strong> to confirm:
					</label>
					<input
						id="confirmation-input"
						type="text"
						bind:value={inputValue}
						class="form-input"
						disabled={loading}
						placeholder={requireInput}
					/>
				</div>
			{/if}

			<div class="form-group">
				<label for="reason-input">Reason (optional):</label>
				<textarea
					id="reason-input"
					bind:value={reason}
					class="form-textarea"
					disabled={loading}
					rows="3"
					placeholder="Why are you performing this action?"
				></textarea>
			</div>

			{#if error}
				<div class="error-message" role="alert">
					{error}
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={onCancel} disabled={loading}> Cancel </button>
			<button class="btn btn-danger" onclick={handleConfirm} disabled={loading || !canConfirm}>
				{loading ? 'Processing...' : confirmText}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
		border-radius: 8px;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

	.close-btn:hover {
		background-color: #f3f4f6;
	}

	.modal-body {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.message {
		margin: 0 0 1.5rem 0;
		color: #374151;
		line-height: 1.5;
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

	.form-textarea {
		resize: vertical;
		min-height: 4rem;
	}

	.error-message {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background-color: #fee2e2;
		color: #991b1b;
		border-radius: 6px;
		font-size: 0.875rem;
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
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #4b5563;
	}
</style>
