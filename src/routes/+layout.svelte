<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { checkHealth } from '$lib/api/client';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	type HealthStatus = 'checking' | 'healthy' | 'unhealthy';
	let healthStatus = $state<HealthStatus>('checking');

	onMount(() => {
		checkBackendHealth();
		// Check health every 30 seconds
		const interval = setInterval(checkBackendHealth, 30000);
		return () => clearInterval(interval);
	});

	async function checkBackendHealth() {
		try {
			const response = await checkHealth();
			healthStatus = response.status === 'ok' ? 'healthy' : 'unhealthy';
		} catch {
			healthStatus = 'unhealthy';
		}
	}
</script>

<div class="app">
	<header>
		<h1>Mac'Image Search</h1>
		<nav class="nav">
			<a href="/">Search</a>
			<a href="/categories">Categories</a>
			<a href="/training">Training</a>
			<a href="/vectors">Vectors</a>
		</nav>
		<div class="health-indicator">
			<span class="health-dot health-{healthStatus}"></span>
			<span class="health-text">
				{#if healthStatus === 'checking'}
					Checking backend...
				{:else if healthStatus === 'healthy'}
					Backend connected
				{:else}
					Backend offline
				{/if}
			</span>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>&copy; 2025 Image Search. Licensed under GPLv3.</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		background-color: #f5f5f5;
		color: #333;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		background-color: #2c3e50;
		color: white;
		padding: 1.5rem 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	header h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 600;
	}

	.nav {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav a {
		color: white;
		text-decoration: none;
		font-size: 1rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.nav a:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.health-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.health-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	.health-checking {
		background-color: #f59e0b;
	}

	.health-healthy {
		background-color: #10b981;
		animation: none;
	}

	.health-unhealthy {
		background-color: #ef4444;
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

	.health-text {
		font-size: 0.75rem;
		opacity: 0.9;
	}

	main {
		flex: 1;
		padding: 2rem;
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
	}

	footer {
		background-color: #2c3e50;
		color: #95a5a6;
		text-align: center;
		padding: 1rem;
		margin-top: 2rem;
	}

	footer p {
		margin: 0;
		font-size: 0.875rem;
	}
</style>
