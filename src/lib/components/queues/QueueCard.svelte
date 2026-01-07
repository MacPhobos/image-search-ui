<script lang="ts">
	import type { QueueSummary } from '$lib/api/queues';
	import * as Card from '$lib/components/ui/card';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface Props {
		queue: QueueSummary;
		onClick: () => void;
	}

	let { queue, onClick }: Props = $props();

	const hasActivity = $derived(queue.startedCount > 0);
	const hasFailed = $derived(queue.failedCount > 0);

	const statusTooltip = $derived(() => {
		if (queue.isEmpty) return 'Queue is empty';
		if (hasActivity) return 'Jobs are currently being processed';
		return 'Jobs are waiting to be processed';
	});
</script>

<button onclick={onClick} type="button" class="w-full text-left transition-all hover:shadow-md">
	<Card.Root class="cursor-pointer hover:border-blue-500">
		<Card.Header>
			<Card.Title class="text-sm">{queue.name}</Card.Title>
			<Card.Action>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#if queue.isEmpty}
							<span class="status-dot empty"></span>
						{:else if hasActivity}
							<span class="status-dot active"></span>
						{:else}
							<span class="status-dot pending"></span>
						{/if}
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>{statusTooltip()}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</Card.Action>
		</Card.Header>

		<Card.Content class="flex flex-col gap-3">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<div class="main-stat cursor-help">
						<span class="stat-value">{queue.count}</span>
						<span class="stat-label">pending</span>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Number of jobs waiting to be processed</p>
				</Tooltip.Content>
			</Tooltip.Root>

			<div class="stat-grid">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<div class="stat cursor-help">
							<span class="stat-value started">{queue.startedCount}</span>
							<span class="stat-label">started</span>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Jobs currently being processed by workers</p>
					</Tooltip.Content>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<div class="stat cursor-help">
							<span class="stat-value" class:failed={hasFailed}>{queue.failedCount}</span>
							<span class="stat-label">failed</span>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Jobs that encountered errors during processing</p>
					</Tooltip.Content>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<div class="stat cursor-help">
							<span class="stat-value finished">{queue.finishedCount}</span>
							<span class="stat-label">finished</span>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Successfully completed jobs</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</Card.Content>
	</Card.Root>
</button>

<style>
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
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
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
