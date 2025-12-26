<script lang="ts">
	import { listPersons, labelCluster } from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import type { Person } from '$lib/types';
	import { onMount } from 'svelte';

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

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<header class="modal-header">
			<h2 id="modal-title">Label Cluster</h2>
			<button type="button" class="close-button" onclick={onClose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</header>

		<div class="modal-body">
			{#if error}
				<div class="error-banner" role="alert">
					{error}
				</div>
			{/if}

			<p class="instruction">
				Select an existing person or create a new one to label this cluster.
			</p>

			<!-- Search input -->
			<div class="search-container">
				<input
					type="text"
					placeholder="Search or enter new name..."
					bind:value={searchQuery}
					class="search-input"
					aria-label="Search persons or enter new name"
				/>
			</div>

			<!-- Person list -->
			<div class="person-list" role="listbox" aria-label="Select a person">
				{#if loading}
					<div class="loading-item">Loading persons...</div>
				{:else}
					<!-- Create new option -->
					{#if searchQuery.trim().length > 0}
						<button
							type="button"
							class="person-option create-new"
							class:selected={createNewMode}
							onclick={handleCreateNew}
							role="option"
							aria-selected={createNewMode}
						>
							<span class="create-icon">+</span>
							<span>Create "{searchQuery.trim()}"</span>
						</button>
					{/if}

					<!-- Existing persons -->
					{#if filteredPersons.length === 0 && !searchQuery.trim()}
						<div class="no-persons">No persons found. Enter a name above to create one.</div>
					{:else}
						{#each filteredPersons as person (person.id)}
							<button
								type="button"
								class="person-option"
								class:selected={selectedPerson?.id === person.id}
								onclick={() => handleSelectPerson(person)}
								role="option"
								aria-selected={selectedPerson?.id === person.id}
							>
								<div class="person-avatar">
									{person.name.charAt(0).toUpperCase()}
								</div>
								<div class="person-info">
									<span class="person-name">{person.name}</span>
									<span class="person-meta">{person.faceCount} faces</span>
								</div>
							</button>
						{/each}
					{/if}
				{/if}
			</div>

			<!-- Selected indicator -->
			{#if selectedPerson || createNewMode}
				<div class="selection-summary">
					{#if createNewMode}
						Will create new person: <strong>{newPersonName || searchQuery.trim()}</strong>
					{:else if selectedPerson}
						Will assign to: <strong>{selectedPerson.name}</strong>
					{/if}
				</div>
			{/if}
		</div>

		<footer class="modal-footer">
			<button type="button" class="cancel-button" onclick={onClose} disabled={submitting}>
				Cancel
			</button>
			<button
				type="button"
				class="submit-button"
				onclick={handleSubmit}
				disabled={!canSubmit || submitting}
			>
				{#if submitting}
					Labeling...
				{:else}
					Label Cluster
				{/if}
			</button>
		</footer>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
	}

	.close-button {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.close-button:hover {
		background-color: #f0f0f0;
		color: #333;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.error-banner {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.instruction {
		color: #666;
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
	}

	.search-container {
		margin-bottom: 1rem;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.person-list {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		max-height: 250px;
		overflow-y: auto;
	}

	.loading-item,
	.no-persons {
		padding: 1rem;
		text-align: center;
		color: #666;
		font-size: 0.875rem;
	}

	.person-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.person-option:hover {
		background-color: #f5f5f5;
	}

	.person-option.selected {
		background-color: #e8f4fd;
	}

	.person-option:not(:last-child) {
		border-bottom: 1px solid #f0f0f0;
	}

	.person-option.create-new {
		background-color: #f0f7ff;
		color: #4a90e2;
		font-weight: 500;
	}

	.person-option.create-new:hover {
		background-color: #e0efff;
	}

	.create-icon {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background-color: #4a90e2;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.person-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1rem;
	}

	.person-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.person-name {
		font-weight: 500;
		color: #333;
	}

	.person-meta {
		font-size: 0.75rem;
		color: #999;
	}

	.selection-summary {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background-color: #f0f7ff;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #333;
	}

	.selection-summary strong {
		color: #4a90e2;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.cancel-button,
	.submit-button {
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			opacity 0.2s;
	}

	.cancel-button {
		background: none;
		border: 1px solid #ddd;
		color: #666;
	}

	.cancel-button:hover:not(:disabled) {
		background-color: #f5f5f5;
	}

	.submit-button {
		background-color: #4a90e2;
		border: none;
		color: white;
	}

	.submit-button:hover:not(:disabled) {
		background-color: #3a7bc8;
	}

	.submit-button:disabled,
	.cancel-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
