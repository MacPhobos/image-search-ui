<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import UnifiedPersonCard from '$lib/components/faces/UnifiedPersonCard.svelte';
	import type { UnifiedPerson } from '$lib/types';

	interface Props {
		person: UnifiedPerson;
		onClick?: () => void;
		onAssign?: () => void;
		selected?: boolean;
		showAssignButton?: boolean;
	}

	let { person, onClick, onAssign, selected = false, showAssignButton = false }: Props = $props();
</script>

<Tooltip.Provider>
	<UnifiedPersonCard {person} {onClick} {onAssign} {selected} {showAssignButton} />
</Tooltip.Provider>
