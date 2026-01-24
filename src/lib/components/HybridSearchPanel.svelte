<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { tid } from '$lib/testing/testid';
	import ImageUploadZone from './ImageUploadZone.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('HybridSearchPanel', {
		filePath: 'src/lib/components/HybridSearchPanel.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		textQuery?: string;
		selectedImage?: File | null;
		textWeight?: number;
		onSearch: (params: {
			textQuery: string | null;
			imageFile: File | null;
			textWeight: number;
		}) => void;
		disabled?: boolean;
		testId?: string;
	}

	let {
		textQuery = '',
		selectedImage = null,
		textWeight = 50,
		onSearch,
		disabled = false,
		testId = 'hybrid-search-panel'
	}: Props = $props();

	// Derived scoped test ID generator
	const t = $derived((...segments: string[]) =>
		segments.length === 0 ? testId : tid(testId, ...segments)
	);

	let localTextQuery = $state('');
	let localImage = $state<File | null>(null);
	let localTextWeight = $state(50);

	// Initialize from props using $derived
	$effect(() => {
		if (textQuery !== undefined && localTextQuery === '') {
			localTextQuery = textQuery;
		}
		if (selectedImage !== undefined && localImage === null) {
			localImage = selectedImage;
		}
		if (textWeight !== undefined && localTextWeight === 50) {
			localTextWeight = textWeight;
		}
	});

	// Derived states
	let canSearch = $derived((localTextQuery.trim().length > 0 || localImage !== null) && !disabled);

	let imageWeight = $derived(100 - localTextWeight);

	function handleSearch() {
		if (!canSearch) return;

		onSearch({
			textQuery: localTextQuery.trim() || null,
			imageFile: localImage,
			textWeight: localTextWeight / 100
		});
	}

	function handleImageSelect(file: File) {
		localImage = file;
	}

	function handleImageClear() {
		localImage = null;
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter' && canSearch) {
			handleSearch();
		}
	}
</script>

<div class="hybrid-search-panel" data-testid={t()}>
	<div class="panel-header">
		<h3 class="panel-title">Hybrid Search</h3>
		<p class="panel-description">Combine text and image search with adjustable weights</p>
	</div>

	<div class="search-inputs">
		<!-- Text Input -->
		<div class="input-group">
			<label for="hybrid-text-input" class="input-label">Text Query</label>
			<input
				id="hybrid-text-input"
				type="text"
				class="text-input"
				placeholder="Enter search text..."
				bind:value={localTextQuery}
				onkeypress={handleKeyPress}
				{disabled}
				data-testid={t('input-text')}
			/>
		</div>

		<!-- Image Upload -->
		<div class="input-group">
			<div class="input-label">Reference Image</div>
			<ImageUploadZone
				selectedFile={localImage}
				onImageSelect={handleImageSelect}
				onClear={handleImageClear}
				{disabled}
				testId={t('image-upload')}
			/>
		</div>
	</div>

	<!-- Weight Slider -->
	<div class="weight-control">
		<label for="text-weight-slider" class="weight-label"> Text / Image Weight Balance </label>
		<div class="slider-container">
			<div class="weight-indicators">
				<span class="weight-value" data-testid={t('text-weight')}>
					Text: {localTextWeight}%
				</span>
				<span class="weight-value" data-testid={t('image-weight')}>
					Image: {imageWeight}%
				</span>
			</div>
			<input
				id="text-weight-slider"
				type="range"
				min="0"
				max="100"
				step="5"
				bind:value={localTextWeight}
				{disabled}
				class="weight-slider"
				data-testid={t('slider-weight')}
				aria-label="Text weight percentage"
			/>
			<div class="slider-labels">
				<span class="slider-label">Image Only</span>
				<span class="slider-label">Balanced</span>
				<span class="slider-label">Text Only</span>
			</div>
		</div>
	</div>

	<!-- Search Button -->
	<button
		type="button"
		class="search-button"
		onclick={handleSearch}
		disabled={!canSearch}
		data-testid={t('btn-search')}
	>
		{disabled ? 'Searching...' : 'Search'}
	</button>
</div>

<style>
	.hybrid-search-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}

	.panel-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.panel-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.panel-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.search-inputs {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.text-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.text-input:focus {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
		border-color: #2563eb;
	}

	.text-input:disabled {
		background-color: #f9fafb;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.weight-control {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.weight-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.slider-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.weight-indicators {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.weight-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: #2563eb;
	}

	.weight-slider {
		width: 100%;
		height: 0.5rem;
		-webkit-appearance: none;
		appearance: none;
		background: linear-gradient(to right, #3b82f6 0%, #3b82f6 50%, #10b981 50%, #10b981 100%);
		border-radius: 0.25rem;
		outline: none;
		cursor: pointer;
	}

	.weight-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 1.25rem;
		height: 1.25rem;
		background: #2563eb;
		border: 2px solid white;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.weight-slider::-moz-range-thumb {
		width: 1.25rem;
		height: 1.25rem;
		background: #2563eb;
		border: 2px solid white;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.weight-slider:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.slider-labels {
		display: flex;
		justify-content: space-between;
		padding: 0 0.25rem;
	}

	.slider-label {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.search-button {
		padding: 0.75rem 1.5rem;
		background-color: #2563eb;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.search-button:hover:not(:disabled) {
		background-color: #1d4ed8;
	}

	.search-button:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
		opacity: 0.6;
	}

	/* Dark mode support */
	:global(.dark) .hybrid-search-panel {
		background-color: #1f2937;
		border-color: #374151;
	}

	:global(.dark) .panel-title {
		color: #f9fafb;
	}

	:global(.dark) .panel-description {
		color: #9ca3af;
	}

	:global(.dark) .input-label {
		color: #d1d5db;
	}

	:global(.dark) .weight-label {
		color: #d1d5db;
	}

	:global(.dark) .text-input {
		background-color: #374151;
		border-color: #4b5563;
		color: #f9fafb;
	}

	:global(.dark) .text-input:focus {
		border-color: #60a5fa;
	}

	:global(.dark) .text-input:disabled {
		background-color: #1f2937;
	}

	:global(.dark) .weight-value {
		color: #60a5fa;
	}

	:global(.dark) .slider-label {
		color: #6b7280;
	}
</style>
