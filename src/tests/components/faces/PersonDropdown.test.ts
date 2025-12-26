import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import PersonDropdown from '$lib/components/faces/PersonDropdown.svelte';

describe('PersonDropdown', () => {
	const mockPersons = [
		{ id: '1', name: 'Alice Johnson', faceCount: 24 },
		{ id: '2', name: 'Bob Smith', faceCount: 18 },
		{ id: '3', name: 'Carol Williams', faceCount: 12 }
	];

	const mockSuggestions = [
		{ personId: '1', personName: 'Alice Johnson', confidence: 0.87 },
		{ personId: '2', personName: 'Bob Smith', confidence: 0.72 }
	];

	it('renders with placeholder when no person selected', () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate,
				placeholder: 'Choose a person...'
			}
		});

		expect(screen.getByRole('combobox')).toHaveTextContent('Choose a person...');
	});

	it('renders with selected person', () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: '1',
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		expect(screen.getByRole('combobox')).toHaveTextContent('Alice Johnson');
	});

	it('opens dropdown when clicked', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		const trigger = screen.getByRole('combobox');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(trigger);

		await waitFor(() => {
			expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});

		expect(screen.getByPlaceholderText('Search persons...')).toBeInTheDocument();
	});

	it('displays all persons in dropdown', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
			expect(screen.getByText('Bob Smith')).toBeInTheDocument();
			expect(screen.getByText('Carol Williams')).toBeInTheDocument();
		});
	});

	it('displays suggestions section when provided', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				suggestions: mockSuggestions,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('SUGGESTED')).toBeInTheDocument();
			expect(screen.getByText('87% confidence')).toBeInTheDocument();
			expect(screen.getByText('72% confidence')).toBeInTheDocument();
		});
	});

	it('filters persons based on search query', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		const searchInput = screen.getByPlaceholderText('Search persons...');
		await fireEvent.input(searchInput, { target: { value: 'alice' } });

		await waitFor(() => {
			expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
			expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
			expect(screen.queryByText('Carol Williams')).not.toBeInTheDocument();
		});
	});

	it('shows create new option when search has no match', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		const searchInput = screen.getByPlaceholderText('Search persons...');
		await fireEvent.input(searchInput, { target: { value: 'New Person' } });

		await waitFor(() => {
			expect(screen.getByText('Create "New Person"')).toBeInTheDocument();
		});
	});

	it('calls onSelect when person is clicked', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		const aliceOption = screen.getByText('Alice Johnson');
		await fireEvent.click(aliceOption);

		expect(onSelect).toHaveBeenCalledWith('1', 'Alice Johnson');
	});

	it('calls onCreate when create option is clicked', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		const searchInput = screen.getByPlaceholderText('Search persons...');
		await fireEvent.input(searchInput, { target: { value: 'New Person' } });

		const createOption = await screen.findByText('Create "New Person"');
		await fireEvent.click(createOption);

		expect(onCreate).toHaveBeenCalledWith('New Person');
	});

	it('closes dropdown on Escape key', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		const trigger = screen.getByRole('combobox');
		await fireEvent.click(trigger);

		await waitFor(() => {
			expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});

		await fireEvent.keyDown(trigger, { key: 'Escape' });

		await waitFor(() => {
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	});

	it('navigates options with arrow keys', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		const trigger = screen.getByRole('combobox');
		await fireEvent.click(trigger);

		await waitFor(() => {
			expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});

		// Arrow down should highlight first option
		await fireEvent.keyDown(trigger, { key: 'ArrowDown' });

		// Enter should select highlighted option
		await fireEvent.keyDown(trigger, { key: 'Enter' });

		expect(onSelect).toHaveBeenCalledWith('1', 'Alice Johnson');
	});

	it('shows loading state', () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				loading: true,
				onSelect,
				onCreate
			}
		});

		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('disables dropdown when disabled prop is true', () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				disabled: true,
				onSelect,
				onCreate
			}
		});

		const trigger = screen.getByRole('combobox');
		expect(trigger).toBeDisabled();
	});

	it('excludes selected person from suggestions', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: '1',
				persons: mockPersons,
				suggestions: mockSuggestions,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			// Alice (id: 1) should not appear in suggestions since she's selected
			const suggestions = screen.getAllByText(/% confidence/);
			expect(suggestions).toHaveLength(1);
			expect(screen.getByText('72% confidence')).toBeInTheDocument(); // Bob only
		});
	});

	it('shows empty state when no persons match search', async () => {
		const onSelect = vi.fn();
		const onCreate = vi.fn();

		render(PersonDropdown, {
			props: {
				selectedPersonId: null,
				persons: mockPersons,
				onSelect,
				onCreate
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		const searchInput = screen.getByPlaceholderText('Search persons...');
		await fireEvent.input(searchInput, { target: { value: 'xyz' } });

		await waitFor(() => {
			// Should show create option, not empty state
			expect(screen.getByText('Create "xyz"')).toBeInTheDocument();
		});

		// Clear search to get truly empty state with exact match
		await fireEvent.input(searchInput, { target: { value: 'Alice Johnson' } });

		await waitFor(() => {
			// Should find Alice and not show create
			expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
			expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
		});
	});
});
