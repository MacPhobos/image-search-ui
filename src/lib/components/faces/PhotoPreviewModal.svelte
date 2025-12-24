<script lang="ts">
	import type { PersonPhotoGroup, FaceInPhoto } from '$lib/api/faces';

	interface Props {
		/** The photo to display */
		photo: PersonPhotoGroup;
		/** The person being reviewed (for highlighting their faces) */
		currentPersonId: string;
		/** Name of current person */
		currentPersonName: string;
		/** Called when modal should close */
		onClose: () => void;
		/** Optional: navigate to previous photo */
		onPrevious?: () => void;
		/** Optional: navigate to next photo */
		onNext?: () => void;
	}

	let { photo, currentPersonId, currentPersonName, onClose, onPrevious, onNext }: Props = $props();

	// State
	let imgElement: HTMLImageElement | undefined = $state();
	let imageLoaded = $state(false);
	let imgWidth = $state(0);
	let imgHeight = $state(0);
	let highlightedFaceId = $state<string | null>(null);

	function handleImageLoad() {
		if (imgElement) {
			imgWidth = imgElement.naturalWidth;
			imgHeight = imgElement.naturalHeight;
			imageLoaded = true;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
		if (event.key === 'ArrowLeft' && onPrevious) {
			onPrevious();
		}
		if (event.key === 'ArrowRight' && onNext) {
			onNext();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleHighlightFace(faceId: string) {
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}

	function getFaceColor(face: FaceInPhoto): string {
		if (face.personId === currentPersonId) return '#22c55e'; // Green - current person
		if (face.personId) return '#eab308'; // Yellow - other person
		return '#6b7280'; // Gray - unlabeled
	}

	function getFaceLabel(face: FaceInPhoto): string {
		if (face.personName) return face.personName;
		return 'Unknown';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal photo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<header class="modal-header">
			<h2 id="modal-title">Photo Preview - {currentPersonName}</h2>
			<button type="button" class="close-button" onclick={onClose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</header>

		<div class="modal-body">
			<!-- Photo container with navigation -->
			<div class="photo-container">
				{#if onPrevious}
					<button
						type="button"
						class="nav-btn prev"
						onclick={onPrevious}
						aria-label="Previous photo"
					>
						‹
					</button>
				{/if}

				<div class="photo-wrapper">
					<img
						src={photo.fullUrl}
						alt="Photo with {photo.faceCount} detected faces"
						bind:this={imgElement}
						onload={handleImageLoad}
					/>

					<!-- SVG overlay for face bounding boxes -->
					{#if imageLoaded && imgWidth > 0 && imgHeight > 0}
						<svg class="face-overlay" viewBox="0 0 {imgWidth} {imgHeight}" aria-hidden="true">
							{#each photo.faces as face (face.faceInstanceId)}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<rect
									x={face.bboxX}
									y={face.bboxY}
									width={face.bboxW}
									height={face.bboxH}
									class="face-box"
									class:current-person={face.personId === currentPersonId}
									class:other-person={face.personId && face.personId !== currentPersonId}
									class:unknown={!face.personId}
									class:highlighted={highlightedFaceId === face.faceInstanceId}
									style="stroke: {getFaceColor(face)};"
									onclick={() => handleHighlightFace(face.faceInstanceId)}
								/>
							{/each}
						</svg>
					{/if}
				</div>

				{#if onNext}
					<button type="button" class="nav-btn next" onclick={onNext} aria-label="Next photo">
						›
					</button>
				{/if}
			</div>

			<!-- Face info sidebar -->
			<aside class="face-sidebar" aria-label="Detected faces">
				<h3>Faces ({photo.faceCount})</h3>
				<ul class="face-list">
					{#each photo.faces as face (face.faceInstanceId)}
						<li
							class="face-item"
							class:highlighted={highlightedFaceId === face.faceInstanceId}
						>
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
							<button
								type="button"
								class="face-item-button"
								onclick={() => handleHighlightFace(face.faceInstanceId)}
								aria-label="Highlight face of {getFaceLabel(face)}"
							>
								<span
									class="face-indicator"
									class:current-person={face.personId === currentPersonId}
									class:other-person={face.personId && face.personId !== currentPersonId}
									style="background-color: {getFaceColor(face)};"
								></span>
								<div class="face-info">
									<span class="face-name">
										{getFaceLabel(face)}
										{#if face.personId === currentPersonId}
											<span class="current-badge">(current)</span>
										{/if}
									</span>
									<span class="face-meta">
										Conf: {(face.detectionConfidence * 100).toFixed(0)}%
										{#if face.qualityScore !== null}
											| Q: {face.qualityScore.toFixed(1)}
										{/if}
									</span>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			</aside>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.photo-preview-modal {
		background: white;
		border-radius: 12px;
		max-width: 95vw;
		max-height: 95vh;
		width: auto;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e0e0e0;
		flex-shrink: 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
	}

	.close-button {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		transition: background-color 0.2s, color 0.2s;
	}

	.close-button:hover {
		background-color: #f0f0f0;
		color: #333;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.modal-body {
		display: flex;
		gap: 1rem;
		overflow: hidden;
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}

	.photo-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-width: 0;
		min-height: 0;
	}

	.photo-wrapper {
		position: relative;
		max-width: 100%;
		max-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.photo-wrapper img {
		max-width: 100%;
		max-height: 80vh;
		width: auto;
		height: auto;
		object-fit: contain;
		display: block;
	}

	.face-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.face-box {
		fill: none;
		stroke-width: 3;
		cursor: pointer;
		pointer-events: auto;
		transition: stroke-width 0.2s;
	}

	.face-box:hover {
		stroke-width: 4;
	}

	.face-box.highlighted {
		stroke-width: 5;
	}

	.face-sidebar {
		width: 280px;
		flex-shrink: 0;
		overflow-y: auto;
		border-left: 1px solid #e5e7eb;
		padding-left: 1rem;
	}

	.face-sidebar h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.face-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.face-item {
		border-radius: 6px;
		transition: background-color 0.2s;
	}

	.face-item:hover,
	.face-item.highlighted {
		background-color: #f3f4f6;
	}

	.face-item-button {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.625rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
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

	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		font-size: 2.5rem;
		background-color: rgba(0, 0, 0, 0.5);
		color: white;
		border: none;
		padding: 1.25rem 0.75rem;
		cursor: pointer;
		z-index: 10;
		line-height: 1;
		transition: background-color 0.2s;
		border-radius: 4px;
	}

	.nav-btn:hover {
		background-color: rgba(0, 0, 0, 0.7);
	}

	.nav-btn.prev {
		left: 0.5rem;
	}

	.nav-btn.next {
		right: 0.5rem;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.modal-body {
			flex-direction: column;
		}

		.face-sidebar {
			width: 100%;
			max-height: 200px;
			border-left: none;
			border-top: 1px solid #e5e7eb;
			padding-left: 0;
			padding-top: 1rem;
		}

		.photo-wrapper {
			max-height: 60vh;
		}

		.photo-wrapper img {
			max-height: 60vh;
		}
	}
</style>
