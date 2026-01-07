<script lang="ts">
	import AdminDataManagement from '$lib/components/admin/AdminDataManagement.svelte';
	import FaceMatchingSettings from '$lib/components/admin/FaceMatchingSettings.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
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

	<Tabs.Root value="data" class="admin-tabs-container">
		<Tabs.List class="admin-tabs-list">
			<Tabs.Trigger value="data" class="admin-tab-trigger">Data Management</Tabs.Trigger>
			<Tabs.Trigger value="settings" class="admin-tab-trigger">Settings</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="data" class="admin-tab-content">
			<AdminDataManagement />
		</Tabs.Content>

		<Tabs.Content value="settings" class="admin-tab-content">
			<FaceMatchingSettings />
		</Tabs.Content>
	</Tabs.Root>
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

	/* shadcn Tabs customizations */
	:global(.admin-tabs-container) {
		margin-bottom: 1.5rem;
	}

	:global(.admin-tab-content) {
		min-height: 400px;
	}

	@media (max-width: 768px) {
		.page-header h1 {
			font-size: 1.5rem;
		}

		.page-description {
			font-size: 0.9rem;
		}
	}
</style>
