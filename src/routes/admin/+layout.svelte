<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const tabs = [
		{ href: '/admin', label: 'Data Management', exact: true },
		{ href: '/admin/settings', label: 'Settings', exact: false },
		{ href: '/admin/queues', label: 'Queues', exact: false },
		{ href: '/admin/vectors', label: 'Vectors', exact: false }
	];

	function isActive(tab: { href: string; exact: boolean }, pathname: string): boolean {
		if (tab.exact) {
			return pathname === tab.href;
		}
		return pathname.startsWith(tab.href);
	}
</script>

<svelte:head>
	<title>Admin Panel - Image Search</title>
</svelte:head>

<div class="admin-page">
	<header class="page-header">
		<h1>Admin Panel</h1>
		<p class="page-description">System administration, configuration, and monitoring.</p>
	</header>

	<nav class="admin-tabs" aria-label="Admin sections">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="admin-tab"
				class:active={isActive(tab, $page.url.pathname)}
				aria-current={isActive(tab, $page.url.pathname) ? 'page' : undefined}
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	<div class="admin-content">
		{@render children()}
	</div>
</div>

<style>
	.admin-page {
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		color: #1f2937;
		font-weight: 700;
	}

	.page-description {
		margin: 0;
		color: #6b7280;
		font-size: 1rem;
		line-height: 1.6;
	}

	.admin-tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid #e5e7eb;
		margin-bottom: 1.5rem;
	}

	.admin-tab {
		padding: 0.75rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		text-decoration: none;
		border-bottom: 2px solid transparent;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
		margin-bottom: -1px;
	}

	.admin-tab:hover {
		color: #374151;
		border-bottom-color: #d1d5db;
	}

	.admin-tab.active {
		color: #111827;
		border-bottom-color: #111827;
	}

	.admin-content {
		min-height: 400px;
	}

	@media (max-width: 768px) {
		.page-header h1 {
			font-size: 1.5rem;
		}

		.page-description {
			font-size: 0.9rem;
		}

		.admin-tabs {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}

		.admin-tab {
			white-space: nowrap;
		}
	}
</style>
