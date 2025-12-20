import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DeleteConfirmationModal from '$lib/components/vectors/DeleteConfirmationModal.svelte';

describe('DeleteConfirmationModal', () => {
	it('renders title and message', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete Directory',
				message: 'Are you sure you want to delete this directory?',
				onConfirm,
				onCancel
			}
		});

		expect(screen.getByText('Delete Directory')).toBeInTheDocument();
		expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
	});

	it('renders with default confirm button text', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Test',
				message: 'Test message',
				onConfirm,
				onCancel
			}
		});

		expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
	});

	it('renders with custom confirm button text', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Test',
				message: 'Test message',
				confirmText: 'Remove All',
				onConfirm,
				onCancel
			}
		});

		expect(screen.getByRole('button', { name: /remove all/i })).toBeInTheDocument();
	});

	it('shows confirmation input when requireInput is set', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Reset Collection',
				message: 'This will delete everything',
				requireInput: 'DELETE ALL VECTORS',
				onConfirm,
				onCancel
			}
		});

		expect(screen.getByLabelText(/type.*delete all vectors.*to confirm/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText('DELETE ALL VECTORS')).toBeInTheDocument();
	});

	it('disables confirm button when input does not match requireInput', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Reset',
				message: 'Confirm reset',
				requireInput: 'DELETE ALL VECTORS',
				onConfirm,
				onCancel
			}
		});

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		expect(confirmButton).toBeDisabled();

		const input = screen.getByLabelText(/type.*delete all vectors.*to confirm/i);
		await fireEvent.input(input, { target: { value: 'wrong text' } });

		expect(confirmButton).toBeDisabled();
	});

	it('enables confirm button when input matches requireInput', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Reset',
				message: 'Confirm reset',
				requireInput: 'DELETE ALL VECTORS',
				onConfirm,
				onCancel
			}
		});

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		expect(confirmButton).toBeDisabled();

		const input = screen.getByLabelText(/type.*delete all vectors.*to confirm/i);
		await fireEvent.input(input, { target: { value: 'DELETE ALL VECTORS' } });

		expect(confirmButton).not.toBeDisabled();
	});

	it('calls onConfirm without reason when confirm button clicked', async () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined);
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
				onConfirm,
				onCancel
			}
		});

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		await fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalledWith(undefined);
			expect(onConfirm).toHaveBeenCalledTimes(1);
		});
	});

	it('calls onConfirm with reason when reason is provided', async () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined);
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
				onConfirm,
				onCancel
			}
		});

		const reasonInput = screen.getByLabelText(/reason.*optional/i);
		await fireEvent.input(reasonInput, { target: { value: 'Cleanup old data' } });

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		await fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalledWith('Cleanup old data');
		});
	});

	it('calls onCancel when cancel button clicked', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
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
		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
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

		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
				onConfirm,
				onCancel
			}
		});

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		await fireEvent.click(confirmButton);

		// Should show loading text
		expect(screen.getByText(/processing/i)).toBeInTheDocument();

		// Buttons should be disabled
		expect(confirmButton).toBeDisabled();
		expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

		// Resolve the promise
		resolveConfirm!();
	});

	it('displays error message when onConfirm rejects', async () => {
		const onConfirm = vi.fn().mockRejectedValue(new Error('Deletion failed'));
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
				onConfirm,
				onCancel
			}
		});

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		await fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('Deletion failed');
		});
	});

	it('displays generic error message for non-Error exceptions', async () => {
		const onConfirm = vi.fn().mockRejectedValue('String error');
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
				onConfirm,
				onCancel
			}
		});

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		await fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('An error occurred');
		});
	});

	it('does not call onConfirm when confirmation input does not match', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(DeleteConfirmationModal, {
			props: {
				title: 'Reset',
				message: 'Confirm reset',
				requireInput: 'DELETE ALL VECTORS',
				onConfirm,
				onCancel
			}
		});

		const input = screen.getByLabelText(/type.*delete all vectors.*to confirm/i);
		await fireEvent.input(input, { target: { value: 'wrong' } });

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		await fireEvent.click(confirmButton);

		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('disables inputs during loading', async () => {
		let resolveConfirm: () => void;
		const confirmPromise = new Promise<void>((resolve) => {
			resolveConfirm = resolve;
		});
		const onConfirm = vi.fn().mockReturnValue(confirmPromise);
		const onCancel = vi.fn();

		render(DeleteConfirmationModal, {
			props: {
				title: 'Delete',
				message: 'Confirm deletion',
				requireInput: 'CONFIRM',
				onConfirm,
				onCancel
			}
		});

		const input = screen.getByLabelText(/type.*confirm.*to confirm/i);
		await fireEvent.input(input, { target: { value: 'CONFIRM' } });

		const confirmButton = screen.getByRole('button', { name: /delete/i });
		await fireEvent.click(confirmButton);

		// Inputs should be disabled during loading
		expect(input).toBeDisabled();
		expect(screen.getByLabelText(/reason.*optional/i)).toBeDisabled();

		resolveConfirm!();
	});
});
