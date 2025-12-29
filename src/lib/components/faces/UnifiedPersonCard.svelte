<script lang="ts">
	import type { UnifiedPersonResponse } from '$lib/api/faces';

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

	function handleClick() {
		onClick?.(person);
	}

	function handleAssign(event: Event) {
		event.stopPropagation();
		onAssign?.(person);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick?.(person);
		}
	}

	function getBadgeClass(type: string): string {
		switch (type) {
			case 'identified':
				return 'badge-success';
			case 'unidentified':
				return 'badge-warning';
			case 'noise':
				return 'badge-error';
			default:
				return 'badge-neutral';
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
	class:clickable={!!onClick}
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role={onClick ? 'button' : 'article'}
	tabindex={onClick ? 0 : -1}
	aria-label="Person: {person.name}, {person.faceCount} faces"
>
	<!-- Thumbnail/Avatar -->
	<div class="person-thumbnail">
		{#if person.thumbnailUrl}
			<img src={person.thumbnailUrl} alt={person.name} class="thumbnail-image" />
		{:else}
			<div class="thumbnail-placeholder">{getInitials(person.name)}</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="person-content">
		<div class="person-header">
			<h3 class="person-name">{person.name}</h3>
			<span class="type-badge {getBadgeClass(person.type)}">
				{getBadgeLabel(person.type)}
			</span>
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

		{#if showAssignButton && person.type !== 'identified'}
			<button class="assign-button" onclick={handleAssign} aria-label="Assign name to {person.name}">
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

	.unified-person-card.selected {
		border-color: #4a90e2;
		background-color: #f0f7ff;
	}

	.unified-person-card:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
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

	.type-badge {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		flex-shrink: 0;
	}

	.badge-success {
		background-color: #e8f5e9;
		color: #2e7d32;
	}

	.badge-warning {
		background-color: #fff3e0;
		color: #e65100;
	}

	.badge-error {
		background-color: #ffebee;
		color: #c62828;
	}

	.badge-neutral {
		background-color: #f5f5f5;
		color: #666;
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
