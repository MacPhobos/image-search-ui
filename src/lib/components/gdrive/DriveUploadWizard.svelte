<script lang="ts">
	import {
		startUpload,
		cancelUpload,
		type WizardStep,
		type UploadStatusResponse
	} from '$lib/api/gdrive';
	import type { PersonPhotoGroup } from '$lib/api/faces';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import PhotoReviewStep from './PhotoReviewStep.svelte';
	import FolderPickerStep from './FolderPickerStep.svelte';
	import UploadProgressStep from './UploadProgressStep.svelte';
	import UploadCompleteStep from './UploadCompleteStep.svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		personId: string;
		personName: string;
		photos: PersonPhotoGroup[];
		initialPhotoIds: number[];
		onClose: () => void;
		onUploadComplete?: (result: UploadStatusResponse) => void;
	}

	let {
		open = $bindable(),
		personId,
		personName,
		photos,
		initialPhotoIds,
		onClose,
		onUploadComplete
	}: Props = $props();

	// Wizard state
	let currentStep = $state<WizardStep>('review');
	let confirmedPhotoIds = $state<number[]>([]);
	let selectedFolderId = $state<string | null>(null);
	let selectedFolderPath = $state('');
	let batchId = $state<string | null>(null);
	let finalStatus = $state<UploadStatusResponse | null>(null);
	let startingUpload = $state(false);
	let cancellingUpload = $state(false);

	// Sync initialPhotoIds only when confirmedPhotoIds is empty and initialPhotoIds has values
	// (avoids resetting user selections when parent re-renders with a new array reference)
	$effect(() => {
		if (confirmedPhotoIds.length === 0 && initialPhotoIds.length > 0) {
			confirmedPhotoIds = [...initialPhotoIds];
		}
	});

	// Step title map
	let stepTitle = $derived.by(() => {
		switch (currentStep) {
			case 'review':
				return 'Review Photos';
			case 'folder':
				return 'Choose Destination';
			case 'uploading':
				return 'Uploading';
			case 'complete':
				return 'Upload Results';
		}
	});

	let stepNumber = $derived.by(() => {
		switch (currentStep) {
			case 'review':
				return 1;
			case 'folder':
				return 2;
			case 'uploading':
				return 3;
			case 'complete':
				return 4;
		}
	});

	let canGoNext = $derived.by(() => {
		if (currentStep === 'review') return confirmedPhotoIds.length > 0;
		if (currentStep === 'folder') return selectedFolderId !== null;
		return false;
	});

	let canGoBack = $derived(currentStep === 'folder');

	function handleReviewConfirm(ids: number[]) {
		confirmedPhotoIds = ids;
	}

	function goNext() {
		if (currentStep === 'review') {
			currentStep = 'folder';
		} else if (currentStep === 'folder' && selectedFolderId) {
			handleStartUpload();
		}
	}

	function goBack() {
		if (currentStep === 'folder') {
			currentStep = 'review';
		}
	}

	function handleFolderSelect(folderId: string, folderPath: string) {
		selectedFolderId = folderId;
		selectedFolderPath = folderPath;
	}

	async function handleStartUpload() {
		if (!selectedFolderId || confirmedPhotoIds.length === 0) return;

		startingUpload = true;
		try {
			const result = await startUpload(personId, confirmedPhotoIds, selectedFolderId);
			batchId = result.batchId;
			currentStep = 'uploading';
			toast.success(`Started uploading ${result.totalPhotos} photos`);
		} catch (e) {
			toast.error('Failed to start upload', {
				description: e instanceof Error ? e.message : 'Unknown error'
			});
		} finally {
			startingUpload = false;
		}
	}

	async function handleCancelUpload() {
		if (!batchId) return;

		cancellingUpload = true;
		try {
			await cancelUpload(batchId);
			toast.info('Upload cancelled');
		} catch (e) {
			toast.error('Failed to cancel', {
				description: e instanceof Error ? e.message : 'Unknown error'
			});
		} finally {
			cancellingUpload = false;
		}
	}

	function handleUploadComplete(status: UploadStatusResponse) {
		finalStatus = status;
		currentStep = 'complete';
		onUploadComplete?.(status);
	}

	function handleClose() {
		// Prevent closing during active upload without confirmation
		if (currentStep === 'uploading' && batchId) {
			if (
				!confirm('Upload is in progress. Closing this dialog will not stop the upload. Continue?')
			) {
				return;
			}
		}

		// Reset state
		currentStep = 'review';
		confirmedPhotoIds = [];
		selectedFolderId = null;
		selectedFolderPath = '';
		batchId = null;
		finalStatus = null;
		startingUpload = false;
		cancellingUpload = false;
		open = false;
		onClose();
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			handleClose();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
		<Dialog.Header>
			<Dialog.Title>
				{stepTitle}
				<span class="text-sm font-normal text-gray-400 ml-2">Step {stepNumber} of 4</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				Upload {personName}'s photos to Google Drive
			</Dialog.Description>
		</Dialog.Header>

		<!-- Step indicator -->
		<div class="flex items-center gap-1 px-1 py-2">
			{#each [1, 2, 3, 4] as step}
				<div
					class="h-1 flex-1 rounded-full transition-colors {step <= stepNumber
						? 'bg-blue-500'
						: 'bg-gray-200'}"
				></div>
			{/each}
		</div>

		<!-- Step content -->
		<div class="flex-1 overflow-y-auto py-2 px-1">
			{#if currentStep === 'review'}
				<PhotoReviewStep
					{photos}
					selectedPhotoIds={confirmedPhotoIds}
					{personName}
					onConfirm={handleReviewConfirm}
				/>
			{:else if currentStep === 'folder'}
				<FolderPickerStep
					{personName}
					initialFolderId={selectedFolderId}
					onSelect={handleFolderSelect}
				/>
			{:else if currentStep === 'uploading' && batchId}
				<UploadProgressStep
					{batchId}
					onComplete={handleUploadComplete}
					onCancel={handleCancelUpload}
					cancelInProgress={cancellingUpload}
				/>
			{:else if currentStep === 'complete' && finalStatus}
				<UploadCompleteStep
					status={finalStatus}
					folderName={selectedFolderPath}
					folderId={selectedFolderId}
					onClose={handleClose}
				/>
			{/if}
		</div>

		<!-- Footer navigation -->
		{#if currentStep === 'review' || currentStep === 'folder'}
			<Dialog.Footer class="flex items-center justify-between border-t pt-4">
				<div>
					{#if canGoBack}
						<Button variant="ghost" onclick={goBack}>Back</Button>
					{/if}
				</div>
				<div class="flex gap-2">
					<Button variant="outline" onclick={handleClose}>Cancel</Button>
					{#if currentStep === 'review'}
						<Button onclick={goNext} disabled={!canGoNext}>Next: Choose Folder</Button>
					{:else if currentStep === 'folder'}
						<Button onclick={goNext} disabled={!canGoNext || startingUpload}>
							{startingUpload ? 'Starting...' : 'Start Upload'}
						</Button>
					{/if}
				</div>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
