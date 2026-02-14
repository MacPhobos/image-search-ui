<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import PersonPickerModal from './PersonPickerModal.svelte';
	import FaceThumbnail from './FaceThumbnail.svelte';
	import {
		acceptUnknownPersonCandidate,
		toAbsoluteUrl,
		type UnknownPersonCandidateGroup,
		type AcceptCandidateResponse,
		type FaceInGroupResponse
	} from '$lib/api/faces';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		open: boolean;
		group: UnknownPersonCandidateGroup | null;
		excludedFaceIds: string[];
		onOpenChange: (open: boolean) => void;
		onAccepted: (response: AcceptCandidateResponse) => void;
	}

	let { open = $bindable(), group, excludedFaceIds, onOpenChange, onAccepted }: Props = $props();

	// Component tracking (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('faces/AssignGroupToPersonDialog', {
					filePath: 'src/lib/components/faces/AssignGroupToPersonDialog.svelte'
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

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let showPersonPicker = $state(false);

	/**
	 * Guard flag that stays true from the moment the PersonPickerModal opens
	 * until the API call completes (or fails). This survives the 10ms debounce
	 * window in bits-ui's DismissibleLayer that fires after pointerdown events.
	 *
	 * The problem: when the user clicks "Move" in PersonPickerModal, the click
	 * handler sets showPersonPicker=false synchronously, but bits-ui's
	 * interact-outside check runs 10ms later (debounced). By that time
	 * showPersonPicker is already false, so the guard fails and the dialog
	 * closes prematurely. This flag remains true throughout the entire flow.
	 */
	let dismissGuardActive = $state(false);

	/**
	 * Prevent the shadcn/bits-ui Dialog from closing when the user interacts
	 * with the PersonPickerModal overlay (which renders outside Dialog.Content),
	 * or while the API submission is in progress.
	 *
	 * bits-ui's DismissibleLayer debounces the interact-outside check by 10ms
	 * after pointerdown. The click event fires before that debounce resolves,
	 * so showPersonPicker may already be false by the time this handler runs.
	 * The dismissGuardActive flag covers this gap.
	 */
	function handleInteractOutside(e: Event) {
		if (showPersonPicker || isSubmitting || dismissGuardActive) {
			e.preventDefault();
		}
	}

	// Derived: faces that will be assigned (all sample faces minus excluded)
	let includedFaces = $derived.by(() => {
		if (!group) return [];
		const allFaces: FaceInGroupResponse[] = [
			group.representativeFace,
			...group.sampleFaces.filter(
				(f) => f.faceInstanceId !== group.representativeFace.faceInstanceId
			)
		];
		const excludedSet = new Set(excludedFaceIds);
		return allFaces.filter((f) => !excludedSet.has(f.faceInstanceId));
	});

	let assignedCount = $derived(group ? group.faceCount - excludedFaceIds.length : 0);
	let excludedCount = $derived(excludedFaceIds.length);

	// Reset form state when dialog opens with a new group
	$effect(() => {
		if (open && group) {
			errorMessage = null;
			isSubmitting = false;
			showPersonPicker = false;
			dismissGuardActive = false;
		}
	});

	function getThumbnailUrl(face: FaceInGroupResponse): string {
		if (!face.thumbnailUrl) return '';
		return toAbsoluteUrl(face.thumbnailUrl);
	}

	function getBbox(face: FaceInGroupResponse) {
		return {
			x: face.bboxX,
			y: face.bboxY,
			width: face.bboxW,
			height: face.bboxH
		};
	}

	function handleOpenPicker() {
		showPersonPicker = true;
		dismissGuardActive = true;
	}

	function handlePickerClose() {
		showPersonPicker = false;
		dismissGuardActive = false;
	}

	async function handlePersonSelected(
		destination: { toPersonId: string } | { toPersonName: string }
	) {
		// Capture references before any state changes. The bits-ui Dialog's
		// interact-outside handler (debounced 10ms) can cause the parent to
		// set group=null and excludedFaceIds=[] if the dismiss guard fails.
		const currentGroup = group;
		const currentExcludedFaceIds = [...excludedFaceIds];
		showPersonPicker = false;
		// NOTE: dismissGuardActive stays true to block the debounced
		// interact-outside check that fires ~10ms after the pointerdown
		// on the "Move" button. It is cleared in the finally block.

		if (!currentGroup) return;

		isSubmitting = true;
		errorMessage = null;

		try {
			const request: { personId?: string; name?: string; faceIdsToExclude?: string[] } = {};

			if ('toPersonId' in destination) {
				request.personId = destination.toPersonId;
			} else {
				request.name = destination.toPersonName;
			}

			if (currentExcludedFaceIds.length > 0) {
				request.faceIdsToExclude = currentExcludedFaceIds;
			}

			const response = await acceptUnknownPersonCandidate(currentGroup.groupId, request);

			untrack(() => {
				onAccepted(response);
				onOpenChange(false);
			});
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to assign group to person';
		} finally {
			isSubmitting = false;
			dismissGuardActive = false;
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="sm:max-w-lg" onInteractOutside={handleInteractOutside}>
		<Dialog.Header>
			<Dialog.Title>Assign Group to Person</Dialog.Title>
			<Dialog.Description>
				Assign {assignedCount} face{assignedCount !== 1 ? 's' : ''} to an existing person or create a
				new one.
				{#if excludedCount > 0}
					{excludedCount} face{excludedCount !== 1 ? 's' : ''} excluded.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if group}
			<div class="space-y-4 py-4">
				<!-- Face preview grid -->
				{#if includedFaces.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium">
							Faces to Assign ({includedFaces.length}
							{#if assignedCount > includedFaces.length}
								of {assignedCount}
							{/if})
						</p>
						<div class="flex flex-wrap gap-2">
							{#each includedFaces.slice(0, 12) as face (face.faceInstanceId)}
								<FaceThumbnail
									thumbnailUrl={getThumbnailUrl(face)}
									bbox={getBbox(face)}
									size={48}
									alt="Face to assign"
									square
								/>
							{/each}
							{#if includedFaces.length > 12}
								<div
									class="flex items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground"
									style="width: 48px; height: 48px;"
								>
									+{includedFaces.length - 12}
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Group metadata -->
				<div class="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
					<div class="flex justify-between">
						<span>Total faces in group:</span>
						<span class="font-medium">{group.faceCount}</span>
					</div>
					<div class="flex justify-between">
						<span>Cluster confidence:</span>
						<span class="font-medium">
							{(group.clusterConfidence * 100).toFixed(0)}%
						</span>
					</div>
					<div class="flex justify-between">
						<span>Average quality:</span>
						<span class="font-medium">
							{group.avgQuality.toFixed(2)}
						</span>
					</div>
				</div>

				<!-- Submitting indicator -->
				{#if isSubmitting}
					<div class="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
						<span class="loading loading-spinner loading-sm"></span>
						Assigning faces...
					</div>
				{/if}

				<!-- Error display -->
				{#if errorMessage}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
						{errorMessage}
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => onOpenChange(false)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={handleOpenPicker} disabled={isSubmitting || assignedCount === 0}>
					{isSubmitting ? 'Assigning...' : 'Choose Person...'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

{#if showPersonPicker}
	<PersonPickerModal onSelect={handlePersonSelected} onClose={handlePickerClose} />
{/if}
