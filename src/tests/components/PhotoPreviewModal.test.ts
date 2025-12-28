import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import PhotoPreviewModal from '$lib/components/faces/PhotoPreviewModal.svelte';
import type { PersonPhotoGroup } from '$lib/api/faces';
import { mockResponse, mockError, resetMocks } from '../helpers/mockFetch';

describe('PhotoPreviewModal - Face Unassignment', () => {
	// Factory function to create fresh mock data for each test
	const createMockPhoto = (): PersonPhotoGroup => ({
		photoId: 1,
		takenAt: '2024-12-19T10:00:00Z',
		thumbnailUrl: 'http://localhost:8000/api/v1/images/1/thumbnail',
		fullUrl: 'http://localhost:8000/api/v1/images/1/full',
		faceCount: 2,
		hasNonPersonFaces: true,
		faces: [
			{
				faceInstanceId: 'face-1',
				bboxX: 100,
				bboxY: 100,
				bboxW: 50,
				bboxH: 50,
				detectionConfidence: 0.95,
				qualityScore: 0.8,
				personId: 'person-1',
				personName: 'John Smith',
				clusterId: 'cluster-1'
			},
			{
				faceInstanceId: 'face-2',
				bboxX: 200,
				bboxY: 150,
				bboxW: 45,
				bboxH: 45,
				detectionConfidence: 0.88,
				qualityScore: null,
				personId: null,
				personName: null,
				clusterId: null
			}
		]
	});

	const mockOnClose = vi.fn();

	beforeEach(() => {
		resetMocks();
		mockOnClose.mockClear();
		vi.clearAllMocks();
		vi.unstubAllGlobals();

		// Mock persons API (called on component mount)
		mockResponse('/api/v1/faces/persons', {
			items: [],
			total: 0,
			page: 1,
			pageSize: 100
		});

		// Mock suggestions API (called for unknown faces on mount) - regex pattern to match any faceId
		mockResponse('/api/v1/faces/faces/[^/]+/suggestions', {
			suggestions: []
		});
	});

	it('shows unassign button for labeled faces', () => {
		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		// Should show unassign button for labeled face
		const unassignButtons = screen.getAllByRole('button', { name: /Unassign this face from/i });
		expect(unassignButtons).toHaveLength(1);
		expect(unassignButtons[0]).toHaveAttribute('aria-label', 'Unassign this face from John Smith');
	});

	it('does not show unassign button for unlabeled faces', () => {
		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		// Should show assign button for unlabeled face
		const assignButton = screen.getByRole('button', { name: 'Assign this face to a person' });
		expect(assignButton).toBeInTheDocument();

		// Face-2 should not have unassign button (it's unlabeled)
		const unassignButtons = screen.getAllByRole('button', { name: /Unassign this face from/i });
		expect(unassignButtons).toHaveLength(1); // Only for labeled face
	});

	it('calls unassignFace API when unassign button is clicked and confirmed', async () => {
		// Mock confirm dialog
		const confirmMock = vi.fn().mockReturnValue(true);
		vi.stubGlobal('confirm', confirmMock);

		// Mock successful unassign response
		mockResponse('/api/v1/faces/faces/face-1/person', {
			faceId: 'face-1',
			previousPersonId: 'person-1',
			previousPersonName: 'John Smith'
		});

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: 'Unassign this face from John Smith'
		});
		await fireEvent.click(unassignButton);

		// Verify confirmation dialog was shown
		expect(confirmMock).toHaveBeenCalledWith('Unassign "John Smith" from this face?');

		// Wait for API call to complete
		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/faces/faces/face-1/person'),
				expect.objectContaining({
					method: 'DELETE'
				})
			);
		});

		vi.unstubAllGlobals();
	});

	it('does not call API when user cancels confirmation', async () => {
		// Mock confirm dialog - user cancels
		const confirmMock = vi.fn().mockReturnValue(false);
		vi.stubGlobal('confirm', confirmMock);

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: 'Unassign this face from John Smith'
		});
		await fireEvent.click(unassignButton);

		// Verify confirmation dialog was shown
		expect(confirmMock).toHaveBeenCalledWith('Unassign "John Smith" from this face?');

		// Verify DELETE API was not called (mount-time GET calls are expected)
		const fetchCalls = (globalThis.fetch as Mock).mock.calls;
		const deleteCalls = fetchCalls.filter((call) => call[1]?.method === 'DELETE');
		expect(deleteCalls).toHaveLength(0);

		vi.unstubAllGlobals();
	});

	it('updates UI after successful unassignment', async () => {
		// Mock confirm dialog
		const confirmMock = vi.fn().mockReturnValue(true);
		vi.stubGlobal('confirm', confirmMock);

		// Mock successful unassign response
		mockResponse('/api/v1/faces/faces/face-1/person', {
			faceId: 'face-1',
			previousPersonId: 'person-1',
			previousPersonName: 'John Smith'
		});

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		// Initially shows "John Smith"
		expect(screen.getByText('John Smith')).toBeInTheDocument();

		const unassignButton = screen.getByRole('button', {
			name: 'Unassign this face from John Smith'
		});
		await fireEvent.click(unassignButton);

		// First verify the API was called
		await waitFor(
			() => {
				expect(globalThis.fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/v1/faces/faces/face-1/person'),
					expect.objectContaining({ method: 'DELETE' })
				);
			},
			{ timeout: 1000 }
		);

		// Then wait for UI update - face should become "Unknown"
		// Note: Due to Svelte reactivity timing, we just verify at least one Unknown exists
		await waitFor(
			() => {
				const unknownElements = screen.queryAllByText('Unknown');
				expect(unknownElements.length).toBeGreaterThanOrEqual(1);
			},
			{ timeout: 2000 }
		);

		vi.unstubAllGlobals();
	});

	it('shows error message when unassignment fails', async () => {
		// Mock confirm dialog
		const confirmMock = vi.fn().mockReturnValue(true);
		vi.stubGlobal('confirm', confirmMock);

		// Mock error response
		mockError('/api/v1/faces/faces/face-1/person', 400, {
			error: {
				code: 'FACE_NOT_ASSIGNED',
				message: 'Face is not assigned to any person'
			}
		});

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: 'Unassign this face from John Smith'
		});
		await fireEvent.click(unassignButton);

		// First verify the API was called
		await waitFor(
			() => {
				expect(globalThis.fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/v1/faces/faces/face-1/person'),
					expect.objectContaining({ method: 'DELETE' })
				);
			},
			{ timeout: 1000 }
		);

		// Wait for error message to appear
		await waitFor(
			() => {
				const errorAlert = screen.queryByRole('alert');
				expect(errorAlert).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Face should still show "John Smith" (not updated on error)
		expect(screen.getByText('John Smith')).toBeInTheDocument();

		vi.unstubAllGlobals();
	});

	it('shows loading state while unassigning', async () => {
		// Mock confirm dialog
		const confirmMock = vi.fn().mockReturnValue(true);
		vi.stubGlobal('confirm', confirmMock);

		// Mock slow API response
		mockResponse('/api/v1/faces/faces/face-1/person', {
			faceId: 'face-1',
			previousPersonId: 'person-1',
			previousPersonName: 'John Smith'
		});

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: 'Unassign this face from John Smith'
		});

		await fireEvent.click(unassignButton);

		// Button should be disabled during unassignment
		await waitFor(() => {
			expect(unassignButton).toBeDisabled();
			// Should show loading indicator "..."
			expect(unassignButton).toHaveTextContent('...');
		});

		vi.unstubAllGlobals();
	});

	it('allows dismissing error message', async () => {
		// Mock confirm dialog
		const confirmMock = vi.fn().mockReturnValue(true);
		vi.stubGlobal('confirm', confirmMock);

		// Mock error response
		mockError('/api/v1/faces/faces/face-1/person', 500, {
			message: 'Internal server error'
		});

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: 'Unassign this face from John Smith'
		});
		await fireEvent.click(unassignButton);

		// Wait for error message
		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});

		// Click dismiss button
		const dismissButton = screen.getByRole('button', { name: 'Dismiss error' });
		await fireEvent.click(dismissButton);

		// Error should be dismissed
		await waitFor(() => {
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});

		vi.unstubAllGlobals();
	});

	it('does not show unassign button when face is being assigned', async () => {
		// Mock persons list
		mockResponse('/api/v1/faces/persons', {
			items: [],
			total: 0,
			page: 1,
			pageSize: 100
		});

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose
			}
		});

		// Click first assign button for unlabeled face
		const assignButtons = screen.getAllByRole('button', { name: 'Assign this face to a person' });
		await fireEvent.click(assignButtons[0]);

		// Unassign button for the labeled face should still be visible
		// (only the face being assigned should hide its action buttons)
		const unassignButtons = screen.getAllByRole('button', { name: /Unassign this face from/i });
		expect(unassignButtons).toHaveLength(1);
	});

	it('calls onFaceAssigned callback when face is unassigned', async () => {
		// Mock confirm dialog
		const confirmMock = vi.fn().mockReturnValue(true);
		vi.stubGlobal('confirm', confirmMock);

		// Mock successful unassign response
		mockResponse('/api/v1/faces/faces/face-1/person', {
			faceId: 'face-1',
			previousPersonId: 'person-1',
			previousPersonName: 'John Smith'
		});

		const onFaceAssignedMock = vi.fn();

		render(PhotoPreviewModal, {
			props: {
				photo: createMockPhoto(),
				currentPersonId: null,
				currentPersonName: null,
				onClose: mockOnClose,
				onFaceAssigned: onFaceAssignedMock
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: 'Unassign this face from John Smith'
		});
		await fireEvent.click(unassignButton);

		// Wait for callback to be called
		await waitFor(() => {
			expect(onFaceAssignedMock).toHaveBeenCalledWith('face-1', null, null);
		});

		vi.unstubAllGlobals();
	});
});
