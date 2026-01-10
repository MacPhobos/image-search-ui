import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import FiltersPanel from '$lib/components/FiltersPanel.svelte';
import { mockResponse } from '../helpers/mockFetch';
import {
	createPersonResponse,
	createMultiplePersons,
	createCategoryResponse
} from '../helpers/fixtures';

describe('FiltersPanel', () => {
	it('renders with "Filters" heading', () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		expect(screen.getByRole('heading', { name: /filters/i })).toBeInTheDocument();
	});

	it('renders date input fields', () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		expect(screen.getByLabelText('Date From')).toBeInTheDocument();
		expect(screen.getByLabelText('Date To')).toBeInTheDocument();
	});

	it('date inputs update filter state', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		const dateFrom = screen.getByLabelText('Date From') as HTMLInputElement;
		const dateTo = screen.getByLabelText('Date To') as HTMLInputElement;

		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });
		await fireEvent.input(dateTo, { target: { value: '2024-12-31' } });

		expect(dateFrom.value).toBe('2024-01-01');
		expect(dateTo.value).toBe('2024-12-31');
	});

	it('shows clear all button when filters are active', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Initially no clear button
		expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();

		const dateFrom = screen.getByLabelText('Date From');
		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });

		// Now clear button should appear
		expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
	});

	it('clear all button resets date inputs', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		const dateFrom = screen.getByLabelText('Date From') as HTMLInputElement;
		const dateTo = screen.getByLabelText('Date To') as HTMLInputElement;

		// Set values
		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });
		await fireEvent.input(dateTo, { target: { value: '2024-12-31' } });

		// Click clear
		const clearButton = screen.getByRole('button', { name: /clear all/i });
		await fireEvent.click(clearButton);

		// Inputs should be empty
		expect(dateFrom.value).toBe('');
		expect(dateTo.value).toBe('');
	});

	it('people filter shows loading state initially', () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		const peopleFilterLabel = screen.getByText('People Filter');
		expect(peopleFilterLabel).toBeInTheDocument();

		// Person filter input should be disabled while loading
		const input = screen.getByPlaceholderText('Loading people...');
		expect(input).toBeDisabled();
	});

	it('onFilterChange callback receives correct filter object', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Clear the initial call (from initialization)
		onFilterChange.mockClear();

		const dateFrom = screen.getByLabelText('Date From');
		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });

		// Should be called with filters containing dateFrom
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({
				dateFrom: '2024-01-01'
			})
		);
	});

	it('onFilterChange includes both dates when set', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		onFilterChange.mockClear();

		const dateFrom = screen.getByLabelText('Date From');
		const dateTo = screen.getByLabelText('Date To');

		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });
		await fireEvent.input(dateTo, { target: { value: '2024-12-31' } });

		// Most recent call should have both dates
		expect(onFilterChange).toHaveBeenLastCalledWith({
			dateFrom: '2024-01-01',
			dateTo: '2024-12-31'
		});
	});

	it('onFilterChange sends empty object when filters cleared', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		const dateFrom = screen.getByLabelText('Date From');
		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });

		onFilterChange.mockClear();

		const clearButton = screen.getByRole('button', { name: /clear all/i });
		await fireEvent.click(clearButton);

		// Should be called with empty filter object
		expect(onFilterChange).toHaveBeenCalledWith({});
	});
});

