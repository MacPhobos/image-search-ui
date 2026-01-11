<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import type { DeletionLogEntry } from '$lib/api/vectors';
	import * as Table from '$lib/components/ui/table';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';

	// Component tracking (DEV only)
	const cleanup = registerComponent('vectors/DeletionLogsTable', {
		filePath: 'src/lib/components/vectors/DeletionLogsTable.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		logs: DeletionLogEntry[];
		loading?: boolean;
	}

	let { logs, loading = false }: Props = $props();

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getTypeVariant(type: string): BadgeVariant {
		const variants: Record<string, BadgeVariant> = {
			DIRECTORY: 'default',
			SESSION: 'success',
			CATEGORY: 'secondary',
			ASSET: 'warning',
			ORPHAN: 'destructive',
			FULL_RESET: 'destructive'
		};
		return variants[type] || 'outline';
	}

	function getTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			DIRECTORY: 'Directory',
			SESSION: 'Session',
			CATEGORY: 'Category',
			ASSET: 'Asset',
			ORPHAN: 'Orphan',
			FULL_RESET: 'Full Reset'
		};
		return labels[type] || type;
	}
</script>

<div class="table-container">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading deletion logs...</p>
		</div>
	{:else if logs.length === 0}
		<div class="empty-state">
			<p>No deletion history found.</p>
		</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Type</Table.Head>
					<Table.Head>Target</Table.Head>
					<Table.Head class="text-right">Count</Table.Head>
					<Table.Head>Reason</Table.Head>
					<Table.Head>Date</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each logs as log (log.id)}
					<Table.Row>
						<Table.Cell>
							<Badge variant={getTypeVariant(log.deletionType)}>
								{getTypeLabel(log.deletionType)}
							</Badge>
						</Table.Cell>
						<Table.Cell
							class="max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs"
							title={log.deletionTarget}
						>
							{log.deletionTarget}
						</Table.Cell>
						<Table.Cell class="text-right font-semibold text-red-500">
							{log.vectorCount.toLocaleString()}
						</Table.Cell>
						<Table.Cell class="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap italic text-gray-500">
							{log.deletionReason || '-'}
						</Table.Cell>
						<Table.Cell class="whitespace-nowrap text-xs text-gray-500">
							{formatDate(log.createdAt)}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<style>
	.table-container {
		width: 100%;
		overflow-x: auto;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		color: #6b7280;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
