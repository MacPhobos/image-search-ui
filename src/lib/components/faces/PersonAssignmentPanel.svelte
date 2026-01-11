<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import type { Person } from '$lib/api/faces';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';

	// Component tracking (DEV only)
	const cleanup = registerComponent('faces/PersonAssignmentPanel', {
		filePath: 'src/lib/components/faces/PersonAssignmentPanel.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		open: boolean;
		faceId: string;
		persons: Person[];
		personsLoading: boolean;
		submitting: boolean;
		error: string | null;
		recentPersonIds?: string[];
		onCancel: () => void;
		onAssignToExisting: (personId: string) => void;
		onCreateAndAssign: (name: string) => void;
	}

	let {
		open,
		faceId,
		persons,
		personsLoading,
		submitting,
		error,
		recentPersonIds = [],
		onCancel,
		onAssignToExisting,
		onCreateAndAssign
	}: Props = $props();

	// Local state for search query
	let personSearchQuery = $state('');

	// Filtered and sorted persons
	let filteredPersons = $derived(() => {
		const query = personSearchQuery.toLowerCase().trim();
		let results = query ? persons.filter((p) => p.name.toLowerCase().includes(query)) : persons;

		// Sort by recency (MRU), then alphabetically
		return [...results].sort((a, b) => {
			const rankA = recentPersonIds.indexOf(a.id);
			const rankB = recentPersonIds.indexOf(b.id);

			// Both in recent list
			if (rankA !== -1 && rankB !== -1) return rankA - rankB;
			// Only A in recent list
			if (rankA !== -1) return -1;
			// Only B in recent list
			if (rankB !== -1) return 1;
			// Neither in recent list, sort alphabetically
			return a.name.localeCompare(b.name);
		});
	});

	let showCreateOption = $derived(
		personSearchQuery.trim().length > 0 &&
			!persons.some((p) => p.name.toLowerCase() === personSearchQuery.trim().toLowerCase())
	);

	// Reset query when panel closes
	$effect(() => {
		if (!open) {
			personSearchQuery = '';
		}
	});

	function handleAssignToExisting(person: Person) {
		if (submitting) return;
		onAssignToExisting(person.id);
	}

	function handleCreateAndAssign() {
		if (!personSearchQuery.trim() || submitting) return;
		onCreateAndAssign(personSearchQuery.trim());
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="assignment-panel" data-face-id={faceId}>
		<div class="assignment-header">
			<h4>Assign to Person</h4>
			<button type="button" class="close-btn" onclick={onCancel} aria-label="Cancel assignment">
				×
			</button>
		</div>

		{#if error}
			<Alert.Root variant="destructive" class="mb-2">
				<Alert.Description class="text-xs">{error}</Alert.Description>
			</Alert.Root>
		{/if}

		<input
			type="text"
			placeholder="Search or create person..."
			bind:value={personSearchQuery}
			class="person-search-input"
			aria-label="Search persons or enter new name"
		/>

		<div class="person-options">
			{#if personsLoading}
				<div class="loading-option">Loading persons...</div>
			{:else}
				<!-- Create new option -->
				{#if showCreateOption}
					<button
						type="button"
						class="person-option create-new"
						onclick={handleCreateAndAssign}
						disabled={submitting}
					>
						<span class="person-avatar create-avatar">+</span>
						<span>Create "{personSearchQuery.trim()}"</span>
					</button>
				{/if}

				<!-- Existing persons -->
				{#each filteredPersons() as person (person.id)}
					<button
						type="button"
						class="person-option"
						onclick={() => handleAssignToExisting(person)}
						disabled={submitting}
					>
						<span class="person-avatar">
							{person.name.charAt(0).toUpperCase()}
						</span>
						<div class="person-option-info">
							<span class="person-option-name">{person.name}</span>
							<span class="person-option-meta">{person.faceCount} faces</span>
						</div>
					</button>
				{/each}

				{#if filteredPersons().length === 0 && !showCreateOption}
					<div class="no-results">No persons found</div>
				{/if}
			{/if}
		</div>

		<div class="assignment-footer">
			<Button variant="outline" size="sm" onclick={onCancel} disabled={submitting}>Cancel</Button>
		</div>
	</div>
{/if}

<style>
	.assignment-panel {
		background-color: #f8f9fa;
		border-radius: 8px;
		padding: 0.75rem;
		margin: 0.5rem 0.625rem;
		border: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 500px;
	}

	.assignment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-shrink: 0;
	}

	.assignment-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}

	.close-btn {
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
		color: #666;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-btn:hover {
		background-color: #e0e0e0;
	}

	.close-btn:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.person-search-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.875rem;
		transition: border-color 0.2s;
		flex-shrink: 0;
	}

	.person-search-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.person-options {
		flex: 1;
		min-height: 150px;
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		background-color: white;
	}

	.loading-option,
	.no-results {
		padding: 1rem;
		text-align: center;
		color: #666;
		font-size: 0.75rem;
	}

	.person-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
		font: inherit;
	}

	.person-option:hover:not(:disabled) {
		background-color: #f5f5f5;
	}

	.person-option:focus {
		outline: 2px solid #4a90e2;
		outline-offset: -2px;
	}

	.person-option:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.person-option:not(:last-child) {
		border-bottom: 1px solid #f0f0f0;
	}

	.person-option.create-new {
		background-color: #f0f7ff;
		color: #4a90e2;
		font-weight: 500;
		font-size: 0.8125rem;
	}

	.person-option.create-new:hover:not(:disabled) {
		background-color: #e0efff;
	}

	.person-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.person-avatar.create-avatar {
		background: #4a90e2;
		font-size: 1.125rem;
	}

	.person-option-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.person-option-name {
		font-weight: 500;
		color: #333;
		font-size: 0.8125rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.person-option-meta {
		font-size: 0.6875rem;
		color: #999;
	}

	.assignment-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		flex-shrink: 0;
		padding-top: 0.5rem;
		border-top: 1px solid #e0e0e0;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.assignment-panel {
			max-height: 400px;
		}

		.person-options {
			max-height: 200px;
		}
	}
</style>
