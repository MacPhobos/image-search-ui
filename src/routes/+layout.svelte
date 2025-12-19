<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="app">
	<header>
		<h1>Image Search</h1>
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
	}

	header h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 600;
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
