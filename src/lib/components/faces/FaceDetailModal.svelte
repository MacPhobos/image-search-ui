<script lang="ts">
	/**
	 * FaceDetailModal - Shows full image with face bounding boxes for unlabeled faces.
	 *
	 * A simpler alternative to SuggestionDetailModal, used in the "Suggested New Persons" tab.
	 * Displays the full image with bounding box overlays highlighting all detected faces,
	 * with the selected face highlighted differently, plus a sidebar with basic face info.
	 */
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import { API_BASE_URL } from '$lib/api/client';
	import { getFacesForAsset, type FaceInGroupResponse, type FaceInstance } from '$lib/api/faces';
	import ImageWithFaceBoundingBoxes, {
		type FaceBox
	} from '$lib/components/faces/ImageWithFaceBoundingBoxes.svelte';
	import { getFaceColorByIndex } from '$lib/components/faces/face-colors';
	import * as Dialog from '$lib/components/ui/dialog';

	// Component tracking for modals (visibility-based, not mount-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	interface Props {
		/** The face to display details for. null = modal closed. */
		face: FaceInGroupResponse | null;
		/** Callback when the modal is closed. */
		onClose: () => void;
	}

	let { face, onClose }: Props = $props();

	// Derive open state from face
	let open = $derived(face !== null);

	// Track component visibility
	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('FaceDetailModal', {
					filePath: 'src/lib/components/faces/FaceDetailModal.svelte'
				})
			);
		} else if (trackingCleanup) {
			trackingCleanup();
			trackingCleanup = null;
		}

		return () => {
			if (trackingCleanup) {
				trackingCleanup();
				trackingCleanup = null;
			}
		};
	});

	// All faces in the image
	let allFaces = $state<FaceInstance[]>([]);
	let facesLoading = $state(false);
	let facesError = $state<string | null>(null);

	// Face highlight state
	let highlightedFaceId = $state<string | null>(null);

	// Derive the asset ID from the face
	const assetId = $derived.by(() => {
		if (!face) return null;
		const id = parseInt(face.assetId, 10);
		return isNaN(id) ? null : id;
	});

	// Construct the full image URL
	const fullImageUrl = $derived.by(() => {
		if (!assetId) return null;
		return `${API_BASE_URL}/api/v1/images/${assetId}/full`;
	});

	// Build FaceBox array for the bounding box overlay
	const faceBoxes = $derived<FaceBox[]>(
		(() => {
			if (!face) return [];

			return allFaces.map((f, index) => {
				const isPrimaryFace = f.id === face.faceInstanceId;

				let labelStyle: FaceBox['labelStyle'];
				let label: string;

				if (isPrimaryFace) {
					labelStyle = 'suggested';
					label = 'Selected Face';
				} else if (f.personName) {
					labelStyle = 'assigned';
					label = f.personName;
				} else {
					labelStyle = 'unknown';
					label = 'Unknown';
				}

				return {
					id: f.id,
					bboxX: f.bbox.x,
					bboxY: f.bbox.y,
					bboxW: f.bbox.width,
					bboxH: f.bbox.height,
					label,
					labelStyle,
					color: getFaceColorByIndex(index)
				};
			});
		})()
	);

	// Track the current abort controller for cleanup
	let abortController: AbortController | null = null;

	// Load all faces when the face prop changes
	$effect(() => {
		const currentAssetId = assetId;
		const currentFace = face;

		if (!currentFace || !currentAssetId) {
			allFaces = [];
			facesLoading = false;
			facesError = null;
			return;
		}

		// Abort any pending requests
		if (abortController) {
			abortController.abort();
		}
		abortController = new AbortController();
		const controller = abortController;

		facesLoading = true;
		facesError = null;

		getFacesForAsset(currentAssetId)
			.then((response) => {
				if (controller.signal.aborted) return;
				allFaces = response.items;
				facesLoading = false;
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				if (err.name !== 'AbortError') {
					facesError = err instanceof Error ? err.message : 'Failed to load faces';
					facesLoading = false;
				}
			});

		return () => {
			controller.abort();
		};
	});

	function handleFaceClick(faceId: string) {
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			onClose();
		}
	}

	function formatScore(value: number | null | undefined): string {
		if (value == null) return '--';
		return value.toFixed(3);
	}

	function formatPercent(value: number | null | undefined): string {
		if (value == null) return '--';
		return `${(value * 100).toFixed(1)}%`;
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="!max-w-[95vw] !max-h-[95vh] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col"
		onInteractOutside={(e) => e.preventDefault()}
	>
		<Dialog.Header class="px-6 py-4 border-b flex-shrink-0">
			<div class="flex flex-col gap-1 flex-1">
				<Dialog.Title>Face Detail</Dialog.Title>
				{#if face}
					<p class="text-sm text-muted-foreground">
						Asset #{face.assetId}
						{#if allFaces.length > 0}
							&middot; {allFaces.length} face{allFaces.length !== 1 ? 's' : ''} detected
						{/if}
					</p>
				{/if}
			</div>
		</Dialog.Header>

		{#if face}
			<div class="modal-body">
				<!-- Image container -->
				<div class="image-container">
					{#if fullImageUrl}
						<ImageWithFaceBoundingBoxes
							imageUrl={fullImageUrl}
							faces={faceBoxes}
							primaryFaceId={face.faceInstanceId}
							{highlightedFaceId}
							onFaceClick={handleFaceClick}
							maxHeight="75vh"
						/>
					{:else}
						<div class="image-placeholder">
							<span class="text-muted-foreground">Image not available</span>
						</div>
					{/if}
				</div>

				<!-- Sidebar with face info -->
				<aside class="face-sidebar" aria-label="Face details">
					<!-- Selected face info -->
					<div class="sidebar-section">
						<h3 class="sidebar-heading">Selected Face</h3>
						<dl class="info-grid">
							<dt>Quality Score</dt>
							<dd>{formatScore(face.qualityScore)}</dd>
							<dt>Detection Confidence</dt>
							<dd>{formatPercent(face.detectionConfidence)}</dd>
							<dt>Bounding Box</dt>
							<dd class="font-mono text-xs">
								{face.bboxX.toFixed(0)}, {face.bboxY.toFixed(0)}
								&ndash; {face.bboxW.toFixed(0)}&times;{face.bboxH.toFixed(0)}
							</dd>
							<dt>Face ID</dt>
							<dd class="font-mono text-xs truncate" title={face.faceInstanceId}>
								{face.faceInstanceId.slice(0, 8)}...
							</dd>
						</dl>
					</div>

					<!-- All faces in image -->
					{#if facesLoading}
						<div class="sidebar-section">
							<h3 class="sidebar-heading">Faces in Image</h3>
							<p class="text-sm text-muted-foreground">Loading faces...</p>
						</div>
					{:else if facesError}
						<div class="sidebar-section">
							<h3 class="sidebar-heading">Faces in Image</h3>
							<p class="text-sm text-red-600">{facesError}</p>
						</div>
					{:else if allFaces.length > 0}
						<div class="sidebar-section">
							<h3 class="sidebar-heading">
								All Faces ({allFaces.length})
							</h3>
							<ul class="face-list">
								{#each allFaces as f, index (f.id)}
									{@const isPrimary = f.id === face.faceInstanceId}
									{@const isHighlighted = f.id === highlightedFaceId}
									<li>
										<button
											type="button"
											class="face-list-item"
											class:primary={isPrimary}
											class:highlighted={isHighlighted}
											onclick={() => handleFaceClick(f.id)}
										>
											<span
												class="color-dot"
												style="background-color: {getFaceColorByIndex(index)};"
											></span>
											<span class="face-list-label">
												{#if isPrimary}
													Selected Face
												{:else if f.personName}
													{f.personName}
												{:else}
													Unknown
												{/if}
											</span>
											<span class="face-list-quality">
												Q: {formatScore(f.qualityScore)}
											</span>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</aside>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.modal-body {
		display: flex;
		flex: 1;
		overflow: hidden;
		min-height: 0;
	}

	.image-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: auto;
		padding: 1rem;
		background-color: #1a1a2e;
		min-width: 0;
	}

	.image-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		min-height: 200px;
	}

	.face-sidebar {
		width: 280px;
		flex-shrink: 0;
		border-left: 1px solid hsl(var(--border));
		overflow-y: auto;
		background-color: hsl(var(--background));
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sidebar-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sidebar-heading {
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		border-bottom: 1px solid hsl(var(--border));
		padding-bottom: 0.375rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 0.75rem;
		font-size: 0.75rem;
	}

	.info-grid dt {
		color: hsl(var(--muted-foreground));
		white-space: nowrap;
	}

	.info-grid dd {
		color: hsl(var(--foreground));
		margin: 0;
		text-align: right;
	}

	.face-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.face-list-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 6px;
		background: none;
		cursor: pointer;
		font-size: 0.75rem;
		transition:
			background-color 0.15s,
			border-color 0.15s;
		text-align: left;
	}

	.face-list-item:hover {
		background-color: hsl(var(--muted));
		border-color: hsl(var(--border));
	}

	.face-list-item.primary {
		background-color: hsl(var(--accent));
		border-color: hsl(var(--accent));
		font-weight: 600;
	}

	.face-list-item.highlighted {
		background-color: hsl(var(--accent));
		border-color: hsl(var(--ring));
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.face-list-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: hsl(var(--foreground));
	}

	.face-list-quality {
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
		font-size: 0.6875rem;
	}
</style>
