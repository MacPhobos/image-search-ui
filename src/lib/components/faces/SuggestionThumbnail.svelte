<script lang="ts">
	import type { FaceSuggestion } from '$lib/api/faces';
	import FaceThumbnail from './FaceThumbnail.svelte';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { ComponentProps } from 'svelte';

	interface Props {
		suggestion: FaceSuggestion;
		selected: boolean;
		onSelect: (id: number, selected: boolean) => void;
		onClick: () => void;
	}

	let { suggestion, selected, onSelect, onClick }: Props = $props();

	const confidencePercent = $derived(Math.round(suggestion.confidence * 100));

	// Map confidence to badge variant
	function getConfidenceVariant(confidence: number): ComponentProps<Badge>['variant'] {
		if (confidence >= 0.7) return 'success';
		if (confidence >= 0.5) return 'warning';
		return 'destructive';
	}

	// Map status to badge variant
	function getStatusVariant(status: FaceSuggestion['status']): ComponentProps<Badge>['variant'] {
		switch (status) {
			case 'accepted':
				return 'success';
			case 'rejected':
				return 'destructive';
			case 'expired':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	const confidenceVariant = $derived(getConfidenceVariant(suggestion.confidence));
	const statusVariant = $derived(getStatusVariant(suggestion.status));

	// Extract asset ID from faceThumbnailUrl (e.g., /api/v1/images/123/thumbnail)
	const assetId = $derived.by(() => {
		if (!suggestion.faceThumbnailUrl) return null;
		const match = suggestion.faceThumbnailUrl.match(/\/images\/(\d+)\/thumbnail/);
		return match ? parseInt(match[1], 10) : null;
	});

	// Get cached thumbnail data URI
	const cachedThumbnail = $derived(assetId ? thumbnailCache.get(assetId) : undefined);
	const isLoading = $derived(assetId ? thumbnailCache.isPending(assetId) : false);

	function handleCheckboxChange(checked: boolean) {
		onSelect(suggestion.id, checked);
	}

	function handleClick() {
		onClick();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick();
		}
	}
</script>

<div
	class="thumbnail-container"
	class:selected
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role="button"
	tabindex={0}
	aria-label="Face suggestion for {suggestion.personName ||
		'Unknown'} with {confidencePercent}% confidence"
>
	<!-- Selection checkbox (top-left, only for pending) -->
	{#if suggestion.status === 'pending'}
		<div
			class="checkbox-container"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="none"
		>
			<Checkbox
				checked={selected}
				onCheckedChange={handleCheckboxChange}
				aria-label="Select suggestion"
			/>
		</div>
	{/if}

	<!-- Face thumbnail -->
	<FaceThumbnail
		thumbnailUrl={suggestion.faceThumbnailUrl || ''}
		dataUri={cachedThumbnail}
		{isLoading}
		size={128}
		alt="Face for {suggestion.personName || 'Unknown'}"
		square={true}
	/>

	<!-- Confidence badge (bottom-right corner) -->
	<div class="confidence-badge">
		<Badge variant={confidenceVariant} class="text-[0.625rem] font-bold px-1 py-0 h-auto">
			{confidencePercent}%
		</Badge>
	</div>

	<!-- Status indicator for non-pending -->
	{#if suggestion.status !== 'pending'}
		<div class="status-badge">
			<Badge
				variant={statusVariant}
				class="w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
			>
				{#if suggestion.status === 'accepted'}
					✓
				{:else if suggestion.status === 'rejected'}
					✗
				{:else}
					!
				{/if}
			</Badge>
		</div>
	{/if}
</div>

<style>
	.thumbnail-container {
		position: relative;
		width: 128px;
		height: 128px;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		border-radius: 8px;
	}

	.thumbnail-container:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.thumbnail-container:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.thumbnail-container.selected {
		transform: scale(1.05);
		box-shadow: 0 0 0 3px #4a90e2;
	}

	.checkbox-container {
		position: absolute;
		top: 4px;
		left: 4px;
		z-index: 10;
		background-color: rgba(255, 255, 255, 0.95);
		border-radius: 4px;
		padding: 2px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.confidence-badge {
		position: absolute;
		bottom: 2px;
		right: 2px;
		pointer-events: none;
	}

	.status-badge {
		position: absolute;
		top: 2px;
		right: 2px;
		pointer-events: none;
	}
</style>
