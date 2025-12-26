<script lang="ts">
	interface Suggestion {
		personId: string;
		personName: string;
		confidence: number;
	}

	interface Person {
		id: string;
		name: string;
		faceCount?: number;
	}

	interface Props {
		/** Currently selected person ID (null if none) */
		selectedPersonId: string | null;
		/** Pre-loaded suggestions from face recognition with confidence scores */
		suggestions?: Suggestion[];
		/** List of all persons in the system */
		persons: Person[];
		/** Whether persons are still loading */
		loading?: boolean;
		/** Placeholder text when nothing selected */
		placeholder?: string;
		/** Callback when person is selected */
		onSelect: (personId: string, personName: string) => void;
		/** Callback when "Create new" is selected with the name */
		onCreate: (name: string) => void;
		/** Whether the dropdown is disabled */
		disabled?: boolean;
	}

	let {
		selectedPersonId,
		suggestions = [],
		persons,
		loading = false,
		placeholder = 'Select person...',
		onSelect,
		onCreate,
		disabled = false
	}: Props = $props();

	// State
	let isOpen = $state(false);
	let searchQuery = $state('');
	let highlightedIndex = $state(-1);
	let dropdownRef = $state<HTMLDivElement | null>(null);
	let triggerButtonRef = $state<HTMLButtonElement | null>(null);

	// Derived
	let selectedPerson = $derived(persons.find((p) => p.id === selectedPersonId) ?? null);

	// Filter persons based on search query
	let filteredPersons = $derived(
		persons.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	// Filter suggestions to only include those in the persons list and not already selected
	let filteredSuggestions = $derived(
		suggestions
			.filter((s) => persons.some((p) => p.id === s.personId) && s.personId !== selectedPersonId)
			.sort((a, b) => b.confidence - a.confidence)
	);

	// Check if we should show "Create new" option
	let showCreateOption = $derived(
		searchQuery.trim().length > 0 &&
			!persons.some((p) => p.name.toLowerCase() === searchQuery.toLowerCase())
	);

	// Combined list of all options for keyboard navigation
	type DropdownOption =
		| { type: 'suggestion'; data: Suggestion }
		| { type: 'person'; data: Person }
		| { type: 'create'; data: { name: string } };

	let allOptions = $derived(() => {
		const options: DropdownOption[] = [];

		// Add suggestions
		filteredSuggestions.forEach((s) => {
			options.push({ type: 'suggestion', data: s });
		});

		// Add persons
		filteredPersons.forEach((p) => {
			options.push({ type: 'person', data: p });
		});

		// Add create option
		if (showCreateOption) {
			options.push({ type: 'create', data: { name: searchQuery.trim() } });
		}

		return options;
	});

	// Effect to handle click outside
	$effect(() => {
		if (!isOpen) return;

		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (
				dropdownRef &&
				!dropdownRef.contains(target) &&
				triggerButtonRef &&
				!triggerButtonRef.contains(target)
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
		if (allOptions().length > 0 && highlightedIndex >= allOptions().length) {
			highlightedIndex = allOptions().length - 1;
		}
	});

	function toggleDropdown() {
		if (disabled || loading) return;
		isOpen = !isOpen;
		if (isOpen) {
			searchQuery = '';
			highlightedIndex = -1;
		}
	}

	function closeDropdown() {
		isOpen = false;
		searchQuery = '';
		highlightedIndex = -1;
	}

	function handleSelectSuggestion(suggestion: Suggestion) {
		onSelect(suggestion.personId, suggestion.personName);
		closeDropdown();
	}

	function handleSelectPerson(person: Person) {
		onSelect(person.id, person.name);
		closeDropdown();
	}

	function handleCreate() {
		if (!showCreateOption) return;
		onCreate(searchQuery.trim());
		closeDropdown();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!isOpen) {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				toggleDropdown();
			}
			return;
		}

		const options = allOptions();

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				closeDropdown();
				triggerButtonRef?.focus();
				break;

			case 'ArrowDown':
				event.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
				break;

			case 'ArrowUp':
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;

			case 'Enter':
				event.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < options.length) {
					const option = options[highlightedIndex];
					if (option.type === 'suggestion') {
						handleSelectSuggestion(option.data);
					} else if (option.type === 'person') {
						handleSelectPerson(option.data);
					} else if (option.type === 'create') {
						handleCreate();
					}
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

	function getOptionIndex(
		type: 'suggestion' | 'person' | 'create',
		data: Suggestion | Person | Record<string, never>
	): number {
		return allOptions().findIndex((o) => {
			if (type === 'suggestion' && o.type === 'suggestion') {
				return o.data.personId === (data as Suggestion).personId;
			} else if (type === 'person' && o.type === 'person') {
				return o.data.id === (data as Person).id;
			} else if (type === 'create' && o.type === 'create') {
				return true;
			}
			return false;
		});
	}
</script>

<div class="person-dropdown">
	<button
		type="button"
		class="dropdown-trigger"
		class:open={isOpen}
		class:disabled={disabled || loading}
		onclick={toggleDropdown}
		onkeydown={handleKeyDown}
		bind:this={triggerButtonRef}
		{disabled}
		role="combobox"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
		aria-controls="person-dropdown-menu"
		aria-label="Select person"
	>
		<span class="trigger-content">
			{#if loading}
				<span class="loading-text">Loading...</span>
			{:else if selectedPerson}
				<span class="selected-person">
					<span class="person-avatar-small">{getInitials(selectedPerson.name)}</span>
					{selectedPerson.name}
				</span>
			{:else}
				<span class="placeholder">{placeholder}</span>
			{/if}
		</span>
		<svg
			class="dropdown-arrow"
			class:rotate={isOpen}
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fill-rule="evenodd"
				d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	{#if isOpen}
		<div
			id="person-dropdown-menu"
			class="dropdown-menu"
			bind:this={dropdownRef}
			role="listbox"
		>
			<!-- Search input -->
			<div class="search-section">
				<div class="search-input-wrapper">
					<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
							clip-rule="evenodd"
						/>
					</svg>
					<input
						type="text"
						class="search-input"
						placeholder="Search persons..."
						bind:value={searchQuery}
						onkeydown={handleKeyDown}
						aria-label="Search persons"
					/>
				</div>
			</div>

			<!-- Suggestions section -->
			{#if filteredSuggestions.length > 0}
				<div class="dropdown-section">
					<div class="section-header">
						<span class="section-icon">⭐</span>
						<span class="section-title">SUGGESTED</span>
					</div>
					{#each filteredSuggestions as suggestion (suggestion.personId)}
						{@const person = persons.find((p) => p.id === suggestion.personId)}
						{#if person}
							{@const isHighlighted = getOptionIndex('suggestion', suggestion) === highlightedIndex}
							<button
								type="button"
								class="dropdown-option"
								class:highlighted={isHighlighted}
								onclick={() => handleSelectSuggestion(suggestion)}
								role="option"
								aria-selected={isHighlighted}
							>
								<span class="person-avatar">{getInitials(person.name)}</span>
								<span class="option-info">
									<span class="option-name">{person.name}</span>
									<span class="option-meta confidence"
										>{Math.round(suggestion.confidence * 100)}% confidence</span
									>
								</span>
							</button>
						{/if}
					{/each}
				</div>
			{/if}

			<!-- All persons section -->
			{#if filteredPersons.length > 0}
				<div class="dropdown-section">
					<div class="section-header">
						<span class="section-title">ALL PERSONS</span>
					</div>
					{#each filteredPersons as person (person.id)}
						{@const isHighlighted = getOptionIndex('person', person) === highlightedIndex}
						<button
							type="button"
							class="dropdown-option"
							class:highlighted={isHighlighted}
							onclick={() => handleSelectPerson(person)}
							role="option"
							aria-selected={isHighlighted}
						>
							<span class="person-avatar">{getInitials(person.name)}</span>
							<span class="option-info">
								<span class="option-name">{person.name}</span>
								{#if person.faceCount !== undefined}
									<span class="option-meta">{person.faceCount} faces</span>
								{/if}
							</span>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Empty state -->
			{#if filteredPersons.length === 0 && filteredSuggestions.length === 0 && !showCreateOption}
				<div class="empty-state">
					<p>No persons found</p>
				</div>
			{/if}

			<!-- Create new option -->
			{#if showCreateOption}
				{@const isHighlighted = getOptionIndex('create', {}) === highlightedIndex}
				<div class="dropdown-section">
					<button
						type="button"
						class="dropdown-option create-option"
						class:highlighted={isHighlighted}
						onclick={handleCreate}
						role="option"
						aria-selected={isHighlighted}
					>
						<span class="create-icon">➕</span>
						<span class="option-info">
							<span class="option-name">Create "{searchQuery.trim()}"</span>
						</span>
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.person-dropdown {
		position: relative;
		width: 100%;
	}

	.dropdown-trigger {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		background: white;
		font-size: 0.95rem;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.2s;
		text-align: left;
	}

	.dropdown-trigger:hover:not(.disabled) {
		border-color: #4a90e2;
	}

	.dropdown-trigger:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
	}

	.dropdown-trigger.open {
		border-color: #4a90e2;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.dropdown-trigger.disabled {
		background-color: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	.trigger-content {
		flex: 1;
		overflow: hidden;
	}

	.loading-text,
	.placeholder {
		color: #999;
	}

	.selected-person {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #333;
	}

	.person-avatar-small {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.65rem;
		flex-shrink: 0;
	}

	.dropdown-arrow {
		width: 20px;
		height: 20px;
		color: #666;
		transition: transform 0.2s;
		flex-shrink: 0;
		margin-left: 0.5rem;
	}

	.dropdown-arrow.rotate {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #4a90e2;
		border-top: none;
		border-radius: 0 0 6px 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		max-height: 400px;
		overflow-y: auto;
		z-index: 1000;
	}

	/* Search Section */
	.search-section {
		padding: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
		background-color: #fafafa;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		width: 16px;
		height: 16px;
		color: #999;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
	}

	.search-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	/* Dropdown Sections */
	.dropdown-section {
		border-bottom: 1px solid #e0e0e0;
	}

	.dropdown-section:last-child {
		border-bottom: none;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: #f9f9f9;
		font-size: 0.75rem;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.section-icon {
		font-size: 0.875rem;
	}

	.section-title {
		flex: 1;
	}

	/* Dropdown Options */
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

	.option-meta.confidence {
		color: #4a90e2;
		font-weight: 500;
	}

	/* Create Option */
	.create-option {
		color: #4a90e2;
	}

	.create-option .option-name {
		color: #4a90e2;
	}

	.create-icon {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		flex-shrink: 0;
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

	/* Responsive */
	@media (max-width: 640px) {
		.dropdown-menu {
			max-height: 300px;
		}
	}
</style>
