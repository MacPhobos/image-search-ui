<script lang="ts">
	import { untrack } from 'svelte';
	import type { Person } from '$lib/api/faces';
	import { tid } from '$lib/testing/testid';

	interface Props {
		/** Pre-loaded list of all persons */
		persons: Person[];
		/** True while persons are loading */
		loading?: boolean;
		/** Currently selected person ID */
		selectedPersonId: string | null;
		/** Callback when selection changes (null to clear) */
		onSelect: (personId: string | null, personName: string | null) => void;
		/** Placeholder text */
		placeholder?: string;
		/** Test ID for the component */
		testId?: string;
	}

	let {
		persons,
		loading = false,
		selectedPersonId,
		onSelect,
		placeholder = 'Search for a person...',
		testId = 'person-search-bar'
	}: Props = $props();

	// State
	let searchQuery = $state('');
	let isOpen = $state(false);
	let highlightedIndex = $state(-1);
	let dropdownRef = $state<HTMLDivElement | null>(null);
	let inputRef = $state<HTMLInputElement | null>(null);

	// Derived
	let selectedPerson = $derived(persons.find((p) => p.id === selectedPersonId) ?? null);

	// Filter persons based on search query (client-side)
	let filteredPersons = $derived.by(() => {
		if (!searchQuery.trim()) return persons;
		const query = searchQuery.toLowerCase();
		return persons.filter((p) => p.name.toLowerCase().includes(query));
	});

	// Effect to handle click outside
	$effect(() => {
		if (!isOpen) return;

		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (
				dropdownRef &&
				!dropdownRef.contains(target) &&
				inputRef &&
				!inputRef.contains(target)
			) {
				closeDropdown();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});

	// Effect to reset highlighted index when options change
	$effect(() => {
		if (filteredPersons.length > 0 && highlightedIndex >= filteredPersons.length) {
			highlightedIndex = filteredPersons.length - 1;
		}
	});

	function openDropdown() {
		if (loading) return;
		isOpen = true;
		highlightedIndex = -1;
	}

	function closeDropdown() {
		isOpen = false;
		highlightedIndex = -1;
	}

	function handleInputFocus() {
		openDropdown();
	}

	function handleInputChange() {
		if (!isOpen) {
			openDropdown();
		}
		highlightedIndex = -1;
	}

	function handleSelectPerson(person: Person) {
		// Use untrack to prevent callback from triggering effects
		untrack(() => {
			onSelect(person.id, person.name);
		});
		closeDropdown();
		searchQuery = '';
	}

	function handleClearSelection() {
		untrack(() => {
			onSelect(null, null);
		});
		searchQuery = '';
		inputRef?.focus();
	}

	function handleKeyDown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				closeDropdown();
				inputRef?.blur();
				break;

			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					openDropdown();
				} else {
					highlightedIndex = Math.min(highlightedIndex + 1, filteredPersons.length - 1);
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (isOpen) {
					highlightedIndex = Math.max(highlightedIndex - 1, -1);
				}
				break;

			case 'Enter':
				event.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < filteredPersons.length) {
					handleSelectPerson(filteredPersons[highlightedIndex]);
				}
				break;
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

<div class="person-search-bar" data-testid={tid(testId)}>
	<!-- Selected person badge (when person is selected) -->
	{#if selectedPerson}
		<div class="selected-badge" data-testid={tid(testId, 'badge')}>
			<span class="badge-avatar">{getInitials(selectedPerson.name)}</span>
			<span class="badge-name">{selectedPerson.name}</span>
			<button
				type="button"
				class="badge-clear"
				onclick={handleClearSelection}
				aria-label="Clear person filter"
				data-testid={tid(testId, 'btn-clear')}
			>
				×
			</button>
		</div>
	{:else}
		<!-- Search input (when no person selected) -->
		<div class="search-input-wrapper">
			<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
					clip-rule="evenodd"
				/>
			</svg>
			<input
				type="text"
				class="search-input"
				{placeholder}
				bind:value={searchQuery}
				bind:this={inputRef}
				onfocus={handleInputFocus}
				oninput={handleInputChange}
				onkeydown={handleKeyDown}
				disabled={loading}
				role="combobox"
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				aria-controls={tid(testId, 'dropdown')}
				aria-label="Search for person"
				data-testid={tid(testId, 'input')}
			/>
		</div>

		<!-- Dropdown menu -->
		{#if isOpen}
			<div
				id={tid(testId, 'dropdown')}
				class="dropdown-menu"
				bind:this={dropdownRef}
				role="listbox"
				data-testid={tid(testId, 'dropdown')}
			>
				{#if loading}
					<div class="empty-state" data-testid={tid(testId, 'loading')}>
						<div class="spinner"></div>
						<p>Loading persons...</p>
					</div>
				{:else if filteredPersons.length === 0}
					<div class="empty-state" data-testid={tid(testId, 'empty')}>
						{#if searchQuery.trim()}
							<p>No persons found matching "{searchQuery}"</p>
						{:else}
							<p>No persons available</p>
						{/if}
					</div>
				{:else}
					<div class="dropdown-list">
						{#each filteredPersons as person, index (person.id)}
							<button
								type="button"
								class="dropdown-option"
								class:highlighted={index === highlightedIndex}
								onclick={() => handleSelectPerson(person)}
								role="option"
								aria-selected={index === highlightedIndex}
								data-testid={tid(testId, 'option', person.id)}
							>
								<span class="person-avatar">{getInitials(person.name)}</span>
								<span class="option-info">
									<span class="option-name">{person.name}</span>
									<span class="option-meta">{person.faceCount} faces</span>
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.person-search-bar {
		position: relative;
		width: 100%;
	}

	/* Selected Badge */
	.selected-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.badge-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.625rem;
		flex-shrink: 0;
	}

	.badge-name {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge-clear {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: background-color 0.15s;
		flex-shrink: 0;
	}

	.badge-clear:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.badge-clear:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
	}

	/* Search Input */
	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		width: 18px;
		height: 18px;
		color: #999;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		transition: border-color 0.15s;
	}

	.search-input:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
	}

	.search-input:disabled {
		background-color: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	/* Dropdown Menu */
	.dropdown-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #ddd;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		max-height: 300px;
		overflow-y: auto;
		z-index: 1000;
	}

	/* Empty State */
	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
		color: #999;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #f0f0f0;
		border-top-color: #4a90e2;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin: 0 auto 0.75rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Dropdown List */
	.dropdown-list {
		padding: 0.25rem 0;
	}

	.dropdown-option {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.15s;
	}

	.dropdown-option:hover,
	.dropdown-option.highlighted {
		background-color: #f5f5f5;
	}

	.dropdown-option.highlighted {
		background-color: #e8f4fd;
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
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.option-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.option-name {
		font-weight: 500;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.option-meta {
		font-size: 0.75rem;
		color: #999;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.dropdown-menu {
			max-height: 240px;
		}

		.badge-name {
			max-width: 150px;
		}
	}
</style>
