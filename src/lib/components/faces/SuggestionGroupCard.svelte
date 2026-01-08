<script lang="ts">
	import type { FaceSuggestion } from '$lib/api/faces';
	import SuggestionThumbnail from './SuggestionThumbnail.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface SuggestionGroup {
		personId: string;
		personName: string | null;
		suggestions: FaceSuggestion[];
		pendingCount: number;
	}

	interface Props {
		group: SuggestionGroup;
		selectedIds: Set<number>;
		onSelect: (id: number, selected: boolean) => void;
		onSelectAllInGroup: (ids: number[], selected: boolean) => void;
		onAcceptAll: (ids: number[]) => Promise<void>;
		onRejectAll: (ids: number[]) => Promise<void>;
		onThumbnailClick: (suggestion: FaceSuggestion) => void;
	}

	let {
		group,
		selectedIds,
		onSelect,
		onSelectAllInGroup,
		onAcceptAll,
		onRejectAll,
		onThumbnailClick
	}: Props = $props();

	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Sort suggestions to prioritize multi-prototype matches
	const sortedSuggestions = $derived.by(() => {
		return [...group.suggestions].sort((a, b) => {
			// Multi-prototype matches first
			const aMulti = a.isMultiPrototypeMatch ? 1 : 0;
			const bMulti = b.isMultiPrototypeMatch ? 1 : 0;
			if (bMulti !== aMulti) return bMulti - aMulti;

			// Then by aggregate confidence (or regular confidence if not multi-prototype)
			const aConf = a.aggregateConfidence ?? a.confidence;
			const bConf = b.aggregateConfidence ?? b.confidence;
			return bConf - aConf;
		});
	});

	// Get all pending suggestion IDs in this group
	const pendingSuggestions = $derived(sortedSuggestions.filter((s) => s.status === 'pending'));
	const pendingIds = $derived(pendingSuggestions.map((s) => s.id));

	// Check if all pending suggestions in this group are selected
	const allSelected = $derived(
		pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id))
	);

	// Check if some (but not all) pending suggestions are selected
	const someSelected = $derived(
		pendingIds.length > 0 && !allSelected && pendingIds.some((id) => selectedIds.has(id))
	);

	// Map state to shadcn Checkbox format
	const checkboxChecked = $derived(allSelected);
	const checkboxIndeterminate = $derived(someSelected);

	function handleSelectAll(checked: boolean | 'indeterminate') {
		// When indeterminate or unchecked, select all; when checked, deselect all
		const shouldSelect = checked === true;
		onSelectAllInGroup(pendingIds, shouldSelect);
	}

	async function handleAcceptAll() {
		if (pendingIds.length === 0 || isLoading) return;

		isLoading = true;
		error = null;
		try {
			await onAcceptAll(pendingIds);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to accept suggestions';
		} finally {
			isLoading = false;
		}
	}

	async function handleRejectAll() {
		if (pendingIds.length === 0 || isLoading) return;

		isLoading = true;
		error = null;
		try {
			await onRejectAll(pendingIds);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reject suggestions';
		} finally {
			isLoading = false;
		}
	}
</script>

<article class="group-card">
	<!-- Header -->
	<header class="group-header">
		<div class="header-left">
			{#if group.pendingCount > 0}
				<Checkbox
					checked={checkboxChecked}
					indeterminate={checkboxIndeterminate}
					onCheckedChange={handleSelectAll}
					aria-label="Select all suggestions in this group"
				/>
			{/if}
			<div class="group-info">
				<h3 class="group-name">{group.personName || 'Unknown Person'}</h3>
				<span class="group-count">
					{group.suggestions.length} suggestion{group.suggestions.length === 1 ? '' : 's'}
					{#if group.pendingCount > 0}
						({group.pendingCount} pending)
					{/if}
				</span>
			</div>
		</div>

		{#if group.pendingCount > 0}
			<div class="header-actions">
				<button
					type="button"
					class="action-btn accept-btn"
					onclick={handleAcceptAll}
					disabled={isLoading}
					aria-label="Accept all suggestions in this group"
				>
					{isLoading ? 'Processing...' : `✓ Accept All (${pendingIds.length})`}
				</button>
				<button
					type="button"
					class="action-btn reject-btn"
					onclick={handleRejectAll}
					disabled={isLoading}
					aria-label="Reject all suggestions in this group"
				>
					{isLoading ? 'Processing...' : `✗ Reject All (${pendingIds.length})`}
				</button>
			</div>
		{/if}
	</header>

	<!-- Error message -->
	{#if error}
		<div class="error-message" role="alert">
			{error}
		</div>
	{/if}

	<!-- Thumbnails Grid -->
	<div class="thumbnails-grid">
		{#each sortedSuggestions as suggestion (suggestion.id)}
			<SuggestionThumbnail
				{suggestion}
				selected={selectedIds.has(suggestion.id)}
				{onSelect}
				onClick={() => onThumbnailClick(suggestion)}
			/>
		{/each}
	</div>
</article>

<style>
	.group-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 1rem;
		transition:
			box-shadow 0.2s,
			border-color 0.2s;
	}

	.group-card:hover {
		border-color: #d0d0d0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.group-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.group-name {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.group-count {
		font-size: 0.75rem;
		color: #666;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.action-btn {
		padding: 0.5rem 0.875rem;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.1s;
		white-space: nowrap;
	}

	.action-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.action-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.accept-btn {
		background-color: #22c55e;
		color: white;
	}

	.accept-btn:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.reject-btn {
		background-color: #ef4444;
		color: white;
	}

	.reject-btn:hover:not(:disabled) {
		background-color: #dc2626;
	}

	.error-message {
		margin-bottom: 1rem;
		padding: 0.75rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.thumbnails-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		min-height: 64px;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.group-header {
			flex-direction: column;
			align-items: stretch;
		}

		.header-left {
			width: 100%;
		}

		.header-actions {
			width: 100%;
		}

		.action-btn {
			flex: 1;
		}
	}
</style>
