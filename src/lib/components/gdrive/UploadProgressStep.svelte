<script lang="ts">
	import { pollUploadStatus, type UploadStatusResponse } from '$lib/api/gdrive';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import UploadFileRow from './UploadFileRow.svelte';

	interface Props {
		batchId: string;
		onComplete: (status: UploadStatusResponse) => void;
		onCancel: () => void;
		cancelInProgress?: boolean;
	}

	let { batchId, onComplete, onCancel, cancelInProgress = false }: Props = $props();

	let status = $state<UploadStatusResponse | null>(null);
	let isFinished = $state(false);

	let percentage = $derived(status?.percentage ?? 0);
	let completed = $derived(status?.completed ?? 0);
	let total = $derived(status?.total ?? 0);
	let failed = $derived(status?.failed ?? 0);
	let inProgress = $derived(status?.inProgress ?? 0);
	let etaText = $derived.by(() => {
		const eta = status?.etaSeconds;
		if (!eta) return '';
		if (eta < 60) return `${eta}s remaining`;
		const mins = Math.floor(eta / 60);
		const secs = eta % 60;
		return `${mins}m ${secs}s remaining`;
	});

	$effect(() => {
		if (!batchId) return;

		return pollUploadStatus(
			batchId,
			(update) => {
				status = update;
			},
			(final) => {
				status = final;
				isFinished = true;
				onComplete(final);
			}
		);
	});
</script>

<div class="flex flex-col gap-4">
	<!-- Screen reader live region for progress announcements -->
	<div aria-live="polite" class="sr-only">
		{#if status && !isFinished}
			Uploaded {completed} of {total} photos. {Math.round(percentage)}% complete.
		{:else if status && isFinished}
			Upload finished. {completed} of {total} photos uploaded.{failed > 0
				? ` ${failed} failed.`
				: ''}
		{/if}
	</div>

	<!-- Overall progress -->
	<div>
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-medium text-gray-700"> Uploading photos to Google Drive </span>
			<span class="text-sm text-gray-500">
				{completed}/{total}
				{#if failed > 0}
					<span class="text-red-500">({failed} failed)</span>
				{/if}
			</span>
		</div>
		<Progress value={percentage} max={100} class="h-3" />
		<div class="flex items-center justify-between mt-1">
			<span class="text-xs text-gray-400">{Math.round(percentage)}%</span>
			{#if etaText && !isFinished}
				<span class="text-xs text-gray-400">{etaText}</span>
			{/if}
		</div>
	</div>

	<!-- Status summary -->
	<div class="flex gap-4 text-xs text-gray-500">
		{#if inProgress > 0}
			<span class="flex items-center gap-1">
				<span class="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
				{inProgress} in progress
			</span>
		{/if}
		{#if completed > 0}
			<span class="flex items-center gap-1">
				<span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
				{completed} uploaded
			</span>
		{/if}
		{#if failed > 0}
			<span class="flex items-center gap-1">
				<span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
				{failed} failed
			</span>
		{/if}
	</div>

	<!-- File list -->
	{#if status?.files && status.files.length > 0}
		<div class="border rounded-md max-h-[280px] overflow-y-auto divide-y divide-gray-100">
			{#each status.files as file (file.assetId)}
				<UploadFileRow {file} />
			{/each}
		</div>
	{/if}

	<!-- Cancel button -->
	{#if !isFinished}
		<div class="flex justify-end">
			<Button variant="outline" size="sm" onclick={onCancel} disabled={cancelInProgress}>
				{cancelInProgress ? 'Cancelling...' : 'Cancel Upload'}
			</Button>
		</div>
	{/if}
</div>
