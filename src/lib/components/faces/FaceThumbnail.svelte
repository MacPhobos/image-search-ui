<script lang="ts">
	import type { BoundingBox } from '$lib/types';
	import { API_BASE_URL } from '$lib/api/client';

	interface Props {
		/** URL path to the photo thumbnail (relative to API base or absolute) */
		thumbnailUrl: string;
		/** Face bounding box coordinates (optional for cropping) */
		bbox?: BoundingBox | null;
		/** Display size of the face thumbnail in pixels */
		size?: number;
		/** Alt text for accessibility */
		alt?: string;
		/** Additional CSS class */
		class?: string;
		/** Whether to show a square instead of circle */
		square?: boolean;
	}

	let {
		thumbnailUrl,
		bbox = null,
		size = 64,
		alt = 'Face',
		class: className = '',
		square = false
	}: Props = $props();

	let hasError = $state(false);

	function getImageUrl(): string {
		if (!thumbnailUrl) return '';
		// If thumbnailUrl is already absolute, use it directly
		if (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) {
			return thumbnailUrl;
		}
		return `${API_BASE_URL}${thumbnailUrl}`;
	}

	/**
	 * Calculate object-position to center on the face.
	 * Uses percentage-based positioning relative to the image.
	 */
	function getObjectPosition(): string {
		if (!bbox) return 'center center';

		// Calculate center of the face as a percentage of the image
		// We assume the thumbnail maintains aspect ratio
		// This is an approximation since we don't know actual dimensions
		// Position values: percentage from left/top
		// We'll use bbox center as the focus point
		// Note: This works best when bbox coordinates are relative to a known image size
		// For now, we'll use a simple heuristic assuming typical image dimensions
		const assumedWidth = 800; // Assumed typical image width
		const assumedHeight = 600; // Assumed typical image height

		const centerX = ((bbox.x + bbox.width / 2) / assumedWidth) * 100;
		const centerY = ((bbox.y + bbox.height / 2) / assumedHeight) * 100;

		// Clamp values to reasonable range
		const posX = Math.max(0, Math.min(100, centerX));
		const posY = Math.max(0, Math.min(100, centerY));

		return `${posX.toFixed(0)}% ${posY.toFixed(0)}%`;
	}

	function handleError() {
		hasError = true;
	}
</script>

<div
	class="face-thumbnail {className}"
	class:square
	style="width: {size}px; height: {size}px;"
	role="img"
	aria-label={alt}
>
	{#if hasError || !thumbnailUrl}
		<div class="placeholder">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="8" r="4" />
				<path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
			</svg>
		</div>
	{:else}
		<img
			src={getImageUrl()}
			{alt}
			loading="lazy"
			style="object-position: {getObjectPosition()};"
			onerror={handleError}
		/>
	{/if}
</div>

<style>
	.face-thumbnail {
		border-radius: 50%;
		overflow: hidden;
		background-color: #e8e8e8;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.face-thumbnail.square {
		border-radius: 8px;
	}

	.face-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
		color: white;
	}

	.placeholder svg {
		width: 50%;
		height: 50%;
		opacity: 0.8;
	}
</style>
