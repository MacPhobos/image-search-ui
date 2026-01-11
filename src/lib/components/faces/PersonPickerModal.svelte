<script lang="ts">
	import { untrack } from 'svelte';
	import { fetchAllPersons } from '$lib/api/faces';
	import type { Person } from '$lib/api/faces';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';

	interface Props {
		onSelect: (destination: { toPersonId: string } | { toPersonName: string }) => void;
		onClose: () => void;
		excludePersonId?: string;
	}

	let { onSelect, onClose, excludePersonId }: Props = $props();

	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;
	const open = true; // This modal is always open when rendered

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('PersonPickerModal', {
					filePath: 'src/lib/components/faces/PersonPickerModal.svelte'
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

	// State
	let persons = $state<Person[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let selectedPerson = $state<Person | null>(null);
	let newPersonName = $state('');
	let mode = $state<'existing' | 'new'>('existing');

	// Derived
	let filteredPersons = $derived(
		persons.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);
	let canConfirm = $derived(
		(mode === 'existing' && selectedPerson !== null) ||
			(mode === 'new' && newPersonName.trim().length > 0)
	);

	// Load persons when modal opens
	$effect(() => {
		loadPersons();
	});

	async function loadPersons() {
		loading = true;
		error = null;
		try {
			// Load all active persons
			const allPersons = await fetchAllPersons('active');
			// Exclude the current person
			persons = allPersons.filter((p) => p.id !== excludePersonId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load persons';
		} finally {
			loading = false;
		}
	}

	function handlePersonClick(person: Person) {
		selectedPerson = person;
		mode = 'existing';
	}

	function handleNewPersonMode() {
		mode = 'new';
		selectedPerson = null;
		newPersonName = searchQuery; // Pre-fill with search query
	}

	function handleConfirm() {
		if (!canConfirm) return;

		if (mode === 'existing' && selectedPerson) {
			onSelect({ toPersonId: selectedPerson.id });
		} else if (mode === 'new' && newPersonName.trim()) {
			onSelect({ toPersonName: newPersonName.trim() });
		}
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onClose}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2>Move to Person</h2>
			<button type="button" class="close-button" onclick={onClose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</header>

		<div class="modal-body">
			{#if error}
				<div class="error-message" role="alert">
					{error}
					<button type="button" class="retry-button" onclick={loadPersons}>Retry</button>
				</div>
			{:else}
				<!-- Search input -->
				<div class="search-section">
					<label for="person-search" class="search-label">Search or create person</label>
					<input
						id="person-search"
						type="text"
						class="search-input"
						placeholder="Start typing..."
						bind:value={searchQuery}
					/>
				</div>

				<!-- Mode tabs -->
				<div class="mode-tabs">
					<button
						type="button"
						class="mode-tab"
						class:active={mode === 'existing'}
						onclick={() => (mode = 'existing')}
					>
						Existing Person
					</button>
					<button
						type="button"
						class="mode-tab"
						class:active={mode === 'new'}
						onclick={handleNewPersonMode}
					>
						New Person
					</button>
				</div>

				{#if mode === 'existing'}
					<!-- Existing persons list -->
					{#if loading}
						<div class="loading-state">
							<div class="spinner"></div>
							<span>Loading persons...</span>
						</div>
					{:else if filteredPersons.length === 0}
						<div class="no-results">
							{#if searchQuery}
								<p>No persons found matching "{searchQuery}"</p>
								<button type="button" class="create-new-btn" onclick={handleNewPersonMode}>
									Create new person "{searchQuery}"
								</button>
							{:else}
								<p>No persons available</p>
							{/if}
						</div>
					{:else}
						<div class="persons-list">
							{#each filteredPersons as person (person.id)}
								<button
									type="button"
									class="person-option"
									class:selected={selectedPerson?.id === person.id}
									onclick={() => handlePersonClick(person)}
								>
									<div class="person-avatar">{getInitials(person.name)}</div>
									<div class="person-info">
										<span class="person-name">{person.name}</span>
										<span class="person-meta">{person.faceCount} faces</span>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				{:else}
					<!-- New person form -->
					<div class="new-person-form">
						<label for="new-person-name" class="form-label">New person name</label>
						<input
							id="new-person-name"
							type="text"
							class="form-input"
							placeholder="Enter person name"
							bind:value={newPersonName}
						/>
						<p class="form-hint">A new person will be created with this name</p>
					</div>
				{/if}
			{/if}
		</div>

		<footer class="modal-footer">
			<button type="button" class="cancel-button" onclick={onClose}>Cancel</button>
			<button type="button" class="confirm-button" onclick={handleConfirm} disabled={!canConfirm}>
				Move
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
		max-width: 520px;
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
		color: #666;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		transition: background-color 0.2s;
	}

	.close-button:hover {
		background-color: #f5f5f5;
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

	.error-message {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 1rem;
		border-radius: 6px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.retry-button {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #dc2626;
		border-radius: 6px;
		color: #dc2626;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	/* Search Section */
	.search-section {
		margin-bottom: 1rem;
	}

	.search-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #333;
		margin-bottom: 0.5rem;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.95rem;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
	}

	/* Mode Tabs */
	.mode-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.mode-tab {
		flex: 1;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		font-size: 0.875rem;
		font-weight: 500;
		color: #666;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}

	.mode-tab:hover {
		color: #4a90e2;
	}

	.mode-tab.active {
		color: #4a90e2;
		border-bottom-color: #4a90e2;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		color: #666;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #f0f0f0;
		border-top-color: #4a90e2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* No Results */
	.no-results {
		text-align: center;
		padding: 2rem;
		color: #666;
	}

	.no-results p {
		margin: 0 0 1rem 0;
	}

	.create-new-btn {
		padding: 0.625rem 1.25rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.create-new-btn:hover {
		background-color: #3a7bc8;
	}

	/* Persons List */
	.persons-list {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		max-height: 350px;
		overflow-y: auto;
	}

	.person-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
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

	.person-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.person-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.person-name {
		font-weight: 500;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.person-meta {
		font-size: 0.75rem;
		color: #999;
	}

	/* New Person Form */
	.new-person-form {
		padding: 1rem 0;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #333;
		margin-bottom: 0.5rem;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.95rem;
		transition: border-color 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
	}

	.form-hint {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #999;
	}

	/* Modal Footer */
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.cancel-button,
	.confirm-button {
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button {
		background: white;
		border: 1px solid #ddd;
		color: #666;
	}

	.cancel-button:hover {
		background: #f5f5f5;
	}

	.confirm-button {
		background-color: #4a90e2;
		border: none;
		color: white;
	}

	.confirm-button:hover:not(:disabled) {
		background-color: #3a7bc8;
	}

	.confirm-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.modal {
			max-width: 100%;
			margin: 1rem;
		}
	}
</style>
