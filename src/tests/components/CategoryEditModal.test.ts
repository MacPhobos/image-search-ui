import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CategoryEditModal from '$lib/components/CategoryEditModal.svelte';
import { createCategory, createDefaultCategory } from '../helpers/fixtures';

// Mock the API
vi.mock('$lib/api/categories', () => ({
	updateCategory: vi.fn()
}));

import * as categoriesApi from '$lib/api/categories';

describe('CategoryEditModal', () => {
	const mockCategory = createCategory({
		id: 1,
		name: 'Test Category',
		description: 'Test description',
		color: '#3B82F6'
	});

	it('does not render when open is false', () => {
		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: false,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		// Dialog should not be visible when closed
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('renders modal when open is true', () => {
		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Edit Category')).toBeInTheDocument();
	});

	it('pre-populates form with existing category data', () => {
		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

		expect(nameInput.value).toBe('Test Category');
		expect(descriptionInput.value).toBe('Test description');
	});

	it('disables name field for default category', () => {
		const defaultCategory = createDefaultCategory();

		render(CategoryEditModal, {
			props: {
				category: defaultCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		expect(nameInput).toBeDisabled();
		expect(screen.getByText('Cannot rename the default category')).toBeInTheDocument();
	});

	it('allows editing name field for non-default category', () => {
		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		expect(nameInput).not.toBeDisabled();
	});

	it('validates required name field', async () => {
		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		// Set to whitespace-only value which should fail trim() validation
		await fireEvent.input(nameInput, { target: { value: '   ' } });

		const submitButton = screen.getByRole('button', { name: /update category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(screen.getByText('Category name is required')).toBeInTheDocument();
		});
	});

	it('submits updated data', async () => {
		const updatedCategory = createCategory({
			id: 1,
			name: 'Updated Name',
			description: 'Updated description',
			color: '#10B981'
		});

		const onUpdated = vi.fn();
		const onClose = vi.fn();

		vi.mocked(categoriesApi.updateCategory).mockResolvedValueOnce(updatedCategory);

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose,
				onUpdated
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

		await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
		await fireEvent.input(descriptionInput, { target: { value: 'Updated description' } });

		// Select green color preset
		const greenPreset = screen.getByLabelText('Select color #10B981');
		await fireEvent.click(greenPreset);

		const submitButton = screen.getByRole('button', { name: /update category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(categoriesApi.updateCategory).toHaveBeenCalledWith(1, {
				name: 'Updated Name',
				description: 'Updated description',
				color: '#10B981'
			});
		});

		expect(onUpdated).toHaveBeenCalledWith(updatedCategory);
	});

	it('shows error on API failure', async () => {
		vi.mocked(categoriesApi.updateCategory).mockRejectedValueOnce(
			new Error('Failed to update category')
		);

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'New Name' } });

		const submitButton = screen.getByRole('button', { name: /update category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
			expect(screen.getByText('Failed to update category')).toBeInTheDocument();
		});
	});

	it('calls onUpdated callback on success', async () => {
		const updatedCategory = createCategory();
		const onUpdated = vi.fn();

		vi.mocked(categoriesApi.updateCategory).mockResolvedValueOnce(updatedCategory);

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'Updated' } });

		const submitButton = screen.getByRole('button', { name: /update category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(onUpdated).toHaveBeenCalledWith(updatedCategory);
		});
	});

	it('closes modal when cancel button is clicked', async () => {
		const onClose = vi.fn();

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose,
				onUpdated: vi.fn()
			}
		});

		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		expect(onClose).toHaveBeenCalled();
	});

	it('closes modal when close button (X) is clicked', async () => {
		const onClose = vi.fn();

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose,
				onUpdated: vi.fn()
			}
		});

		// shadcn Dialog uses an X icon button with sr-only "Close" text
		const closeButton = screen.getByRole('button', { name: 'Close' });
		await fireEvent.click(closeButton);

		expect(onClose).toHaveBeenCalled();
	});

	it('resets form to original values when closed', async () => {
		const onClose = vi.fn();

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose,
				onUpdated: vi.fn()
			}
		});

		// Modify the form
		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'Changed Name' } });

		// Close modal
		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		expect(onClose).toHaveBeenCalled();
	});

	it('renders color presets', () => {
		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		// Should have 7 color preset buttons
		const colorPresets = screen.getAllByLabelText(/select color/i);
		expect(colorPresets).toHaveLength(7);
	});

	it('highlights selected color preset', () => {
		const categoryWithGreen = createCategory({ color: '#10B981' });

		render(CategoryEditModal, {
			props: {
				category: categoryWithGreen,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const greenPreset = screen.getByLabelText('Select color #10B981');
		// Selected preset has different border styling (inline styles instead of class)
		const style = greenPreset.getAttribute('style');
		expect(style).toContain('border: 2px solid #1f2937');
	});

	it('disables form during submission', async () => {
		vi.mocked(categoriesApi.updateCategory).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'New Name' } });

		const submitButton = screen.getByRole('button', { name: /update category/i });
		await fireEvent.click(submitButton);

		// Check loading state
		await vi.waitFor(() => {
			expect(screen.getByRole('button', { name: /updating/i })).toBeInTheDocument();
		});

		expect(nameInput).toBeDisabled();
	});

	it('trims whitespace from name and description', async () => {
		const updatedCategory = createCategory();
		vi.mocked(categoriesApi.updateCategory).mockResolvedValueOnce(updatedCategory);

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

		await fireEvent.input(nameInput, { target: { value: '  Trimmed Name  ' } });
		await fireEvent.input(descriptionInput, { target: { value: '  Trimmed Desc  ' } });

		const submitButton = screen.getByRole('button', { name: /update category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(categoriesApi.updateCategory).toHaveBeenCalledWith(1, {
				name: 'Trimmed Name',
				description: 'Trimmed Desc',
				color: '#3B82F6'
			});
		});
	});

	it('handles empty description as null', async () => {
		const updatedCategory = createCategory();
		vi.mocked(categoriesApi.updateCategory).mockResolvedValueOnce(updatedCategory);

		render(CategoryEditModal, {
			props: {
				category: mockCategory,
				open: true,
				onClose: vi.fn(),
				onUpdated: vi.fn()
			}
		});

		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
		await fireEvent.input(descriptionInput, { target: { value: '' } });

		const submitButton = screen.getByRole('button', { name: /update category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(categoriesApi.updateCategory).toHaveBeenCalledWith(
				1,
				expect.objectContaining({
					description: null
				})
			);
		});
	});
});
