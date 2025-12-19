<script lang="ts">
	import type { ProgressStats } from '$lib/types';

	interface Props {
		stats: ProgressStats;
	}

	let { stats }: Props = $props();

	const processingRate = $derived(stats.imagesPerMinute?.toFixed(1) || '0.0');
</script>

<div class="stats-grid">
	<div class="stat-card">
		<div class="stat-label">Current</div>
		<div class="stat-value">{stats.current.toLocaleString()}</div>
	</div>

	<div class="stat-card">
		<div class="stat-label">Total</div>
		<div class="stat-value">{stats.total.toLocaleString()}</div>
	</div>

	<div class="stat-card">
		<div class="stat-label">Progress</div>
		<div class="stat-value">{stats.percentage.toFixed(1)}%</div>
	</div>

	{#if stats.imagesPerMinute !== null && stats.imagesPerMinute !== undefined}
		<div class="stat-card">
			<div class="stat-label">Processing Rate</div>
			<div class="stat-value">{processingRate} img/min</div>
		</div>
	{/if}
</div>

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 1rem;
		margin: 1rem 0;
	}

	.stat-card {
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 0.5rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-failed {
		color: #dc2626;
	}
</style>
