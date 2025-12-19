<script lang="ts">
	interface Props {
		status: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { status, size = 'md' }: Props = $props();

	const statusColors: Record<string, string> = {
		pending: 'gray',
		running: 'blue',
		paused: 'yellow',
		completed: 'green',
		cancelled: 'gray',
		failed: 'red'
	};

	const statusLabels: Record<string, string> = {
		pending: 'Pending',
		running: 'Running',
		paused: 'Paused',
		completed: 'Completed',
		cancelled: 'Cancelled',
		failed: 'Failed'
	};

	const color = $derived(statusColors[status] || 'gray');
	const label = $derived(statusLabels[status] || status);
</script>

<span class="badge badge-{color} badge-{size}">
	{label}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		border-radius: 4px;
		text-transform: capitalize;
		white-space: nowrap;
	}

	.badge-sm {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
	}

	.badge-md {
		font-size: 0.875rem;
		padding: 0.25rem 0.75rem;
	}

	.badge-lg {
		font-size: 1rem;
		padding: 0.375rem 1rem;
	}

	.badge-gray {
		background-color: #e5e7eb;
		color: #4b5563;
	}

	.badge-blue {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.badge-yellow {
		background-color: #fef3c7;
		color: #92400e;
	}

	.badge-green {
		background-color: #d1fae5;
		color: #065f46;
	}

	.badge-red {
		background-color: #fee2e2;
		color: #991b1b;
	}
</style>
