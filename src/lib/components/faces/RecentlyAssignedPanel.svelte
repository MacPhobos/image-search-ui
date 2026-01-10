<script lang="ts">
	import { formatRelativeTime } from '$lib/utils/time';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { toAbsoluteUrl } from '$lib/api/faces';

	export interface RecentAssignment {
		faceId: string;
		personId: string;
		personName: string;
		thumbnailUrl: string;
		photoFilename: string;
		assignedAt: Date;
	}

	interface Props {
		assignments?: RecentAssignment[];
		onUndo?: (faceId: string) => Promise<void>;
		maxItems?: number;
		collapsible?: boolean;
	}

	let {
		assignments = [],
		onUndo,
		maxItems = 10,
		collapsible = true
	}: Props = $props();

	// Collapsible state
	let isExpanded = $state(true);

	// Per-item loading state for undo operations
	let undoingFaceIds = $state<Set<string>>(new Set());

	// Limit displayed items
	const displayedAssignments = $derived(assignments.slice(0, maxItems));

	async function handleUndo(assignment: RecentAssignment) {
		if (!onUndo || undoingFaceIds.has(assignment.faceId)) return;

		// Mark as loading
		undoingFaceIds.add(assignment.faceId);
		undoingFaceIds = new Set(undoingFaceIds);

		try {
			await onUndo(assignment.faceId);
			// Success - parent will remove from list
		} catch (err) {
			console.error('Undo failed:', err);
			// Show error state on this item (optional enhancement)
		} finally {
			// Remove loading state
			undoingFaceIds.delete(assignment.faceId);
			undoingFaceIds = new Set(undoingFaceIds);
		}
	}

	function toggleExpanded() {
		if (collapsible) {
			isExpanded = !isExpanded;
		}
	}
</script>

<Card.Root class="sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
	<Card.Header class="pb-3">
		<button
			type="button"
			class="header-button"
			onclick={toggleExpanded}
			aria-expanded={isExpanded}
			aria-label={isExpanded ? 'Collapse recent assignments' : 'Expand recent assignments'}
		>
			<Card.Title class="text-sm font-semibold">Recently Assigned</Card.Title>
			{#if collapsible}
				<span class="expand-icon" class:expanded={isExpanded}>▼</span>
			{/if}
		</button>
	</Card.Header>

	{#if isExpanded}
		<Card.Content class="pt-0">
			{#if displayedAssignments.length === 0}
				<div class="empty-state">
					<p class="text-sm text-muted-foreground">No recent assignments</p>
				</div>
			{:else}
				<ul class="assignments-list">
					{#each displayedAssignments as assignment (assignment.faceId)}
						{@const isUndoing = undoingFaceIds.has(assignment.faceId)}
						<li class="assignment-item" class:undoing={isUndoing}>
							<div class="assignment-content">
								<!-- Face thumbnail -->
								<img
									src={toAbsoluteUrl(assignment.thumbnailUrl)}
									alt="Face thumbnail"
									class="face-thumb"
									loading="lazy"
								/>

								<!-- Assignment info -->
								<div class="assignment-info">
									<div class="assignment-target">
										<span class="arrow">→</span>
										<span class="person-name">{assignment.personName}</span>
									</div>
									<div class="assignment-meta">
										<span class="photo-name" title={assignment.photoFilename}>
											{assignment.photoFilename}
										</span>
										<span class="time-ago">
											{formatRelativeTime(assignment.assignedAt)}
										</span>
									</div>
								</div>

								<!-- Undo button -->
								<Button
									variant="outline"
									size="sm"
									class="shrink-0 h-8 min-w-14 text-xs"
									onclick={() => handleUndo(assignment)}
									disabled={isUndoing}
									aria-label={`Undo assignment to ${assignment.personName}`}
								>
									{isUndoing ? '...' : 'Undo'}
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	{/if}
</Card.Root>

<style>
	.header-button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}

	.header-button:hover {
		opacity: 0.8;
	}

	.expand-icon {
		display: inline-block;
		transition: transform 0.2s ease;
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
	}

	.expand-icon.expanded {
		transform: rotate(180deg);
	}

	.empty-state {
		padding: 2rem 0;
		text-align: center;
	}

	.assignments-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow-y: auto;
		max-height: calc(100vh - 12rem);
	}

	.assignment-item {
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		background: hsl(var(--card));
		transition: all 0.2s ease;
	}

	.assignment-item:hover {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.assignment-item.undoing {
		opacity: 0.6;
		pointer-events: none;
	}

	.assignment-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.face-thumb {
		width: 40px;
		height: 40px;
		border-radius: 0.375rem;
		object-fit: cover;
		flex-shrink: 0;
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
	}

	.assignment-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.assignment-target {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
	}

	.arrow {
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.person-name {
		font-weight: 600;
		color: hsl(var(--foreground));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.assignment-meta {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
	}

	.photo-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 180px;
	}

	.time-ago {
		font-size: 0.6875rem;
		color: hsl(var(--muted-foreground) / 0.7);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.assignments-list {
			max-height: 400px;
		}
	}
</style>
