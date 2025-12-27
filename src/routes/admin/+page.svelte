<script lang="ts">
	import AdminDataManagement from '$lib/components/admin/AdminDataManagement.svelte';
	import FaceMatchingSettings from '$lib/components/admin/FaceMatchingSettings.svelte';

	let activeTab = $state<'data' | 'settings'>('data');
</script>

<svelte:head>
	<title>Admin Panel - Image Search</title>
</svelte:head>

<div class="admin-page">
	<header class="page-header">
		<h1>Admin Panel</h1>
		<p class="page-description">
			System-wide administrative operations for managing application data and configuration.
		</p>
	</header>

	<nav class="admin-tabs" role="tablist" aria-label="Admin sections">
		<button
			class="tab-button"
			class:active={activeTab === 'data'}
			role="tab"
			aria-selected={activeTab === 'data'}
			aria-controls="data-panel"
			onclick={() => (activeTab = 'data')}
		>
			Data Management
		</button>
		<button
			class="tab-button"
			class:active={activeTab === 'settings'}
			role="tab"
			aria-selected={activeTab === 'settings'}
			aria-controls="settings-panel"
			onclick={() => (activeTab = 'settings')}
		>
			Settings
		</button>
	</nav>

	<div class="tab-content">
		{#if activeTab === 'data'}
			<div id="data-panel" role="tabpanel" aria-labelledby="data-tab">
				<AdminDataManagement />
			</div>
		{:else if activeTab === 'settings'}
			<div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab">
				<FaceMatchingSettings />
			</div>
		{/if}
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
		border-bottom: 2px solid #e5e7eb;
		margin-bottom: 1.5rem;
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		cursor: pointer;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #6b7280;
		transition: all 0.15s ease;
	}

	.tab-button:hover {
		color: #374151;
		background: #f9fafb;
	}

	.tab-button.active {
		color: #3b82f6;
		border-bottom-color: #3b82f6;
	}

	.tab-content {
		min-height: 400px;
	}

	@media (max-width: 768px) {
		.page-header h1 {
			font-size: 1.5rem;
		}

		.page-description {
			font-size: 0.9rem;
		}

		.tab-button {
			padding: 0.625rem 1rem;
			font-size: 0.875rem;
		}
	}
</style>
