<script lang="ts">
	import type { FaceSuggestion } from '$lib/api/faces';
	import FaceThumbnail from './FaceThumbnail.svelte';

	interface Props {
		suggestion: FaceSuggestion;
		selected: boolean;
		onSelect: (id: number, selected: boolean) => void;
		onClick: () => void;
	}

	let { suggestion, selected, onSelect, onClick }: Props = $props();

	const confidencePercent = $derived(Math.round(suggestion.confidence * 100));
	const confidenceColor = $derived(
		suggestion.confidence >= 0.9
			? '#22c55e' // green-600
			: suggestion.confidence >= 0.8
				? '#eab308' // yellow-500
				: '#f97316' // orange-500
	);

	function handleCheckbox(e: Event) {
		e.stopPropagation();
		const target = e.target as HTMLInputElement;
		onSelect(suggestion.id, target.checked);
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
		<div class="checkbox-container">
			<input
				type="checkbox"
				checked={selected}
				onchange={handleCheckbox}
				class="checkbox"
				aria-label="Select suggestion"
			/>
		</div>
	{/if}

	<!-- Face thumbnail -->
	<FaceThumbnail
		thumbnailUrl={suggestion.faceThumbnailUrl || ''}
		size={128}
		alt="Face for {suggestion.personName || 'Unknown'}"
		square={true}
	/>

	<!-- Confidence badge (bottom-right corner) -->
	<div class="confidence-badge" style="background-color: {confidenceColor}">
		{confidencePercent}%
	</div>

	<!-- Status indicator for non-pending -->
	{#if suggestion.status !== 'pending'}
		<div
			class="status-badge {suggestion.status === 'accepted'
				? 'accepted'
				: suggestion.status === 'rejected'
					? 'rejected'
					: 'expired'}"
		>
			{#if suggestion.status === 'accepted'}
				✓
			{:else if suggestion.status === 'rejected'}
				✗
			{:else}
				!
			{/if}
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
		top: 2px;
		left: 2px;
		z-index: 10;
		background-color: rgba(255, 255, 255, 0.95);
		border-radius: 3px;
		padding: 2px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.checkbox {
		display: block;
		width: 14px;
		height: 14px;
		cursor: pointer;
		margin: 0;
	}

	.confidence-badge {
		position: absolute;
		bottom: 2px;
		right: 2px;
		padding: 2px 4px;
		border-radius: 4px;
		font-size: 0.625rem;
		font-weight: 700;
		color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	.status-badge {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	.status-badge.accepted {
		background-color: #22c55e;
	}

	.status-badge.rejected {
		background-color: #ef4444;
	}

	.status-badge.expired {
		background-color: #94a3b8;
	}
</style>
