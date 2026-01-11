<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { startFindMoreSuggestions } from '$lib/api/faces';
	import { jobProgressStore, type JobProgress } from '$lib/stores/jobProgressStore.svelte';

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

	async function handleSubmit() {
		if (isSubmitting || currentJob) return;

		isSubmitting = true;

		try {
			const actualCount = selectedCount === -1 ? labeledFaceCount : selectedCount;
			const response = await startFindMoreSuggestions(personId, {
				prototypeCount: actualCount
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

		toast.success(
			count > 0
				? `Found ${count} new suggestions for ${personName}!`
				: `No new suggestions found for ${personName}`,
			{ id: `find-more-${job.jobId}` }
		);

		activeJobId = null;
		cleanupFn = null;
		onComplete(count);
		onClose();
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
			{:else}
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
			{/if}
		</div>

		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={handleClose}>
				{currentJob ? 'Close' : 'Cancel'}
			</Button>
			{#if !currentJob}
				<Button onclick={handleSubmit} disabled={isSubmitting}>
					{isSubmitting ? 'Starting...' : 'Find Suggestions'}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
