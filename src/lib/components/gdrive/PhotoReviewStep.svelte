<script lang="ts">
	import type { PersonPhotoGroup } from '$lib/api/faces';
	import { API_BASE_URL } from '$lib/api/client';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		photos: PersonPhotoGroup[];
		selectedPhotoIds: number[];
		personName: string;
		onConfirm: (confirmedIds: number[]) => void;
	}

	let { photos, selectedPhotoIds, personName, onConfirm }: Props = $props();

	let localSelection = $state<Set<number>>(new Set<number>());

	// Sync from parent prop when it changes
	$effect(() => {
		localSelection = new Set(selectedPhotoIds);
	});

	let allSelected = $derived(localSelection.size === photos.length && photos.length > 0);
	let selectedCount = $derived(localSelection.size);

	function toggleSelection(photoId: number) {
		const newSet = new Set(localSelection);
		if (newSet.has(photoId)) {
			newSet.delete(photoId);
		} else {
			newSet.add(photoId);
		}
		localSelection = newSet;
		onConfirm([...newSet]);
	}

	function toggleSelectAll() {
		if (allSelected) {
			localSelection = new Set();
		} else {
			localSelection = new Set(photos.map((p) => p.photoId));
		}
		onConfirm([...localSelection]);
	}

	function getImageUrl(url: string): string {
		if (!url) return '';
		if (url.startsWith('http://') || url.startsWith('https://')) return url;
		return `${API_BASE_URL}${url}`;
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<p class="text-sm text-gray-600">
			{selectedCount}
			{selectedCount === 1 ? 'photo' : 'photos'} selected for upload from {personName}
		</p>
		<button
			type="button"
			class="text-sm font-medium text-blue-600 hover:text-blue-800"
			onclick={toggleSelectAll}
		>
			{allSelected ? 'Deselect All' : 'Select All'}
		</button>
	</div>

	<div
		class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[360px] overflow-y-auto p-1"
	>
		{#each photos as photo, i (photo.photoId)}
			{@const isSelected = localSelection.has(photo.photoId)}
			<div
				class="relative group rounded overflow-hidden border-2 transition-colors cursor-pointer {isSelected
					? 'border-blue-500 bg-blue-50'
					: 'border-transparent hover:border-gray-300'}"
				onclick={() => toggleSelection(photo.photoId)}
				role="checkbox"
				aria-checked={isSelected}
				aria-label="Select photo {i + 1}"
				tabindex="0"
				onkeydown={(e) => {
					if (e.key === ' ' || e.key === 'Enter') {
						e.preventDefault();
						toggleSelection(photo.photoId);
					}
				}}
			>
				<img
					src={getImageUrl(photo.thumbnailUrl)}
					alt=""
					loading="lazy"
					class="w-full aspect-square object-cover"
				/>
				<div class="absolute top-1 left-1">
					<Checkbox
						checked={isSelected}
						onCheckedChange={() => toggleSelection(photo.photoId)}
						aria-label="Select photo {i + 1}"
					/>
				</div>
			</div>
		{/each}
	</div>

	{#if photos.length === 0}
		<div class="text-center py-8">
			<p class="text-sm text-gray-500">No photos available for upload.</p>
		</div>
	{/if}
</div>
