<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import FaceThumbnail from './FaceThumbnail.svelte';
	import {
		dismissUnknownPersonCandidate,
		toAbsoluteUrl,
		type UnknownPersonCandidateGroup,
		type FaceInGroupResponse
	} from '$lib/api/faces';

	interface Props {
		group: UnknownPersonCandidateGroup;
		onCreatePerson: (group: UnknownPersonCandidateGroup, excludedFaceIds: string[]) => void;
		onDismissed?: () => void;
	}

	let { group, onCreatePerson, onDismissed }: Props = $props();

	// Track which faces are selected (all selected by default)
	let allFaces = $derived<FaceInGroupResponse[]>([
		group.representativeFace,
		...group.sampleFaces.filter((f) => f.faceInstanceId !== group.representativeFace.faceInstanceId)
	]);

	let selectedFaceIds = $state<Set<string>>(new Set());

	// Initialize selection with all face IDs when group changes
	$effect(() => {
		const ids = new Set(allFaces.map((f) => f.faceInstanceId));
		selectedFaceIds = ids;
	});

	let selectedCount = $derived(selectedFaceIds.size);
	let allSelected = $derived(selectedCount === allFaces.length);
	let noneSelected = $derived(selectedCount === 0);
	let excludedFaceIds = $derived(
		allFaces.filter((f) => !selectedFaceIds.has(f.faceInstanceId)).map((f) => f.faceInstanceId)
	);

	let isDismissing = $state(false);
	let dismissError = $state<string | null>(null);

	function toggleFace(faceId: string) {
		const next = new Set(selectedFaceIds);
		if (next.has(faceId)) {
			next.delete(faceId);
		} else {
			next.add(faceId);
		}
		selectedFaceIds = next;
	}

	function toggleAll() {
		if (allSelected) {
			selectedFaceIds = new Set();
		} else {
			selectedFaceIds = new Set(allFaces.map((f) => f.faceInstanceId));
		}
	}

	function getConfidenceVariant(
		confidence: number
	): 'default' | 'success' | 'warning' | 'destructive' {
		if (confidence >= 0.85) return 'success';
		if (confidence >= 0.7) return 'default';
		if (confidence >= 0.5) return 'warning';
		return 'destructive';
	}

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

	async function handleDismiss(markAsNoise: boolean) {
		isDismissing = true;
		dismissError = null;
		try {
			await dismissUnknownPersonCandidate(group.groupId, { markAsNoise });
			onDismissed?.();
		} catch (err) {
			dismissError = err instanceof Error ? err.message : 'Failed to dismiss group';
		} finally {
			isDismissing = false;
		}
	}
</script>

<div
	class="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
	class:opacity-60={group.isDismissed}
>
	<!-- Header -->
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h3 class="text-sm font-semibold">
				{group.faceCount} face{group.faceCount !== 1 ? 's' : ''}
			</h3>
			<Badge variant={getConfidenceVariant(group.clusterConfidence)}>
				{(group.clusterConfidence * 100).toFixed(0)}% confidence
			</Badge>
		</div>
		{#if group.isDismissed}
			<Badge variant="outline">Dismissed</Badge>
		{/if}
	</div>

	<!-- Face thumbnail grid -->
	<div class="mb-3 grid grid-cols-6 gap-2">
		{#each allFaces as face (face.faceInstanceId)}
			<div class="relative">
				<button
					type="button"
					class="w-full cursor-pointer border-2 rounded-lg p-0.5 transition-colors {selectedFaceIds.has(
						face.faceInstanceId
					)
						? 'border-primary bg-primary/5'
						: 'border-transparent hover:border-muted-foreground/30'}"
					onclick={() => toggleFace(face.faceInstanceId)}
					title="Quality: {face.qualityScore.toFixed(2)}"
				>
					<FaceThumbnail
						thumbnailUrl={getThumbnailUrl(face)}
						bbox={getBbox(face)}
						size={56}
						alt="Face in group"
						square
					/>
				</button>
				<div class="absolute -right-1 -top-1 z-10">
					<Checkbox
						checked={selectedFaceIds.has(face.faceInstanceId)}
						onCheckedChange={() => toggleFace(face.faceInstanceId)}
					/>
				</div>
			</div>
		{/each}
	</div>

	<!-- Selection controls -->
	<div class="mb-3 flex items-center justify-between text-xs text-muted-foreground">
		<button type="button" class="underline hover:text-foreground" onclick={toggleAll}>
			{allSelected ? 'Deselect all' : 'Select all'}
		</button>
		<span>
			{selectedCount}/{allFaces.length} selected
			{#if excludedFaceIds.length > 0}
				({excludedFaceIds.length} excluded)
			{/if}
		</span>
	</div>

	<!-- Error display -->
	{#if dismissError}
		<div class="mb-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive" role="alert">
			{dismissError}
		</div>
	{/if}

	<!-- Action buttons -->
	<div class="flex flex-wrap gap-2">
		<Button
			size="sm"
			disabled={noneSelected || group.isDismissed}
			onclick={() => onCreatePerson(group, excludedFaceIds)}
		>
			Create Person ({selectedCount})
		</Button>
		<Button
			variant="outline"
			size="sm"
			disabled={isDismissing || group.isDismissed}
			onclick={() => handleDismiss(false)}
		>
			{isDismissing ? 'Dismissing...' : 'Dismiss'}
		</Button>
		<Button
			variant="destructive"
			size="sm"
			disabled={isDismissing || group.isDismissed}
			onclick={() => handleDismiss(true)}
			title="Dismiss and mark all faces as noise (will not appear in future clustering)"
		>
			Mark as Noise
		</Button>
	</div>
</div>
