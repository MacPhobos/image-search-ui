<script lang="ts">
	import type { ClusterSummary } from '$lib/types';
	import FaceThumbnail from './FaceThumbnail.svelte';

	interface FaceWithThumbnail {
		id: string;
		thumbnailUrl: string;
	}

	interface Props {
		/** Cluster summary data */
		cluster: ClusterSummary;
		/** Face thumbnails (if available) - maps face ID to thumbnail URL */
		faceThumbnails?: Map<string, string>;
		/** Click handler */
		onClick?: () => void;
		/** Whether the card is selected */
		selected?: boolean;
	}

	let { cluster, faceThumbnails, onClick, selected = false }: Props = $props();

	// Get sample faces with representative face first if available
	let sampleFaces = $derived<FaceWithThumbnail[]>(() => {
		// Start with representative face if available
		let faceIds = cluster.sampleFaceIds.slice();
		if (cluster.representativeFaceId && faceIds.includes(cluster.representativeFaceId)) {
			// Move representative face to the front
			faceIds = [
				cluster.representativeFaceId,
				...faceIds.filter((id) => id !== cluster.representativeFaceId)
			];
		}

		// Take up to 6 faces
		const selectedIds = faceIds.slice(0, 6);

		if (!faceThumbnails || faceThumbnails.size === 0) {
			// Return empty array if no thumbnails available - will show placeholders
			return selectedIds.map((id) => ({
				id,
				thumbnailUrl: ''
			}));
		}

		return selectedIds.map((id) => ({
			id,
			thumbnailUrl: faceThumbnails.get(id) || ''
		}));
	});

	function formatQuality(quality: number | null): string {
		if (quality === null) return 'N/A';
		return (quality * 100).toFixed(0) + '%';
	}

	function shortenClusterId(id: string): string {
		if (id.length <= 8) return id;
		return id.substring(0, 8) + '...';
	}

	function handleClick() {
		onClick?.();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick?.();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<article
	class="cluster-card"
	class:selected
	class:clickable={!!onClick}
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role={onClick ? 'button' : undefined}
	tabindex={onClick ? 0 : undefined}
	aria-label="Face cluster with {cluster.faceCount} faces"
>
	<div class="card-header">
		<div class="cluster-info">
			<span class="face-count">{cluster.faceCount} faces</span>
			{#if cluster.clusterConfidence}
				<span class="confidence-badge" title="Intra-cluster similarity">
					{(cluster.clusterConfidence * 100).toFixed(0)}% match
				</span>
			{/if}
		</div>
		<span class="cluster-id" title={cluster.clusterId}>
			{shortenClusterId(cluster.clusterId)}
		</span>
	</div>

	<div class="faces-preview">
		{#each sampleFaces as face (face.id)}
			<FaceThumbnail thumbnailUrl={face.thumbnailUrl} size={48} alt="Sample face" />
		{/each}
		{#if cluster.faceCount > 6}
			<div class="more-faces">+{cluster.faceCount - 6}</div>
		{/if}
	</div>

	<div class="card-footer">
		<span class="quality-label">
			Avg Quality: <strong>{formatQuality(cluster.avgQuality)}</strong>
		</span>
	</div>
</article>

<style>
	.cluster-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 1rem;
		transition:
			box-shadow 0.2s,
			border-color 0.2s,
			transform 0.2s;
	}

	.cluster-card.clickable {
		cursor: pointer;
	}

	.cluster-card.clickable:hover {
		border-color: #4a90e2;
		box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
		transform: translateY(-2px);
	}

	.cluster-card.selected {
		border-color: #4a90e2;
		background-color: #f0f7ff;
	}

	.cluster-card:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.cluster-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.face-count {
		font-weight: 600;
		font-size: 1rem;
		color: #333;
	}

	.confidence-badge {
		display: inline-block;
		background-color: #e3f2fd;
		color: #1565c0;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.cluster-id {
		font-family: monospace;
		font-size: 0.7rem;
		color: #999;
		background-color: #f5f5f5;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}

	.faces-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		min-height: 48px;
	}

	.more-faces {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background-color: #e0e0e0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: #666;
	}

	.card-footer {
		border-top: 1px solid #f0f0f0;
		padding-top: 0.5rem;
	}

	.quality-label {
		font-size: 0.75rem;
		color: #666;
	}

	.quality-label strong {
		color: #333;
	}
</style>
