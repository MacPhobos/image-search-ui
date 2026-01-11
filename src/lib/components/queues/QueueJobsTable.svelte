<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import type { JobInfo } from '$lib/api/queues';
	import JobStatusBadge from './JobStatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';

	// Component tracking (DEV only)
	const cleanup = registerComponent('queues/QueueJobsTable', {
		filePath: 'src/lib/components/queues/QueueJobsTable.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		jobs: JobInfo[];
		page: number;
		pageSize: number;
		hasMore: boolean;
		totalCount: number;
		loading?: boolean;
		onPageChange: (page: number) => void;
		onJobSelect?: (jobId: string) => void;
	}

	let {
		jobs,
		page,
		pageSize,
		hasMore,
		totalCount,
		loading = false,
		onPageChange,
		onJobSelect
	}: Props = $props();

	const totalPages = $derived(Math.ceil(totalCount / pageSize) || 1);
	const canGoPrev = $derived(page > 1);
	const canGoNext = $derived(hasMore);

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
		return date.toLocaleDateString();
	}

	function truncateId(id: string): string {
		if (id.length <= 12) return id;
		return id.slice(0, 8) + '...';
	}

	function getFuncShortName(funcName: string): string {
		const parts = funcName.split('.');
		return parts[parts.length - 1] || funcName;
	}
</script>

<div class="jobs-table">
	{#if loading && jobs.length === 0}
		<div class="loading">Loading jobs...</div>
	{:else if jobs.length === 0}
		<div class="empty">No jobs in queue</div>
	{:else}
		<div class="table-wrapper">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Job ID</Table.Head>
						<Table.Head>Function</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head>Started</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each jobs as job}
						<Table.Row
							class={onJobSelect ? 'cursor-pointer hover:bg-blue-50' : ''}
							onclick={() => onJobSelect?.(job.id)}
						>
							<Table.Cell class="font-mono text-sm text-muted-foreground" title={job.id}>
								{truncateId(job.id)}
							</Table.Cell>
							<Table.Cell class="font-mono text-sm text-blue-600" title={job.funcName}>
								<span
									class="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap inline-block"
								>
									{getFuncShortName(job.funcName)}
								</span>
							</Table.Cell>
							<Table.Cell>
								<JobStatusBadge status={job.status} size="sm" />
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground whitespace-nowrap">
								{formatDate(job.createdAt)}
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground whitespace-nowrap">
								{formatDate(job.startedAt)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<div class="pagination">
			<Button
				variant="outline"
				size="sm"
				disabled={!canGoPrev || loading}
				onclick={() => onPageChange(page - 1)}
			>
				← Prev
			</Button>
			<span class="page-info">
				Page {page} of {totalPages}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={!canGoNext || loading}
				onclick={() => onPageChange(page + 1)}
			>
				Next →
			</Button>
		</div>
	{/if}
</div>

<style>
	.jobs-table {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.loading,
	.empty {
		padding: 2rem;
		text-align: center;
		color: #6b7280;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.page-info {
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
