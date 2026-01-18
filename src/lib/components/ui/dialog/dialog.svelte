<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let { open = $bindable(false), ...restProps }: DialogPrimitive.RootProps = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps} />
