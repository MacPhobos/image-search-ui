<script lang="ts">
	import { tid } from '$lib/testing/testid';

	interface Props {
		onSearch: (query: string) => void;
		placeholder?: string;
		testId?: string;
	}

	let { onSearch, placeholder = 'Search images...', testId = 'search-bar' }: Props = $props();

	// Derived scoped test ID generator (reactive to testId changes)
	const t = $derived((...segments: string[]) =>
		segments.length === 0 ? testId : tid(testId, ...segments)
	);

	let query = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (query.trim()) {
			onSearch(query.trim());
		}
	}

	function handleClear() {
		query = '';
	}
</script>

<form onsubmit={handleSubmit} class="search-bar" data-testid={t()}>
	<input
		type="text"
		bind:value={query}
		{placeholder}
		class="search-input"
		aria-label="Search query"
		data-testid={t('input-query')}
	/>
	{#if query}
		<button
			type="button"
			onclick={handleClear}
			class="clear-btn"
			aria-label="Clear search"
			data-testid={t('btn-clear')}
		>
			×
		</button>
	{/if}
	<button type="submit" class="search-btn" disabled={!query.trim()} data-testid={t('btn-submit')}>
		Search
	</button>
</form>

<style>
	.search-bar {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		max-width: 600px;
		position: relative;
	}

	.search-input {
		flex: 1;
		padding: 0.75rem 1rem;
		padding-right: 2.5rem;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.clear-btn {
		position: absolute;
		right: 90px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #999;
		cursor: pointer;
		padding: 0 0.5rem;
		line-height: 1;
	}

	.clear-btn:hover {
		color: #333;
	}

	.search-btn {
		padding: 0.75rem 1.5rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
		white-space: nowrap;
	}

	.search-btn:hover:not(:disabled) {
		background-color: #357abd;
	}

	.search-btn:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
</style>
