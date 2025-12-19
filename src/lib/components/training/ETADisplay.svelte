<script lang="ts">
	interface Props {
		eta: string | null;
	}

	let { eta }: Props = $props();

	function formatETA(isoDate: string): string {
		const now = new Date();
		const target = new Date(isoDate);
		const diffMs = target.getTime() - now.getTime();

		if (diffMs <= 0) {
			return 'Completing soon...';
		}

		const totalMinutes = Math.floor(diffMs / 60000);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;

		if (hours > 0) {
			return `${hours}h ${minutes}m remaining`;
		} else if (minutes > 0) {
			return `${minutes}m remaining`;
		} else {
			return 'Less than 1m remaining';
		}
	}

	const formattedETA = $derived(eta ? formatETA(eta) : 'Calculating...');
</script>

<div class="eta-display">
	<span class="eta-icon">⏱️</span>
	<span class="eta-text">{formattedETA}</span>
</div>

<style>
	.eta-display {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: #f3f4f6;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #4b5563;
	}

	.eta-icon {
		font-size: 1rem;
	}

	.eta-text {
		font-weight: 500;
	}
</style>
