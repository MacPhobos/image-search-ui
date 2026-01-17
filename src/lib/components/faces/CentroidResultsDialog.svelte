<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { toast } from 'svelte-sonner';
	import { toAbsoluteUrl, assignFaceToPerson, type CentroidSuggestion } from '$lib/api/faces';

	interface Props {
		open: boolean;
		personId: string;
		personName: string;
		suggestions: CentroidSuggestion[];
		onClose: () => void;
		onComplete?: () => void; // Called when suggestions are accepted to refresh person data
	}

	let { open, personId, personName, suggestions, onClose, onComplete }: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('CentroidResultsDialog', {
					filePath: 'src/lib/components/faces/CentroidResultsDialog.svelte'
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

	let selectedIds = $state<Set<string>>(new Set());
	let processingIds = $state<Set<string>>(new Set());
	let error = $state<string | null>(null);

	// Sort suggestions by score (highest first)
	const sortedSuggestions = $derived.by(() => {
		return [...suggestions].sort((a, b) => b.score - a.score);
	});

	// Check if all suggestions are selected
	const allSelected = $derived(
		suggestions.length > 0 && suggestions.every((s) => selectedIds.has(s.faceInstanceId))
	);

	// Check if some (but not all) suggestions are selected
	const someSelected = $derived(
		suggestions.length > 0 &&
			!allSelected &&
			suggestions.some((s) => selectedIds.has(s.faceInstanceId))
	);

	const checkboxChecked = $derived(allSelected);
	const checkboxIndeterminate = $derived(someSelected);

	function handleSelectAll(checked: boolean | 'indeterminate') {
		if (checked === true) {
			selectedIds = new Set(suggestions.map((s) => s.faceInstanceId));
		} else {
			selectedIds = new Set();
		}
	}

	function handleSelect(faceInstanceId: string, selected: boolean) {
		if (selected) {
			selectedIds.add(faceInstanceId);
		} else {
			selectedIds.delete(faceInstanceId);
		}
		selectedIds = new Set(selectedIds);
	}

	async function handleAcceptAll() {
		if (suggestions.length === 0) return;

		const idsToAccept = [...suggestions.map((s) => s.faceInstanceId)];
		await acceptSuggestions(idsToAccept);
	}

	async function handleAcceptSelected() {
		if (selectedIds.size === 0) return;

		const idsToAccept = [...selectedIds];
		await acceptSuggestions(idsToAccept);
	}

	async function acceptSuggestions(faceInstanceIds: string[]) {
		error = null;
		const newProcessingIds = new Set(faceInstanceIds);
		processingIds = new Set([...processingIds, ...newProcessingIds]);

		try {
			// Accept suggestions sequentially (backend doesn't have batch endpoint for centroid suggestions)
			let successCount = 0;
			let failCount = 0;

			for (const faceInstanceId of faceInstanceIds) {
				try {
					await assignFaceToPerson(faceInstanceId, personId);
					successCount++;

					// Remove from selected
					selectedIds.delete(faceInstanceId);
				} catch (e) {
					console.error(`Failed to accept suggestion ${faceInstanceId}:`, e);
					failCount++;
				} finally {
					processingIds.delete(faceInstanceId);
					processingIds = new Set(processingIds);
				}
			}

			// Update selectedIds state
			selectedIds = new Set(selectedIds);

			// Show toast
			if (failCount === 0) {
				toast.success(`Accepted ${successCount} suggestion${successCount === 1 ? '' : 's'}`);
			} else {
				toast.warning(
					`Accepted ${successCount}, failed ${failCount} suggestion${failCount === 1 ? '' : 's'}`
				);
			}

			// Call onComplete to refresh person data
			if (onComplete) {
				onComplete();
			}

			// Close dialog if all suggestions were accepted
			if (
				successCount === faceInstanceIds.length &&
				suggestions.length === faceInstanceIds.length
			) {
				onClose();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to accept suggestions';
			// Clear processing state
			processingIds = new Set();
		}
	}

	function formatScore(score: number): string {
		return (score * 100).toFixed(1) + '%';
	}
</script>

<Dialog.Root
	{open}
	onOpenChange={(isOpen) => {
		if (!isOpen) onClose();
	}}
>
	<Dialog.Content class="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
		<Dialog.Header>
			<Dialog.Title>Centroid Suggestions for {personName}</Dialog.Title>
			<Dialog.Description>
				Review and accept face suggestions found using centroid matching
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto py-4">
			{#if error}
				<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
					{error}
				</div>
			{/if}

			{#if suggestions.length === 0}
				<div class="text-center py-12 text-muted-foreground">
					No centroid suggestions found for {personName}
				</div>
			{:else}
				<!-- Bulk Actions Header -->
				<div class="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
					<Checkbox
						checked={checkboxChecked}
						indeterminate={checkboxIndeterminate}
						onCheckedChange={handleSelectAll}
						aria-label="Select all suggestions"
					/>
					<div class="flex-1">
						<div class="font-medium">
							{suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} found
						</div>
						{#if selectedIds.size > 0}
							<div class="text-sm text-muted-foreground">
								{selectedIds.size} selected
							</div>
						{/if}
					</div>
					<div class="flex gap-2">
						{#if selectedIds.size > 0}
							<Button size="sm" onclick={handleAcceptSelected} disabled={processingIds.size > 0}>
								Accept Selected ({selectedIds.size})
							</Button>
						{/if}
						<Button
							size="sm"
							variant="secondary"
							onclick={handleAcceptAll}
							disabled={processingIds.size > 0}
						>
							Accept All
						</Button>
					</div>
				</div>

				<!-- Suggestion Grid -->
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{#each sortedSuggestions as suggestion (suggestion.faceInstanceId)}
						{@const isSelected = selectedIds.has(suggestion.faceInstanceId)}
						{@const isProcessing = processingIds.has(suggestion.faceInstanceId)}
						<div class="relative group">
							<!-- Selection Checkbox -->
							<div class="absolute top-2 left-2 z-10">
								<Checkbox
									checked={isSelected}
									onCheckedChange={(checked) =>
										handleSelect(suggestion.faceInstanceId, checked === true)}
									disabled={isProcessing}
									aria-label="Select suggestion"
								/>
							</div>

							<!-- Thumbnail -->
							<button
								type="button"
								class="relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all {isSelected
									? 'border-blue-500 shadow-lg'
									: 'border-transparent hover:border-blue-300'} {isProcessing ? 'opacity-50' : ''}"
								onclick={() => handleSelect(suggestion.faceInstanceId, !isSelected)}
								disabled={isProcessing}
							>
								{#if suggestion.thumbnailUrl}
									<img
										src={toAbsoluteUrl(suggestion.thumbnailUrl)}
										alt="Face suggestion"
										class="w-full h-full object-cover"
									/>
								{:else}
									<div
										class="w-full h-full flex items-center justify-center bg-muted text-muted-foreground"
									>
										No thumbnail
									</div>
								{/if}

								<!-- Score Badge -->
								<div
									class="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md font-medium"
								>
									{formatScore(suggestion.score)}
								</div>

								<!-- Processing Spinner -->
								{#if isProcessing}
									<div class="absolute inset-0 flex items-center justify-center bg-black/40">
										<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
									</div>
								{/if}
							</button>

							<!-- Centroid Label (shown on hover) -->
							<div
								class="absolute bottom-full left-0 right-0 mb-2 p-2 bg-black/80 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
							>
								Centroid: {suggestion.matchedCentroid}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose}>Done</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
