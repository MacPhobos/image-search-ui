import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import CategorySelector from '$lib/components/CategorySelector.svelte';
import { mockResponse } from '../helpers/mockFetch';
import {
	createCategoryResponse,
	createDefaultCategory,
	createMultipleCategories
} from '../helpers/fixtures';

describe('CategorySelector', () => {
	const defaultCategories = [
		createDefaultCategory(),
		...createMultipleCategories(3, 2) // IDs 2, 3, 4
	];

	beforeEach(() => {
		mockResponse(
			'http://localhost:8000/api/v1/categories?page=1&page_size=100',
			createCategoryResponse(defaultCategories)
		);
	});

	it('renders with default label', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect } });

		expect(screen.getByLabelText('Category')).toBeInTheDocument();
	});

	it('renders with custom label', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, {
			props: { selectedId: null, onSelect, label: 'Choose Category' }
		});

		expect(screen.getByLabelText('Choose Category')).toBeInTheDocument();
	});

	it('shows loading state initially', () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect } });

		const select = screen.getByRole('combobox') as HTMLSelectElement;
		expect(select).toBeDisabled();
		expect(select.textContent).toContain('Loading categories');
	});

	it('loads and displays categories', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect } });

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
		});

		// Check all categories are rendered
		expect(screen.getByText('Uncategorized (Default)')).toBeInTheDocument();
		expect(screen.getByText('Category 2')).toBeInTheDocument();
		expect(screen.getByText('Category 3')).toBeInTheDocument();
		expect(screen.getByText('Category 4')).toBeInTheDocument();
	});

	it('includes "No category" option', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect } });

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).not.toBeDisabled();
		});

		expect(screen.getByRole('option', { name: 'No category' })).toBeInTheDocument();
	});

	it('shows "Create New Category..." option when showCreateOption is true', async () => {
		const onSelect = vi.fn();
		const onCreateNew = vi.fn();
		render(CategorySelector, {
			props: { selectedId: null, onSelect, onCreateNew, showCreateOption: true }
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).not.toBeDisabled();
		});

		expect(screen.getByRole('option', { name: /Create New Category/i })).toBeInTheDocument();
	});

	it('hides "Create New Category..." when showCreateOption is false', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, {
			props: { selectedId: null, onSelect, showCreateOption: false }
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).not.toBeDisabled();
		});

		expect(screen.queryByRole('option', { name: /Create New Category/i })).not.toBeInTheDocument();
	});

	it('calls onSelect when category is selected', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect } });

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox');
		await fireEvent.change(select, { target: { value: '2' } });

		expect(onSelect).toHaveBeenCalledWith(2);
	});

	it('calls onSelect with null when "No category" is selected', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: 2, onSelect } });

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox');
		await fireEvent.change(select, { target: { value: '' } });

		expect(onSelect).toHaveBeenCalledWith(null);
	});

	it('calls onCreateNew when "Create New..." is selected', async () => {
		const onSelect = vi.fn();
		const onCreateNew = vi.fn();
		render(CategorySelector, {
			props: { selectedId: null, onSelect, onCreateNew, showCreateOption: true }
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox');
		await fireEvent.change(select, { target: { value: '__create__' } });

		expect(onCreateNew).toHaveBeenCalled();
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('displays selected category', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: 2, onSelect } });

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
			expect(select.value).toBe('2');
		});
	});

	it('can be disabled', async () => {
		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect, disabled: true } });

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).toBeDisabled();
		});
	});

	it('displays error message when API fails', async () => {
		mockResponse('http://localhost:8000/api/v1/categories?page=1&page_size=100', {}, 500);

		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect } });

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
			// The error message will be "HTTP 500: OK" from the API client
			expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();
		});
	});

	it('handles empty category list', async () => {
		mockResponse(
			'http://localhost:8000/api/v1/categories?page=1&page_size=100',
			createCategoryResponse([])
		);

		const onSelect = vi.fn();
		render(CategorySelector, { props: { selectedId: null, onSelect } });

		await waitFor(() => {
			const select = screen.getByRole('combobox');
			expect(select).not.toBeDisabled();
		});

		// Should still have "No category" option
		expect(screen.getByRole('option', { name: 'No category' })).toBeInTheDocument();
	});
});
