<script lang="ts">
	interface Props {
		message: string;
		type?: 'success' | 'error' | 'info';
		duration?: number;
		onClose: () => void;
	}

	let { message, type = 'info', duration = 3000, onClose }: Props = $props();

	$effect(() => {
		const timer = setTimeout(onClose, duration);
		return () => clearTimeout(timer);
	});
</script>

<div class="toast toast-{type}" role="alert">
	<span class="toast-message">{message}</span>
	<button type="button" class="toast-close" onclick={onClose}>×</button>
</div>

<style>
	.toast {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		animation: slideIn 0.3s ease-out;
	}

	.toast-success {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #86efac;
	}

	.toast-error {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fca5a5;
	}

	.toast-info {
		background: #dbeafe;
		color: #1e40af;
		border: 1px solid #93c5fd;
	}

	.toast-close {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		opacity: 0.7;
		color: inherit;
	}

	.toast-close:hover {
		opacity: 1;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
