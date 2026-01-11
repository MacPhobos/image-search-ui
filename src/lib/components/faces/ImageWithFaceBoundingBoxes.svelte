<script lang="ts">
	/**
	 * Reusable component for displaying an image with face bounding boxes and labels.
	 *
	 * Handles image loading, dimension detection, and SVG overlay positioning.
	 * Supports different label styles (assigned, suggested, unknown, loading) and
	 * face highlighting with configurable stroke weights.
	 */

	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('faces/ImageWithFaceBoundingBoxes', {
		filePath: 'src/lib/components/faces/ImageWithFaceBoundingBoxes.svelte'
	});
	onMount(() => cleanup);

	export interface FaceBox {
		id: string;
		bboxX: number;
		bboxY: number;
		bboxW: number;
		bboxH: number;
		label: string;
		labelStyle: 'assigned' | 'suggested' | 'unknown' | 'loading';
		color?: string;
		highlighted?: boolean;
		suggestionConfidence?: number; // For suggested style, shown as percentage
	}

	interface Props {
		imageUrl: string;
		faces: FaceBox[];
		highlightedFaceId?: string | null;
		primaryFaceId?: string | null; // For suggestion dialog - more prominent styling
		onFaceClick?: (faceId: string) => void;
		maxHeight?: string; // CSS value like '70vh'
	}

	let {
		imageUrl,
		faces,
		highlightedFaceId = null,
		primaryFaceId = null,
		onFaceClick,
		maxHeight = '100%'
	}: Props = $props();

	// Image loading state
	let imgElement: HTMLImageElement | undefined = $state();
	let imageLoaded = $state(false);
	let imgWidth = $state(0);
	let imgHeight = $state(0);
	let displayHeight = $state(0);

	// ============================================
	// LABEL CONFIGURATION - Responsive font sizing
	// ============================================
	// Target: 3% of displayed image height, converted to SVG coordinates
	const labelFontSize = $derived.by(() => {
		if (!displayHeight || !imgHeight || displayHeight === 0 || imgHeight === 0) {
			return 48; // Fallback for initial render or if dimensions unavailable
		}
		const targetDisplayFontSize = displayHeight * 0.03;
		const scaleFactor = imgHeight / displayHeight;
		return targetDisplayFontSize * scaleFactor;
	});

	// Derived label dimensions (calculated from font size)
	const labelHeight = $derived(labelFontSize + 10);
	const LABEL_GAP = 4; // Gap between bounding box and label
	const labelTextYOffset = $derived(LABEL_GAP + labelFontSize + 2);
	// ============================================

	// Color palette for distinct face colors
	const FACE_COLORS = [
		'#3b82f6', // Blue
		'#22c55e', // Green
		'#f59e0b', // Amber
		'#ef4444', // Red
		'#8b5cf6', // Purple
		'#ec4899', // Pink
		'#14b8a6', // Teal
		'#f97316', // Orange
		'#06b6d4', // Cyan
		'#84cc16' // Lime
	];

	function getFaceColor(face: FaceBox, index: number): string {
		if (face.color) return face.color;
		return FACE_COLORS[index % FACE_COLORS.length];
	}

	function handleImageLoad() {
		if (imgElement) {
			imgWidth = imgElement.naturalWidth;
			imgHeight = imgElement.naturalHeight;
			displayHeight = imgElement.clientHeight;
			imageLoaded = true;
		}
	}

	function handleFaceClick(faceId: string) {
		if (onFaceClick) {
			onFaceClick(faceId);
		}
	}

	function getStrokeWidth(face: FaceBox): number {
		if (face.id === primaryFaceId) return 4;
		if (face.id === highlightedFaceId) return 3;
		return 2;
	}

	function isPrimary(face: FaceBox): boolean {
		return face.id === primaryFaceId;
	}

	function isHighlighted(face: FaceBox): boolean {
		return face.id === highlightedFaceId;
	}
</script>

