import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import RetrainModal from '$lib/components/vectors/RetrainModal.svelte';
import { mockResponse } from '../../helpers/mockFetch';
import { createCategoryResponse, createMultipleCategories } from '../../helpers/fixtures';

describe('RetrainModal', () => {
	const defaultCategories = createMultipleCategories(3);

	beforeEach(() => {
		mockResponse(
			'http://localhost:8000/api/v1/categories?page=1&page_size=100',
			createCategoryResponse(defaultCategories)
		);
	});

	it('renders modal with title', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/vacation',
				onConfirm,
				onCancel
			}
		});

		expect(screen.getByText('Retrain Directory')).toBeInTheDocument();
	});

	it('displays directory path prefix', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/vacation/2024',
				onConfirm,
				onCancel
			}
		});

		expect(screen.getByText(/directory:/i)).toBeInTheDocument();
		// Should show truncated path
		expect(screen.getByText(/vacation\/2024/i)).toBeInTheDocument();
	});

	it('displays description about retrain operation', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		expect(
			screen.getByText(/this will delete all existing vectors for this directory/i)
		).toBeInTheDocument();
		expect(screen.getByText(/create a new training session/i)).toBeInTheDocument();
	});

	it('renders category selector', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			expect(
				screen.getByLabelText(/select category for training session/i)
			).toBeInTheDocument();
		});
	});

	it('renders reason textarea', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		expect(screen.getByLabelText(/reason.*optional/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/why are you retraining/i)).toBeInTheDocument();
	});

	it('disables retrain button when no category selected', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			const retrainButton = screen.getByRole('button', { name: /retrain/i });
			expect(retrainButton).toBeDisabled();
		});
	});

	it('enables retrain button when category is selected', async () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined);
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: '1' } });

		const retrainButton = screen.getByRole('button', { name: /retrain/i });
		expect(retrainButton).not.toBeDisabled();
	});

	it('calls onConfirm with category ID when confirmed', async () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined);
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: '2' } });

		const retrainButton = screen.getByRole('button', { name: /retrain/i });
		await fireEvent.click(retrainButton);

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalledWith(2, undefined);
		});
	});

	it('calls onConfirm with category ID and reason when provided', async () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined);
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: '1' } });

		const reasonInput = screen.getByLabelText(/reason.*optional/i);
		await fireEvent.input(reasonInput, { target: { value: 'Model upgrade' } });

		const retrainButton = screen.getByRole('button', { name: /retrain/i });
		await fireEvent.click(retrainButton);

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalledWith(1, 'Model upgrade');
		});
	});

	it('calls onCancel when cancel button clicked', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('calls onCancel when close button clicked', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		const closeButton = document.querySelector('.close-btn');
		if (!closeButton) throw new Error('Close button not found');
		await fireEvent.click(closeButton);

		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('shows loading state during confirmation', async () => {
		let resolveConfirm: () => void;
		const confirmPromise = new Promise<void>((resolve) => {
			resolveConfirm = resolve;
		});
		const onConfirm = vi.fn().mockReturnValue(confirmPromise);
		const onCancel = vi.fn();

		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: '1' } });

		const retrainButton = screen.getByRole('button', { name: /retrain/i });
		await fireEvent.click(retrainButton);

		// Should show loading text
		expect(screen.getByText(/creating session/i)).toBeInTheDocument();

		// Buttons should be disabled
		expect(retrainButton).toBeDisabled();
		expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

		resolveConfirm!();
	});

	it('displays error message when onConfirm rejects', async () => {
		const onConfirm = vi.fn().mockRejectedValue(new Error('Training session creation failed'));
		const onCancel = vi.fn();

		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: '1' } });

		const retrainButton = screen.getByRole('button', { name: /retrain/i });
		await fireEvent.click(retrainButton);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('Training session creation failed');
		});
	});

	it('truncates long path prefix in display', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(RetrainModal, {
			props: {
				pathPrefix: '/very/long/path/to/photos/vacation/2024',
				onConfirm,
				onCancel
			}
		});

		// Should only show last 3 parts
		expect(screen.getByText(/vacation\/2024$/)).toBeInTheDocument();
	});

	it('disables category selector during loading', async () => {
		let resolveConfirm: () => void;
		const confirmPromise = new Promise<void>((resolve) => {
			resolveConfirm = resolve;
		});
		const onConfirm = vi.fn().mockReturnValue(confirmPromise);
		const onCancel = vi.fn();

		render(RetrainModal, {
			props: {
				pathPrefix: '/photos/test',
				onConfirm,
				onCancel
			}
		});

		await waitFor(() => {
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			expect(select).not.toBeDisabled();
		});

		const select = screen.getByRole('combobox') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: '1' } });

		const retrainButton = screen.getByRole('button', { name: /retrain/i });
		await fireEvent.click(retrainButton);

		// Category selector should be disabled during loading
		expect(select).toBeDisabled();

		resolveConfirm!();
	});
});
