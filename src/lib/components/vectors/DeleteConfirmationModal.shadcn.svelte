<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		requireInput?: string; // If set, user must type this text to confirm
		onConfirm: (reason?: string) => Promise<void>;
		onCancel: () => void;
	}

	let {
		open = $bindable(false),
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
			// On success, close the dialog
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		// Reset form state
		reason = '';
		inputValue = '';
		error = null;
		onCancel();
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{message}</AlertDialog.Description>
		</AlertDialog.Header>

		<div style="display: grid; gap: 1rem; padding: 0.5rem 0;">
			{#if requireInput}
				<div>
					<Label for="confirmation-input">
						Type <strong>{requireInput}</strong> to confirm:
					</Label>
					<Input
						id="confirmation-input"
						bind:value={inputValue}
						disabled={loading}
						placeholder={requireInput}
					/>
				</div>
			{/if}

			<div>
				<Label for="reason-input">Reason (optional):</Label>
				<textarea
					id="reason-input"
					bind:value={reason}
					disabled={loading}
					rows="3"
					placeholder="Why are you performing this action?"
					class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				></textarea>
			</div>

			{#if error}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancel} disabled={loading}>Cancel</AlertDialog.Cancel>
			<Button variant="destructive" onclick={handleConfirm} disabled={loading || !canConfirm}>
				{loading ? 'Processing...' : confirmText}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
