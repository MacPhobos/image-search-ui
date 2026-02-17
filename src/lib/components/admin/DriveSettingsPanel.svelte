<script lang="ts">
	import { getDriveHealth, type DriveHealthResponse } from '$lib/api/gdrive';
	import DriveStatusBadge from '$lib/components/gdrive/DriveStatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';

	let health = $state<DriveHealthResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let testing = $state(false);

	let storageLabel = $derived.by(() => {
		if (!health?.storageUsedBytes || !health?.storageTotalBytes) return null;
		const usedGB = (health.storageUsedBytes / 1024 ** 3).toFixed(1);
		const totalGB = (health.storageTotalBytes / 1024 ** 3).toFixed(1);
		return `${usedGB} GB / ${totalGB} GB`;
	});

	let storagePercent = $derived(health?.storageUsagePercentage ?? null);

	let lastUploadFormatted = $derived.by(() => {
		if (!health?.lastUploadAt) return null;
		try {
			return new Date(health.lastUploadAt).toLocaleString();
		} catch {
			return null;
		}
	});

	$effect(() => {
		loadHealth();
	});

	async function loadHealth() {
		loading = true;
		error = null;
		try {
			health = await getDriveHealth();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load Drive status';
		} finally {
			loading = false;
		}
	}

	async function testConnection() {
		testing = true;
		error = null;
		try {
			health = await getDriveHealth();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Connection test failed';
		} finally {
			testing = false;
		}
	}
</script>

<div class="border rounded-lg p-4">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold">Google Drive</h3>
		<DriveStatusBadge status={health} />
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-6">
			<span
				class="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
			></span>
			<span class="ml-2 text-sm text-gray-500">Loading status...</span>
		</div>
	{:else if error}
		<div class="py-4" role="alert">
			<p class="text-sm text-red-600 mb-2">{error}</p>
			<Button size="sm" variant="outline" onclick={loadHealth}>Retry</Button>
		</div>
	{:else if health}
		<div class="space-y-3">
			<!-- Connection -->
			<div class="flex justify-between text-sm">
				<span class="text-gray-500">Enabled</span>
				<span class="font-medium">{health.enabled ? 'Yes' : 'No'}</span>
			</div>

			{#if health.connected}
				{#if health.serviceAccountEmail}
					<div class="flex justify-between text-sm">
						<span class="text-gray-500">Service Account</span>
						<span
							class="font-mono text-xs truncate max-w-[200px]"
							title={health.serviceAccountEmail}
						>
							{health.serviceAccountEmail}
						</span>
					</div>
				{/if}

				{#if health.rootFolderName}
					<div class="flex justify-between text-sm">
						<span class="text-gray-500">Root Folder</span>
						<span class="font-medium">{health.rootFolderName}</span>
					</div>
				{/if}

				{#if storageLabel && storagePercent !== null}
					<div class="text-sm">
						<div class="flex justify-between mb-1">
							<span class="text-gray-500">Storage</span>
							<span class="font-medium">{storageLabel} ({storagePercent.toFixed(0)}%)</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div
								class="h-2 rounded-full transition-all {storagePercent > 90
									? 'bg-red-500'
									: storagePercent > 70
										? 'bg-yellow-500'
										: 'bg-green-500'}"
								style="width: {Math.min(storagePercent, 100)}%"
							></div>
						</div>
					</div>
				{/if}

				{#if lastUploadFormatted}
					<div class="flex justify-between text-sm">
						<span class="text-gray-500">Last Upload</span>
						<span>{lastUploadFormatted}</span>
					</div>
				{/if}
			{:else if health.error}
				<div class="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">
					{health.error}
				</div>
			{:else if !health.enabled}
				<p class="text-sm text-gray-500">
					Google Drive integration is not enabled. Set GOOGLE_DRIVE_ENABLED=true in your
					environment.
				</p>
			{/if}

			<!-- Test connection -->
			<div class="pt-2">
				<Button size="sm" variant="outline" onclick={testConnection} disabled={testing}>
					{testing ? 'Testing...' : 'Test Connection'}
				</Button>
			</div>
		</div>
	{/if}
</div>
