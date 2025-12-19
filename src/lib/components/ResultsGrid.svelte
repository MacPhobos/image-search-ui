<script lang="ts">
	import type { SearchResult } from '$lib/types';

	interface Props {
		results: SearchResult[];
		loading?: boolean;
	}

	let { results, loading = false }: Props = $props();
</script>

<div class="results-container">
	{#if loading}
		<div class="loading">Loading...</div>
	{:else if results.length === 0}
		<div class="empty-state">
			<p>No results found. Try a different search query.</p>
		</div>
	{:else}
		<div class="results-grid">
			{#each results as result (result.id)}
				<article class="result-card">
					<img src={result.thumbnailUrl} alt={result.title} class="result-image" />
					<div class="result-info">
						<h3 class="result-title">{result.title}</h3>
						{#if result.description}
							<p class="result-description">{result.description}</p>
						{/if}
						{#if result.source}
							<span class="result-source">{result.source}</span>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.results-container {
		width: 100%;
	}

	.loading {
		text-align: center;
		padding: 3rem;
		font-size: 1.1rem;
		color: #666;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #666;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
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
		cursor: pointer;
	}

	.result-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.result-image {
		width: 100%;
		height: 200px;
		object-fit: cover;
	}

	.result-info {
		padding: 1rem;
	}

	.result-title {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-description {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #666;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.result-source {
		font-size: 0.75rem;
		color: #999;
	}
</style>
