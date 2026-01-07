<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { deleteAllData, type DeleteAllDataResponse } from '$lib/api/admin';

	interface Props {
		open: boolean;
		onClose: () => void;
		onSuccess: (response: DeleteAllDataResponse) => void;
	}

	let { open = $bindable(false), onClose, onSuccess }: Props = $props();

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
			// Close dialog
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		if (loading) return;
		// Reset form state
		confirmationText = '';
		reason = '';
		error = null;
		onClose();
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content class="max-w-2xl">
		<AlertDialog.Header>
			<AlertDialog.Title class="text-destructive">Delete All Application Data</AlertDialog.Title>
			<AlertDialog.Description>
				This action cannot be undone and will permanently delete all application data.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="grid gap-4 py-2">
			<!-- Warning Banner -->
			<Alert variant="destructive" data-testid="delete-all-warning">
				<div class="space-y-2">
					<div class="font-semibold">Destructive Action - Cannot Be Undone</div>
					<div class="text-sm">
						<p class="mb-2">This will permanently delete ALL application data including:</p>
						<ul class="list-disc list-inside space-y-1 ml-2">
							<li>All vector embeddings in Qdrant (main + faces collections)</li>
							<li>All database records (images, training sessions, categories, etc.)</li>
							<li>All deletion logs and metadata</li>
						</ul>
						<p class="mt-2">
							<strong>Only the database schema will be preserved.</strong>
						</p>
					</div>
				</div>
			</Alert>

			<!-- Confirmation Input -->
			<div class="space-y-2">
				<Label for="confirmation-input">
					Type <strong class="font-mono">{REQUIRED_TEXT}</strong> to confirm:
				</Label>
				<Input
					id="confirmation-input"
					data-testid="delete-all-confirmation-input"
					type="text"
					bind:value={confirmationText}
					disabled={loading}
					placeholder={REQUIRED_TEXT}
					autocomplete="off"
					class={confirmationText && !canConfirm ? 'border-destructive' : ''}
				/>
				{#if confirmationText && !canConfirm}
					<p class="text-sm text-destructive font-medium" data-testid="validation-error">
						Text must exactly match "{REQUIRED_TEXT}"
					</p>
				{/if}
			</div>

			<!-- Reason Textarea -->
			<div class="space-y-2">
				<Label for="reason-input">Reason (optional):</Label>
				<textarea
					id="reason-input"
					data-testid="delete-all-reason-input"
					bind:value={reason}
					disabled={loading}
					rows="3"
					placeholder="Why are you deleting all data? (e.g., Development reset, Testing)"
					class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical"
				></textarea>
			</div>

			<!-- Error Message -->
			{#if error}
				<Alert variant="destructive" data-testid="delete-all-error">
					<AlertDescription>
						<strong>Error:</strong>
						{error}
					</AlertDescription>
				</Alert>
			{/if}
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancel} disabled={loading} data-testid="cancel-button">
				Cancel
			</AlertDialog.Cancel>
			<Button
				variant="destructive"
				onclick={handleDelete}
				disabled={loading || !canConfirm}
				data-testid="confirm-delete-button"
			>
				{loading ? 'Deleting...' : 'Delete All Data'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
