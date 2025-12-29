<script lang="ts">
	import type { TemporalCoverage } from '$lib/types';

	interface Props {
		/** Coverage statistics */
		coverage: TemporalCoverage;
		/** Display compact version (badge only) */
		compact?: boolean;
	}

	let { coverage, compact = false }: Props = $props();

	const coverageClass = $derived(() => {
		if (coverage.coveragePercentage >= 80) return 'high';
		if (coverage.coveragePercentage >= 50) return 'medium';
		return 'low';
	});
</script>

{#if compact}
	<span class="coverage-compact {coverageClass()}">
		{coverage.coveragePercentage.toFixed(0)}%
	</span>
{:else}
	<div class="coverage-indicator">
		<div class="coverage-bar">
			<div class="coverage-fill {coverageClass()}" style="width: {coverage.coveragePercentage}%">
			</div>
		</div>
		<span class="coverage-text">
			{coverage.coveredEras.length}/{coverage.coveredEras.length + coverage.missingEras.length} eras
		</span>
	</div>
{/if}

<style>
	.coverage-compact {
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 600;
		display: inline-block;
	}

	.coverage-compact.high {
		background: #c8e6c9;
		color: #2e7d32;
	}

	.coverage-compact.medium {
		background: #fff3e0;
		color: #e65100;
	}

	.coverage-compact.low {
		background: #ffcdd2;
		color: #c62828;
	}

	.coverage-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.coverage-bar {
		flex: 1;
		height: 8px;
		background: #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
		min-width: 60px;
	}

	.coverage-fill {
		height: 100%;
		transition: width 0.3s ease;
		border-radius: 4px;
	}

	.coverage-fill.high {
		background: #4caf50;
	}

	.coverage-fill.medium {
		background: #ff9800;
	}

	.coverage-fill.low {
		background: #f44336;
	}

	.coverage-text {
		font-size: 0.8rem;
		color: #666;
		white-space: nowrap;
	}
</style>
