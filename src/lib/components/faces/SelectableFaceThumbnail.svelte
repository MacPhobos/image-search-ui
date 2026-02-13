<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { BoundingBox } from '$lib/types';
	import FaceThumbnail from './FaceThumbnail.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		/** URL path to the face thumbnail (relative or absolute) */
		thumbnailUrl: string;
		/** Base64 data URI from thumbnailCache (takes precedence over thumbnailUrl) */
		dataUri?: string | null;
		/** Whether the thumbnail cache is still loading this asset */
		isLoading?: boolean;
		/** Face bounding box for cropping (optional) */
		bbox?: BoundingBox | null;
		/** Display size in pixels (default: 128) */
		size?: number;
		/** Alt text for the image */
		alt?: string;
		/** Whether this thumbnail is currently selected */
		selected: boolean;
		/** Whether the checkbox should be shown (default: true) */
		showCheckbox?: boolean;
		/** Callback when selection state changes via checkbox */
		onSelect: (selected: boolean) => void;
		/** Callback when the thumbnail body is clicked */
		onClick: () => void;
		/** Optional children snippet for badge overlays */
		children?: Snippet;
	}

	let {
		thumbnailUrl,
		dataUri = null,
		isLoading = false,
		bbox = null,
		size = 128,
		alt = 'Face',
		selected,
		showCheckbox = true,
		onSelect,
		onClick,
		children
	}: Props = $props();

	function handleCheckboxChange(checked: boolean) {
		onSelect(checked);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick();
		}
	}
</script>

<div
	class="selectable-thumbnail"
	class:selected
	style="width: {size}px; height: {size}px;"
	onclick={onClick}
	onkeydown={handleKeyDown}
	role="button"
	tabindex={0}
	aria-label={alt}
>
	{#if showCheckbox}
		<div
			class="checkbox-overlay"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="none"
		>
			<Checkbox
				checked={selected}
				onCheckedChange={handleCheckboxChange}
				aria-label="Select face"
			/>
		</div>
	{/if}

	<FaceThumbnail {thumbnailUrl} {dataUri} {isLoading} {bbox} {size} {alt} square={true} />

	{@render children?.()}
</div>

<style>
	.selectable-thumbnail {
		position: relative;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		border-radius: 8px;
	}

	.selectable-thumbnail:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.selectable-thumbnail:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.selectable-thumbnail.selected {
		transform: scale(1.05);
		box-shadow: 0 0 0 3px #4a90e2;
	}

	.checkbox-overlay {
		position: absolute;
		top: 4px;
		left: 4px;
		z-index: 10;
		background-color: rgba(255, 255, 255, 0.95);
		border-radius: 4px;
		padding: 2px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
</style>
