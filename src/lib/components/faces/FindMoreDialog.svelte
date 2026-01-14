<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { startFindMoreSuggestions } from '$lib/api/faces';
	import { getFaceMatchingConfig } from '$lib/api/admin';
	import { jobProgressStore, type JobProgress } from '$lib/stores/jobProgressStore.svelte';
	import FindMoreResultsDialog from './FindMoreResultsDialog.svelte';

	interface Props {
		open: boolean;
		personId: string;
		personName: string;
		labeledFaceCount: number;
		onClose: () => void;
		onComplete: (suggestionsFound: number) => void;
	}

	let { open, personId, personName, labeledFaceCount, onClose, onComplete }: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('FindMoreDialog', {
					filePath: 'src/lib/components/faces/FindMoreDialog.svelte'
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

	// Prototype count options with descriptions (derived to capture reactive labeledFaceCount)
	const PROTOTYPE_OPTIONS = $derived([
		{ value: '10', label: '10 faces', description: 'Quick scan (~5 seconds)' },
		{ value: '50', label: '50 faces', description: 'Balanced (~15 seconds)' },
		{ value: '100', label: '100 faces', description: 'Thorough (~30 seconds)' },
		{ value: '1000', label: '1000 faces', description: 'Comprehensive (~2 minutes)' },
		{ value: '-1', label: 'All faces', description: `All ${labeledFaceCount} labeled faces` }
	]);

	let selectedCountStr = $state('50');
	let isSubmitting = $state(false);
	let activeJobId = $state<string | null>(null);
	let cleanupFn: (() => void) | null = null;

	// Threshold selection
	const THRESHOLD_OPTIONS = [
		{ value: '0.70', label: 'Standard (0.70)', description: 'Default system threshold' },
		{ value: '0.65', label: 'Relaxed (0.65)', description: 'Find more matches' },
		{ value: '0.60', label: 'Broad (0.60)', description: 'Maximum discovery' },
		{ value: '0.55', label: 'Broader (0.55)', description: 'Maximum discovery' }
	];
	let selectedThresholdStr = $state('0.70');
	let configLoading = $state(true);

	// Job results (after completion)
	let jobResults = $state<{
		suggestionsCreated: number;
		prototypesUsed: number;
		candidatesFound: number;
		duplicatesSkipped: number;
	} | null>(null);

	// Results dialog state
	let showResultsDialog = $state(false);

	// Derive currentJob from activeJobId (prevents effect loop)
	let currentJob = $derived(activeJobId ? jobProgressStore.getJob(activeJobId) : null);

	// Convert selectedCountStr to number
	let selectedCount = $derived(parseInt(selectedCountStr, 10));

	// Filter options based on available faces
	const availableOptions = $derived(
		PROTOTYPE_OPTIONS.filter((opt) => {
			const value = parseInt(opt.value, 10);
			return value === -1 || value <= labeledFaceCount;
		})
	);

	// Get label for selected option (with description for display)
	const selectedLabel = $derived.by(() => {
		const option = PROTOTYPE_OPTIONS.find((opt) => opt.value === selectedCountStr);
		return option ? `${option.label} - ${option.description}` : 'Select count';
	});

	// Progress percentage
	const progressPercent = $derived(
		currentJob ? Math.round((currentJob.current / currentJob.total) * 100) : 0
	);

	onMount(async () => {
		try {
			const config = await getFaceMatchingConfig();
			selectedThresholdStr = config.suggestionThreshold.toFixed(2);
		} catch (e) {
			console.error('Failed to load face matching config:', e);
			selectedThresholdStr = '0.70';
		} finally {
			configLoading = false;
		}
	});

	async function handleSubmit() {
		if (isSubmitting || currentJob) return;

		isSubmitting = true;
		jobResults = null;

		try {
			const actualCount = selectedCount === -1 ? labeledFaceCount : selectedCount;
			const response = await startFindMoreSuggestions(personId, {
				prototypeCount: actualCount,
				minConfidence: parseFloat(selectedThresholdStr)
			});

			// Start tracking progress using progressKey from response
			cleanupFn = jobProgressStore.trackJob(
				response.jobId,
				response.progressKey,
				personId,
				personName,
				handleJobComplete,
				handleJobError
			);

			// Set activeJobId (currentJob will be derived from store)
			activeJobId = response.jobId;

			toast.loading(`Finding more suggestions for ${personName}...`, {
				id: `find-more-${response.jobId}`
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to start job';
			toast.error(message);
		} finally {
			isSubmitting = false;
		}
	}

	function handleJobComplete(job: JobProgress) {
		const count = job.result?.suggestionsCreated || 0;

		// Store results for display
		jobResults = {
			suggestionsCreated: job.result?.suggestionsCreated || 0,
			prototypesUsed: job.result?.prototypesUsed || 0,
			candidatesFound: job.result?.candidatesFound || 0,
			duplicatesSkipped: job.result?.duplicatesSkipped || 0
		};

		toast.success(
			count > 0
				? `Found ${count} new suggestions for ${personName}!`
				: `No new suggestions found for ${personName}`,
			{ id: `find-more-${job.jobId}` }
		);

		activeJobId = null;
		cleanupFn = null;
		// DON'T close - show results first
	}

	function handleJobError(error: string) {
		toast.error(`Failed: ${error}`, {
			id: currentJob ? `find-more-${currentJob.jobId}` : undefined
		});
		activeJobId = null;
		cleanupFn = null;
	}

	function handleClose() {
		// Job continues in background if running
		if (currentJob) {
			toast.info(`Job continues in background for ${personName}`);
		}
		cleanupFn?.();
		activeJobId = null;
		onClose();
	}
</script>

<Dialog.Root
	{open}
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			handleClose();
		}
	}}
>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Find More Suggestions</Dialog.Title>
			<Dialog.Description>
				Search for additional faces similar to {personName}'s labeled faces
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4 space-y-4">
			{#if !currentJob}
				<!-- Selection UI -->
				<div class="text-sm text-muted-foreground">
					{personName} has <strong>{labeledFaceCount}</strong> labeled faces available for sampling.
				</div>

				<div class="space-y-2">
					<Label for="prototype-count">Number of faces to sample:</Label>
					<Select.Root type="single" bind:value={selectedCountStr}>
						<Select.Trigger id="prototype-count" class="w-full">
							{selectedLabel}
						</Select.Trigger>
						<Select.Content>
							{#each availableOptions as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{option.label} - {option.description}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="text-xs text-muted-foreground">
					Higher counts provide better coverage but take longer to process.
				</div>

				<!-- Threshold selector -->
				<div class="space-y-2 mt-4">
					<Label for="threshold">Similarity threshold:</Label>
					<Select.Root type="single" bind:value={selectedThresholdStr}>
						<Select.Trigger id="threshold" class="w-full">
							{THRESHOLD_OPTIONS.find((o) => o.value === selectedThresholdStr)?.label ||
								'Select threshold'}
						</Select.Trigger>
						<Select.Content>
							{#each THRESHOLD_OPTIONS as option (option.value)}
								<Select.Item value={option.value}>
									{#snippet children()}
										<div class="flex flex-col">
											<span class="font-medium">{option.label}</span>
											<span class="text-xs text-muted-foreground">{option.description}</span>
										</div>
									{/snippet}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<p class="text-xs text-muted-foreground">
						Lower thresholds find more matches but may include less accurate results.
					</p>
				</div>
			{:else if currentJob}
				<!-- Progress UI -->
				<div class="space-y-3">
					<div class="flex justify-between text-sm">
						<span>{currentJob.message}</span>
						<span class="text-muted-foreground">{progressPercent}%</span>
					</div>
					<Progress value={progressPercent} class="h-2" />
					<div class="text-xs text-muted-foreground text-center">
						{currentJob.current} / {currentJob.total} prototypes processed
					</div>
				</div>
			{:else if jobResults}
				<!-- Results panel -->
				<div class="space-y-4">
					<div class="text-sm font-medium">Search Results</div>
					<div class="grid grid-cols-2 gap-3">
						<div class="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
							<div class="text-2xl font-bold text-green-700 dark:text-green-300">
								{jobResults.suggestionsCreated}
							</div>
							<div class="text-xs text-green-600 dark:text-green-400">Suggestions Created</div>
						</div>
						<div class="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
							<div class="text-2xl font-bold text-blue-700 dark:text-blue-300">
								{jobResults.candidatesFound}
							</div>
							<div class="text-xs text-blue-600 dark:text-blue-400">Candidates Found</div>
						</div>
						<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
							<div class="text-2xl font-bold text-gray-700 dark:text-gray-300">
								{jobResults.prototypesUsed}
							</div>
							<div class="text-xs text-gray-600 dark:text-gray-400">Prototypes Used</div>
						</div>
						<div class="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
							<div class="text-2xl font-bold text-orange-700 dark:text-orange-300">
								{jobResults.duplicatesSkipped}
							</div>
							<div class="text-xs text-orange-600 dark:text-orange-400">Duplicates Skipped</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="gap-2">
			{#if jobResults}
				<Button variant="outline" onclick={handleClose}>Close</Button>
				{#if jobResults.suggestionsCreated > 0}
					<Button
						onclick={() => {
							showResultsDialog = true;
						}}
					>
						View Suggestions
					</Button>
				{/if}
				<Button
					variant="secondary"
					onclick={() => {
						jobResults = null;
					}}
				>
					Search Again
				</Button>
			{:else}
				<!-- Keep existing buttons for selection/progress states -->
				<Button variant="outline" onclick={handleClose}>
					{currentJob ? 'Close' : 'Cancel'}
				</Button>
				{#if !currentJob}
					<Button onclick={handleSubmit} disabled={isSubmitting || configLoading}>
						{isSubmitting ? 'Starting...' : 'Find Suggestions'}
					</Button>
				{/if}
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Results Dialog -->
{#if showResultsDialog}
	<FindMoreResultsDialog
		open={showResultsDialog}
		{personId}
		{personName}
		onClose={() => {
			showResultsDialog = false;
			onComplete(jobResults?.suggestionsCreated || 0);
			onClose();
		}}
	/>
{/if}
