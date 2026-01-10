<script lang="ts">
	import type { FaceInstance, FaceSuggestionItem } from '$lib/api/faces';
	import { getFaceColorByIndex } from './face-colors';
	import { Button } from '$lib/components/ui/button';

	interface FaceSuggestionsState {
		suggestions: FaceSuggestionItem[];
		loading: boolean;
		error: string | null;
	}

	interface Props {
		faces: FaceInstance[];
		highlightedFaceId?: string | null;
		primaryFaceId?: string | null;
		currentPersonId?: string | null;
		faceSuggestions?: Map<string, FaceSuggestionsState>;
		showUnassignButton?: boolean;
		showPinButton?: boolean;
		showSuggestions?: boolean;
		onFaceClick: (faceId: string) => void;
		onAssignClick?: (faceId: string) => void;
		onUnassignClick?: (faceId: string) => void;
		onPinClick?: (faceId: string) => void;
		onSuggestionAccept?: (faceId: string, personId: string, personName: string) => void;
	}

	let {
		faces,
		highlightedFaceId = null,
		primaryFaceId = null,
		currentPersonId = null,
		faceSuggestions = new Map(),
		showUnassignButton = true,
		showPinButton = true,
		showSuggestions = true,
		onFaceClick,
		onAssignClick,
		onUnassignClick,
		onPinClick,
		onSuggestionAccept
	}: Props = $props();

	// Track face list item elements for scroll-into-view functionality
	let faceListItems = $state<Map<string, HTMLLIElement>>(new Map());

	/**
	 * Get face label (person name or "Unknown")
	 */
	function getFaceLabel(face: FaceInstance): string {
		if (face.personName) return face.personName;
		return 'Unknown';
	}

	/**
	 * Get face color based on index
	 */
	function getFaceColor(face: FaceInstance): string {
		const index = faces.findIndex((f) => f.id === face.id);
		return getFaceColorByIndex(index >= 0 ? index : 0);
	}

	/**
	 * Format age display for face
	 */
	function formatAgeDisplay(age: number | null | undefined): string {
		if (age === null || age === undefined) return '';
		return ` (Age ${age})`;
	}

	/**
	 * Handle face click (bidirectional selection)
	 */
	function handleFaceClick(faceId: string) {
		onFaceClick(faceId);
	}

	/**
	 * Svelte action to register face list item element for scroll-into-view
	 */
	function registerFaceListItem(node: HTMLLIElement, faceId: string) {
		faceListItems.set(faceId, node);
		return {
			destroy() {
				faceListItems.delete(faceId);
			}
		};
	}

	// Export reference type for parent components
	export interface FaceListItemRef {
		element: HTMLLIElement;
		scrollIntoView: () => void;
	}

	/**
	 * Public method to scroll to a face in the list
	 * Parent components can use this via component binding
	 */
	export function scrollToFace(faceId: string): void {
		const element = faceListItems.get(faceId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}
</script>

<aside class="face-sidebar" aria-label="Detected faces">
	<h3>Faces ({faces.length})</h3>
	<ul class="face-list">
		{#each faces as face (face.id)}
			{@const isPrimary = primaryFaceId && face.id === primaryFaceId}
			{@const isCurrentPerson = currentPersonId && face.personId === currentPersonId}
			{@const suggestionState = faceSuggestions.get(face.id)}
			{@const topSuggestion = suggestionState?.suggestions?.[0]}
			{@const isHighlighted = highlightedFaceId === face.id}

			<li
				use:registerFaceListItem={face.id}
				class="face-item"
				class:highlighted={isHighlighted}
				class:primary={isPrimary}
				style="--highlight-color: {getFaceColor(face)};"
			>
				<div class="face-item-content">
					<button
						type="button"
						class="face-item-button"
						onclick={() => handleFaceClick(face.id)}
						aria-label="Highlight face of {getFaceLabel(face)}"
					>
						<span
							class="face-indicator"
							class:current-person={isCurrentPerson}
							class:other-person={face.personId && !isCurrentPerson}
							style="background-color: {getFaceColor(face)};"
						></span>
						<div class="face-info">
							<span class="face-name">
								{#if isPrimary}
									<span class="primary-badge">Primary</span>
								{/if}
								{getFaceLabel(face)}{formatAgeDisplay(face.personAgeAtPhoto)}
								{#if isCurrentPerson}
									<span class="current-badge">(current)</span>
								{/if}
							</span>
							<span class="face-meta">
								<span
									title="How confident the AI is that this region contains a face (not person matching)"
								>
									IsFace: {(face.detectionConfidence * 100).toFixed(0)}%
								</span>
								{#if face.qualityScore !== null}
									<span title="Face quality based on clarity, lighting, and pose">
										| Quality: {face.qualityScore.toFixed(1)}
									</span>
								{/if}
							</span>
						</div>
					</button>

					<!-- Assign button for unknown faces -->
					{#if !face.personName && onAssignClick}
						<Button
							size="sm"
							class="flex-shrink-0 mr-2 h-6 px-2 text-xs"
							onclick={(e) => {
								e.stopPropagation();
								onAssignClick(face.id);
							}}
							aria-label="Assign this face to a person"
						>
							Assign
						</Button>
					{/if}

					<!-- Unassign button for assigned faces -->
					{#if face.personName && showUnassignButton && onUnassignClick}
						<Button
							variant="destructive"
							size="icon-sm"
							class="flex-shrink-0 mr-2 h-6 w-6 rounded-full"
							onclick={(e) => {
								e.stopPropagation();
								onUnassignClick(face.id);
							}}
							aria-label="Unassign this face from {face.personName}"
							title="Remove label"
						>
							✕
						</Button>
					{/if}
				</div>

				<!-- Suggestion indicator for unknown faces -->
				{#if !face.personName && showSuggestions && topSuggestion && onSuggestionAccept}
					<div class="suggestion-hint">
						<span class="suggestion-icon">💡</span>
						<span class="suggestion-text">
							Suggested: {topSuggestion.personName} ({Math.round(
								topSuggestion.confidence * 100
							)}%)
						</span>
						<Button
							size="sm"
							class="flex-shrink-0 h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
							onclick={() =>
								onSuggestionAccept?.(
									face.id,
									topSuggestion.personId,
									topSuggestion.personName
								)}
							title="Accept suggestion"
						>
							✓ Accept
						</Button>
					</div>
				{/if}

				<!-- Pin as Prototype button for assigned faces -->
				{#if face.personId && showPinButton && onPinClick}
					<div class="pin-prototype-section">
						<Button
							size="sm"
							class="w-full"
							onclick={() => onPinClick?.(face.id)}
							title="Pin this face as a prototype for the person"
						>
							Pin as Prototype
						</Button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</aside>

<style>
	.face-sidebar {
		width: 320px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-left: 1px solid #e5e7eb;
		padding-left: 1rem;
	}

	.face-sidebar h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		flex-shrink: 0;
	}

	.face-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.face-item {
		border-radius: 6px;
		transition:
			background-color 0.25s ease,
			box-shadow 0.25s ease,
			transform 0.15s ease;
	}

	.face-item:hover {
		background-color: #f3f4f6;
	}

	.face-item.highlighted {
		background-color: #e0f2fe;
		box-shadow: inset 4px 0 0 0 var(--highlight-color, #3b82f6);
		outline: 2px solid var(--highlight-color, #3b82f6);
		outline-offset: -2px;
		animation: highlight-pulse 1s ease-out;
	}

	.face-item.primary {
		border: 2px solid #fbbf24;
		background-color: #fef3c7;
	}

	@keyframes highlight-pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.95;
		}
		100% {
			opacity: 1;
		}
	}

	.face-item-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.face-item-button {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex: 1;
		padding: 0.625rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s ease;
	}

	.face-item-button:hover {
		background-color: #f1f5f9;
	}

	.face-item-button:focus {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}

	.face-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.face-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.face-name {
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.primary-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		font-size: 0.6875rem;
		font-weight: 600;
		background-color: #fef3c7;
		color: #92400e;
	}

	.current-badge {
		color: #22c55e;
		font-weight: 600;
		font-size: 0.75rem;
	}

	.face-meta {
		font-size: 0.75rem;
		color: #999;
	}

	/* Suggestion hint styles */
	.suggestion-hint {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		background-color: #fffbeb;
		border: 1px solid #fef3c7;
		border-radius: 6px;
		margin: 0.25rem 0.625rem 0.5rem;
		font-size: 0.75rem;
	}

	.suggestion-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.suggestion-text {
		flex: 1;
		color: #92400e;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Pin prototype styles */
	.pin-prototype-section {
		margin: 0.5rem 0.625rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e0e0e0;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.face-sidebar {
			width: 100%;
			max-height: 250px;
			border-left: none;
			border-top: 1px solid #e5e7eb;
			padding-left: 0;
			padding-top: 1rem;
		}
	}
</style>
