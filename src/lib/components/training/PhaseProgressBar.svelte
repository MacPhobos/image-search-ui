<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import type { components } from '$lib/api/generated';

	type PhaseProgress = components['schemas']['PhaseProgress'];

	interface Props {
		phase: PhaseProgress;
		label: string;
		icon: string;
	}

	// Component tracking (DEV only)
	const cleanup = registerComponent('training/PhaseProgressBar', {
		filePath: 'src/lib/components/training/PhaseProgressBar.svelte'
	});
	onMount(() => cleanup);

	let { phase, label, icon }: Props = $props();

	const statusClass = $derived(() => {
		switch (phase.status) {
			case 'completed':
				return 'text-green-600';
			case 'running':
			case 'processing':
				return 'text-blue-600';
			case 'failed':
				return 'text-red-600';
			default:
				return 'text-gray-400';
		}
	});

	const statusText = $derived(() => {
		switch (phase.status) {
			case 'completed':
				return '✓ Complete';
			case 'running':
			case 'processing':
				return `${phase.progress.percentage.toFixed(0)}%`;
			case 'failed':
				return '✗ Failed';
			default:
				return 'Pending';
		}
	});
</script>

<div class="flex items-center gap-3 p-2 bg-gray-50 rounded">
	<span class="text-xl">{icon}</span>
	<div class="flex-1">
		<div class="flex justify-between items-center mb-1">
			<span class="text-xs font-medium">{label}</span>
			<span
				class="text-xs {statusClass()}"
				class:font-bold={phase.status === 'running' || phase.status === 'processing'}
			>
				{statusText()}
			</span>
		</div>
		{#if phase.status === 'running' || phase.status === 'processing'}
			<Progress value={phase.progress.percentage} max={100} class="h-1" />
		{/if}
	</div>
</div>
