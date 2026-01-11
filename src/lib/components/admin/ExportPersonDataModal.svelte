<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import { exportPersonMetadata, type PersonMetadataExport } from '$lib/api/admin';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';

	interface Props {
		open: boolean;
		onClose: () => void;
		onSuccess: (result: PersonMetadataExport) => void;
	}

	let { open = $bindable(), onClose, onSuccess }: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('ExportPersonDataModal', {
					filePath: 'src/lib/components/admin/ExportPersonDataModal.svelte'
				})
			);
		} else if (trackingCleanup) {
			trackingCleanup();
			trackingCleanup = null;
		}
		return () => {
			if (trackingCleanup) {
				trackingCleanup();
				trackingCleanup = null;
			}
		};
	});

	let maxFacesPerPerson = $state(100);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let isValidInput = $derived(maxFacesPerPerson >= 1 && maxFacesPerPerson <= 500);

	function downloadJson(data: unknown, filename: string): void {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function handleExport() {
		if (!isValidInput) return;

		loading = true;
		error = null;
		try {
			const result = await exportPersonMetadata(maxFacesPerPerson);

			// Trigger file download
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const filename = `person-metadata-${timestamp}.json`;
			downloadJson(result, filename);

			// Notify parent
			onSuccess(result);
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		if (loading) return;
		error = null;
		onClose();
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			handleCancel();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Export Person Data</Dialog.Title>
			<Dialog.Description>
				Export all persons and their associated face-to-image mappings as a JSON file.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<Alert.Root variant="default" class="border-blue-500 bg-blue-50 dark:bg-blue-950/50">
				<Alert.Title>Export Person-to-Face Mappings</Alert.Title>
				<Alert.Description>
					<p class="mb-2">
						This will export all persons and their associated face-to-image mappings as a JSON file.
						The export includes:
					</p>
					<ul class="list-disc list-inside space-y-1 text-sm">
						<li>Person names and statuses</li>
						<li>Face bounding boxes and image paths</li>
						<li>Detection confidence and quality scores</li>
					</ul>
					<p class="mt-2">Use this for backup or to migrate data between environments.</p>
				</Alert.Description>
			</Alert.Root>

			<div class="space-y-2">
				<Label for="max-faces-input">Maximum faces per person (1-500)</Label>
				<Input
					id="max-faces-input"
					type="number"
					bind:value={maxFacesPerPerson}
					class={!isValidInput ? 'border-destructive' : ''}
					disabled={loading}
					min="1"
					max="500"
					step="1"
				/>
				{#if !isValidInput}
					<p class="text-sm font-medium text-destructive">Must be between 1 and 500</p>
				{/if}
				<p class="text-sm text-muted-foreground">
					Limits the number of face mappings exported per person. Default is 100.
				</p>
			</div>

			{#if error}
				<Alert.Root variant="destructive">
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel} disabled={loading}>Cancel</Button>
			<Button onclick={handleExport} disabled={loading || !isValidInput}>
				{loading ? 'Exporting...' : 'Export'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
