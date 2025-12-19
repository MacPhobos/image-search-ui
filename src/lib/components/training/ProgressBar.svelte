<script lang="ts">
	interface Props {
		current: number;
		total: number;
		showPercentage?: boolean;
	}

	let { current, total, showPercentage = true }: Props = $props();

	const percentage = $derived(total > 0 ? Math.round((current / total) * 100) : 0);
</script>

<div class="progress-container">
	<div class="progress-bar">
		<div class="progress-fill" style="width: {percentage}%"></div>
	</div>
	{#if showPercentage}
		<div class="progress-text">
			{percentage}% ({current.toLocaleString()} / {total.toLocaleString()})
		</div>
	{/if}
</div>

<style>
	.progress-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.progress-bar {
		width: 100%;
		height: 24px;
		background-color: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
		position: relative;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
		transition: width 0.3s ease-in-out;
		border-radius: 4px;
	}

	.progress-text {
		font-size: 0.875rem;
		color: #4b5563;
		text-align: center;
	}
</style>
