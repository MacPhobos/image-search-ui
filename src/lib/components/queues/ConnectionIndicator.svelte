<script lang="ts">
	interface Props {
		connected: boolean;
	}

	let { connected }: Props = $props();
</script>

<div class="connection-indicator">
	<span class="dot" class:connected class:disconnected={!connected}></span>
	<span class="label">{connected ? 'Connected' : 'Disconnected'}</span>
</div>

<style>
	.connection-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}
	.connected {
		background-color: #10b981;
	}
	.disconnected {
		background-color: #ef4444;
		animation: pulse 2s infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	.label {
		font-weight: 500;
	}
</style>
