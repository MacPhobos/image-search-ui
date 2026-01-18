<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Tooltip as TooltipPrimitive } from 'bits-ui';

	let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps = $props();
</script>

<TooltipPrimitive.Root bind:open {...restProps} />
