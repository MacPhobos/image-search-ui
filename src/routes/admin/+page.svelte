<script lang="ts">
	import AdminDataManagement from '$lib/components/admin/AdminDataManagement.svelte';
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

	<AdminDataManagement />

	<!-- Future: More admin sections can be added here -->
	<!-- Examples:
	- User Management
	- System Settings
	- Background Jobs Monitoring
	- Performance Metrics
	- API Key Management
	-->
</div>

<style>
	.admin-page {
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 2px solid #e5e7eb;
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

	@media (max-width: 768px) {
		.page-header h1 {
			font-size: 1.5rem;
		}

		.page-description {
			font-size: 0.9rem;
		}
	}
</style>
