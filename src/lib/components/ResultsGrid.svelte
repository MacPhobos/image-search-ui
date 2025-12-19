<script lang="ts">
	import type { SearchResult } from '$lib/types';

	interface Props {
		results: SearchResult[];
		loading?: boolean;
		hasSearched?: boolean;
	}

	let { results, loading = false, hasSearched = false }: Props = $props();

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

	function getFilename(path: string): string {
		return path.split('/').pop() || path;
	}
</script>

<div class="results-container">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Searching...</p>
		</div>
	{:else if results.length === 0}
		<div class="empty-state">
			{#if hasSearched}
				<p>No results found. Try a different search query.</p>
			{:else}
				<p>Enter a search query to find images.</p>
			{/if}
		</div>
	{:else}
		<div class="results-header">
			<span class="results-count">{results.length} result{results.length !== 1 ? 's' : ''}</span>
		</div>
		<div class="results-grid">
			{#each results as result (result.asset.id)}
				<article class="result-card">
					<div class="result-image-placeholder">
						<span class="filename">{getFilename(result.asset.path)}</span>
					</div>
					<div class="result-info">
						<div class="result-path" title={result.asset.path}>
							{result.asset.path}
						</div>
						<div class="result-meta">
							<span class="score" title="Similarity score">
								{formatScore(result.score)}
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

	.result-image-placeholder {
		width: 100%;
		height: 180px;
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
