<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { BadgeProps } from '$lib/components/ui/badge';
	import type { JobStatus } from '$lib/api/queues';

	interface Props {
		status: JobStatus;
		size?: 'sm' | 'md' | 'lg';
	}

	let { status, size = 'md' }: Props = $props();

	// Map job status to Badge variant
	const statusToVariant: Record<JobStatus, BadgeProps['variant']> = {
		finished: 'default', // Green/success style
		started: 'secondary', // Blue style
		queued: 'outline',
		failed: 'destructive',
		deferred: 'secondary',
		scheduled: 'secondary',
		canceled: 'outline',
		stopped: 'outline'
	};

	const statusLabels: Record<JobStatus, string> = {
		queued: 'Queued',
		started: 'Running',
		finished: 'Finished',
		failed: 'Failed',
		deferred: 'Deferred',
		scheduled: 'Scheduled',
		canceled: 'Canceled',
		stopped: 'Stopped'
	};

	const variant = $derived(statusToVariant[status] || 'outline');
	const label = $derived(statusLabels[status] || status);

	// Size classes for custom styling (shadcn-svelte Badge doesn't have size prop)
	const sizeClass = $derived(
		size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-1.5' : ''
	);
</script>

<Badge {variant} class={sizeClass}>
	{label}
</Badge>
