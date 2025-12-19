import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FiltersPanel from '$lib/components/FiltersPanel.svelte';

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

	it('face filter select is disabled with "Coming Soon" badge', () => {
		const onFilterChange = vi.fn();
		render(FiltersPanel, { props: { onFilterChange } });

		const faceFilterLabel = screen.getByText('Face Filter');
		expect(faceFilterLabel).toBeInTheDocument();

		// Check for Coming Soon badge
		expect(screen.getByText('Coming Soon')).toBeInTheDocument();

		// Face filter select should be disabled
		const select = screen.getByRole('combobox', { name: /face filter/i });
		expect(select).toBeDisabled();
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
