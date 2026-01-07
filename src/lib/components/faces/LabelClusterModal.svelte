<script lang="ts">
	import { listPersons, labelCluster } from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import type { Person } from '$lib/types';
	import { onMount } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	interface Props {
		/** The cluster ID to label */
		clusterId: string;
		/** Called when label is successful */
		onSuccess: (personName: string, personId: string) => void;
		/** Called when modal should close */
		onClose: () => void;
	}

	let { clusterId, onSuccess, onClose }: Props = $props();

	// State
	let searchQuery = $state('');
	let persons = $state<Person[]>([]);
	let filteredPersons = $state<Person[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let selectedPerson = $state<Person | null>(null);
	let createNewMode = $state(false);
	let newPersonName = $state('');

	// Derived
	let canSubmit = $derived(
		(!createNewMode && selectedPerson !== null) ||
			(createNewMode && newPersonName.trim().length > 0)
	);

	onMount(async () => {
		await loadPersons();
	});

	async function loadPersons() {
		loading = true;
		error = null;
		try {
			const response = await listPersons(1, 100, 'active');
			persons = response.items;
			filteredPersons = response.items;
		} catch (err) {
			console.error('Failed to load persons:', err);
			error = 'Failed to load existing persons.';
		} finally {
			loading = false;
		}
	}

	// Filter persons based on search query
	$effect(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) {
			filteredPersons = persons;
		} else {
			filteredPersons = persons.filter((p) => p.name.toLowerCase().includes(query));
		}
	});

	async function handleSubmit() {
		if (!canSubmit || submitting) return;

		submitting = true;
		error = null;

		try {
			const name = createNewMode ? newPersonName.trim() : selectedPerson!.name;
			const response = await labelCluster(clusterId, name);
			onSuccess(response.personName, response.personId);
		} catch (err) {
			console.error('Failed to label cluster:', err);
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Failed to label cluster. Please try again.';
			}
		} finally {
			submitting = false;
		}
	}

	function handleSelectPerson(person: Person) {
		selectedPerson = person;
		createNewMode = false;
	}

	function handleCreateNew() {
		selectedPerson = null;
		createNewMode = true;
		newPersonName = searchQuery.trim();
	}
</script>

<Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Label Cluster</Dialog.Title>
			<Dialog.Description>
				Select an existing person or create a new one to label this cluster.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#if error}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}

			<!-- Search input -->
			<div>
				<Input
					type="text"
					placeholder="Search or enter new name..."
					bind:value={searchQuery}
					aria-label="Search persons or enter new name"
				/>
			</div>

			<!-- Person list -->
			<div
				class="border rounded-lg max-h-[250px] overflow-y-auto"
				role="listbox"
				aria-label="Select a person"
			>
				{#if loading}
					<div class="p-4 text-center text-sm text-muted-foreground">Loading persons...</div>
				{:else}
					<!-- Create new option -->
					{#if searchQuery.trim().length > 0}
						<button
							type="button"
							class="w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors border-b"
							class:bg-accent={createNewMode}
							onclick={handleCreateNew}
							role="option"
							aria-selected={createNewMode}
						>
							<div
								class="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold"
							>
								+
							</div>
							<span class="text-sm font-medium text-primary">
								Create "{searchQuery.trim()}"
							</span>
						</button>
					{/if}

					<!-- Existing persons -->
					{#if filteredPersons.length === 0 && !searchQuery.trim()}
						<div class="p-4 text-center text-sm text-muted-foreground">
							No persons found. Enter a name above to create one.
						</div>
					{:else}
						{#each filteredPersons as person (person.id)}
							<button
								type="button"
								class="w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors"
								class:bg-accent={selectedPerson?.id === person.id}
								class:border-b={person !== filteredPersons[filteredPersons.length - 1]}
								onclick={() => handleSelectPerson(person)}
								role="option"
								aria-selected={selectedPerson?.id === person.id}
							>
								<div
									class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white flex items-center justify-center font-semibold"
								>
									{person.name.charAt(0).toUpperCase()}
								</div>
								<div class="flex flex-col gap-0.5">
									<span class="font-medium text-sm">{person.name}</span>
									<span class="text-xs text-muted-foreground">{person.faceCount} faces</span>
								</div>
							</button>
						{/each}
					{/if}
				{/if}
			</div>

			<!-- Selected indicator -->
			{#if selectedPerson || createNewMode}
				<div class="p-3 bg-accent rounded-lg text-sm">
					{#if createNewMode}
						Will create new person: <strong class="text-primary"
							>{newPersonName || searchQuery.trim()}</strong
						>
					{:else if selectedPerson}
						Will assign to: <strong class="text-primary">{selectedPerson.name}</strong>
					{/if}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose} disabled={submitting}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={!canSubmit || submitting}>
				{#if submitting}
					Labeling...
				{:else}
					Label Cluster
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
