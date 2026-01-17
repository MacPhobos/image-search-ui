<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		computeCentroids,
		getCentroidSuggestions,
		type CentroidInfo,
		type CentroidSuggestion
	} from '$lib/api/faces';

	interface Props {
		open?: boolean;
		personId: string;
		personName: string;
		labeledFaceCount: number;
		onClose: () => void;
		onSuggestionsReady?: (suggestions: CentroidSuggestion[]) => void;
	}

	let {
		open = $bindable(false),
		personId,
		personName,
		labeledFaceCount,
		onClose,
		onSuggestionsReady
	}: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('ComputeCentroidsDialog', {
					filePath: 'src/lib/components/faces/ComputeCentroidsDialog.svelte'
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

	// Options
	let enableClustering = $state(false);
	let minSimilarity = $state(0.65);
	let maxResults = $state(200);
	let unassignedOnly = $state(true);

	// State
	let step = $state<'options' | 'computing' | 'searching' | 'results'>('options');
	let centroids = $state<CentroidInfo[]>([]);
	let suggestions = $state<CentroidSuggestion[]>([]);
	let error = $state<string | null>(null);

	// Computed
	let canCluster = $derived(labeledFaceCount >= 200);

	async function handleCompute() {
		step = 'computing';
		error = null;

		try {
			// Compute centroids
			const result = await computeCentroids(personId, {
				forceRebuild: false,
				enableClustering: enableClustering && canCluster,
				minFaces: 2
			});
			centroids = result.centroids;

			// Search for suggestions
			step = 'searching';
			const suggestionsResult = await getCentroidSuggestions(personId, {
				minSimilarity,
				maxResults,
				unassignedOnly,
				excludePrototypes: true,
				autoRebuild: false
			});

			suggestions = suggestionsResult.suggestions;
			step = 'results';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			step = 'options';
		}
	}

	function handleViewSuggestions() {
		if (onSuggestionsReady && suggestions.length > 0) {
			onSuggestionsReady(suggestions);
		}
		onClose();
	}

	function handleClose() {
		step = 'options';
		error = null;
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()} closeOnOutsideClick={false}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-[500px] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
		>
			<Dialog.Header>
				<Dialog.Title class="mb-4 text-lg font-semibold">
					Compute Centroids for {personName}
				</Dialog.Title>
			</Dialog.Header>

			{#if step === 'options'}
				<div class="space-y-4">
					<p class="text-sm text-gray-600">
						This person has <strong>{labeledFaceCount}</strong> labeled faces. Centroids create optimized
						embeddings for better match discovery.
					</p>

					<!-- Options -->
					<div class="space-y-3">
						<label class="flex items-center gap-2">
							<Checkbox bind:checked={enableClustering} disabled={!canCluster} />
							<span class:text-gray-400={!canCluster}>
								Enable cluster centroids
								{#if !canCluster}(requires 200+ faces){/if}
							</span>
						</label>

						<div>
							<Label class="mb-1 block text-sm font-medium">
								Minimum Similarity: {minSimilarity.toFixed(2)}
							</Label>
							<input
								type="range"
								min="0.5"
								max="0.85"
								step="0.05"
								bind:value={minSimilarity}
								class="w-full"
							/>
							<div class="flex justify-between text-xs text-gray-500">
								<span>Broad (0.50)</span>
								<span>Strict (0.85)</span>
							</div>
						</div>

						<div>
							<Label class="mb-1 block text-sm font-medium">Max Results</Label>
							<select bind:value={maxResults} class="w-full rounded border p-2">
								<option value={50}>50</option>
								<option value={100}>100</option>
								<option value={200}>200 (recommended)</option>
								<option value={500}>500</option>
							</select>
						</div>

						<label class="flex items-center gap-2">
							<Checkbox bind:checked={unassignedOnly} />
							<span>Only unassigned faces</span>
						</label>
					</div>

					{#if error}
						<div class="rounded bg-red-50 p-3 text-sm text-red-700">
							{error}
						</div>
					{/if}

					<Dialog.Footer class="mt-6 flex justify-end gap-2">
						<Button variant="outline" onclick={handleClose}>Cancel</Button>
						<Button onclick={handleCompute} disabled={labeledFaceCount < 2}>
							Compute & Search
						</Button>
					</Dialog.Footer>
				</div>
			{:else if step === 'computing'}
				<div class="py-8 text-center">
					<div
						class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
					></div>
					<p>Computing centroids from {labeledFaceCount} faces...</p>
				</div>
			{:else if step === 'searching'}
				<div class="py-8 text-center">
					<div
						class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
					></div>
					<p>Searching for similar faces...</p>
				</div>
			{:else if step === 'results'}
				<div class="space-y-4">
					<!-- Centroid Summary -->
					<div class="rounded bg-gray-50 p-3">
						<h4 class="mb-2 font-medium">Centroids Computed</h4>
						<ul class="space-y-1 text-sm">
							{#each centroids as c}
								<li class="flex justify-between">
									<span class="capitalize">{c.clusterLabel} ({c.centroidType})</span>
									<span class="text-gray-500">from {c.nFaces} faces</span>
								</li>
							{/each}
						</ul>
					</div>

					<!-- Results Summary -->
					<div class="rounded p-3 {suggestions.length > 0 ? 'bg-green-50' : 'bg-yellow-50'}">
						<h4
							class="mb-1 font-medium {suggestions.length > 0
								? 'text-green-800'
								: 'text-yellow-800'}"
						>
							{suggestions.length} Suggestions Found
						</h4>
						<p class="text-sm {suggestions.length > 0 ? 'text-green-700' : 'text-yellow-700'}">
							{#if suggestions.length > 0}
								Ready to review potential matches.
							{:else}
								No matches found at threshold {minSimilarity.toFixed(2)}. Try lowering the
								threshold.
							{/if}
						</p>
					</div>

					<Dialog.Footer class="mt-6 flex justify-end gap-2">
						<Button variant="outline" onclick={handleClose}>Close</Button>
						{#if suggestions.length > 0}
							<Button onclick={handleViewSuggestions}>
								View {suggestions.length} Suggestions
							</Button>
						{/if}
					</Dialog.Footer>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
