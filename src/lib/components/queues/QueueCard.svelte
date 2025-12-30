<script lang="ts">
    import type { QueueSummary } from '$lib/api/queues';

    interface Props {
        queue: QueueSummary;
        onClick: () => void;
    }

    let { queue, onClick }: Props = $props();

    const hasActivity = $derived(queue.startedCount > 0);
    const hasFailed = $derived(queue.failedCount > 0);
</script>

<button class="queue-card" onclick={onClick} type="button">
    <div class="card-header">
        <h3 class="queue-name">{queue.name}</h3>
        {#if queue.isEmpty}
            <span class="status-dot empty"></span>
        {:else if hasActivity}
            <span class="status-dot active"></span>
        {:else}
            <span class="status-dot pending"></span>
        {/if}
    </div>

    <div class="card-body">
        <div class="stat main-stat">
            <span class="stat-value">{queue.count}</span>
            <span class="stat-label">pending</span>
        </div>

        <div class="stat-grid">
            <div class="stat">
                <span class="stat-value started">{queue.startedCount}</span>
                <span class="stat-label">started</span>
            </div>
            <div class="stat">
                <span class="stat-value" class:failed={hasFailed}>{queue.failedCount}</span>
                <span class="stat-label">failed</span>
            </div>
            <div class="stat">
                <span class="stat-value finished">{queue.finishedCount}</span>
                <span class="stat-label">finished</span>
            </div>
        </div>
    </div>
</button>

<style>
    .queue-card {
        display: flex;
        flex-direction: column;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        width: 100%;
    }
    .queue-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }
    .queue-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0;
    }
    .status-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
    }
    .status-dot.empty {
        background-color: #9ca3af;
    }
    .status-dot.pending {
        background-color: #fbbf24;
    }
    .status-dot.active {
        background-color: #3b82f6;
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    .card-body {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .main-stat {
        text-align: center;
        padding: 0.5rem 0;
        background: #f9fafb;
        border-radius: 0.375rem;
    }
    .main-stat .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
    }
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
    }
    .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .stat-value {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
    }
    .stat-value.started {
        color: #3b82f6;
    }
    .stat-value.failed {
        color: #dc2626;
    }
    .stat-value.finished {
        color: #10b981;
    }
    .stat-label {
        font-size: 0.75rem;
        color: #6b7280;
    }
</style>
