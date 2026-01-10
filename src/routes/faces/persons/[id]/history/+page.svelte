<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		getPersonAssignmentHistory,
		unassignFace,
		getPersonById,
		type AssignmentEvent
	} from '$lib/api/faces';
	import type { Person } from '$lib/api/faces';

	const personId = $page.params.id;

	let person = $state<Person | null>(null);
	let events = $state<AssignmentEvent[]>([]);
	let total = $state(0);
	let offset = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let operationFilter = $state<string>('');

	// Track which events are being undone
	let undoingEvents = $state<Set<string>>(new Set());

	async function loadHistory() {
		loading = true;
		error = null;
		try {
			const [personData, historyData] = await Promise.all([
				getPersonById(personId),
				getPersonAssignmentHistory(personId, {
					limit: 20,
					offset,
					operation: operationFilter || undefined
				})
			]);
			person = personData;
			events = historyData.events;
			total = historyData.total;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load history';
		} finally {
			loading = false;
		}
	}

	async function handleUndo(event: AssignmentEvent) {
		if (event.operation !== 'ASSIGN_TO_PERSON' && event.operation !== 'BULK_ASSIGN') return;

		undoingEvents = new Set([...undoingEvents, event.id]);

		try {
			// Unassign all faces from this event
			for (const faceId of event.faceInstanceIds) {
				await unassignFace(faceId);
			}
			// Reload history
			await loadHistory();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to undo';
		} finally {
			undoingEvents = new Set([...undoingEvents].filter((id) => id !== event.id));
		}
	}

	function getOperationLabel(op: string): string {
		switch (op) {
			case 'ASSIGN_TO_PERSON':
				return 'Assigned';
			case 'UNASSIGN_FROM_PERSON':
				return 'Unassigned';
			case 'MOVE_TO_PERSON':
				return 'Moved';
			case 'BULK_ASSIGN':
				return 'Bulk assigned';
			case 'BULK_UNASSIGN':
				return 'Bulk unassigned';
			case 'BULK_MOVE':
				return 'Bulk moved';
			default:
				return op;
		}
	}

	function getOperationIcon(op: string): string {
		switch (op) {
			case 'ASSIGN_TO_PERSON':
			case 'BULK_ASSIGN':
				return '📥';
			case 'UNASSIGN_FROM_PERSON':
			case 'BULK_UNASSIGN':
				return '📤';
			case 'MOVE_TO_PERSON':
			case 'BULK_MOVE':
				return '🔄';
			default:
				return '📋';
		}
	}

	function canUndo(event: AssignmentEvent): boolean {
		return (
			event.operation === 'ASSIGN_TO_PERSON' ||
			event.operation === 'BULK_ASSIGN' ||
			event.operation === 'MOVE_TO_PERSON' ||
			event.operation === 'BULK_MOVE'
		);
	}

	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function handleFilterChange() {
		offset = 0; // Reset offset when filter changes
		loadHistory();
	}

	function loadMore() {
		offset += 20;
		loadHistory();
	}

	onMount(loadHistory);
</script>

<div class="history-page">
	<header class="page-header">
		<a href="/people/{personId}" class="back-link"> ← Back to {person?.name ?? 'Person'} </a>
		<h1>Assignment History</h1>
	</header>

	<div class="filters">
		<label for="operation-filter">Filter:</label>
		<select id="operation-filter" bind:value={operationFilter} onchange={handleFilterChange}>
			<option value="">All Operations</option>
			<option value="ASSIGN_TO_PERSON">Assignments</option>
			<option value="UNASSIGN_FROM_PERSON">Unassignments</option>
			<option value="MOVE_TO_PERSON">Moves</option>
		</select>
	</div>

	{#if loading}
		<div class="loading">Loading history...</div>
	{:else if error}
		<div class="error" role="alert">{error}</div>
	{:else if events && events.length === 0}
		<div class="empty">No assignment history found.</div>
	{:else if events && events.length > 0}
		<div class="events-list">
			{#each events as event (event.id)}
				<article class="event-card">
					<div class="event-header">
						<span class="icon">{getOperationIcon(event.operation)}</span>
						<time datetime={event.createdAt}>{formatDate(event.createdAt)}</time>
					</div>

					<div class="event-body">
						<p class="operation">
							{getOperationLabel(event.operation)}
							{event.faceCount} face{event.faceCount !== 1 ? 's' : ''}
							{#if event.operation === 'MOVE_TO_PERSON' && event.fromPersonName}
								from {event.fromPersonName}
							{/if}
						</p>
						<p class="photos">
							{event.photoCount} photo{event.photoCount !== 1 ? 's' : ''} affected
						</p>
						{#if event.note}
							<p class="note">{event.note}</p>
						{/if}
					</div>

					<div class="event-actions">
						{#if canUndo(event)}
							<button
								type="button"
								class="btn-undo"
								onclick={() => handleUndo(event)}
								disabled={undoingEvents.has(event.id)}
							>
								{undoingEvents.has(event.id) ? 'Undoing...' : 'Undo'}
							</button>
						{:else}
							<span class="no-undo">Cannot undo</span>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		{#if events.length < total}
			<div class="pagination">
				<button type="button" class="btn-load-more" onclick={loadMore} disabled={loading}>
					{loading ? 'Loading...' : `Load More (${events.length} of ${total})`}
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.history-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		color: rgb(59 130 246);
		text-decoration: none;
		font-size: 0.875rem;
		display: inline-block;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	h1 {
		margin: 0.5rem 0 0 0;
		font-size: 1.875rem;
		font-weight: 600;
	}

	.filters {
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filters label {
		font-weight: 500;
	}

	.filters select {
		padding: 0.5rem;
		border: 1px solid rgb(209 213 219);
		border-radius: 0.375rem;
		background: white;
		font-size: 0.875rem;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.event-card {
		border: 1px solid rgb(229 231 235);
		border-radius: 0.5rem;
		padding: 1rem;
		background: white;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		color: rgb(107 114 128);
		font-size: 0.875rem;
	}

	.icon {
		font-size: 1.25rem;
	}

	.event-body {
		margin-bottom: 0.75rem;
	}

	.operation {
		font-weight: 500;
		margin: 0 0 0.25rem 0;
	}

	.photos {
		color: rgb(107 114 128);
		font-size: 0.875rem;
		margin: 0;
	}

	.note {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		font-style: italic;
		color: rgb(75 85 99);
	}

	.event-actions {
		display: flex;
		justify-content: flex-end;
	}

	.btn-undo {
		padding: 0.375rem 0.75rem;
		border: 1px solid rgb(209 213 219);
		border-radius: 0.375rem;
		background: white;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-undo:hover:not(:disabled) {
		background: rgb(249 250 251);
		border-color: rgb(156 163 175);
	}

	.btn-undo:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.no-undo {
		color: rgb(156 163 175);
		font-size: 0.75rem;
		padding: 0.375rem 0;
	}

	.pagination {
		margin-top: 1.5rem;
		text-align: center;
	}

	.btn-load-more {
		padding: 0.5rem 1rem;
		border: 1px solid rgb(209 213 219);
		border-radius: 0.375rem;
		background: white;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-load-more:hover:not(:disabled) {
		background: rgb(249 250 251);
		border-color: rgb(156 163 175);
	}

	.btn-load-more:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading,
	.empty {
		text-align: center;
		padding: 2rem;
		color: rgb(107 114 128);
	}

	.error {
		padding: 1rem;
		background: rgb(254 242 242);
		color: rgb(153 27 27);
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}
</style>
