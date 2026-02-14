<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import FaceThumbnail from './FaceThumbnail.svelte';
	import {
		toAbsoluteUrl,
		type UnknownPersonCandidateGroup,
		type FaceInGroupResponse
	} from '$lib/api/faces';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		open: boolean;
		group: UnknownPersonCandidateGroup | null;
		excludedFaceIds: string[];
		onOpenChange: (open: boolean) => void;
		onChoosePerson: () => void;
	}

	let {
		open = $bindable(),
		group,
		excludedFaceIds,
		onOpenChange,
		onChoosePerson
	}: Props = $props();

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

	function handleChoosePersonClick() {
		untrack(() => {
			onChoosePerson();
			onOpenChange(false);
		});
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
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
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => onOpenChange(false)}>Cancel</Button>
				<Button onclick={handleChoosePersonClick} disabled={assignedCount === 0}>
					Choose Person...
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