<div class="image-with-faces" style="--max-height: {maxHeight};">
	<img
		src={imageUrl}
		alt="Image with {faces.length} detected faces"
		bind:this={imgElement}
		onload={handleImageLoad}
	/>

	<!-- SVG overlay for face bounding boxes -->
	{#if imageLoaded && imgWidth > 0 && imgHeight > 0}
		<svg class="face-overlay" viewBox="0 0 {imgWidth} {imgHeight}" aria-hidden="true">
			{#each faces as face, index (face.id)}
				{@const faceColor = getFaceColor(face, index)}
				{@const strokeWidth = getStrokeWidth(face)}
				{@const primary = isPrimary(face)}
				{@const highlighted = isHighlighted(face)}

				<!-- Face bounding box -->
				<rect
					x={face.bboxX}
					y={face.bboxY}
					width={face.bboxW}
					height={face.bboxH}
					class="face-box"
					class:primary
					class:highlighted
					style="stroke: {faceColor}; stroke-width: {strokeWidth};"
					role="button"
					tabindex="0"
					aria-label="Face bounding box - {face.label || 'Unknown'}"
					onclick={() => handleFaceClick(face.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleFaceClick(face.id);
						}
					}}
				/>

				<!-- Label below bounding box -->
				{#if face.labelStyle === 'assigned'}
					<!-- Assigned person label (green background) -->
					<g
						class="face-label assigned-label clickable-label"
						role="button"
						tabindex="0"
						aria-label="Assigned to {face.label}"
						onclick={() => handleFaceClick(face.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleFaceClick(face.id);
							}
						}}
					>
						<rect
							x={face.bboxX}
							y={face.bboxY + face.bboxH + LABEL_GAP}
							width={Math.max(face.bboxW, 100)}
							height={labelHeight}
							rx={4}
							fill="rgba(0, 0, 0, 0.75)"
						/>
						<text
							x={face.bboxX + 8}
							y={face.bboxY + face.bboxH + labelTextYOffset}
							fill="white"
							font-size={labelFontSize}
							font-weight="500"
						>
							{face.label}
						</text>
					</g>
				{:else if face.labelStyle === 'loading'}
					<!-- Loading state (gray, animated) -->
					<g
						class="face-label loading-label clickable-label"
						role="button"
						tabindex="0"
						aria-label="Loading face label"
						onclick={() => handleFaceClick(face.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleFaceClick(face.id);
							}
						}}
					>
						<rect
							x={face.bboxX}
							y={face.bboxY + face.bboxH + LABEL_GAP}
							width={80}
							height={labelHeight}
							rx={4}
							fill="rgba(100, 116, 139, 0.6)"
						/>
						<text
							x={face.bboxX + 8}
							y={face.bboxY + face.bboxH + labelTextYOffset}
							fill="white"
							font-size={labelFontSize}
						>
							{face.label}
						</text>
					</g>
				{:else if face.labelStyle === 'suggested'}
					<!-- Suggested person label (amber background with confidence) -->
					{@const labelText = face.suggestionConfidence
						? `${face.label} (${Math.round(face.suggestionConfidence * 100)}%)`
						: face.label}
					{@const labelWidth = Math.max(face.bboxW, labelText.length * labelFontSize * 0.6)}
					<g
						class="face-label suggestion-label clickable-label"
						role="button"
						tabindex="0"
						aria-label="Suggested: {labelText}"
						onclick={() => handleFaceClick(face.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleFaceClick(face.id);
							}
						}}
					>
						<rect
							x={face.bboxX}
							y={face.bboxY + face.bboxH + LABEL_GAP}
							width={labelWidth}
							height={labelHeight}
							rx={4}
							fill="rgba(234, 179, 8, 0.9)"
						/>
						<text
							x={face.bboxX + 8}
							y={face.bboxY + face.bboxH + labelTextYOffset}
							fill="#422006"
							font-size={labelFontSize}
							font-weight="500"
						>
							{labelText}
						</text>
					</g>
				{:else}
					<!-- Unknown label (gray, italic) -->
					<g
						class="face-label unknown-label clickable-label"
						role="button"
						tabindex="0"
						aria-label="Unknown face"
						onclick={() => handleFaceClick(face.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleFaceClick(face.id);
							}
						}}
					>
						<rect
							x={face.bboxX}
							y={face.bboxY + face.bboxH + LABEL_GAP}
							width={Math.max(face.bboxW, 80)}
							height={labelHeight}
							rx={4}
							fill="rgba(100, 116, 139, 0.85)"
						/>
						<text
							x={face.bboxX + 8}
							y={face.bboxY + face.bboxH + labelTextYOffset}
							fill="white"
							font-size={labelFontSize}
							font-style="italic"
						>
							{face.label}
						</text>
					</g>
				{/if}
			{/each}
		</svg>
	{/if}
</div>

<style>
	.image-with-faces {
		position: relative;
		max-width: 100%;
		max-height: var(--max-height);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-with-faces img {
		max-width: 100%;
		max-height: var(--max-height);
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
		cursor: pointer;
		pointer-events: auto;
		transition:
			stroke-width 0.2s,
			opacity 0.2s;
		opacity: 0.7;
	}

	.face-box:hover {
		stroke-width: 4 !important;
		opacity: 1;
	}

	.face-box.highlighted {
		opacity: 1;
		animation: pulse-box 1.5s ease-in-out infinite;
	}

	.face-box.primary {
		opacity: 1;
		animation: pulse-primary 2s ease-in-out infinite;
	}

	@keyframes pulse-box {
		0%,
		100% {
			stroke-width: 3;
		}
		50% {
			stroke-width: 5;
		}
	}

	@keyframes pulse-primary {
		0%,
		100% {
			stroke-width: 4;
		}
		50% {
			stroke-width: 6;
		}
	}

	.face-label {
		pointer-events: none;
		transition: opacity 0.2s ease;
	}

	.face-label.clickable-label {
		pointer-events: auto;
		cursor: pointer;
	}

	.face-label.clickable-label rect {
		transition: opacity 0.2s ease;
	}

	.face-label.clickable-label:hover rect {
		opacity: 0.9;
	}

	.face-label text {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.loading-label rect {
		animation: loading-pulse 1.5s ease-in-out infinite;
	}

	@keyframes loading-pulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 0.9;
		}
	}
</style>
