<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import CoverageIndicator from '$lib/components/faces/CoverageIndicator.svelte';
	import type { TemporalCoverage } from '$lib/types';

	interface Props {
		coverage: TemporalCoverage;
		compact?: boolean;
	}

	let { coverage, compact = false }: Props = $props();
</script>

<Tooltip.Provider>
	<CoverageIndicator {coverage} {compact} />
</Tooltip.Provider>
