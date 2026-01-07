<script lang="ts">
	import type { UnifiedPersonResponse } from '$lib/api/faces';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';

	interface Props {
		/** Person data (identified, unidentified, or noise) */
		person: UnifiedPersonResponse;
		/** Show assign button for unidentified/noise persons */
		showAssignButton?: boolean;
		/** Click handler */
		onClick?: (person: UnifiedPersonResponse) => void;
		/** Assign handler */
		onAssign?: (person: UnifiedPersonResponse) => void;
		/** Whether the card is selected */
		selected?: boolean;
	}

	let { person, showAssignButton = false, onClick, onAssign, selected = false }: Props = $props();

	// Noise faces are not clickable (no cluster detail page)
	let isClickable = $derived(person.type !== 'noise' && !!onClick);

	// Only add tabindex for clickable elements
	let tabIndexAttr = $derived(isClickable ? { tabindex: 0 } : {});

	// Extract asset ID from thumbnailUrl
	const assetId = $derived.by(() => {
		if (!person.thumbnailUrl) return null;
		const match = person.thumbnailUrl.match(/\/images\/(\d+)\/thumbnail/);
		return match ? parseInt(match[1], 10) : null;
	});

	// Get cached thumbnail
	const cachedThumbnail = $derived(assetId ? thumbnailCache.get(assetId) : undefined);
	const isLoading = $derived(assetId ? thumbnailCache.isPending(assetId) : false);

	function handleClick() {
		// Only trigger onClick if not a noise face
		if (isClickable) {
			onClick?.(person);
		}
	}

	function handleAssign(event: Event) {
		event.stopPropagation();
		// Noise faces can't be assigned (no cluster page)
		if (person.type !== 'noise') {
			onAssign?.(person);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (isClickable) {
				onClick?.(person);
			}
		}
	}

	function getBadgeVariant(type: string): BadgeVariant {
		switch (type) {
			case 'identified':
				return 'success';
			case 'unidentified':
				return 'warning';
			case 'noise':
				return 'destructive';
			default:
				return 'secondary';
		}
	}

	function getBadgeLabel(type: string): string {
		switch (type) {
			case 'identified':
				return 'Identified';
			case 'unidentified':
				return 'Needs Name';
			case 'noise':
				return 'Review';
			default:
				return type;
		}
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	}
</script>

<article
	class="unified-person-card"
	class:selected
	class:clickable={isClickable}
	class:noise={person.type === 'noise'}
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role={isClickable ? 'button' : 'article'}
	{...tabIndexAttr}
	aria-label="Person: {person.name}, {person.faceCount} faces"
>
	<!-- Thumbnail/Avatar -->
	<div class="person-thumbnail">
		{#if isLoading}
			<div class="thumbnail-loading">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
					<path d="M12 2 A10 10 0 0 1 22 12" stroke-linecap="round" />
				</svg>
			</div>
		{:else if cachedThumbnail}
			<img src={cachedThumbnail} alt={person.name} class="thumbnail-image" />
		{:else if person.thumbnailUrl}
			<img src={person.thumbnailUrl} alt={person.name} class="thumbnail-image" />
		{:else}
			<div class="thumbnail-placeholder">{getInitials(person.name)}</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="person-content">
		<div class="person-header">
			<h3 class="person-name">{person.name}</h3>
			<Badge variant={getBadgeVariant(person.type)} class="uppercase">
				{getBadgeLabel(person.type)}
			</Badge>
		</div>

		<div class="person-stats">
			<span class="face-count">
				<strong>{person.faceCount}</strong>
				{person.faceCount === 1 ? 'face' : 'faces'}
			</span>
			{#if person.type === 'unidentified' && person.confidence}
				<span class="confidence">
					<strong>{Math.round(person.confidence * 100)}%</strong> confidence
				</span>
			{/if}
		</div>

		{#if person.type === 'noise'}
			<p class="noise-hint">These faces need individual review and manual grouping.</p>
		{/if}

		{#if showAssignButton && person.type !== 'identified' && person.type !== 'noise'}
			<button
				class="assign-button"
				onclick={handleAssign}
				aria-label="Assign name to {person.name}"
			>
				Assign Name
			</button>
		{/if}
	</div>
</article>

<style>
	.unified-person-card {
		display: flex;
		gap: 1rem;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 1rem;
		transition:
			box-shadow 0.2s,
			border-color 0.2s,
			transform 0.2s;
	}

	.unified-person-card.clickable {
		cursor: pointer;
	}

	.unified-person-card.clickable:hover {
		border-color: #4a90e2;
		box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
		transform: translateY(-2px);
	}

	.unified-person-card.noise {
		opacity: 0.85;
		cursor: default;
	}

	.unified-person-card.noise:hover {
		border-color: #e0e0e0;
		box-shadow: none;
		transform: none;
	}

	.unified-person-card.selected {
		border-color: #4a90e2;
		background-color: #f0f7ff;
	}

	.unified-person-card:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.unified-person-card.noise:focus {
		outline: none;
	}

	.person-thumbnail {
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		border-radius: 8px;
		overflow: hidden;
		background-color: #f5f5f5;
	}

	.thumbnail-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumbnail-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		font-weight: 600;
		font-size: 1.5rem;
	}

	.thumbnail-loading {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
		color: #6366f1;
	}

	.thumbnail-loading svg {
		width: 50%;
		height: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.person-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.person-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.person-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: #333;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.person-stats {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.face-count,
	.confidence {
		font-size: 0.875rem;
		color: #666;
	}

	.face-count strong,
	.confidence strong {
		color: #333;
	}

	.noise-hint {
		font-size: 0.8rem;
		color: #999;
		font-style: italic;
		margin: 0;
		line-height: 1.4;
	}

	.assign-button {
		margin-top: 0.25rem;
		padding: 0.5rem 1rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.1s;
		align-self: flex-start;
	}

	.assign-button:hover {
		background-color: #3a7bc8;
		transform: translateY(-1px);
	}

	.assign-button:active {
		transform: translateY(0);
	}
</style>
