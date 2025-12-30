<script lang="ts">
	import type { WorkerState } from '$lib/api/queues';

	interface Props {
		state: WorkerState;
		size?: 'sm' | 'md' | 'lg';
	}

	let { state, size = 'md' }: Props = $props();

	const stateConfig: Record<WorkerState, { bg: string; text: string; label: string }> = {
		idle: { bg: '#d1fae5', text: '#065f46', label: 'Idle' },
		busy: { bg: '#dbeafe', text: '#1e40af', label: 'Busy' },
		suspended: { bg: '#fef3c7', text: '#92400e', label: 'Suspended' }
	};

	const config = $derived(stateConfig[state] || stateConfig.idle);
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
