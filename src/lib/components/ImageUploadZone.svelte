<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { tid } from '$lib/testing/testid';

	// Component tracking (DEV only)
	const cleanup = registerComponent('ImageUploadZone', {
		filePath: 'src/lib/components/ImageUploadZone.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		selectedFile: File | null;
		onImageSelect: (file: File) => void;
		onClear: () => void;
		disabled?: boolean;
		testId?: string;
	}

	let {
		selectedFile,
		onImageSelect,
		onClear,
		disabled = false,
		testId = 'image-upload-zone'
	}: Props = $props();

	// Derived scoped test ID generator
	const t = $derived((...segments: string[]) =>
		segments.length === 0 ? testId : tid(testId, ...segments)
	);

	let isDragging = $state(false);
	let previewUrl = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement>();

	// Update preview URL when selectedFile changes
	$effect(() => {
		if (selectedFile) {
			previewUrl = URL.createObjectURL(selectedFile);
		} else {
			previewUrl = null;
		}

		// Cleanup function
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		if (disabled) return;

		const file = e.dataTransfer?.files[0];
		if (file && file.type.startsWith('image/')) {
			onImageSelect(file);
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			onImageSelect(file);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (!disabled) {
			isDragging = true;
		}
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleClearClick() {
		onClear();
		// Reset file input
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<div class="upload-zone-container" data-testid={t()}>
	{#if selectedFile && previewUrl}
		<!-- Image Preview -->
		<div class="preview-container" data-testid={t('preview')}>
			<img src={previewUrl} alt="Search preview" class="preview-image" />
			<button
				type="button"
				onclick={handleClearClick}
				class="clear-button"
				title="Remove image"
				aria-label="Remove image"
				data-testid={t('btn-clear')}
			>
				<svg class="clear-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
			<p class="file-name">{selectedFile.name}</p>
		</div>
	{:else}
		<!-- Drop Zone -->
		<div
			class="drop-zone"
			class:dragging={isDragging}
			class:disabled
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			role="region"
			aria-label="Image upload drop zone"
			data-testid={t('dropzone')}
		>
			<svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>

			<p class="upload-text">
				<button
					type="button"
					class="upload-link"
					onclick={() => fileInput.click()}
					{disabled}
					data-testid={t('btn-upload')}
				>
					Upload an image
				</button>
				or drag and drop
			</p>
			<p class="upload-hint">PNG, JPG, WEBP up to 10MB</p>

			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				class="file-input"
				onchange={handleFileSelect}
				{disabled}
				data-testid={t('input-file')}
			/>
		</div>
	{/if}
</div>

<style>
	.upload-zone-container {
		width: 100%;
	}

	/* Preview Styles */
	.preview-container {
		position: relative;
		display: inline-block;
	}

	.preview-image {
		max-height: 12rem;
		border-radius: 0.5rem;
		border: 2px solid #3b82f6;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.clear-button {
		position: absolute;
		top: -0.5rem;
		right: -0.5rem;
		padding: 0.25rem;
		background-color: #ef4444;
		color: white;
		border: none;
		border-radius: 9999px;
		cursor: pointer;
		transition: background-color 0.2s;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.clear-button:hover {
		background-color: #dc2626;
	}

	.clear-button:focus {
		outline: 2px solid #ef4444;
		outline-offset: 2px;
	}

	.clear-icon {
		width: 1rem;
		height: 1rem;
	}

	.file-name {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
		text-align: center;
	}

	/* Drop Zone Styles */
	.drop-zone {
		border: 2px dashed #d1d5db;
		border-radius: 0.5rem;
		padding: 2rem;
		text-align: center;
		transition: all 0.2s;
		cursor: pointer;
	}

	.drop-zone:hover:not(.disabled) {
		border-color: #9ca3af;
	}

	.drop-zone.dragging {
		border-color: #3b82f6;
		background-color: #eff6ff;
	}

	.drop-zone.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.upload-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 1rem;
		color: #9ca3af;
	}

	.upload-text {
		margin-top: 1rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.upload-link {
		color: #2563eb;
		font-weight: 500;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s;
	}

	.upload-link:hover:not(:disabled) {
		color: #1d4ed8;
	}

	.upload-link:disabled {
		color: #9ca3af;
		cursor: not-allowed;
	}

	.upload-hint {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.file-input {
		display: none;
	}

	/* Dark mode support */
	:global(.dark) .drop-zone {
		border-color: #4b5563;
	}

	:global(.dark) .drop-zone:hover:not(.disabled) {
		border-color: #6b7280;
	}

	:global(.dark) .drop-zone.dragging {
		border-color: #60a5fa;
		background-color: #1e3a8a;
	}

	:global(.dark) .upload-icon {
		color: #6b7280;
	}

	:global(.dark) .upload-text {
		color: #9ca3af;
	}

	:global(.dark) .upload-link {
		color: #60a5fa;
	}

	:global(.dark) .upload-link:hover:not(:disabled) {
		color: #93c5fd;
	}

	:global(.dark) .upload-hint {
		color: #6b7280;
	}

	:global(.dark) .file-name {
		color: #9ca3af;
	}
</style>
