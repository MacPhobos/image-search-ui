<script lang="ts">
	import SelectableFaceThumbnail from './SelectableFaceThumbnail.svelte';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';
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

	function getCachedThumbnail(face: FaceInGroupResponse): string | null | undefined {
		const id = parseInt(face.assetId, 10);
		return isNaN(id) ? undefined : thumbnailCache.get(id);
	}

	function isThumbnailLoading(face: FaceInGroupResponse): boolean {
		const id = parseInt(face.assetId, 10);
		return isNaN(id) ? false : thumbnailCache.isPending(id);
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
	class="bg-white border border-[#e0e0e0] rounded-xl p-4 transition-all hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
	class:opacity-60={group.isDismissed}
>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h3 class="text-base font-semibold text-[#333]">
				{group.faceCount} face{group.faceCount !== 1 ? 's' : ''}
			</h3>
			<span class="text-xs text-[#666]">
				{(group.clusterConfidence * 100).toFixed(0)}% confidence
				{#if group.isDismissed}
					· Dismissed
				{/if}
			</span>
		</div>
	</div>

	<!-- Face thumbnail grid -->
	<div class="mb-3 flex flex-wrap gap-3">
		{#each allFaces as face (face.faceInstanceId)}
			<SelectableFaceThumbnail
				thumbnailUrl={getThumbnailUrl(face)}
				dataUri={getCachedThumbnail(face)}
				isLoading={isThumbnailLoading(face)}
				bbox={getBbox(face)}
				size={128}
				alt="Face in group"
				selected={selectedFaceIds.has(face.faceInstanceId)}
				onSelect={() => toggleFace(face.faceInstanceId)}
				onClick={() => toggleFace(face.faceInstanceId)}
			/>
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
		<div
			class="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-md text-[#dc2626] text-sm"
			role="alert"
		>
			{dismissError}
		</div>
	{/if}

	<!-- Action buttons -->
	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="action-btn accept-btn"
			disabled={noneSelected || group.isDismissed}
			onclick={() => onCreatePerson(group, excludedFaceIds)}
		>
			Create Person ({selectedCount})
		</button>
		<button
			type="button"
			class="action-btn outline-btn"
			disabled={isDismissing || group.isDismissed}
			onclick={() => handleDismiss(false)}
		>
			{isDismissing ? 'Dismissing...' : 'Dismiss'}
		</button>
		<button
			type="button"
			class="action-btn reject-btn"
			disabled={isDismissing || group.isDismissed}
			onclick={() => handleDismiss(true)}
			title="Dismiss and mark all faces as noise (will not appear in future clustering)"
		>
			Mark as Noise
		</button>
	</div>
</div>

<style>
	.action-btn {
		padding: 0.5rem 0.875rem;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.1s;
		white-space: nowrap;
	}

	.action-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.action-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.accept-btn {
		background-color: #22c55e;
		color: white;
	}

	.accept-btn:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.reject-btn {
		background-color: #ef4444;
		color: white;
	}

	.reject-btn:hover:not(:disabled) {
		background-color: #dc2626;
	}

	.outline-btn {
		background-color: white;
		color: #374151;
		border: 1px solid #e0e0e0;
	}

	.outline-btn:hover:not(:disabled) {
		background-color: #f9fafb;
		border-color: #d0d0d0;
	}
</style>
