<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { useFaceAssignment, type AssignmentResult } from '$lib/hooks/useFaceAssignment.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';

	// Component tracking (DEV only)
	const cleanup = registerComponent('faces/PersonAssignmentModal', {
		filePath: 'src/lib/components/faces/PersonAssignmentModal.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		open?: boolean;
		faceId: string;
		onSuccess?: (result: AssignmentResult) => void;
		onCancel?: () => void;
	}

	let { open = $bindable(false), faceId, onSuccess, onCancel }: Props = $props();

	// Use the hook for all assignment logic
	const assignment = useFaceAssignment();

	// Local state for search
	let searchQuery = $state('');

	// Load persons when modal opens
	$effect(() => {
		if (open && assignment.persons.length === 0 && !assignment.personsLoading) {
			assignment.loadPersons();
		}
	});

	// Reset search when modal closes
	$effect(() => {
		if (!open) {
			searchQuery = '';
			assignment.reset();
		}
	});

	// Filtered persons based on search
	let filteredPersons = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			// Sort by MRU
			const recentIds = assignment.getRecentPersonIds();
			return [...assignment.persons].sort((a, b) => {
				const aRecent = recentIds.indexOf(a.id);
				const bRecent = recentIds.indexOf(b.id);
				if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
				if (aRecent !== -1) return -1;
				if (bRecent !== -1) return 1;
				return a.name.localeCompare(b.name);
			});
		}
		return assignment.persons.filter((p) => p.name.toLowerCase().includes(query));
	});

	// Show "Create" option when query doesn't match exactly
	let showCreateOption = $derived.by(() => {
		const query = searchQuery.trim();
		if (!query) return false;
		return !assignment.persons.some((p) => p.name.toLowerCase() === query.toLowerCase());
	});

	async function handleAssignToExisting(personId: string) {
		try {
			const result = await assignment.assignToExisting(faceId, personId);
			onSuccess?.(result);
			open = false;
		} catch (err) {
			// Error is already set in hook state, will display in Alert
			console.error('Assignment failed:', err);
		}
	}

	async function handleCreateAndAssign() {
		const name = searchQuery.trim();
		if (!name) return;

		try {
			const result = await assignment.createAndAssign(faceId, name);
			onSuccess?.(result);
			open = false;
		} catch (err) {
			// Error is already set in hook state, will display in Alert
			console.error('Create and assign failed:', err);
		}
	}

	function handleCancel() {
		onCancel?.();
		open = false;
	}
</script>

<Dialog.Root bind:open onOpenChange={(newOpen) => !newOpen && handleCancel()}>
	<Dialog.Content class="max-w-md z-[60] sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Assign to Person</Dialog.Title>
			<Dialog.Description>
				Search for an existing person or create a new one for this face.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 py-4">
			{#if assignment.error}
				<Alert.Root variant="destructive">
					<Alert.Description class="text-xs">{assignment.error}</Alert.Description>
				</Alert.Root>
			{/if}

			<input
				type="text"
				placeholder="Search or create person..."
				bind:value={searchQuery}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				aria-label="Search persons or enter new name"
			/>

			<div
				class="border border-gray-200 rounded-lg bg-white overflow-hidden"
				role="list"
				aria-label="Person list"
			>
				<div class="max-h-[300px] overflow-y-auto">
					{#if assignment.personsLoading}
						<div class="p-4 text-center text-sm text-gray-500" role="status" aria-live="polite">
							Loading persons...
						</div>
					{:else}
						<!-- Create new option -->
						{#if showCreateOption}
							<button
								type="button"
								class="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left text-blue-700"
								onclick={handleCreateAndAssign}
								disabled={assignment.submitting}
							>
								<div
									class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg flex-shrink-0"
									aria-hidden="true"
								>
									+
								</div>
								<span class="font-medium text-sm truncate">
									Create "{searchQuery.trim()}"
								</span>
							</button>
						{/if}

						<!-- Existing persons -->
						{#each filteredPersons as person (person.id)}
							<button
								type="button"
								class="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-t first:border-t-0 border-gray-100"
								onclick={() => handleAssignToExisting(person.id)}
								disabled={assignment.submitting}
							>
								<div
									class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0"
									aria-hidden="true"
								>
									{person.name.charAt(0).toUpperCase()}
								</div>
								<div class="flex-1 min-w-0">
									<div class="font-medium text-sm text-gray-900 truncate">
										{person.name}
									</div>
									{#if person.faceCount}
										<div class="text-xs text-gray-500">
											{person.faceCount} {person.faceCount === 1 ? 'face' : 'faces'}
										</div>
									{/if}
								</div>
							</button>
						{/each}

						{#if filteredPersons.length === 0 && !showCreateOption}
							<div class="p-4 text-center text-sm text-gray-500" role="status">
								No persons found
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				type="button"
				variant="outline"
				onclick={handleCancel}
				disabled={assignment.submitting}
			>
				Cancel
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
