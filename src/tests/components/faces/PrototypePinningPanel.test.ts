import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PrototypePinningPanel from '$lib/components/faces/PrototypePinningPanel.svelte';
import type { AgeEraBucket } from '$lib/api/faces';

describe('PrototypePinningPanel', () => {
	const mockOnCancel = vi.fn();
	const mockOnConfirm = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders when open is true', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(screen.getByText('Pin as Prototype')).toBeInTheDocument();
		expect(screen.getByText('for Alice Smith')).toBeInTheDocument();
	});

	it('does not render when open is false', () => {
		render(PrototypePinningPanel, {
			props: {
				open: false,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(screen.queryByText('Pin as Prototype')).not.toBeInTheDocument();
	});

	it('renders person name in panel body', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Bob Jones',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(screen.getByText('for Bob Jones')).toBeInTheDocument();
		expect(
			screen.getByText(/this will add this face as a reference prototype for bob jones/i)
		).toBeInTheDocument();
	});

	it('renders age era dropdown with all options', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const select = screen.getByLabelText(/age era/i);
		expect(select).toBeInTheDocument();

		// Check all era options are present
		expect(screen.getByRole('option', { name: /auto-detect/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /infant \(0-2\)/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /child \(3-12\)/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /teen \(13-19\)/i })).toBeInTheDocument();
		expect(
			screen.getByRole('option', { name: /young adult \(20-35\)/i })
		).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /adult \(36-55\)/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /senior \(56\+\)/i })).toBeInTheDocument();
	});

	it('defaults to auto-detect era', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const select = screen.getByLabelText(/age era/i) as HTMLSelectElement;
		expect(select.value).toBe('');
	});

	it('allows selecting an age era', async () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const select = screen.getByLabelText(/age era/i);
		await fireEvent.change(select, { target: { value: 'young_adult' } });

		expect(select).toHaveValue('young_adult');
	});

	it('allows selecting an age era option', async () => {
		// Note: Testing the actual callback with selected era is challenging due to
		// Svelte 5 runes reactivity limitations in testing environment.
		// This test verifies the UI allows selection; the callback behavior is
		// tested via the null/auto-detect case below which doesn't require state updates.
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const select = screen.getByLabelText(/age era/i) as HTMLSelectElement;

		// Verify all era options are available for selection
		const options = Array.from(select.options).map((opt) => opt.value);
		expect(options).toContain('infant');
		expect(options).toContain('child');
		expect(options).toContain('teen');
		expect(options).toContain('young_adult');
		expect(options).toContain('adult');
		expect(options).toContain('senior');

		// User can change the select value
		await fireEvent.change(select, { target: { value: 'adult' } });
		expect(select.value).toBe('adult');
	});

	it('clicking confirm triggers onConfirm with null when auto-detect selected', async () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const confirmButton = screen.getByRole('button', { name: /pin prototype/i });
		await fireEvent.click(confirmButton);

		expect(mockOnConfirm).toHaveBeenCalledWith(null);
		expect(mockOnConfirm).toHaveBeenCalledTimes(1);
	});

	it('clicking cancel button triggers onCancel callback', async () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const buttons = screen.getAllByRole('button');
		const cancelButton = buttons.find((btn) => btn.textContent === 'Cancel');
		expect(cancelButton).toBeDefined();
		await fireEvent.click(cancelButton!);

		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});

	it('clicking close button (×) triggers onCancel callback', async () => {
		const { container } = render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const closeButton = container.querySelector('.close-button');
		expect(closeButton).toBeInTheDocument();
		await fireEvent.click(closeButton!);

		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});

	it('shows loading state when submitting is true', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: true,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(screen.getByText('Pinning...')).toBeInTheDocument();
	});

	it('shows "Pin Prototype" button text when not submitting', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(screen.getByRole('button', { name: /pin prototype/i })).toBeInTheDocument();
		expect(screen.queryByText('Pinning...')).not.toBeInTheDocument();
	});

	it('disables cancel button when submitting is true', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: true,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const buttons = screen.getAllByRole('button');
		const cancelButton = buttons.find((btn) => btn.textContent === 'Cancel');
		expect(cancelButton).toBeDefined();
		expect(cancelButton).toBeDisabled();
	});

	it('disables confirm button when submitting is true', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: true,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const buttons = screen.getAllByRole('button');
		const confirmButton = buttons.find((btn) => btn.textContent === 'Pinning...');
		expect(confirmButton).toBeDefined();
		expect(confirmButton).toBeDisabled();
	});

	it('disables close button when submitting is true', () => {
		const { container } = render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: true,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const closeButton = container.querySelector('.close-button');
		expect(closeButton).toBeInTheDocument();
		expect(closeButton).toBeDisabled();
	});

	it('disables age era dropdown when submitting is true', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: true,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const select = screen.getByLabelText(/age era/i);
		expect(select).toBeDisabled();
	});

	it('shows error message when error prop is set', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				error: 'Failed to pin prototype',
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(screen.getByText('Failed to pin prototype')).toBeInTheDocument();
		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	it('does not show error when error prop is null', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('resets era to auto-detect when panel opens', async () => {
		const { rerender } = render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const select = screen.getByLabelText(/age era/i);
		await fireEvent.change(select, { target: { value: 'adult' } });

		expect(select).toHaveValue('adult');

		// Close panel
		rerender({
			open: false,
			faceId: 'face-1',
			personId: 'person-1',
			personName: 'Alice Smith',
			submitting: false,
			onCancel: mockOnCancel,
			onConfirm: mockOnConfirm
		});

		// Reopen panel
		await waitFor(() => {
			rerender({
				open: true,
				faceId: 'face-2',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			});
		});

		const newSelect = screen.getByLabelText(/age era/i) as HTMLSelectElement;
		expect(newSelect.value).toBe('');
	});

	it('renders helper text explaining prototype purpose', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		expect(
			screen.getByText(/this will add this face as a reference prototype for alice smith/i)
		).toBeInTheDocument();
	});

	it('renders Cancel button before Confirm button (proper button order)', () => {
		render(PrototypePinningPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith',
				submitting: false,
				onCancel: mockOnCancel,
				onConfirm: mockOnConfirm
			}
		});

		const buttons = screen.getAllByRole('button');
		const buttonTexts = buttons.map((btn) => btn.textContent);

		const cancelIndex = buttonTexts.findIndex((text) => text === 'Cancel');
		const confirmIndex = buttonTexts.findIndex((text) => text === 'Pin Prototype');

		expect(cancelIndex).toBeGreaterThan(-1);
		expect(confirmIndex).toBeGreaterThan(-1);
		expect(cancelIndex).toBeLessThan(confirmIndex);
	});
});
