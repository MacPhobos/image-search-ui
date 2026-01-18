<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let { ref = $bindable(null), ...restProps }: DialogPrimitive.TriggerProps = $props();
</script>

<DialogPrimitive.Trigger bind:ref data-slot="dialog-trigger" {...restProps} />
