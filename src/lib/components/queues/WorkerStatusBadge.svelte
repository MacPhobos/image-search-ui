<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { BadgeProps } from '$lib/components/ui/badge';
	import type { WorkerState } from '$lib/api/queues';

	interface Props {
		state: WorkerState;
		size?: 'sm' | 'md' | 'lg';
	}

	let { state, size = 'md' }: Props = $props();

	// Map worker state to Badge variant
	const stateToVariant: Record<WorkerState, BadgeProps['variant']> = {
		idle: 'default', // Success/green style
		busy: 'secondary', // Blue style
		suspended: 'outline' // Neutral style
	};

	const stateLabels: Record<WorkerState, string> = {
		idle: 'Idle',
		busy: 'Busy',
		suspended: 'Suspended'
	};

	const variant = $derived(stateToVariant[state] || 'outline');
	const label = $derived(stateLabels[state] || state);

	// Size classes for custom styling
	const sizeClass = $derived(
		size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-1.5' : ''
	);
</script>

<Badge {variant} class={sizeClass}>
	{label}
</Badge>
