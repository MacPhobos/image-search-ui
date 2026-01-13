<script lang="ts">
	import FaceThumbnail from './FaceThumbnail.svelte';
	import type { FaceInstance } from '$lib/api/faces';

	interface Props {
		face: FaceInstance;
		totalFacesInImage: number;
		onClick: () => void;
	}

	let { face, totalFacesInImage, onClick }: Props = $props();

	// Format quality score as percentage
	let qualityPercent = $derived(((face.qualityScore ?? 0) * 100).toFixed(0));
</script>

<button type="button" class="cluster-face-card" onclick={onClick}>
	<!-- Full image thumbnail (top section) -->
	<div class="full-image-section">
		<img
			src="/api/v1/images/{face.assetId}/thumbnail"
			alt="Photo {face.assetId}"
			class="full-image-thumbnail"
			loading="lazy"
		/>
	</div>

	<!-- Face detail section (bottom section) -->
	<div class="face-detail-section">
		<!-- Zoomed face using FaceThumbnail component -->
		<div class="face-zoom">
			<FaceThumbnail
				thumbnailUrl="/api/v1/images/{face.assetId}/thumbnail"
				bbox={face.bbox}
				size={80}
				alt="Face from photo {face.assetId}"
				square={true}
			/>
		</div>

		<!-- Face metadata -->
		<div class="face-metadata">
			<div class="quality-score">Quality: {qualityPercent}%</div>
			{#if totalFacesInImage > 1}
				<div class="face-count-badge">{totalFacesInImage} faces</div>
			{/if}
		</div>
	</div>
</button>

<style>
	.cluster-face-card {
		display: flex;
		flex-direction: column;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		overflow: hidden;
		background: white;
		cursor: pointer;
		transition:
			box-shadow 0.2s,
			transform 0.1s;
		padding: 0;
		width: 100%;
	}

	.cluster-face-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.cluster-face-card:active {
		transform: translateY(0);
	}

	/* Full image section (top) */
	.full-image-section {
		width: 100%;
		height: 160px;
		overflow: hidden;
		background-color: #f5f5f5;
		border-bottom: 1px solid #e0e0e0;
	}

	.full-image-thumbnail {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Face detail section (bottom) */
	.face-detail-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background-color: white;
	}

	.face-zoom {
		flex-shrink: 0;
	}

	.face-metadata {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.quality-score {
		font-size: 0.75rem;
		color: #666;
		font-weight: 500;
	}

	.face-count-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.5rem;
		background-color: #e3f2fd;
		color: #1976d2;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 500;
		white-space: nowrap;
		align-self: flex-start;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.full-image-section {
			height: 140px;
		}

		.face-detail-section {
			padding: 0.5rem;
			gap: 0.5rem;
		}

		.quality-score {
			font-size: 0.7rem;
		}

		.face-count-badge {
			font-size: 0.65rem;
		}
	}
</style>
