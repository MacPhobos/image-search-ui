import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import VectorsPage from '../../routes/vectors/+page.svelte';
import type { Mock } from 'vitest';
import {
	createDirectoryStatsResponse,
	createDeletionLogsResponse,
	createMultipleDirectories,
	createMultipleDeletionLogs,
	createCategoryResponse,
	createMultipleCategories
} from '../helpers/fixtures';

// Mock the vectors API module
vi.mock('$lib/api/vectors', () => ({
	getDirectoryStats: vi.fn(),
	getDeletionLogs: vi.fn(),
	deleteVectorsByDirectory: vi.fn(),
	retrainDirectory: vi.fn(),
	cleanupOrphanVectors: vi.fn(),
	resetCollection: vi.fn()
}));

// Mock the categories API module
vi.mock('$lib/api/categories', () => ({
	getCategories: vi.fn()
}));

import {
	getDirectoryStats,
	getDeletionLogs,
	deleteVectorsByDirectory,
	retrainDirectory,
	cleanupOrphanVectors,
	resetCollection
} from '$lib/api/vectors';

import { getCategories } from '$lib/api/categories';

describe('Vectors Management Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock for categories
		(getCategories as Mock).mockResolvedValue(createCategoryResponse(createMultipleCategories(3)));

		// Default mocks for vector APIs
		(getDirectoryStats as Mock).mockResolvedValue(
			createDirectoryStatsResponse(createMultipleDirectories(2))
		);
		(getDeletionLogs as Mock).mockResolvedValue(
			createDeletionLogsResponse(createMultipleDeletionLogs(3))
		);
	});

	it('renders page title and subtitle', async () => {
		render(VectorsPage);

		expect(screen.getByText('Vector Management')).toBeInTheDocument();
		expect(screen.getByText(/manage qdrant vector database/i)).toBeInTheDocument();
	});

	it('shows directory statistics section', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText('Directory Statistics')).toBeInTheDocument();
		});
	});

	it('displays total vector count', async () => {
		render(VectorsPage);

		await waitFor(() => {
			// 50 + 100 from createMultipleDirectories(2)
			expect(screen.getByText(/total vectors: 150/i)).toBeInTheDocument();
		});
	});

	it('shows directory stats table with data', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
			expect(screen.getByText(/dir-2/i)).toBeInTheDocument();
		});
	});

	it('shows danger zone section', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /cleanup orphans/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /reset collection/i })).toBeInTheDocument();
		});
	});

	it('shows deletion logs section', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText('Deletion History')).toBeInTheDocument();
		});
	});

	it('displays deletion logs table with data', async () => {
		render(VectorsPage);

		await waitFor(() => {
			// Check for deletion type labels from the mock data (use getAllByText for duplicates)
			const directoryElements = screen.getAllByText('Directory');
			expect(directoryElements.length).toBeGreaterThan(0);
			const sessionElements = screen.getAllByText('Session');
			expect(sessionElements.length).toBeGreaterThan(0);
		});
	});

	it('opens delete modal when delete button clicked', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
		await fireEvent.click(deleteButtons[0]);

		// Modal should appear
		expect(screen.getByText('Delete Directory Vectors')).toBeInTheDocument();
		expect(screen.getByText(/are you sure you want to delete all vectors/i)).toBeInTheDocument();
	});

	it('opens retrain modal when retrain button clicked', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
		});

		const retrainButtons = screen.getAllByRole('button', { name: /^retrain$/i });
		await fireEvent.click(retrainButtons[0]);

		// Modal should appear
		await waitFor(() => {
			expect(screen.getByText('Retrain Directory')).toBeInTheDocument();
		});
	});

	it('deletes directory vectors on confirmation', async () => {
		(deleteVectorsByDirectory as Mock).mockResolvedValue({
			pathPrefix: '/photos/dir-1',
			vectorsDeleted: 50,
			message: 'Deleted 50 vectors'
		});

		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
		});

		// Click delete button
		const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
		await fireEvent.click(deleteButtons[0]);

		// Confirm in modal
		const confirmButton = screen.getByRole('button', { name: /delete vectors/i });
		await fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(deleteVectorsByDirectory).toHaveBeenCalledWith({
				pathPrefix: '/photos/dir-1',
				deletionReason: undefined,
				confirm: true
			});
		});
	});

	it('reloads data after successful deletion', async () => {
		(deleteVectorsByDirectory as Mock).mockResolvedValue({
			pathPrefix: '/photos/dir-1',
			vectorsDeleted: 50,
			message: 'Deleted 50 vectors'
		});

		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
		});

		// Clear previous calls
		vi.clearAllMocks();
		(getDirectoryStats as Mock).mockResolvedValue(
			createDirectoryStatsResponse(createMultipleDirectories(1))
		);
		(getDeletionLogs as Mock).mockResolvedValue(
			createDeletionLogsResponse(createMultipleDeletionLogs(4))
		);

		// Click delete and confirm
		const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
		await fireEvent.click(deleteButtons[0]);
		const confirmButton = screen.getByRole('button', { name: /delete vectors/i });
		await fireEvent.click(confirmButton);

		// Should reload stats and logs
		await waitFor(() => {
			expect(getDirectoryStats).toHaveBeenCalled();
			expect(getDeletionLogs).toHaveBeenCalled();
		});
	});

	it('opens orphan cleanup modal when cleanup button clicked', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /cleanup orphans/i })).toBeInTheDocument();
		});

		const cleanupButton = screen.getByRole('button', { name: /cleanup orphans/i });
		await fireEvent.click(cleanupButton);

		// Modal should appear (use getAllByText since text appears in both DangerZone and modal)
		const modalTitles = screen.getAllByText('Cleanup Orphan Vectors');
		expect(modalTitles.length).toBeGreaterThan(1); // One in DangerZone, one in modal
	});

	it('opens reset modal when reset button clicked', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /reset collection/i })).toBeInTheDocument();
		});

		const resetButton = screen.getByRole('button', { name: /reset collection/i });
		await fireEvent.click(resetButton);

		// Modal should appear
		expect(screen.getByText('Reset Vector Collection')).toBeInTheDocument();
		// Text appears in both DangerZone and modal, so use getAllByText
		const deleteTexts = screen.getAllByText(/delete all vectors from the collection/i);
		expect(deleteTexts.length).toBeGreaterThan(1);
	});

	it('requires confirmation text for reset operation', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /reset collection/i })).toBeInTheDocument();
		});

		const resetButton = screen.getByRole('button', { name: /reset collection/i });
		await fireEvent.click(resetButton);

		// Should show confirmation input
		expect(screen.getByLabelText(/type.*delete all vectors.*to confirm/i)).toBeInTheDocument();
	});

	it('shows error message when stats loading fails', async () => {
		(getDirectoryStats as Mock).mockRejectedValue(new Error('Failed to load stats'));

		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('Failed to load stats');
		});
	});

	it('dismisses error message when dismiss button clicked', async () => {
		(getDirectoryStats as Mock).mockRejectedValue(new Error('Failed to load stats'));

		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});

		const dismissButton = screen.getByRole('button', { name: /dismiss/i });
		await fireEvent.click(dismissButton);

		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('loads directory stats on mount', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(getDirectoryStats).toHaveBeenCalledTimes(1);
		});
	});

	it('loads deletion logs on mount', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(getDeletionLogs).toHaveBeenCalledWith(1, 10);
		});
	});

	it('closes delete modal on cancel', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
		await fireEvent.click(deleteButtons[0]);

		// Modal should be visible
		expect(screen.getByText('Delete Directory Vectors')).toBeInTheDocument();

		// Click cancel
		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		// Modal should close
		await waitFor(() => {
			expect(screen.queryByText('Delete Directory Vectors')).not.toBeInTheDocument();
		});
	});

	it('closes retrain modal on cancel', async () => {
		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
		});

		const retrainButtons = screen.getAllByRole('button', { name: /^retrain$/i });
		await fireEvent.click(retrainButtons[0]);

		await waitFor(() => {
			expect(screen.getByText('Retrain Directory')).toBeInTheDocument();
		});

		// Click cancel
		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await fireEvent.click(cancelButton);

		// Modal should close
		await waitFor(() => {
			expect(screen.queryByText('Retrain Directory')).not.toBeInTheDocument();
		});
	});

	it('handles empty directory stats gracefully', async () => {
		(getDirectoryStats as Mock).mockResolvedValue(createDirectoryStatsResponse([]));

		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/no directories with vectors found/i)).toBeInTheDocument();
		});
	});

	it('handles empty deletion logs gracefully', async () => {
		(getDeletionLogs as Mock).mockResolvedValue(createDeletionLogsResponse([]));

		render(VectorsPage);

		await waitFor(() => {
			expect(screen.getByText(/no deletion history found/i)).toBeInTheDocument();
		});
	});
});
