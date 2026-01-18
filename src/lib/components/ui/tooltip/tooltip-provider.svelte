<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Tooltip as TooltipPrimitive } from 'bits-ui';

	let { ...restProps }: TooltipPrimitive.ProviderProps = $props();
</script>

<TooltipPrimitive.Provider {...restProps} />
