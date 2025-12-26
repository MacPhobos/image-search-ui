<script lang="ts">
	import type { FaceSuggestion } from '$lib/api/faces';
	import { acceptSuggestion, rejectSuggestion } from '$lib/api/faces';

	interface Props {
		suggestion: FaceSuggestion;
		onUpdate?: (suggestion: FaceSuggestion) => void;
		selected?: boolean;
		onSelect?: (id: number, selected: boolean) => void;
	}

	let { suggestion, onUpdate, selected = false, onSelect }: Props = $props();

	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function handleAccept() {
		isLoading = true;
		error = null;
		try {
			const updated = await acceptSuggestion(suggestion.id);
			onUpdate?.(updated);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to accept';
		} finally {
			isLoading = false;
		}
	}

	async function handleReject() {
		isLoading = true;
		error = null;
		try {
			const updated = await rejectSuggestion(suggestion.id);
			onUpdate?.(updated);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reject';
		} finally {
			isLoading = false;
		}
	}

	function handleCheckbox(e: Event) {
		const target = e.target as HTMLInputElement;
		onSelect?.(suggestion.id, target.checked);
	}

	const confidencePercent = $derived(Math.round(suggestion.confidence * 100));
	const confidenceColor = $derived(
		suggestion.confidence >= 0.9
			? 'text-green-600'
			: suggestion.confidence >= 0.8
				? 'text-yellow-600'
				: 'text-orange-600'
	);
</script>

<div
	class="border rounded-lg p-4 bg-white shadow-sm {selected ? 'ring-2 ring-blue-500' : ''}"
>
	<div class="flex items-start gap-4">
		{#if onSelect}
			<input
				type="checkbox"
				checked={selected}
				onchange={handleCheckbox}
				class="mt-1 h-4 w-4 rounded border-gray-300"
				disabled={suggestion.status !== 'pending'}
			/>
		{/if}

		<div class="flex-1">
			<div class="flex items-center justify-between mb-2">
				<span class="font-medium text-gray-900">
					{suggestion.personName || 'Unknown Person'}
				</span>
				<span class="text-sm {confidenceColor} font-semibold">
					{confidencePercent}% match
				</span>
			</div>

			<div class="text-sm text-gray-500 mb-3">
				Created {new Date(suggestion.createdAt).toLocaleDateString()}
			</div>

			{#if suggestion.status === 'pending'}
				<div class="flex gap-2">
					<button
						onclick={handleAccept}
						disabled={isLoading}
						class="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
					>
						✓ Accept
					</button>
					<button
						onclick={handleReject}
						disabled={isLoading}
						class="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
					>
						✗ Reject
					</button>
				</div>
			{:else}
				<span
					class="inline-block px-2 py-1 text-xs rounded {suggestion.status === 'accepted'
						? 'bg-green-100 text-green-800'
						: suggestion.status === 'rejected'
							? 'bg-red-100 text-red-800'
							: 'bg-gray-100 text-gray-800'}"
				>
					{suggestion.status}
				</span>
			{/if}

			{#if error}
				<p class="mt-2 text-sm text-red-600">{error}</p>
			{/if}
		</div>
	</div>
</div>
