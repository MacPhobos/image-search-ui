<script lang="ts">
	import type { AgeEraBucket } from '$lib/api/faces';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';

	interface Props {
		open: boolean;
		faceId: string;
		personId: string;
		personName: string;
		submitting: boolean;
		error?: string | null;
		onCancel: () => void;
		onConfirm: (era: AgeEraBucket | null) => void;
	}

	let {
		open,
		faceId,
		personId,
		personName,
		submitting,
		error = null,
		onCancel,
		onConfirm
	}: Props = $props();

	// Age era options with labels
	const AGE_ERAS: { value: AgeEraBucket; label: string }[] = [
		{ value: 'infant', label: 'Infant (0-2)' },
		{ value: 'child', label: 'Child (3-12)' },
		{ value: 'teen', label: 'Teen (13-19)' },
		{ value: 'young_adult', label: 'Young Adult (20-35)' },
		{ value: 'adult', label: 'Adult (36-55)' },
		{ value: 'senior', label: 'Senior (56+)' }
	];

	// Selected era (null = auto-detect)
	let selectedEra = $state<AgeEraBucket | null>(null);

	// Reset era when panel opens
	$effect(() => {
		if (open) {
			selectedEra = null;
		}
	});

	function handleConfirm() {
		onConfirm(selectedEra);
	}
</script>

{#if open}
	<div class="pin-panel">
		<div class="pin-panel-header">
			<h4>Pin as Prototype</h4>
			<button
				type="button"
				class="close-button"
				onclick={onCancel}
				disabled={submitting}
				aria-label="Cancel pinning"
			>
				×
			</button>
		</div>

		<div class="pin-panel-body">
			<p class="person-name">for {personName}</p>

			<div class="form-group">
				<label for="age-era-select">
					Age Era (optional):
				</label>
				<select
					id="age-era-select"
					bind:value={selectedEra}
					disabled={submitting}
					class="era-select"
				>
					<option value={null}>Auto-detect</option>
					{#each AGE_ERAS as era}
						<option value={era.value}>{era.label}</option>
					{/each}
				</select>
			</div>

			<p class="helper-text">
				This will add this face as a reference prototype for {personName}.
			</p>

			{#if error}
				<Alert.Root variant="destructive" class="error-alert">
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<div class="pin-panel-footer">
			<Button variant="outline" onclick={onCancel} disabled={submitting}>
				Cancel
			</Button>
			<Button
				class="bg-green-600 hover:bg-green-700"
				onclick={handleConfirm}
				disabled={submitting}
			>
				{submitting ? 'Pinning...' : 'Pin Prototype'}
			</Button>
		</div>
	</div>
{/if}

<style>
	.pin-panel {
		background-color: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		margin: 0.5rem 0.625rem;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.pin-panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.pin-panel-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}

	.close-button {
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
		color: #666;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-button:hover:not(:disabled) {
		background-color: #e0e0e0;
	}

	.close-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pin-panel-body {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.person-name {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #333;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-group label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #333;
	}

	.era-select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		transition: border-color 0.2s;
	}

	.era-select:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.era-select:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.helper-text {
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.error-alert {
		margin: 0;
	}

	.pin-panel-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem;
		border-top: 1px solid #e0e0e0;
	}
</style>
