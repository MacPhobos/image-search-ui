<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import type { WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		class: className,
		placeholder,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ValueProps> = $props();
</script>

<SelectPrimitive.Value
	data-slot="select-value"
	class={className}
	{placeholder}
	{...restProps}
/>
