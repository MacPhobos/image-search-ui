<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { startTraining, pauseTraining, cancelTraining, restartTraining } from '$lib/api/training';

	// Component tracking (DEV only)
	const cleanup = registerComponent('training/TrainingControlPanel', {
		filePath: 'src/lib/components/training/TrainingControlPanel.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		sessionId: number;
		status: string;
		onStatusChange?: () => void;
	}

	let { sessionId, status, onStatusChange }: Props = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let showConfirmDialog = $state(false);
	let confirmAction = $state<'cancel' | 'restart' | null>(null);

	const canStart = $derived(status === 'pending' || status === 'paused' || status === 'failed');
	const canPause = $derived(status === 'running');
	const canCancel = $derived(status === 'running' || status === 'paused');
	const canRestart = $derived(status === 'failed' || status === 'cancelled');

	async function handleStart() {
		loading = true;
		error = null;
		try {
			await startTraining(sessionId);
			onStatusChange?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start training';
		} finally {
			loading = false;
		}
	}

	async function handlePause() {
		loading = true;
		error = null;
		try {
			await pauseTraining(sessionId);
			onStatusChange?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to pause training';
		} finally {
			loading = false;
		}
	}

	async function handleCancel() {
		showConfirmDialog = true;
		confirmAction = 'cancel';
	}

	async function handleRestart() {
		showConfirmDialog = true;
		confirmAction = 'restart';
	}

	async function confirmDialogAction() {
		if (!confirmAction) return;

		loading = true;
		error = null;
		showConfirmDialog = false;

		try {
			if (confirmAction === 'cancel') {
				await cancelTraining(sessionId);
			} else if (confirmAction === 'restart') {
				await restartTraining(sessionId, status === 'failed');
			}
			onStatusChange?.();
		} catch (err) {
			error = err instanceof Error ? err.message : `Failed to ${confirmAction} training`;
		} finally {
			loading = false;
			confirmAction = null;
		}
	}

	function cancelDialog() {
		showConfirmDialog = false;
		confirmAction = null;
	}
</script>

<div class="control-panel">
	<div class="controls">
		{#if canStart}
			<button class="btn btn-primary" onclick={handleStart} disabled={loading}>
				{loading ? 'Starting...' : 'Start Training'}
			</button>
		{/if}

		{#if canPause}
			<button class="btn btn-secondary" onclick={handlePause} disabled={loading}>
				{loading ? 'Pausing...' : 'Pause'}
			</button>
		{/if}

		{#if canCancel}
			<button class="btn btn-danger" onclick={handleCancel} disabled={loading}>Cancel</button>
		{/if}

		{#if canRestart}
			<button class="btn btn-primary" onclick={handleRestart} disabled={loading}>
				{loading ? 'Restarting...' : 'Restart Training'}
			</button>
		{/if}
	</div>

	{#if error}
		<div class="error-message" role="alert">
			{error}
		</div>
	{/if}
</div>

{#if showConfirmDialog}
	<div class="modal-overlay" onclick={cancelDialog} role="presentation">
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<h3>Confirm Action</h3>
			<p>
				{#if confirmAction === 'cancel'}
					Are you sure you want to cancel this training session? This action cannot be undone.
				{:else if confirmAction === 'restart'}
					Are you sure you want to restart training?
					{#if status === 'failed'}
						This will retry only failed jobs.
					{/if}
				{/if}
			</p>
			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={cancelDialog}>No, go back</button>
				<button class="btn btn-danger" onclick={confirmDialogAction}>
					Yes, {confirmAction}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.control-panel {
		margin: 1.5rem 0;
	}

	.controls {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
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
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #4b5563;
	}

	.btn-danger {
		background-color: #dc2626;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.error-message {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background-color: #fee2e2;
		color: #991b1b;
		border-radius: 6px;
		font-size: 0.875rem;
	}

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
		padding: 2rem;
		border-radius: 8px;
		max-width: 500px;
		width: 90%;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.modal-content h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #1f2937;
	}

	.modal-content p {
		margin-bottom: 1.5rem;
		color: #4b5563;
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}
</style>
