<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { tid } from '$lib/testing/testid';
	import ImageUploadZone from './ImageUploadZone.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('ComposedSearchPanel', {
		filePath: 'src/lib/components/ComposedSearchPanel.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		referenceImage?: File | null;
		modifierText?: string;
		alpha?: number;
		onSearch: (params: { referenceImage: File; modifierText: string; alpha: number }) => void;
		disabled?: boolean;
		testId?: string;
	}

	let {
		referenceImage = null,
		modifierText = '',
		alpha = 30,
		onSearch,
		disabled = false,
		testId = 'composed-search-panel'
	}: Props = $props();

	// Derived scoped test ID generator
	const t = (...segments: string[]) => (segments.length === 0 ? testId : tid(testId, ...segments));

	let localReferenceImage = $state<File | null>(null);
	let localModifierText = $state('');
	let localAlpha = $state(30);

	// Initialize from props using $derived
	$effect(() => {
		if (referenceImage !== undefined && localReferenceImage === null) {
			localReferenceImage = referenceImage;
		}
		if (modifierText !== undefined && localModifierText === '') {
			localModifierText = modifierText;
		}
		if (alpha !== undefined && localAlpha === 30) {
			localAlpha = alpha;
		}
	});

	// Derived states
	let canSearch = $derived(
		localReferenceImage !== null && localModifierText.trim().length > 0 && !disabled
	);

	let referenceStrength = $derived(100 - localAlpha);

	function handleSearch() {
		if (!canSearch || !localReferenceImage) return;

		onSearch({
			referenceImage: localReferenceImage,
			modifierText: localModifierText.trim(),
			alpha: localAlpha / 100
		});
	}

	function handleImageSelect(file: File) {
		localReferenceImage = file;
	}

	function handleImageClear() {
		localReferenceImage = null;
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter' && canSearch) {
			handleSearch();
		}
	}
</script>

<div class="composed-search-panel" data-testid={t()}>
	<div class="panel-header">
		<h3 class="panel-title">Composed Search</h3>
		<p class="panel-description">
			Start with a reference image and modify it with text descriptions
		</p>
	</div>

	<div class="search-inputs">
		<!-- Reference Image Upload -->
		<div class="input-section reference-section">
			<div class="section-header">
				<span class="section-badge reference-badge">1</span>
				<div class="section-label">Reference Image</div>
			</div>
			<p class="section-hint">Upload the image you want to start with</p>
			<ImageUploadZone
				selectedFile={localReferenceImage}
				onImageSelect={handleImageSelect}
				onClear={handleImageClear}
				{disabled}
				testId={t('reference-upload')}
			/>
		</div>

		<!-- Modifier Text Input -->
		<div class="input-section modifier-section">
			<div class="section-header">
				<span class="section-badge modifier-badge">2</span>
				<label for="modifier-text-input" class="section-label">Text Modifier</label>
			</div>
			<p class="section-hint">Describe how to modify the reference image</p>
			<input
				id="modifier-text-input"
				type="text"
				class="text-input"
				placeholder="e.g., &quot;but at sunset&quot;, &quot;with more people&quot;, &quot;in winter&quot;"
				bind:value={localModifierText}
				onkeypress={handleKeyPress}
				{disabled}
				data-testid={t('input-modifier')}
			/>
		</div>
	</div>

	<!-- Alpha Slider (Modifier Strength) -->
	<div class="strength-control">
		<label for="alpha-slider" class="strength-label">Modifier Strength</label>
		<div class="slider-container">
			<div class="strength-indicators">
				<span class="strength-value" data-testid={t('reference-strength')}>
					Reference: {referenceStrength}%
				</span>
				<span class="strength-value" data-testid={t('modifier-strength')}>
					Modifier: {localAlpha}%
				</span>
			</div>
			<input
				id="alpha-slider"
				type="range"
				min="0"
				max="100"
				step="5"
				bind:value={localAlpha}
				{disabled}
				class="strength-slider"
				data-testid={t('slider-alpha')}
				aria-label="Modifier strength percentage"
			/>
			<div class="slider-labels">
				<span class="slider-label">Original Image</span>
				<span class="slider-label">Balanced</span>
				<span class="slider-label">Strong Modification</span>
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
		{disabled ? 'Searching...' : 'Search with Composition'}
	</button>
</div>

<style>
	.composed-search-panel {
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
		gap: 1.5rem;
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.5rem;
		border: 2px solid transparent;
		transition: border-color 0.2s;
	}

	.reference-section {
		background-color: #f0f9ff;
		border-color: #e0f2fe;
	}

	.modifier-section {
		background-color: #fef3f2;
		border-color: #fee2e2;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.section-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}

	.reference-badge {
		background-color: #0ea5e9;
	}

	.modifier-badge {
		background-color: #f97316;
	}

	.section-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.section-hint {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
	}

	.text-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: all 0.2s;
		background-color: white;
	}

	.text-input:focus {
		outline: 2px solid #f97316;
		outline-offset: 2px;
		border-color: #f97316;
	}

	.text-input:disabled {
		background-color: #f9fafb;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.strength-control {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.strength-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.slider-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.strength-indicators {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.strength-value {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.strength-value:first-child {
		color: #0ea5e9;
	}

	.strength-value:last-child {
		color: #f97316;
	}

	.strength-slider {
		width: 100%;
		height: 0.5rem;
		-webkit-appearance: none;
		appearance: none;
		background: linear-gradient(to right, #0ea5e9 0%, #0ea5e9 50%, #f97316 50%, #f97316 100%);
		border-radius: 0.25rem;
		outline: none;
		cursor: pointer;
	}

	.strength-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 1.25rem;
		height: 1.25rem;
		background: #8b5cf6;
		border: 2px solid white;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.strength-slider::-moz-range-thumb {
		width: 1.25rem;
		height: 1.25rem;
		background: #8b5cf6;
		border: 2px solid white;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.strength-slider:disabled {
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
		background-color: #8b5cf6;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.search-button:hover:not(:disabled) {
		background-color: #7c3aed;
	}

	.search-button:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
		opacity: 0.6;
	}

	/* Dark mode support */
	:global(.dark) .composed-search-panel {
		background-color: #1f2937;
		border-color: #374151;
	}

	:global(.dark) .panel-title {
		color: #f9fafb;
	}

	:global(.dark) .panel-description {
		color: #9ca3af;
	}

	:global(.dark) .reference-section {
		background-color: #1e3a5f;
		border-color: #2563eb;
	}

	:global(.dark) .modifier-section {
		background-color: #3d1e1e;
		border-color: #dc2626;
	}

	:global(.dark) .section-label {
		color: #d1d5db;
	}

	:global(.dark) .section-hint {
		color: #9ca3af;
	}

	:global(.dark) .strength-label {
		color: #d1d5db;
	}

	:global(.dark) .text-input {
		background-color: white;
		border-color: #4b5563;
		color: #111827;
	}

	:global(.dark) .text-input:focus {
		border-color: #f97316;
	}

	:global(.dark) .text-input:disabled {
		background-color: #374151;
		color: #9ca3af;
	}

	:global(.dark) .slider-label {
		color: #6b7280;
	}
</style>
