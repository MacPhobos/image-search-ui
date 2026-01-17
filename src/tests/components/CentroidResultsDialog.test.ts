import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CentroidResultsDialog from '$lib/components/faces/CentroidResultsDialog.svelte';
import { mockResponse, resetMocks } from '../helpers/mockFetch';
import type { CentroidSuggestion } from '$lib/api/faces';

describe('CentroidResultsDialog', () => {
	const mockPersonId = 'person-1';
	const mockPersonName = 'John Doe';

	const createMockSuggestion = (
		faceInstanceId: string,
		score: number,
		matchedCentroid: string
	): CentroidSuggestion => ({
		faceInstanceId,
		assetId: `asset-${faceInstanceId}`,
		score,
		matchedCentroid,
		thumbnailUrl: `/api/v1/thumbnails/${faceInstanceId}`
	});

	const mockSuggestions: CentroidSuggestion[] = [
		createMockSuggestion('face-1', 0.95, 'centroid-A'),
		createMockSuggestion('face-2', 0.87, 'centroid-A'),
		createMockSuggestion('face-3', 0.81, 'centroid-B')
	];

	beforeEach(() => {
		resetMocks();
	});

	it('renders dialog with suggestions when open', () => {
		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose: vi.fn(),
				onComplete: vi.fn()
			}
		});

		expect(screen.getByText(`Centroid Suggestions for ${mockPersonName}`)).toBeInTheDocument();
		expect(screen.getByText('3 suggestions found')).toBeInTheDocument();
	});

	it('does not render dialog when closed', () => {
		render(CentroidResultsDialog, {
			props: {
				open: false,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose: vi.fn(),
				onComplete: vi.fn()
			}
		});

		expect(
			screen.queryByText(`Centroid Suggestions for ${mockPersonName}`)
		).not.toBeInTheDocument();
	});

	it('shows empty state when no suggestions', () => {
		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: [],
				onClose: vi.fn(),
				onComplete: vi.fn()
			}
		});

		expect(
			screen.getByText(`No centroid suggestions found for ${mockPersonName}`)
		).toBeInTheDocument();
	});

	it('sorts suggestions by score (highest first)', () => {
		const unsortedSuggestions: CentroidSuggestion[] = [
			createMockSuggestion('face-low', 0.7, 'centroid-A'),
			createMockSuggestion('face-high', 0.95, 'centroid-B'),
			createMockSuggestion('face-mid', 0.85, 'centroid-A')
		];

		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: unsortedSuggestions,
				onClose: vi.fn(),
				onComplete: vi.fn()
			}
		});

		// Verify suggestions are sorted by score
		const scoreLabels = screen.getAllByText(/%$/);
		expect(scoreLabels[0]).toHaveTextContent('95.0%');
		expect(scoreLabels[1]).toHaveTextContent('85.0%');
		expect(scoreLabels[2]).toHaveTextContent('70.0%');
	});

	it('allows selecting individual suggestions', async () => {
		const user = userEvent.setup();

		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose: vi.fn(),
				onComplete: vi.fn()
			}
		});

		// Find checkboxes (1 for select-all + 3 for individual suggestions)
		const checkboxes = screen.getAllByRole('checkbox');
		expect(checkboxes).toHaveLength(4);

		// Click first suggestion checkbox (skip select-all checkbox at index 0)
		await user.click(checkboxes[1]);

		// Should show "1 selected"
		expect(screen.getByText('1 selected')).toBeInTheDocument();
	});

	it('allows selecting all suggestions', async () => {
		const user = userEvent.setup();

		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose: vi.fn(),
				onComplete: vi.fn()
			}
		});

		// Click select-all checkbox
		const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
		await user.click(selectAllCheckbox);

		// Should show "3 selected"
		expect(screen.getByText('3 selected')).toBeInTheDocument();
	});

	it('accepts selected suggestions and calls onComplete', async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();

		// Mock API response for each face assignment
		mockResponse(/\/api\/v1\/faces\/faces\/.*\/assign/, {});

		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose: vi.fn(),
				onComplete
			}
		});

		// Select first suggestion
		const checkboxes = screen.getAllByRole('checkbox');
		await user.click(checkboxes[1]);

		// Click "Accept Selected"
		const acceptSelectedButton = screen.getByRole('button', { name: /Accept Selected \(1\)/ });
		await user.click(acceptSelectedButton);

		// Wait for API call and onComplete callback
		await waitFor(() => {
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('accepts all suggestions', async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();
		const onClose = vi.fn();

		// Mock API response for each face assignment
		mockResponse(/\/api\/v1\/faces\/faces\/.*\/assign/, {});

		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose,
				onComplete
			}
		});

		// Click "Accept All"
		const acceptAllButton = screen.getByRole('button', { name: /Accept All/ });
		await user.click(acceptAllButton);

		// Wait for all API calls and callbacks
		await waitFor(() => {
			expect(onComplete).toHaveBeenCalled();
		});

		// Dialog should close after accepting all
		await waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
	});

	it('handles API errors gracefully when accepting suggestions', async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();

		// Mock API error
		mockResponse(/\/api\/v1\/faces\/faces\/.*\/assign/, {}, 500);

		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose: vi.fn(),
				onComplete
			}
		});

		// Click "Accept All"
		const acceptAllButton = screen.getByRole('button', { name: /Accept All/ });
		await user.click(acceptAllButton);

		// Wait for processing to complete (error handling happens silently with toast)
		await waitFor(() => {
			// onComplete should still be called even if some fail
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('displays similarity scores as percentages', () => {
		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose: vi.fn(),
				onComplete: vi.fn()
			}
		});

		// Check that scores are formatted as percentages
		expect(screen.getByText('95.0%')).toBeInTheDocument(); // 0.95 * 100
		expect(screen.getByText('87.0%')).toBeInTheDocument(); // 0.87 * 100
		expect(screen.getByText('81.0%')).toBeInTheDocument(); // 0.81 * 100
	});

	it('calls onClose when Done button is clicked', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(CentroidResultsDialog, {
			props: {
				open: true,
				personId: mockPersonId,
				personName: mockPersonName,
				suggestions: mockSuggestions,
				onClose,
				onComplete: vi.fn()
			}
		});

		const doneButton = screen.getByRole('button', { name: /Done/ });
		await user.click(doneButton);

		expect(onClose).toHaveBeenCalled();
	});
});
