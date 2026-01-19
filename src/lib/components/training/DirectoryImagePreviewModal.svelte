<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import VirtualList from '$lib/components/ui/VirtualList.svelte';
	import {
		previewDirectoryImages,
		getPreviewThumbnailUrl,
		type DirectoryImageInfo
	} from '$lib/api/training';

	interface Props {
		open?: boolean;
		directoryPath: string;
		onClose: () => void;
	}

	let { open = $bindable(false), directoryPath, onClose }: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('DirectoryImagePreviewModal', {
					filePath: 'src/lib/components/training/DirectoryImagePreviewModal.svelte'
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

	// State
	let images = $state<DirectoryImageInfo[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let directoryName = $state<string>('');
	let imageCount = $state(0);

	// Virtual list state - calculate rows based on viewport width
	const THUMBNAIL_SIZE = 200;
	const GAP = 16;
	const CONTAINER_PADDING = 48; // 1.5rem × 2
	let containerWidth = $state(1200); // Initial estimate
	let itemsPerRow = $derived(
		Math.max(2, Math.floor((containerWidth - CONTAINER_PADDING) / (THUMBNAIL_SIZE + GAP)))
	);

	// Calculate rows for virtual list
	interface VirtualRow {
		images: DirectoryImageInfo[];
	}

	let rows = $derived.by((): VirtualRow[] => {
		const result: VirtualRow[] = [];
		for (let i = 0; i < images.length; i += itemsPerRow) {
			result.push({
				images: images.slice(i, i + itemsPerRow)
			});
		}
		return result;
	});

	const rowHeight = THUMBNAIL_SIZE + GAP + 40; // Thumbnail + gap + filename footer

	// Load images when modal opens
	$effect(() => {
		if (open) {
			loadImages();
		}
	});

	async function loadImages() {
		loading = true;
		error = null;

		try {
			const data = await previewDirectoryImages(directoryPath);
			images = data.images;
			directoryName = data.directory.split('/').pop() || data.directory;
			imageCount = data.image_count;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load images';
			images = [];
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			onClose();
		}
	}

	// Update container width on resize
	let containerElement: HTMLElement | null = null;

	function updateContainerWidth() {
		if (containerElement) {
			containerWidth = containerElement.clientWidth;
		}
	}

	onMount(() => {
		updateContainerWidth();
		window.addEventListener('resize', updateContainerWidth);
		return () => {
			window.removeEventListener('resize', updateContainerWidth);
		};
	});
</script>

<svelte:window onresize={updateContainerWidth} />

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="!max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh] p-0 gap-0 flex flex-col"
		showCloseButton={true}
	>
		<Dialog.Header class="border-b px-6 py-4 flex-shrink-0">
			<Dialog.Title class="text-lg font-semibold">
				Image Preview: {directoryName}
			</Dialog.Title>
			<p class="text-sm text-muted-foreground mt-1">
				{directoryPath}
			</p>
		</Dialog.Header>

		<div class="modal-body" bind:this={containerElement}>
			{#if loading}
				<div class="loading-state">
					<div class="spinner" aria-label="Loading images"></div>
					<p>Loading images...</p>
				</div>
			{:else if error}
				<div class="error-state" role="alert">
					<p class="error-message">{error}</p>
					<button type="button" onclick={loadImages} class="retry-button">Retry</button>
				</div>
			{:else if images.length === 0}
				<div class="empty-state">
					<p>No images found in this directory.</p>
				</div>
			{:else}
				<div class="image-count">
					{imageCount} image{imageCount === 1 ? '' : 's'}
				</div>

				<div class="virtual-list-container">
					<VirtualList items={rows} height="calc(90vh - 180px)" itemHeight={rowHeight}>
						{#snippet children({ item })}
							<div class="image-row" style="gap: {GAP}px;">
								{#each item.images as image (image.filename)}
									<div class="thumbnail-card" style="width: {THUMBNAIL_SIZE}px;">
										<img
											src={getPreviewThumbnailUrl(image.full_path)}
											alt={image.filename}
											loading="lazy"
											class="thumbnail-image"
											title={image.filename}
											style="width: {THUMBNAIL_SIZE}px; height: {THUMBNAIL_SIZE}px;"
										/>
										<div class="thumbnail-footer">
											<span class="thumbnail-filename" title={image.filename}>
												{image.filename}
											</span>
										</div>
									</div>
								{/each}
							</div>
						{/snippet}
					</VirtualList>
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	.modal-body {
		flex: 1;
		overflow: hidden;
		padding: 1.5rem;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 1rem;
		color: #6b7280;
	}

	.error-state {
		color: #dc2626;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.retry-button {
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.retry-button:hover {
		background-color: #2563eb;
	}

	.image-count {
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.virtual-list-container {
		flex: 1;
		min-height: 0;
	}

	.image-row {
		display: flex;
		flex-wrap: nowrap;
		padding: 0.5rem 0;
	}

	.thumbnail-card {
		display: flex;
		flex-direction: column;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		background-color: white;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		flex-shrink: 0;
	}

	.thumbnail-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.thumbnail-image {
		object-fit: cover;
		background-color: #f9fafb;
		display: block;
	}

	.thumbnail-footer {
		padding: 0.5rem;
		background-color: #f9fafb;
		border-top: 1px solid #e5e7eb;
	}

	.thumbnail-filename {
		font-size: 0.75rem;
		color: #1f2937;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: block;
	}
</style>
