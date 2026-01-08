<script lang="ts">
	import type { FaceSuggestion } from '$lib/api/faces';
	import FaceThumbnail from './FaceThumbnail.svelte';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { ComponentProps } from 'svelte';

	interface Props {
		suggestion: FaceSuggestion;
		selected: boolean;
		onSelect: (id: number, selected: boolean) => void;
		onClick: () => void;
	}

	let { suggestion, selected, onSelect, onClick }: Props = $props();

	const confidencePercent = $derived(Math.round(suggestion.confidence * 100));
	const aggregateConfidencePercent = $derived(
		suggestion.aggregateConfidence ? Math.round(suggestion.aggregateConfidence * 100) : null
	);
	const displayConfidence = $derived(
		aggregateConfidencePercent !== null ? aggregateConfidencePercent : confidencePercent
	);

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

	function getConfidenceTooltip(confidence: number): string {
		const baseMessage =
			confidence >= 0.7
				? 'High confidence - Strong match to this person'
				: confidence >= 0.5
					? 'Medium confidence - Likely match, review recommended'
					: 'Low confidence - Uncertain match, manual verification needed';

		if (suggestion.isMultiPrototypeMatch && suggestion.prototypeMatchCount) {
			return `${baseMessage} (Matched ${suggestion.prototypeMatchCount} prototypes)`;
		}
		return baseMessage;
	}

	function getStatusTooltip(status: FaceSuggestion['status']): string {
		switch (status) {
			case 'accepted':
				return 'This suggestion has been accepted and the face is assigned';
			case 'rejected':
				return 'This suggestion has been rejected';
			case 'expired':
				return 'This suggestion has expired and is no longer active';
			default:
				return 'Pending review';
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
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Badge variant={confidenceVariant} class="text-[0.625rem] font-bold px-1 py-0 h-auto cursor-help">
					{displayConfidence}%
					{#if suggestion.isMultiPrototypeMatch}
						<span class="multi-proto-indicator" title="Multi-prototype match">⚡</span>
					{/if}
				</Badge>
			</Tooltip.Trigger>
			<Tooltip.Content>
				<div class="confidence-tooltip">
					<p class="max-w-xs">{getConfidenceTooltip(displayConfidence)}</p>
					{#if suggestion.isMultiPrototypeMatch && suggestion.prototypeScores}
						<div class="prototype-details">
							<div class="prototype-details-header">Matching Prototypes:</div>
							<ul class="prototype-list">
								{#each Object.entries(suggestion.prototypeScores).slice(0, 5) as [protoId, score]}
									<li class="prototype-item">
										<span class="proto-id">{protoId.slice(0, 8)}...</span>
										<span class="proto-score">{Math.round(score * 100)}%</span>
									</li>
								{/each}
								{#if Object.entries(suggestion.prototypeScores).length > 5}
									<li class="prototype-item-more">
										+{Object.entries(suggestion.prototypeScores).length - 5} more
									</li>
								{/if}
							</ul>
						</div>
					{/if}
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</div>

	<!-- Status indicator for non-pending -->
	{#if suggestion.status !== 'pending'}
		<div class="status-badge">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Badge
						variant={statusVariant}
						class="w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs font-bold cursor-help"
					>
						{#if suggestion.status === 'accepted'}
							✓
						{:else if suggestion.status === 'rejected'}
							✗
						{:else}
							!
						{/if}
					</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>{getStatusTooltip(suggestion.status)}</p>
				</Tooltip.Content>
			</Tooltip.Root>
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

	.multi-proto-indicator {
		margin-left: 2px;
		font-size: 0.7rem;
		opacity: 0.9;
	}

	.confidence-tooltip {
		font-size: 0.875rem;
	}

	.prototype-details {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.prototype-details-header {
		font-size: 0.75rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
		opacity: 0.9;
	}

	.prototype-list {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.75rem;
	}

	.prototype-item {
		display: flex;
		justify-content: space-between;
		padding: 0.15rem 0;
		gap: 0.5rem;
	}

	.prototype-item-more {
		padding: 0.15rem 0;
		font-style: italic;
		opacity: 0.8;
	}

	.proto-id {
		font-family: monospace;
		opacity: 0.8;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.proto-score {
		font-weight: 600;
		color: #22c55e;
	}
</style>
