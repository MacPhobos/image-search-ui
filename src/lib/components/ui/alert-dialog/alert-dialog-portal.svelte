<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

	let { ...restProps }: AlertDialogPrimitive.PortalProps = $props();
</script>

<AlertDialogPrimitive.Portal {...restProps} />
