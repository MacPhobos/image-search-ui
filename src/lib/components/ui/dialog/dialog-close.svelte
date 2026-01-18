<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let { ref = $bindable(null), ...restProps }: DialogPrimitive.CloseProps = $props();
</script>

<DialogPrimitive.Close bind:ref data-slot="dialog-close" {...restProps} />
