<script lang="ts">
	import type { SearchResult, Asset } from '$lib/types';
	import { API_BASE_URL } from '$lib/api/client';
	import PhotoPreviewModal from './faces/PhotoPreviewModal.svelte';
	import { getFacesForAsset, transformFaceInstancesToFaceInPhoto } from '$lib/api/faces';
	import type { PersonPhotoGroup, FaceInPhoto } from '$lib/api/faces';
	import { tid } from '$lib/testing/testid';

	interface Props {
		results: SearchResult[];
		loading?: boolean;
		hasSearched?: boolean;
		testId?: string;
	}

	let { results, loading = false, hasSearched = false, testId = 'results-grid' }: Props = $props();

	// Derived scoped test ID generator (reactive to testId changes)
	const t = $derived((...segments: string[]) =>
		segments.length === 0 ? testId : tid(testId, ...segments)
	);

	// Track image load errors per asset ID
	let imageErrors = $state<Set<number>>(new Set());

	// Lightbox state
	let showLightbox = $state(false);
	let lightboxPhoto = $state<PersonPhotoGroup | null>(null);
	let lightboxIndex = $state(0);

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	}

	function formatScore(score: number): string {
		return (score * 100).toFixed(1) + '%';
	}

	function getImageUrl(thumbnailUrl: string): string {
		return `${API_BASE_URL}${thumbnailUrl}`;
	}

	function handleImageError(assetId: number) {
		imageErrors.add(assetId);
		imageErrors = new Set(imageErrors); // Trigger reactivity
	}

	function hasImageError(assetId: number): boolean {
		return imageErrors.has(assetId);
	}

	function createPhotoGroupFromAsset(asset: Asset, faces: FaceInPhoto[] = []): PersonPhotoGroup {
		return {
			photoId: asset.id,
			takenAt: asset.createdAt,
			thumbnailUrl: getImageUrl(asset.thumbnailUrl),
			fullUrl: getImageUrl(asset.url),
			faces,
			faceCount: faces.length,
			hasNonPersonFaces: faces.some((f) => f.personId === null)
		};
	}

	async function handleCardClick(result: SearchResult, index: number) {
		lightboxIndex = index;
		showLightbox = true;

		try {
			// Fetch faces for this asset
			const facesResponse = await getFacesForAsset(result.asset.id);
			const faces = transformFaceInstancesToFaceInPhoto(facesResponse.items);
			lightboxPhoto = createPhotoGroupFromAsset(result.asset, faces);
		} catch (err) {
			console.error('Failed to load faces for asset:', err);
			// Still show the image, just without face data
			lightboxPhoto = createPhotoGroupFromAsset(result.asset, []);
		}
	}

	async function handleLightboxNext() {
		if (lightboxIndex < results.length - 1) {
			await handleCardClick(results[lightboxIndex + 1], lightboxIndex + 1);
		}
	}

	async function handleLightboxPrev() {
		if (lightboxIndex > 0) {
			await handleCardClick(results[lightboxIndex - 1], lightboxIndex - 1);
		}
	}

	function closeLightbox() {
		showLightbox = false;
		lightboxPhoto = null;
	}
</script>

<div class="results-container" data-testid={t()}>
	{#if loading}
		<div class="loading" data-testid={t('loading')}>
			<div class="spinner"></div>
			<p>Searching...</p>
		</div>
	{:else if results.length === 0}
		<div class="empty-state" data-testid={t('empty')}>
			{#if hasSearched}
				<p>No results found. Try a different search query.</p>
			{:else}
				<p>Enter a search query to find images.</p>
			{/if}
		</div>
	{:else}
		<div class="results-header" data-testid={t('header')}>
			<span class="results-count">{results.length} result{results.length !== 1 ? 's' : ''}</span>
		</div>
		<div class="results-grid" data-testid={t('grid')}>
			{#each results as result, index (result.asset.id)}
				<article class="result-card" data-testid={t('card')}>
					<button
						type="button"
						class="result-card-button"
						onclick={() => handleCardClick(result, index)}
						aria-label="View full image: {result.asset.filename}"
					>
						<div class="result-image-container">
							{#if hasImageError(result.asset.id)}
								<div class="result-image-placeholder">
									<span class="filename">{result.asset.filename}</span>
								</div>
							{:else}
								<img
									src={getImageUrl(result.asset.thumbnailUrl)}
									alt={result.asset.filename}
									class="result-image"
									loading="lazy"
									onerror={() => handleImageError(result.asset.id)}
								/>
							{/if}
						</div>
						<div class="result-info">
							<div class="result-path" title={result.asset.path}>
								{result.asset.path}
							</div>
							<div class="result-meta">
								<span class="score" title="Similarity score">
									Cosine Score: {formatScore(result.score)}
								</span>
								<span class="date" title="Created">
									{formatDate(result.asset.createdAt)}
								</span>
							</div>
							{#if result.highlights && result.highlights.length > 0}
								<div class="highlights">
									{#each result.highlights as highlight}
										<span class="highlight-tag">{highlight}</span>
									{/each}
								</div>
							{/if}
						</div>
					</button>
				</article>
			{/each}
		</div>
	{/if}
</div>

<!-- Lightbox Modal -->
{#if showLightbox && lightboxPhoto}
	<PhotoPreviewModal
		photo={lightboxPhoto}
		onClose={closeLightbox}
		onNext={lightboxIndex < results.length - 1 ? handleLightboxNext : undefined}
		onPrevious={lightboxIndex > 0 ? handleLightboxPrev : undefined}
	/>
{/if}

<style>
	.results-container {
		width: 100%;
	}

	.loading {
		text-align: center;
		padding: 3rem;
		color: #666;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #f3f3f3;
		border-top: 3px solid #4a90e2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #666;
	}

	.results-header {
		margin-bottom: 1rem;
	}

	.results-count {
		font-size: 0.875rem;
		color: #666;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.result-card {
		background: white;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.result-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.result-card-button {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}

	.result-card-button:focus {
		outline: none;
	}

	.result-card:focus-within {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.result-image-container {
		width: 100%;
		min-height: 120px;
		max-height: 280px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f0f0f0;
	}

	.result-image {
		max-width: 100%;
		max-height: 280px;
		width: auto;
		height: auto;
		object-fit: contain;
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.result-image-placeholder {
		width: 100%;
		min-height: 120px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.filename {
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		text-align: center;
		word-break: break-all;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.result-info {
		padding: 1rem;
	}

	.result-path {
		font-size: 0.75rem;
		color: #666;
		margin-bottom: 0.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.score {
		background-color: #e8f5e9;
		color: #2e7d32;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.date {
		font-size: 0.75rem;
		color: #999;
	}

	.highlights {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.highlight-tag {
		background-color: #fff3e0;
		color: #e65100;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-size: 0.6875rem;
	}
</style>
