<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Tooltip as TooltipPrimitive } from 'bits-ui';

	let { ref = $bindable(null), ...restProps }: TooltipPrimitive.TriggerProps = $props();
</script>

<TooltipPrimitive.Trigger bind:ref data-slot="tooltip-trigger" {...restProps} />
