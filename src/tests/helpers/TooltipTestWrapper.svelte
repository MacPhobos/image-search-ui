<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<Tooltip.Provider>
	{@render children()}
</Tooltip.Provider>
