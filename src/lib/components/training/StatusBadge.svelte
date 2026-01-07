<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { BadgeProps } from '$lib/components/ui/badge';

	interface Props {
		status: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { status, size = 'md' }: Props = $props();

	// Map training status to Badge variant
	const statusToVariant: Record<string, BadgeProps['variant']> = {
		pending: 'outline',
		running: 'secondary',
		paused: 'outline',
		completed: 'default',
		cancelled: 'outline',
		failed: 'destructive'
	};

	const statusLabels: Record<string, string> = {
		pending: 'Pending',
		running: 'Running',
		paused: 'Paused',
		completed: 'Completed',
		cancelled: 'Cancelled',
		failed: 'Failed'
	};

	const variant = $derived(statusToVariant[status] || 'outline');
	const label = $derived(statusLabels[status] || status);

	// Size classes for custom styling
	const sizeClass = $derived(
		size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-1.5' : ''
	);
</script>

<Badge {variant} class={sizeClass}>
	{label}
</Badge>
