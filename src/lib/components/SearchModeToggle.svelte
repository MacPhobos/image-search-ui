<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { tid } from '$lib/testing/testid';

	// Component tracking (DEV only)
	const cleanup = registerComponent('SearchModeToggle', {
		filePath: 'src/lib/components/SearchModeToggle.svelte'
	});
	onMount(() => cleanup);

	export type SearchMode = 'text' | 'image';

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
		<span>Text Search</span>
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
		<span>Image Search</span>
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
