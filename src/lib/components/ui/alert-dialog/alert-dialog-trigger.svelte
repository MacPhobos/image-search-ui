<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

	let { ref = $bindable(null), ...restProps }: AlertDialogPrimitive.TriggerProps = $props();
</script>

<AlertDialogPrimitive.Trigger bind:ref data-slot="alert-dialog-trigger" {...restProps} />
