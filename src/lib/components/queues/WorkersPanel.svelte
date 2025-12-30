<script lang="ts">
    import type { WorkerInfo } from '$lib/api/queues';
    import WorkerStatusBadge from './WorkerStatusBadge.svelte';

    interface Props {
        workers: WorkerInfo[];
        total: number;
        active: number;
        idle: number;
        loading?: boolean;
    }

    let { workers, total, active, idle, loading = false }: Props = $props();

    function formatTime(seconds: number): string {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    }

    function formatDate(dateStr: string | null): string {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleTimeString();
    }

    function truncateName(name: string, maxLen: number = 20): string {
        if (name.length <= maxLen) return name;
        return name.slice(0, maxLen - 3) + '...';
    }
</script>

<div class="workers-panel">
    <div class="panel-header">
        <h3>Workers</h3>
        <div class="worker-stats">
            <span class="stat">
                <span class="stat-value">{total}</span> total
            </span>
            <span class="stat active">
                <span class="stat-value">{active}</span> busy
            </span>
            <span class="stat idle">
                <span class="stat-value">{idle}</span> idle
            </span>
        </div>
    </div>

    {#if loading}
        <div class="loading">Loading workers...</div>
    {:else if workers.length === 0}
        <div class="empty">No workers connected</div>
    {:else}
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>State</th>
                        <th>Current Job</th>
                        <th>Jobs</th>
                        <th>Uptime</th>
                        <th>Last Heartbeat</th>
                    </tr>
                </thead>
                <tbody>
                    {#each workers as worker}
                        <tr>
                            <td class="worker-name" title={worker.name}>
                                {truncateName(worker.name)}
                            </td>
                            <td>
                                <WorkerStatusBadge state={worker.state} size="sm" />
                            </td>
                            <td class="current-job">
                                {#if worker.currentJob}
                                    <span class="job-func" title={worker.currentJob.funcName}>
                                        {worker.currentJob.funcName.split('.').pop()}
                                    </span>
                                {:else}
                                    <span class="no-job">-</span>
                                {/if}
                            </td>
                            <td class="jobs-count">
                                <span class="success">{worker.successfulJobCount}</span>
                                /
                                <span class="failed">{worker.failedJobCount}</span>
                            </td>
                            <td>{formatTime(worker.totalWorkingTime)}</td>
                            <td class="heartbeat">{formatDate(worker.lastHeartbeat)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .workers-panel {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
    }
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
    }
    .panel-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
    }
    .worker-stats {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: #6b7280;
    }
    .stat .stat-value {
        font-weight: 600;
        color: #374151;
    }
    .stat.active .stat-value {
        color: #3b82f6;
    }
    .stat.idle .stat-value {
        color: #10b981;
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
    .worker-name {
        font-family: monospace;
        font-size: 0.8125rem;
    }
    .current-job .job-func {
        font-family: monospace;
        font-size: 0.8125rem;
        color: #3b82f6;
    }
    .current-job .no-job {
        color: #9ca3af;
    }
    .jobs-count .success {
        color: #10b981;
    }
    .jobs-count .failed {
        color: #dc2626;
    }
    .heartbeat {
        font-family: monospace;
        font-size: 0.8125rem;
        color: #6b7280;
    }
</style>
