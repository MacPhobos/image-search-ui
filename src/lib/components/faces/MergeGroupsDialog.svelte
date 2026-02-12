<script lang="ts">
	import type { UnknownPersonCandidateGroup } from '$lib/api/faces';
	import { mergeUnknownPersonCandidates } from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import FaceThumbnail from './FaceThumbnail.svelte';

	interface Props {
		open: boolean;
		groupA: UnknownPersonCandidateGroup;
		groupB: UnknownPersonCandidateGroup;
		similarity: number;
		onOpenChange: (open: boolean) => void;
		onMerged?: (mergedGroupId: string) => void;
	}

	let { open, groupA, groupB, similarity, onOpenChange, onMerged }: Props = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleMerge() {
		loading = true;
		error = null;

		try {
			const result = await mergeUnknownPersonCandidates(groupA.groupId, groupB.groupId);
			onMerged?.(result.mergedGroupId);
			onOpenChange(false);
		} catch (err) {
			console.error('Failed to merge groups:', err);
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Failed to merge groups. Please try again.';
			}
		} finally {
			loading = false;
		}
	}

	// Get up to 3 sample faces from each group
	let groupASamples = $derived(groupA.sampleFaces.slice(0, 3));
	let groupBSamples = $derived(groupB.sampleFaces.slice(0, 3));
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Merge Face Groups</Dialog.Title>
			<Dialog.Description>
				These two groups appear to be the same person. Merging will combine all faces into a single
				group.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#if error}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}

			<!-- Similarity display -->
			<div class="flex items-center justify-center gap-2">
				<Badge variant="outline" class="text-lg px-3 py-1">
					{(similarity * 100).toFixed(0)}% similar
				</Badge>
			</div>

			<!-- Side-by-side comparison -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Group A -->
				<div class="space-y-2">
					<h3 class="font-medium text-sm text-muted-foreground">
						Group 1 ({groupA.faceCount} faces)
					</h3>
					<div class="flex gap-2 flex-wrap">
						{#each groupASamples as face (face.faceInstanceId)}
							<FaceThumbnail
								thumbnailUrl={face.thumbnailUrl ?? ''}
								bbox={{ x: face.bboxX, y: face.bboxY, width: face.bboxW, height: face.bboxH }}
								size={80}
								square={true}
								alt="Face from group 1"
							/>
						{/each}
					</div>
				</div>

				<!-- Group B -->
				<div class="space-y-2">
					<h3 class="font-medium text-sm text-muted-foreground">
						Group 2 ({groupB.faceCount} faces)
					</h3>
					<div class="flex gap-2 flex-wrap">
						{#each groupBSamples as face (face.faceInstanceId)}
							<FaceThumbnail
								thumbnailUrl={face.thumbnailUrl ?? ''}
								bbox={{ x: face.bboxX, y: face.bboxY, width: face.bboxW, height: face.bboxH }}
								size={80}
								square={true}
								alt="Face from group 2"
							/>
						{/each}
					</div>
				</div>
			</div>

			<!-- Merge details -->
			<div class="rounded-lg bg-muted p-3 text-sm">
				<p>
					<strong>After merging:</strong> The combined group will have
					{groupA.faceCount + groupB.faceCount} faces total.
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => onOpenChange(false)} disabled={loading}>
				Cancel
			</Button>
			<Button onclick={handleMerge} disabled={loading}>
				{#if loading}
					Merging...
				{:else}
					Merge Groups
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
