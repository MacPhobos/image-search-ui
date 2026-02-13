<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		value: number;
		min?: number;
		max?: number;
		step?: number;
	}

	let { value = $bindable(), min = 0.5, max = 0.95, step = 0.01 }: Props = $props();

	const presets = [
		{ label: 'Exploratory', value: 0.5, description: 'More groups, lower confidence' },
		{ label: 'Standard', value: 0.7, description: 'Balanced confidence' },
		{
			label: 'High Confidence',
			value: 0.9,
			description: 'Fewer groups, higher confidence'
		}
	] as const;

	let activePreset = $derived(
		presets.find((p) => Math.abs(p.value - value) < 0.02)?.label ?? 'Custom'
	);
</script>

<div class="rounded-lg border bg-card p-4">
	<div class="mb-3 flex items-center justify-between">
		<label class="text-sm font-medium" for="threshold-slider"> Similarity Threshold </label>
		<div class="flex items-center gap-2">
			<Badge variant={activePreset === 'Custom' ? 'outline' : 'default'}>
				{activePreset}
			</Badge>
			<span class="font-mono text-sm text-muted-foreground">
				{value.toFixed(2)}
			</span>
		</div>
	</div>

	<div class="mb-3 flex gap-2">
		{#each presets as preset}
			<Button
				variant={Math.abs(preset.value - value) < 0.02 ? 'default' : 'outline'}
				size="sm"
				onclick={() => (value = preset.value)}
				title={preset.description}
			>
				{preset.label}
			</Button>
		{/each}
	</div>

	<input id="threshold-slider" type="range" {min} {max} {step} bind:value class="w-full" />
	<div class="mt-1 flex justify-between text-xs text-muted-foreground">
		<span>{min.toFixed(2)} (more groups)</span>
		<span>{max.toFixed(2)} (fewer groups)</span>
	</div>
</div>
