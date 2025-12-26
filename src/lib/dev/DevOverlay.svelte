<!--
  DEV-ONLY: Development overlay showing route information.

  Features:
  - Displays current pathname, search params, route params
  - Shows SvelteKit route ID and custom view breadcrumb
  - Collapsible for minimal visual footprint
  - Copy-to-clipboard for debugging payloads
  - SSR-safe (guards browser APIs)

  Usage:
  In root +layout.svelte:
    {#if import.meta.env.DEV}
      <DevOverlay />
    {/if}
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { viewIdBreadcrumb } from './viewId';
	import { tid } from '$lib/testing/testid';

	// State
	let expanded = $state(false);
	let copied = $state(false);
	let timestamp = $state<string>('');

	// Derived route info from $page
	let pathname = $derived($page.url.pathname);
	let search = $derived($page.url.search);
	let params = $derived($page.params);
	let routeId = $derived($page.route?.id ?? null);
	let dataKeys = $derived(Object.keys($page.data || {}));

	// Format params for display
	let paramsJson = $derived(JSON.stringify(params, null, 2));
	let hasParams = $derived(Object.keys(params).length > 0);

	// Copy payload
	let copyPayload = $derived(
		JSON.stringify(
			{
				pathname,
				search: search || undefined,
				params,
				routeId
			},
			null,
			2
		)
	);

	// Update timestamp periodically (client-side only)
	onMount(() => {
		function updateTime() {
			timestamp = new Date().toLocaleTimeString();
		}
		updateTime();
		const interval = setInterval(updateTime, 1000);
		return () => clearInterval(interval);
	});

	function toggle() {
		expanded = !expanded;
	}

	async function copyToClipboard() {
		if (!browser) return;

		try {
			await navigator.clipboard.writeText(copyPayload);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<div class="dev-overlay" class:expanded data-testid={tid('dev-overlay')}>
	<div class="dev-overlay-container">
		<!-- Header row -->
		<div class="dev-header">
			<button
				class="toggle-btn"
				onclick={toggle}
				aria-label={expanded ? 'Collapse dev overlay' : 'Expand dev overlay'}
				aria-expanded={expanded}
				data-testid={tid('dev-overlay', 'btn-toggle')}
			>
				<span class="dev-badge">DEV</span>
				<span class="toggle-icon">{expanded ? '▼' : '▲'}</span>
			</button>

			{#if expanded}
				<button
					class="copy-btn"
					onclick={copyToClipboard}
					aria-label="Copy route info to clipboard"
					data-testid={tid('dev-overlay', 'btn-copy')}
				>
					{copied ? '✓' : '📋'}
				</button>
			{/if}
		</div>

		<!-- Collapsed summary -->
		{#if !expanded}
			<div class="dev-summary">
				<span class="pathname" title={pathname}>{pathname}</span>
			</div>
		{/if}

		<!-- Expanded content -->
		{#if expanded}
			<div class="dev-content" data-testid={tid('dev-overlay', 'content')}>
				<!-- Pathname -->
				<div class="info-row">
					<span class="label">pathname:</span>
					<code class="value">{pathname}</code>
				</div>

				<!-- Search params -->
				{#if search}
					<div class="info-row">
						<span class="label">search:</span>
						<code class="value">{search}</code>
					</div>
				{/if}

				<!-- Route params -->
				{#if hasParams}
					<div class="info-row">
						<span class="label">params:</span>
						<pre class="value pre">{paramsJson}</pre>
					</div>
				{/if}

				<!-- Route ID -->
				<div class="info-row">
					<span class="label">route.id:</span>
					<code class="value" class:null={!routeId}>
						{routeId ?? 'null'}
					</code>
				</div>

				<!-- View breadcrumb -->
				{#if $viewIdBreadcrumb.length > 0}
					<div class="info-row">
						<span class="label">viewId:</span>
						<code class="value view-breadcrumb">
							{$viewIdBreadcrumb.join(' > ')}
						</code>
					</div>
				{/if}

				<!-- Data keys (expandable section) -->
				{#if dataKeys.length > 0}
					<div class="info-row">
						<span class="label">data keys:</span>
						<code class="value data-keys">
							{dataKeys.join(', ')}
						</code>
					</div>
				{/if}

				<!-- Timestamp -->
				{#if browser && timestamp}
					<div class="info-row muted">
						<span class="label">time:</span>
						<span class="value">{timestamp}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.dev-overlay {
		position: fixed;
		bottom: 8px;
		right: 8px;
		z-index: 99999;
		pointer-events: none;
		font-family: ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Mono', monospace;
		font-size: 11px;
		line-height: 1.4;
	}

	.dev-overlay-container {
		background-color: rgba(30, 30, 30, 0.92);
		color: #e0e0e0;
		border-radius: 6px;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.3),
			0 0 0 1px rgba(255, 255, 255, 0.1);
		max-width: 360px;
		min-width: 120px;
		overflow: hidden;
		pointer-events: auto;
	}

	.dev-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 8px;
		background-color: rgba(0, 0, 0, 0.3);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 3px;
		font: inherit;
	}

	.toggle-btn:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.dev-badge {
		background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
		color: white;
		padding: 1px 6px;
		border-radius: 3px;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.5px;
	}

	.toggle-icon {
		font-size: 8px;
		opacity: 0.7;
	}

	.copy-btn {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 12px;
	}

	.copy-btn:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.dev-summary {
		padding: 4px 8px;
	}

	.dev-summary .pathname {
		color: #93c5fd;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 200px;
		display: block;
	}

	.dev-content {
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.info-row {
		display: flex;
		gap: 8px;
		align-items: flex-start;
	}

	.info-row.muted {
		opacity: 0.6;
	}

	.label {
		color: #9ca3af;
		flex-shrink: 0;
		min-width: 70px;
	}

	.value {
		color: #93c5fd;
		word-break: break-all;
		overflow-wrap: break-word;
	}

	.value.null {
		color: #f87171;
		font-style: italic;
	}

	.value.pre {
		white-space: pre;
		background-color: rgba(0, 0, 0, 0.2);
		padding: 4px 6px;
		border-radius: 3px;
		font-size: 10px;
	}

	.value.view-breadcrumb {
		color: #a78bfa;
	}

	.value.data-keys {
		color: #86efac;
		font-size: 10px;
	}

	code {
		font-family: inherit;
	}

	pre {
		margin: 0;
		font-family: inherit;
	}

	/* Expanded state */
	.dev-overlay.expanded .dev-overlay-container {
		min-width: 280px;
	}
</style>
