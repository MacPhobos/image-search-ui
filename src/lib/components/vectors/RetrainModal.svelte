<script lang="ts">
	import CategorySelector from '../CategorySelector.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	interface Props {
		open: boolean;
		pathPrefix: string;
		onConfirm: (categoryId: number, reason?: string) => Promise<void>;
		onCancel: () => void;
	}

	let { open = $bindable(false), pathPrefix, onConfirm, onCancel }: Props = $props();

	let selectedCategoryId = $state<number | null>(null);
	let reason = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	let canConfirm = $derived(selectedCategoryId !== null);

	async function handleConfirm() {
		if (!selectedCategoryId) return;

		loading = true;
		error = null;
		try {
			await onConfirm(selectedCategoryId, reason || undefined);
			// On success, close the dialog
			open = false;
			resetForm();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		resetForm();
		onCancel();
	}

	function resetForm() {
		selectedCategoryId = null;
		reason = '';
		error = null;
	}

	function formatPath(path: string): string {
		const parts = path.split('/');
		return parts.slice(-3).join('/');
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleCancel()}>
	<Dialog.Content data-testid="retrain-modal">
		<Dialog.Header>
			<Dialog.Title>Retrain Directory</Dialog.Title>
			<Dialog.Description>
				This will delete all existing vectors for this directory and create a new training session.
			</Dialog.Description>
		</Dialog.Header>

		<div style="display: grid; gap: 1.5rem; padding: 0.5rem 0;">
			<!-- Directory Info -->
			<div
				style="padding: 1rem; background-color: rgb(240, 249, 255); border: 1px solid rgb(186, 230, 253); border-radius: 6px;"
			>
				<div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.875rem;">
					<strong style="color: rgb(55, 65, 81);">Directory:</strong>
					<code
						title={pathPrefix}
						style="background-color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-family: 'Monaco', 'Menlo', 'Courier New', monospace; font-size: 0.8rem; color: rgb(31, 41, 55); border: 1px solid rgb(229, 231, 235); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px;"
					>
						{formatPath(pathPrefix)}
					</code>
				</div>
			</div>

			<!-- Category Selection -->
			<div>
				<CategorySelector
					selectedId={selectedCategoryId}
					onSelect={(id) => (selectedCategoryId = id)}
					disabled={loading}
					showCreateOption={false}
					label="Select Category for Training Session"
				/>
			</div>

			<!-- Reason Input -->
			<div>
				<Label for="reason-input">Reason (optional):</Label>
				<textarea
					id="reason-input"
					bind:value={reason}
					disabled={loading}
					rows="3"
					placeholder="Why are you retraining this directory?"
					class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					data-testid="retrain-modal-reason-input"
				></textarea>
			</div>

			<!-- Error Display -->
			{#if error}
				<Alert variant="destructive" data-testid="retrain-modal-error">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={handleCancel}
				disabled={loading}
				data-testid="retrain-modal-cancel-btn"
			>
				Cancel
			</Button>
			<Button
				onclick={handleConfirm}
				disabled={loading || !canConfirm}
				data-testid="retrain-modal-confirm-btn"
			>
				{loading ? 'Creating Session...' : 'Retrain'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
