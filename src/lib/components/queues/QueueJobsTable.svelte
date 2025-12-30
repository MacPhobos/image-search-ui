<script lang="ts">
    import type { JobInfo } from '$lib/api/queues';
    import JobStatusBadge from './JobStatusBadge.svelte';

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
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Job ID</th>
                        <th>Function</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Started</th>
                    </tr>
                </thead>
                <tbody>
                    {#each jobs as job}
                        <tr
                            class:clickable={!!onJobSelect}
                            onclick={() => onJobSelect?.(job.id)}
                        >
                            <td class="job-id" title={job.id}>
                                {truncateId(job.id)}
                            </td>
                            <td class="func-name" title={job.funcName}>
                                {getFuncShortName(job.funcName)}
                            </td>
                            <td>
                                <JobStatusBadge status={job.status} size="sm" />
                            </td>
                            <td class="timestamp">{formatDate(job.createdAt)}</td>
                            <td class="timestamp">{formatDate(job.startedAt)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <div class="pagination">
            <button
                class="page-btn"
                disabled={!canGoPrev || loading}
                onclick={() => onPageChange(page - 1)}
            >
                ← Prev
            </button>
            <span class="page-info">
                Page {page} of {totalPages}
            </span>
            <button
                class="page-btn"
                disabled={!canGoNext || loading}
                onclick={() => onPageChange(page + 1)}
            >
                Next →
            </button>
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
    .loading, .empty {
        padding: 2rem;
        text-align: center;
        color: #6b7280;
    }
    .table-container {
        overflow-x: auto;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
    }
    th {
        text-align: left;
        padding: 0.75rem 1rem;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        font-weight: 500;
        color: #6b7280;
        white-space: nowrap;
    }
    td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f3f4f6;
        color: #374151;
    }
    tr:hover {
        background: #f9fafb;
    }
    tr.clickable {
        cursor: pointer;
    }
    tr.clickable:hover {
        background: #eff6ff;
    }
    .job-id {
        font-family: monospace;
        font-size: 0.8125rem;
        color: #6b7280;
    }
    .func-name {
        font-family: monospace;
        font-size: 0.8125rem;
        color: #3b82f6;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .timestamp {
        font-size: 0.8125rem;
        color: #6b7280;
        white-space: nowrap;
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
    .page-btn {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        background: white;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    .page-btn:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #9ca3af;
    }
    .page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .page-info {
        font-size: 0.875rem;
        color: #6b7280;
    }
</style>
