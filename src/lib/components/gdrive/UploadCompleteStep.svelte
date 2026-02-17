<script lang="ts">
	import type { UploadStatusResponse } from '$lib/api/gdrive';
	import { Button } from '$lib/components/ui/button';
	import UploadFileRow from './UploadFileRow.svelte';

	interface Props {
		status: UploadStatusResponse;
		folderName: string;
		folderId?: string | null;
		onClose: () => void;
		onRetryFailed?: (failedPhotoIds: number[]) => void;
	}

	let { status, folderName, folderId = null, onClose, onRetryFailed }: Props = $props();

	function handleRetryFailed() {
		const failedIds = status.files.filter((f) => f.status === 'failed').map((f) => f.assetId);
		onRetryFailed?.(failedIds);
	}

	let isSuccess = $derived(status.status === 'completed');
	let isPartialFailure = $derived(status.status === 'partial_failure');
	let isCancelled = $derived(status.status === 'cancelled');

	let failedFiles = $derived(status.files.filter((f) => f.status === 'failed'));

	let headerIcon = $derived.by(() => {
		if (isSuccess) return 'success';
		if (isPartialFailure) return 'warning';
		if (isCancelled) return 'cancelled';
		return 'error';
	});

	let headerText = $derived.by(() => {
		if (isSuccess) return 'Upload Complete';
		if (isPartialFailure) return 'Upload Partially Complete';
		if (isCancelled) return 'Upload Cancelled';
		return 'Upload Failed';
	});

	let summaryText = $derived.by(() => {
		if (isSuccess) {
			return `All ${status.completed} photos uploaded to "${folderName}"`;
		}
		if (isPartialFailure) {
			return `${status.completed} of ${status.total} photos uploaded. ${status.failed} failed.`;
		}
		if (isCancelled) {
			return `Upload cancelled. ${status.completed} photos were uploaded before cancellation.`;
		}
		return `Upload failed. ${status.failed} photos could not be uploaded.`;
	});
</script>

<div class="flex flex-col items-center gap-4 py-4">
	<!-- Status icon -->
	<div
		class="flex items-center justify-center w-16 h-16 rounded-full {headerIcon === 'success'
			? 'bg-green-100'
			: headerIcon === 'warning'
				? 'bg-yellow-100'
				: headerIcon === 'cancelled'
					? 'bg-gray-100'
					: 'bg-red-100'}"
	>
		{#if headerIcon === 'success'}
			<svg
				class="w-8 h-8 text-green-600"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<polyline points="20 6 9 17 4 12" />
			</svg>
		{:else if headerIcon === 'warning'}
			<svg
				class="w-8 h-8 text-yellow-600"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
				/>
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>
		{:else if headerIcon === 'cancelled'}
			<svg
				class="w-8 h-8 text-gray-500"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
			</svg>
		{:else}
			<svg
				class="w-8 h-8 text-red-600"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="15" y1="9" x2="9" y2="15" />
				<line x1="9" y1="9" x2="15" y2="15" />
			</svg>
		{/if}
	</div>

	<!-- Text summary -->
	<h3 class="text-lg font-semibold text-gray-800">{headerText}</h3>
	<p class="text-sm text-gray-600 text-center max-w-sm">{summaryText}</p>

	<!-- Stats row -->
	<div class="flex gap-6 text-center">
		<div>
			<span class="block text-2xl font-bold text-green-600">{status.completed}</span>
			<span class="text-xs text-gray-500">Uploaded</span>
		</div>
		{#if status.failed > 0}
			<div>
				<span class="block text-2xl font-bold text-red-600">{status.failed}</span>
				<span class="text-xs text-gray-500">Failed</span>
			</div>
		{/if}
		<div>
			<span class="block text-2xl font-bold text-gray-700">{status.total}</span>
			<span class="text-xs text-gray-500">Total</span>
		</div>
	</div>

	<!-- Failed files list -->
	{#if failedFiles.length > 0}
		<div class="w-full">
			<p class="text-sm font-medium text-red-600 mb-2">Failed files:</p>
			<div
				class="border border-red-200 rounded-md max-h-[200px] overflow-y-auto divide-y divide-red-100"
			>
				{#each failedFiles as file (file.assetId)}
					<UploadFileRow {file} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Action buttons -->
	<div class="flex gap-2 pt-2 flex-wrap justify-center">
		{#if folderId && status.completed > 0}
			<a
				href="https://drive.google.com/drive/folders/{folderId}"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
					<polyline points="15 3 21 3 21 9" />
					<line x1="10" y1="14" x2="21" y2="3" />
				</svg>
				Open in Google Drive
			</a>
		{/if}
		{#if failedFiles.length > 0 && onRetryFailed}
			<Button variant="outline" onclick={handleRetryFailed}>
				Retry Failed ({failedFiles.length})
			</Button>
		{/if}
		<Button onclick={onClose}>Close</Button>
	</div>
</div>
