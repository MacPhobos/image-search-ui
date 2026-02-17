<script lang="ts">
	import type { UploadFileStatus } from '$lib/api/gdrive';

	interface Props {
		file: UploadFileStatus;
	}

	let { file }: Props = $props();

	let statusColor = $derived.by(() => {
		switch (file.status) {
			case 'completed':
				return 'text-green-600';
			case 'failed':
				return 'text-red-600';
			case 'uploading':
				return 'text-blue-600';
			case 'cancelled':
				return 'text-gray-400';
			default:
				return 'text-gray-500';
		}
	});

	let statusLabel = $derived.by(() => {
		switch (file.status) {
			case 'completed':
				return 'Uploaded';
			case 'failed':
				return 'Failed';
			case 'uploading':
				return 'Uploading';
			case 'cancelled':
				return 'Cancelled';
			case 'pending':
				return 'Pending';
			default:
				return file.status;
		}
	});

	let statusIcon = $derived.by(() => {
		switch (file.status) {
			case 'completed':
				return 'check';
			case 'failed':
				return 'x';
			case 'uploading':
				return 'spinner';
			case 'cancelled':
				return 'cancelled';
			default:
				return 'clock';
		}
	});
</script>

<div class="flex items-center gap-3 py-2 px-2 rounded text-sm hover:bg-gray-50">
	<!-- Status icon -->
	<span class="flex-shrink-0 w-5 h-5 flex items-center justify-center {statusColor}">
		{#if statusIcon === 'check'}
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="20 6 9 17 4 12" />
			</svg>
		{:else if statusIcon === 'x'}
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		{:else if statusIcon === 'spinner'}
			<span
				class="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"
			></span>
		{:else if statusIcon === 'cancelled'}
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
			</svg>
		{:else}
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<polyline points="12 6 12 12 16 14" />
			</svg>
		{/if}
	</span>

	<!-- Filename -->
	<span class="flex-1 truncate text-gray-700">{file.filename}</span>

	<!-- Status label -->
	<span class="flex-shrink-0 text-xs font-medium {statusColor}">{statusLabel}</span>

	<!-- Error message -->
	{#if file.errorMessage}
		<span
			class="flex-shrink-0 text-xs text-red-500 max-w-[200px] truncate"
			title={file.errorMessage}
		>
			{file.errorMessage}
		</span>
	{/if}
</div>
