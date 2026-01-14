<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import SuggestionGroupCard from './SuggestionGroupCard.svelte';
	import SuggestionDetailModal from './SuggestionDetailModal.svelte';
	import {
		listGroupedSuggestions,
		acceptSuggestion,
		rejectSuggestion,
		bulkSuggestionAction,
		type FaceSuggestion,
		type GroupedSuggestionsResponse
	} from '$lib/api/faces';

	interface Props {
		open: boolean;
		personId: string;
		personName: string;
		onClose: () => void;
	}

	let { open, personId, personName, onClose }: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('FindMoreResultsDialog', {
					filePath: 'src/lib/components/faces/FindMoreResultsDialog.svelte'
				})
			);
		} else if (trackingCleanup) {
			trackingCleanup();
			trackingCleanup = null;
		}
		return () => {
			if (trackingCleanup) {
				trackingCleanup();
				trackingCleanup = null;
			}
		};
	});

	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let response = $state<GroupedSuggestionsResponse | null>(null);
	let selectedIds = $state<Set<number>>(new Set());
	let selectedSuggestion = $state<FaceSuggestion | null>(null);

	// Load suggestions on open
	$effect(() => {
		if (open) {
			loadSuggestions();
		}
	});

	async function loadSuggestions() {
		isLoading = true;
		error = null;
		try {
			response = await listGroupedSuggestions({
				personId,
				status: 'pending',
				groupsPerPage: 1,
				suggestionsPerGroup: 100
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load suggestions';
		} finally {
			isLoading = false;
		}
	}

	const group = $derived.by(() => {
		if (!response || response.groups.length === 0) return null;
		const g = response.groups[0];
		if (!g) return null; // Type guard for TypeScript
		return {
			personId: g.personId,
			personName: g.personName,
			suggestions: g.suggestions,
			pendingCount: g.suggestions.filter((s) => s.status === 'pending').length
		};
	});

	// Selection handlers
	function handleSelect(id: number, selected: boolean) {
		if (selected) selectedIds.add(id);
		else selectedIds.delete(id);
		selectedIds = new Set(selectedIds);
	}

	function handleSelectAllInGroup(ids: number[], selected: boolean) {
		if (selected) ids.forEach((id) => selectedIds.add(id));
		else ids.forEach((id) => selectedIds.delete(id));
		selectedIds = new Set(selectedIds);
	}

	// Bulk actions
	async function handleAcceptAll(ids: number[]) {
		try {
			await bulkSuggestionAction(ids, 'accept');
			await loadSuggestions();
			ids.forEach((id) => selectedIds.delete(id));
			selectedIds = new Set(selectedIds);
			toast.success(`Accepted ${ids.length} suggestions`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to accept';
		}
	}

	async function handleRejectAll(ids: number[]) {
		try {
			await bulkSuggestionAction(ids, 'reject');
			await loadSuggestions();
			ids.forEach((id) => selectedIds.delete(id));
			selectedIds = new Set(selectedIds);
			toast.success(`Rejected ${ids.length} suggestions`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reject';
		}
	}

	function handleThumbnailClick(suggestion: FaceSuggestion) {
		selectedSuggestion = suggestion;
	}

	// Modal handlers
	async function handleModalAccept(suggestion: FaceSuggestion) {
		await acceptSuggestion(suggestion.id);
		await loadSuggestions();
		selectedSuggestion = null;
	}

	async function handleModalReject(suggestion: FaceSuggestion) {
		await rejectSuggestion(suggestion.id);
		await loadSuggestions();
		selectedSuggestion = null;
	}
</script>

<Dialog.Root
	{open}
	onOpenChange={(isOpen) => {
		if (!isOpen) onClose();
	}}
>
	<Dialog.Content class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
		<Dialog.Header>
			<Dialog.Title>Suggestions for {personName}</Dialog.Title>
			<Dialog.Description>
				Review and accept or reject face suggestions found for this person
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto py-4">
			{#if isLoading}
				<div class="flex justify-center py-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			{:else if error}
				<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
					{error}
				</div>
			{:else if !group || group.suggestions.length === 0}
				<div class="text-center py-12 text-muted-foreground">
					No pending suggestions found for {personName}
				</div>
			{:else}
				<SuggestionGroupCard
					{group}
					{selectedIds}
					onSelect={handleSelect}
					onSelectAllInGroup={handleSelectAllInGroup}
					onAcceptAll={handleAcceptAll}
					onRejectAll={handleRejectAll}
					onThumbnailClick={handleThumbnailClick}
				/>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose}>Done</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<SuggestionDetailModal
	suggestion={selectedSuggestion}
	onClose={() => {
		selectedSuggestion = null;
	}}
	onAccept={handleModalAccept}
	onReject={handleModalReject}
/>
