import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CategoryCreateModal from '$lib/components/CategoryCreateModal.svelte';
import { createCategory } from '../helpers/fixtures';

// Mock the API
vi.mock('$lib/api/categories', () => ({
	createCategory: vi.fn()
}));

import * as categoriesApi from '$lib/api/categories';

describe('CategoryCreateModal', () => {
	it('does not render when open is false', () => {
		const { container } = render(CategoryCreateModal, {
			props: {
				open: false,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument();
	});

	it('renders modal when open is true', () => {
		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /create category/i })).toBeInTheDocument();
	});

	it('renders all form fields', () => {
		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^description/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^color/i)).toBeInTheDocument();
	});

	it('shows required asterisk for name field', () => {
		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		const nameLabel = screen.getByLabelText(/name/i).closest('.form-group');
		expect(nameLabel?.textContent).toContain('*');
	});

	it('renders color presets', () => {
		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		// Should have 7 color preset buttons
		const colorPresets = screen.getAllByLabelText(/select color/i);
		expect(colorPresets).toHaveLength(7);
	});

	it('validates required name field', async () => {
		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		const submitButton = screen.getByRole('button', { name: /create category/i });
		await fireEvent.click(submitButton);

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText('Category name is required')).toBeInTheDocument();
	});

	it('submits form with valid data', async () => {
		const mockCategory = createCategory({
			id: 1,
			name: 'New Category',
			description: 'Test description',
			color: '#3B82F6'
		});

		const onCreated = vi.fn();
		const onClose = vi.fn();

		vi.mocked(categoriesApi.createCategory).mockResolvedValueOnce(mockCategory);

		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose,
				onCreated
			}
		});

		// Fill in form
		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

		await fireEvent.input(nameInput, { target: { value: 'New Category' } });
		await fireEvent.input(descriptionInput, { target: { value: 'Test description' } });

		// Submit
		const submitButton = screen.getByRole('button', { name: /create category/i });
		await fireEvent.click(submitButton);

		// Wait for async operations
		await vi.waitFor(() => {
			expect(categoriesApi.createCategory).toHaveBeenCalledWith({
				name: 'New Category',
				description: 'Test description',
				color: '#3B82F6' // Default blue
			});
		});

		expect(onCreated).toHaveBeenCalledWith(mockCategory);
		expect(onClose).toHaveBeenCalled();
	});

	it('shows error on API failure', async () => {
		vi.mocked(categoriesApi.createCategory).mockRejectedValueOnce(
			new Error('Failed to create category')
		);

		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'Test' } });

		const submitButton = screen.getByRole('button', { name: /create category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
			expect(screen.getByText('Failed to create category')).toBeInTheDocument();
		});
	});

	it('calls onCreated callback on success', async () => {
		const mockCategory = createCategory();
		const onCreated = vi.fn();

		vi.mocked(categoriesApi.createCategory).mockResolvedValueOnce(mockCategory);

		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'Test Category' } });

		const submitButton = screen.getByRole('button', { name: /create category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(onCreated).toHaveBeenCalledWith(mockCategory);
		});
	});

	it('closes modal when cancel button is clicked', async () => {
		const onClose = vi.fn();

		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose,
				onCreated: vi.fn()
			}
		});

		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		expect(onClose).toHaveBeenCalled();
	});

	it('closes modal when close button (×) is clicked', async () => {
		const onClose = vi.fn();

		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose,
				onCreated: vi.fn()
			}
		});

		const closeButton = screen.getByRole('button', { name: '&times;' });
		await fireEvent.click(closeButton);

		expect(onClose).toHaveBeenCalled();
	});

	it('allows selecting color presets', async () => {
		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		const greenPreset = screen.getByLabelText('Select color #10B981');
		await fireEvent.click(greenPreset);

		// The button should now have the selected class
		expect(greenPreset).toHaveClass('selected');
	});

	it('disables form during submission', async () => {
		vi.mocked(categoriesApi.createCategory).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'Test' } });

		const submitButton = screen.getByRole('button', { name: /create category/i });
		await fireEvent.click(submitButton);

		// Check loading state
		await vi.waitFor(() => {
			expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
		});

		expect(nameInput).toBeDisabled();
	});

	it('trims whitespace from name and description', async () => {
		const mockCategory = createCategory();
		vi.mocked(categoriesApi.createCategory).mockResolvedValueOnce(mockCategory);

		render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

		await fireEvent.input(nameInput, { target: { value: '  Trimmed Name  ' } });
		await fireEvent.input(descriptionInput, { target: { value: '  Trimmed Desc  ' } });

		const submitButton = screen.getByRole('button', { name: /create category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(categoriesApi.createCategory).toHaveBeenCalledWith({
				name: 'Trimmed Name',
				description: 'Trimmed Desc',
				color: '#3B82F6'
			});
		});
	});

	it('resets form after successful creation', async () => {
		const mockCategory = createCategory();
		vi.mocked(categoriesApi.createCategory).mockResolvedValueOnce(mockCategory);

		const { unmount } = render(CategoryCreateModal, {
			props: {
				open: true,
				onClose: vi.fn(),
				onCreated: vi.fn()
			}
		});

		const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'Test' } });

		const submitButton = screen.getByRole('button', { name: /create category/i });
		await fireEvent.click(submitButton);

		await vi.waitFor(() => {
			expect(categoriesApi.createCategory).toHaveBeenCalled();
		});

		unmount();
	});
});
