<script lang="ts">
	import type { DriveHealthResponse } from '$lib/api/gdrive';

	interface Props {
		status?: DriveHealthResponse | null;
		compact?: boolean;
	}

	let { status = null, compact = false }: Props = $props();

	let connected = $derived(status?.connected ?? false);
	let dotColor = $derived(connected ? 'bg-green-500' : 'bg-gray-400');
	let label = $derived(connected ? 'Connected' : 'Not Configured');
	let email = $derived(status?.serviceAccountEmail ?? '');
</script>

<span
	class="inline-flex items-center gap-1.5"
	title={connected && email ? `Service account: ${email}` : undefined}
	aria-label={compact ? `Google Drive: ${label}` : undefined}
>
	<span class="inline-block h-2.5 w-2.5 rounded-full {dotColor}" aria-hidden="true"></span>
	{#if !compact}
		<span class="text-sm {connected ? 'text-green-700' : 'text-gray-500'}">{label}</span>
	{/if}
</span>
