<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { checkHealth } from '$lib/api/client';
	import { tid } from '$lib/testing/testid';
	import { setViewId } from '$lib/dev/viewId';
	import { Toaster } from '$lib/components/ui/sonner';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// DEV: Set view ID for DevOverlay breadcrumb
	onMount(() => {
		if (import.meta.env.DEV) {
			return setViewId('layout:/');
		}
	});

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

<Tooltip.Provider>
	<div class="app" data-testid={tid('layout', 'root')}>
		<header data-testid={tid('layout', 'header')}>
			<h1>Mac'Image Search</h1>
			<nav class="nav" data-testid={tid('layout', 'nav')}>
				<a href="/">Search</a>
				<a href="/people">People</a>
				<a href="/faces/suggestions">Suggestions</a>
				<a href="/faces/clusters">Clusters</a>
				<a href="/categories">Categories</a>
				<a href="/training">Training</a>
				<a href="/queues">Queues</a>
				<a href="/vectors">Vectors</a>
				<a href="/admin">Admin</a>
			</nav>
			<div class="health-indicator" data-testid={tid('layout', 'health')}>
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

		<main data-testid={tid('layout', 'main')}>
			{@render children()}
		</main>

		<footer data-testid={tid('layout', 'footer')}>
			<p>&copy; 2025 Image Search. Licensed under GPLv3.</p>
		</footer>
	</div>
</Tooltip.Provider>

<!-- DEV-ONLY: Development overlay -->
{#if import.meta.env.DEV}
	{#await import('$lib/dev/DevOverlay.svelte') then { default: DevOverlay }}
		<DevOverlay />
	{/await}
{/if}

<!-- Toast notifications -->
<Toaster />

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