describe('FiltersPanel - People Filter (Single-Select)', () => {
	const testPersons = createMultiplePersons(3, 1); // Alice, Bob, Charlie

	beforeEach(() => {
		// Mock API responses for categories and persons
		mockResponse(
			'http://localhost:8000/api/v1/categories?page=1&page_size=100',
			createCategoryResponse([])
		);
		// fetchAllPersons uses page_size=1000 to fetch all persons efficiently
		mockResponse(
			'http://localhost:8000/api/v1/faces/persons?page=1&page_size=1000&status=active',
			createPersonResponse(testPersons)
		);
	});

	it('sends single personId in filter when person selected', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load (input should no longer be disabled)
		await waitFor(
			() => {
				const input = screen.getByPlaceholderText('Search people to add...');
				expect(input).not.toBeDisabled();
			},
			{ timeout: 2000 }
		);

		// Clear initial calls from mount
		onFilterChange.mockClear();

		// Open dropdown and select a person
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		// Wait for dropdown to appear with Alice
		await waitFor(
			() => {
				expect(screen.getByRole('listbox')).toBeInTheDocument();
				expect(screen.getByRole('option', { name: /Alice.*5 faces/i })).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Click on Alice using mousedown (component uses onmousedown)
		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		// Verify filter includes single personId (not array)
		await waitFor(
			() => {
				expect(onFilterChange).toHaveBeenCalledWith(
					expect.objectContaining({ personId: 'person-uuid-1' })
				);
			},
			{ timeout: 2000 }
		);
	});

	it('clears personId when clear button clicked', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Select a person
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		// Wait for selection to appear
		await waitFor(() => {
			const selectedPerson = screen
				.getAllByText('Alice')
				.find((el) => el.closest('.selected-person'));
			expect(selectedPerson).toBeInTheDocument();
			expect(screen.getByLabelText('Clear person filter')).toBeInTheDocument();
		});

		onFilterChange.mockClear();

		// Click clear button
		const clearBtn = screen.getByLabelText('Clear person filter');
		await fireEvent.click(clearBtn);

		// Verify filter no longer has personId
		await waitFor(() => {
			const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
			expect(lastCall[0]).not.toHaveProperty('personId');
		});
	});

	it('replaces previous selection when selecting different person', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Select Alice
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		// Wait for Alice to be selected
		await waitFor(() => {
			const selectedPerson = screen
				.getAllByText('Alice')
				.find((el) => el.closest('.selected-person'));
			expect(selectedPerson).toBeInTheDocument();
		});

		onFilterChange.mockClear();

		// Select Bob instead
		const inputAfterSelection = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(inputAfterSelection);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const bobOption = screen.getByRole('option', { name: /Bob.*10 faces/i });
		await fireEvent.mouseDown(bobOption);

		// Verify filter has Bob's ID, not Alice's
		await waitFor(() => {
			const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
			expect(lastCall[0]).toEqual(expect.objectContaining({ personId: 'person-uuid-2' }));
		});
	});

	it('closes dropdown after selection', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Open dropdown
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		// Select person
		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		// Dropdown should be closed (after a short delay due to setTimeout in component)
		await waitFor(
			() => {
				expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
			},
			{ timeout: 500 }
		);
	});

	it('shows selected person name in filter display', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Select Alice
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		// Should show Alice's name in the selection display
		await waitFor(() => {
			const selectedPerson = screen
				.getAllByText('Alice')
				.find((el) => el.closest('.selected-person'));
			expect(selectedPerson).toBeInTheDocument();
		});
	});

	it('filters dropdown options based on search query', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Type in search input
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'Bob' } });

		// Wait for filtered dropdown
		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
			// Should show Bob but not Alice or Charlie
			expect(screen.getByRole('option', { name: /Bob.*10 faces/i })).toBeInTheDocument();
			expect(screen.queryByRole('option', { name: /Alice/i })).not.toBeInTheDocument();
			expect(screen.queryByRole('option', { name: /Charlie/i })).not.toBeInTheDocument();
		});
	});

	it('toggles selection when clicking already selected person', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Select Alice
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		// Wait for Alice to be selected
		await waitFor(() => {
			const selectedPerson = screen
				.getAllByText('Alice')
				.find((el) => el.closest('.selected-person'));
			expect(selectedPerson).toBeInTheDocument();
		});

		onFilterChange.mockClear();

		// Click Alice again to deselect
		await fireEvent.focus(screen.getByPlaceholderText('Search people to add...'));

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const aliceOptionAgain = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOptionAgain);

		// Verify filter no longer has personId
		await waitFor(() => {
			const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
			expect(lastCall[0]).not.toHaveProperty('personId');
		});
	});
});

describe('FiltersPanel - Clear All Filters', () => {
	const testPersons = createMultiplePersons(2, 1); // Alice, Bob

	beforeEach(() => {
		mockResponse(
			'http://localhost:8000/api/v1/categories?page=1&page_size=100',
			createCategoryResponse([])
		);
		// fetchAllPersons uses page_size=1000 to fetch all persons efficiently
		mockResponse(
			'http://localhost:8000/api/v1/faces/persons?page=1&page_size=1000&status=active',
			createPersonResponse(testPersons)
		);
	});

	it('clears person filter when clearing all filters', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Set some filters including person
		const dateFrom = screen.getByLabelText('Date From');
		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });

		// Select a person
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		// Wait for selection to complete
		await waitFor(() => {
			const selectedPerson = screen
				.getAllByText('Alice')
				.find((el) => el.closest('.selected-person'));
			expect(selectedPerson).toBeInTheDocument();
		});

		onFilterChange.mockClear();

		// Clear all filters
		const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
		await fireEvent.click(clearAllBtn);

		// Verify all filters cleared
		await waitFor(() => {
			const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
			expect(lastCall[0]).toEqual({});
		});
	});

	it('clears all filter types together', async () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		// Wait for persons to load
		await waitFor(() => {
			const input = screen.getByPlaceholderText('Search people to add...');
			expect(input).not.toBeDisabled();
		});

		// Set multiple filter types
		const dateFrom = screen.getByLabelText('Date From');
		const dateTo = screen.getByLabelText('Date To');
		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });
		await fireEvent.input(dateTo, { target: { value: '2024-12-31' } });

		// Select a person
		const input = screen.getByPlaceholderText('Search people to add...');
		await fireEvent.focus(input);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		const aliceOption = screen.getByRole('option', { name: /Alice.*5 faces/i });
		await fireEvent.mouseDown(aliceOption);

		await waitFor(() => {
			const selectedPerson = screen
				.getAllByText('Alice')
				.find((el) => el.closest('.selected-person'));
			expect(selectedPerson).toBeInTheDocument();
		});

		onFilterChange.mockClear();

		// Clear all
		const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
		await fireEvent.click(clearAllBtn);

		// Verify all inputs cleared
		await waitFor(() => {
			const dateFromInput = screen.getByLabelText('Date From') as HTMLInputElement;
			const dateToInput = screen.getByLabelText('Date To') as HTMLInputElement;
			expect(dateFromInput.value).toBe('');
			expect(dateToInput.value).toBe('');
			// Alice should no longer be in selected display
			const selectedPerson = screen
				.queryAllByText('Alice')
				.find((el) => el.closest('.selected-person'));
			expect(selectedPerson).toBeFalsy();
		});

		// Verify filter object is empty
		const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
		expect(lastCall[0]).toEqual({});
	});
});
