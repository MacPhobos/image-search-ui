<script lang="ts">
	/* eslint-disable svelte/valid-compile */
	import { Select as SelectPrimitive } from 'bits-ui';

	let {
		open = $bindable(false),
		value = $bindable(),
		...restProps
	}: SelectPrimitive.RootProps = $props();
</script>

<SelectPrimitive.Root bind:open bind:value={value as never} {...restProps} />
