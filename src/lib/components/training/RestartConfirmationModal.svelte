<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	type RestartOperation = 'training' | 'faces' | 'clustering';

	interface Props {
		operation: RestartOperation;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { operation, onConfirm, onCancel }: Props = $props();

	// Component tracking (DEV only)
	const cleanup = registerComponent('training/RestartConfirmationModal', {
		filePath: 'src/lib/components/training/RestartConfirmationModal.svelte'
	});
	onMount(() => cleanup);

	const titles: Record<RestartOperation, string> = {
		training: 'Restart Training',
		faces: 'Restart Face Detection',
		clustering: 'Restart Clustering'
	};

	const descriptions: Record<RestartOperation, string> = {
		training:
			'This will reset training jobs and re-process images. Face detection results will be preserved.',
		faces:
			'This will delete all detected faces and re-run face detection. Person records will be preserved.',
		clustering:
			'This will reset face clusters and re-run clustering. Manually assigned faces will be preserved.'
	};

	const warnings: Record<RestartOperation, string> = {
		training: 'Failed jobs will be retried. Use "full restart" to reprocess all images.',
		faces: '⚠️ All face detection results will be deleted.',
		clustering: '⚠️ "Unknown Person" records will be deleted.'
	};
</script>

<div class="modal-backdrop" role="dialog" aria-modal="true">
	<div class="modal-content">
		<h2>{titles[operation]}</h2>
		<p>{descriptions[operation]}</p>
		<p class="warning">{warnings[operation]}</p>

		<div class="button-group">
			<button class="btn-cancel" onclick={onCancel}>Cancel</button>
			<button class="btn-confirm" onclick={onConfirm}>Confirm Restart</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		max-width: 400px;
		width: 90%;
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	p {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		color: #4b5563;
		line-height: 1.5;
	}

	.warning {
		color: #d97706;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.button-group {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}

	.btn-cancel,
	.btn-confirm {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-cancel {
		border: 1px solid #d1d5db;
		background: white;
		color: #374151;
	}

	.btn-cancel:hover {
		background: #f9fafb;
	}

	.btn-confirm {
		border: none;
		background: #ef4444;
		color: white;
	}

	.btn-confirm:hover {
		background: #dc2626;
	}
</style>
