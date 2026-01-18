<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let { ...restProps }: DialogPrimitive.PortalProps = $props();
</script>

<DialogPrimitive.Portal {...restProps} />
