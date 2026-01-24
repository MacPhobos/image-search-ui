<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { tid } from '$lib/testing/testid';

	// Component tracking (DEV only)
	const cleanup = registerComponent('SearchModeToggle', {
		filePath: 'src/lib/components/SearchModeToggle.svelte'
	});
	onMount(() => cleanup);

	export type SearchMode = 'text' | 'image' | 'hybrid' | 'composed';

	interface Props {
		mode: SearchMode;
		onModeChange: (mode: SearchMode) => void;
		testId?: string;
	}

	let { mode, onModeChange, testId = 'search-mode-toggle' }: Props = $props();

	// Derived scoped test ID generator
	const t = $derived((...segments: string[]) =>
		segments.length === 0 ? testId : tid(testId, ...segments)
	);
</script>

<div class="mode-toggle" data-testid={t()}>
	<button
		type="button"
		class="mode-button"
		class:active={mode === 'text'}
		onclick={() => onModeChange('text')}
		aria-label="Text search mode"
		aria-pressed={mode === 'text'}
		data-testid={t('btn-text')}
	>
		<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<span>Text</span>
	</button>

	<button
		type="button"
		class="mode-button"
		class:active={mode === 'image'}
		onclick={() => onModeChange('image')}
		aria-label="Image search mode"
		aria-pressed={mode === 'image'}
		data-testid={t('btn-image')}
	>
		<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
		<span>Image</span>
	</button>

	<button
		type="button"
		class="mode-button"
		class:active={mode === 'hybrid'}
		onclick={() => onModeChange('hybrid')}
		aria-label="Hybrid search mode"
		aria-pressed={mode === 'hybrid'}
		data-testid={t('btn-hybrid')}
	>
		<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
			/>
		</svg>
		<span>Hybrid</span>
	</button>

	<button
		type="button"
		class="mode-button"
		class:active={mode === 'composed'}
		onclick={() => onModeChange('composed')}
		aria-label="Composed search mode"
		aria-pressed={mode === 'composed'}
		data-testid={t('btn-composed')}
	>
		<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
			/>
		</svg>
		<span>Composed</span>
	</button>
</div>

<style>
	.mode-toggle {
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background-color: #f3f4f6;
		border-radius: 0.5rem;
		width: fit-content;
	}

	.mode-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		background: transparent;
		cursor: pointer;
		transition: all 0.2s;
	}

	.mode-button:hover:not(.active) {
		color: #374151;
		background-color: #e5e7eb;
	}

	.mode-button.active {
		color: #2563eb;
		background-color: white;
		box-shadow:
			0 1px 2px 0 rgba(0, 0, 0, 0.05),
			0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.mode-button:focus {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}

	.icon {
		width: 1rem;
		height: 1rem;
	}

	/* Dark mode support */
	:global(.dark) .mode-toggle {
		background-color: #1f2937;
	}

	:global(.dark) .mode-button {
		color: #9ca3af;
	}

	:global(.dark) .mode-button:hover:not(.active) {
		color: #d1d5db;
		background-color: #374151;
	}

	:global(.dark) .mode-button.active {
		color: #60a5fa;
		background-color: #1f2937;
	}
</style>
