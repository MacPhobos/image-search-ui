<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FaceThumbnail from './FaceThumbnail.svelte';
	import {
		acceptUnknownPersonCandidate,
		toAbsoluteUrl,
		type UnknownPersonCandidateGroup,
		type AcceptCandidateResponse,
		type FaceInGroupResponse
	} from '$lib/api/faces';

	interface Props {
		open: boolean;
		group: UnknownPersonCandidateGroup | null;
		excludedFaceIds: string[];
		onOpenChange: (open: boolean) => void;
		onAccepted?: (response: AcceptCandidateResponse) => void;
	}

	let { open = $bindable(), group, excludedFaceIds, onOpenChange, onAccepted }: Props = $props();

	// Component tracking (visibility-based, per dev-component-tracking.md)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('faces/CreatePersonFromGroupDialog', {
					filePath: 'src/lib/components/faces/CreatePersonFromGroupDialog.svelte'
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

	let name = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let nameValid = $derived(name.trim().length >= 2);

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

	let excludedCount = $derived(excludedFaceIds.length);

	// Reset form state when dialog opens with a new group
	$effect(() => {
		if (open && group) {
			name = '';
			errorMessage = null;
			isSubmitting = false;
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

	async function handleSubmit() {
		if (!group || !nameValid) return;

		isSubmitting = true;
		errorMessage = null;

		try {
			const response = await acceptUnknownPersonCandidate(group.groupId, {
				name: name.trim(),
				faceIdsToExclude: excludedFaceIds.length > 0 ? excludedFaceIds : undefined
			});
			onAccepted?.(response);
			onOpenChange(false);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to create person';
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && nameValid && !isSubmitting) {
			event.preventDefault();
			handleSubmit();
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Create Person from Group</Dialog.Title>
			<Dialog.Description>
				Assign a name to this group of {includedFaces.length} face{includedFaces.length !== 1
					? 's'
					: ''}.
				{#if excludedCount > 0}
					{excludedCount} face{excludedCount !== 1 ? 's' : ''} excluded.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Name input -->
			<div class="space-y-2">
				<Label for="person-name">Person Name</Label>
				<Input
					id="person-name"
					placeholder="Enter person name..."
					bind:value={name}
					onkeydown={handleKeydown}
					disabled={isSubmitting}
				/>
				{#if name.length > 0 && !nameValid}
					<p class="text-xs text-destructive">Name must be at least 2 characters.</p>
				{/if}
			</div>

			<!-- Face preview grid -->
			{#if includedFaces.length > 0}
				<div class="space-y-2">
					<p class="text-sm font-medium">
						Included Faces ({includedFaces.length})
					</p>
					<div class="flex flex-wrap gap-2">
						{#each includedFaces.slice(0, 12) as face (face.faceInstanceId)}
							<FaceThumbnail
								thumbnailUrl={getThumbnailUrl(face)}
								bbox={getBbox(face)}
								size={48}
								alt="Face to include"
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
			{#if group}
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
			<Button onclick={handleSubmit} disabled={!nameValid || isSubmitting}>
				{isSubmitting ? 'Creating...' : `Create "${name.trim() || '...'}"`}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
