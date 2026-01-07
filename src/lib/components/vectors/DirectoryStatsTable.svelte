<script lang="ts">
	import type { DirectoryStats } from '$lib/api/vectors';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		directories: DirectoryStats[];
		loading?: boolean;
		onDelete: (pathPrefix: string) => void;
		onRetrain: (pathPrefix: string) => void;
	}

	let { directories, loading = false, onDelete, onRetrain }: Props = $props();

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPath(path: string): string {
		// Extract meaningful part of path
		const parts = path.split('/');
		return parts.slice(-3).join('/');
	}
</script>

{#if loading}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>Loading directory statistics...</p>
	</div>
{:else if directories.length === 0}
	<div class="empty-state">
		<p>No directories with vectors found.</p>
	</div>
{:else}
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Directory</Table.Head>
					<Table.Head>Vector Count</Table.Head>
					<Table.Head>Last Indexed</Table.Head>
					<Table.Head>Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each directories as dir (dir.pathPrefix)}
					<Table.Row>
						<Table.Cell class="font-mono text-xs max-w-[300px] truncate" title={dir.pathPrefix}>
							{formatPath(dir.pathPrefix)}
						</Table.Cell>
						<Table.Cell class="font-semibold text-blue-600">
							{dir.vectorCount.toLocaleString()}
						</Table.Cell>
						<Table.Cell class="text-gray-500 text-xs">
							{formatDate(dir.lastIndexed)}
						</Table.Cell>
						<Table.Cell>
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() => onRetrain(dir.pathPrefix)}
									title="Delete vectors and create new training session"
								>
									Retrain
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onclick={() => onDelete(dir.pathPrefix)}
									title="Delete all vectors for this directory"
								>
									Delete
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}

<style>
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
