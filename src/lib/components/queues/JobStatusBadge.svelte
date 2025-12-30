<script lang="ts">
	import type { JobStatus } from '$lib/api/queues';

	interface Props {
		status: JobStatus;
		size?: 'sm' | 'md' | 'lg';
	}

	let { status, size = 'md' }: Props = $props();

	const statusConfig: Record<JobStatus, { bg: string; text: string; label: string }> = {
		queued: { bg: '#e5e7eb', text: '#4b5563', label: 'Queued' },
		started: { bg: '#dbeafe', text: '#1e40af', label: 'Running' },
		finished: { bg: '#d1fae5', text: '#065f46', label: 'Finished' },
		failed: { bg: '#fee2e2', text: '#991b1b', label: 'Failed' },
		deferred: { bg: '#fef3c7', text: '#92400e', label: 'Deferred' },
		scheduled: { bg: '#dbeafe', text: '#1e40af', label: 'Scheduled' },
		canceled: { bg: '#e5e7eb', text: '#4b5563', label: 'Canceled' },
		stopped: { bg: '#e5e7eb', text: '#4b5563', label: 'Stopped' }
	};

	const config = $derived(statusConfig[status] || statusConfig.queued);
	const sizeClass = $derived(size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : 'badge-md');
</script>

<span class="badge {sizeClass}" style="background-color: {config.bg}; color: {config.text}">
	{config.label}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		font-weight: 500;
		border-radius: 9999px;
		text-transform: capitalize;
	}
	.badge-sm {
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
	}
	.badge-md {
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
	}
	.badge-lg {
		padding: 0.375rem 1rem;
		font-size: 1rem;
	}
</style>
