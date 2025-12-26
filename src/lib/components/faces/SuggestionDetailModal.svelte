<script lang="ts">
	import type { FaceSuggestion } from '$lib/api/faces';

	interface Props {
		suggestion: FaceSuggestion | null;
		onClose: () => void;
		onAccept: (suggestion: FaceSuggestion) => void;
		onReject: (suggestion: FaceSuggestion) => void;
	}

	let { suggestion, onClose, onAccept, onReject }: Props = $props();

	let isActionLoading = $state(false);

	const confidencePercent = $derived(
		suggestion ? Math.round(suggestion.confidence * 100) : 0
	);
	const confidenceColor = $derived(() => {
		if (!suggestion) return '#94a3b8';
		return suggestion.confidence >= 0.9
			? '#22c55e' // green-600
			: suggestion.confidence >= 0.8
				? '#eab308' // yellow-500
				: '#f97316'; // orange-500
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	async function handleAccept() {
		if (!suggestion || isActionLoading) return;
		isActionLoading = true;
		try {
			await onAccept(suggestion);
			onClose();
		} finally {
			isActionLoading = false;
		}
	}

	async function handleReject() {
		if (!suggestion || isActionLoading) return;
		isActionLoading = true;
		try {
			await onReject(suggestion);
			onClose();
		} finally {
			isActionLoading = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if suggestion}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<header class="modal-header">
				<h2 id="modal-title">Face Suggestion Details</h2>
				<button
					type="button"
					class="close-button"
					onclick={onClose}
					aria-label="Close modal"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</header>

			<div class="modal-body">
				<!-- Face Image -->
				<div class="image-container">
					{#if suggestion.faceThumbnailUrl}
						<img
							src={suggestion.faceThumbnailUrl}
							alt="Face for {suggestion.personName || 'Unknown'}"
							class="face-image"
						/>
					{:else}
						<div class="image-placeholder">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="8" r="4" />
								<path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
							</svg>
						</div>
					{/if}
				</div>

				<!-- Details -->
				<div class="details">
					<div class="detail-row">
						<span class="detail-label">Person:</span>
						<span class="detail-value person-name">
							{suggestion.personName || 'Unknown'}
						</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Confidence:</span>
						<span class="detail-value confidence" style="color: {confidenceColor()}">
							{confidencePercent}%
						</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Created:</span>
						<span class="detail-value">{formatDate(suggestion.createdAt)}</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Status:</span>
						<span
							class="status-badge {suggestion.status === 'accepted'
								? 'accepted'
								: suggestion.status === 'rejected'
									? 'rejected'
									: suggestion.status === 'expired'
										? 'expired'
										: 'pending'}"
						>
							{suggestion.status}
						</span>
					</div>

					{#if suggestion.reviewedAt}
						<div class="detail-row">
							<span class="detail-label">Reviewed:</span>
							<span class="detail-value">{formatDate(suggestion.reviewedAt)}</span>
						</div>
					{/if}
				</div>
			</div>

			{#if suggestion.status === 'pending'}
				<footer class="modal-footer">
					<button
						type="button"
						class="btn btn-accept"
						onclick={handleAccept}
						disabled={isActionLoading}
					>
						{isActionLoading ? 'Processing...' : '✓ Accept'}
					</button>
					<button
						type="button"
						class="btn btn-reject"
						onclick={handleReject}
						disabled={isActionLoading}
					>
						{isActionLoading ? 'Processing...' : '✗ Reject'}
					</button>
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 12px;
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e0e0e0;
		flex-shrink: 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
	}

	.close-button {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.close-button:hover {
		background-color: #f0f0f0;
		color: #333;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.image-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.face-image {
		width: 200px;
		height: 200px;
		object-fit: cover;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.image-placeholder {
		width: 200px;
		height: 200px;
		border-radius: 12px;
		background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.image-placeholder svg {
		width: 80px;
		height: 80px;
		opacity: 0.8;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f0f0f0;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #666;
	}

	.detail-value {
		font-size: 0.875rem;
		color: #333;
	}

	.person-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.confidence {
		font-weight: 700;
		font-size: 1rem;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.status-badge.pending {
		background-color: #fef3c7;
		color: #92400e;
	}

	.status-badge.accepted {
		background-color: #d1fae5;
		color: #065f46;
	}

	.status-badge.rejected {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.status-badge.expired {
		background-color: #f1f5f9;
		color: #475569;
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e0e0e0;
		flex-shrink: 0;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.1s;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-accept {
		background-color: #22c55e;
		color: white;
	}

	.btn-accept:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.btn-reject {
		background-color: #ef4444;
		color: white;
	}

	.btn-reject:hover:not(:disabled) {
		background-color: #dc2626;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.modal {
			max-width: 100%;
		}

		.face-image,
		.image-placeholder {
			width: 160px;
			height: 160px;
		}

		.modal-footer {
			flex-direction: column;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
