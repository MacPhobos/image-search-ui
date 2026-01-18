<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Select as SelectPrimitive } from 'bits-ui';

	let { ...restProps }: SelectPrimitive.PortalProps = $props();
</script>

<SelectPrimitive.Portal {...restProps} />
