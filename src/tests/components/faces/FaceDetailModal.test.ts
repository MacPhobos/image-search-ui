import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FaceDetailModal from '$lib/components/faces/FaceDetailModal.svelte';
import type { FaceInGroupResponse, FaceInstance } from '$lib/api/faces';
import { mockResponse, mockError, resetMocks } from '../../helpers/mockFetch';
import { createFaceInGroup } from '../../helpers/fixtures';

// Mock thumbnailCache module
vi.mock('$lib/stores/thumbnailCache.svelte', () => ({
	thumbnailCache: {
		get: vi.fn(() => undefined),
		isPending: vi.fn(() => false),
		has: vi.fn(() => false),
		fetchBatch: vi.fn(),
		clear: vi.fn(),
		state: { cache: new Map(), pending: new Set(), error: null }
	}
}));

/**
 * FaceDetailModal Tests
 *
 * Tests the face detail modal used in the "Suggested New Persons" tab.
 * Displays a full image with bounding boxes highlighting detected faces,
 * the selected face highlighted differently, and a sidebar with face info.
 */
describe('FaceDetailModal', () => {
	const mockOnClose = vi.fn();

	// Helper to create a face with stable IDs (rather than random UUIDs)
	function createTestFace(overrides?: Partial<FaceInGroupResponse>): FaceInGroupResponse {
		return createFaceInGroup({
			faceInstanceId: 'face-inst-1',
			assetId: '42',
			qualityScore: 0.82,
			detectionConfidence: 0.95,
			bboxX: 100,
			bboxY: 150,
			bboxW: 80,
			bboxH: 90,
			...overrides
		});
	}

	function createMockAllFaces(): FaceInstance[] {
		return [
			{
				id: 'face-inst-1', // Primary / selected face
				assetId: 42,
				bbox: { x: 100, y: 150, width: 80, height: 90 },
				detectionConfidence: 0.95,
				qualityScore: 0.82,
				clusterId: null,
				personId: null,
				personName: null,
				createdAt: '2025-01-10T10:00:00Z'
			},
			{
				id: 'face-inst-2', // Unknown face
				assetId: 42,
				bbox: { x: 300, y: 200, width: 70, height: 80 },
				detectionConfidence: 0.88,
				qualityScore: 0.65,
				clusterId: null,
				personId: null,
				personName: null,
				createdAt: '2025-01-10T10:00:00Z'
			},
			{
				id: 'face-inst-3', // Assigned face
				assetId: 42,
				bbox: { x: 500, y: 100, width: 60, height: 70 },
				detectionConfidence: 0.92,
				qualityScore: 0.78,
				clusterId: 'cluster-abc',
				personId: 'person-uuid-1',
				personName: 'Jane Doe',
				createdAt: '2025-01-10T10:00:00Z'
			}
		];
	}

	beforeEach(() => {
		resetMocks();
		mockOnClose.mockClear();

		// Default API mock for faces in asset
		mockResponse('http://localhost:8000/api/v1/faces/assets/42', {
			items: createMockAllFaces(),
			total: 3,
			page: 1,
			pageSize: 100
		});
	});

	// ============ Rendering Tests ============

	describe('Rendering', () => {
		it('does not render modal content when face is null', () => {
			const { container } = render(FaceDetailModal, {
				props: { face: null, onClose: mockOnClose }
			});

			// Dialog should not be open - no dialog role element
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			// No sidebar or face detail content
			expect(container.querySelector('.face-sidebar')).not.toBeInTheDocument();
		});

		it('renders modal content when face is provided', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Dialog should be open
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			// Title should be present
			expect(screen.getByText('Face Detail')).toBeInTheDocument();

			// Asset ID should be shown
			expect(screen.getByText(/Asset #42/)).toBeInTheDocument();
		});

		it('shows face details in sidebar', () => {
			const face = createTestFace({
				qualityScore: 0.82,
				detectionConfidence: 0.95
			});

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Sidebar should be present
			const sidebar = screen.getByRole('complementary', { name: 'Face details' });
			expect(sidebar).toBeInTheDocument();

			// Quality Score should be displayed (0.82 -> 0.820)
			expect(screen.getByText('Quality Score')).toBeInTheDocument();
			expect(screen.getByText('0.820')).toBeInTheDocument();

			// Detection Confidence should be displayed (0.95 -> 95.0%)
			expect(screen.getByText('Detection Confidence')).toBeInTheDocument();
			expect(screen.getByText('95.0%')).toBeInTheDocument();

			// Bounding Box info
			expect(screen.getByText('Bounding Box')).toBeInTheDocument();

			// Face ID (truncated)
			expect(screen.getByText('Face ID')).toBeInTheDocument();
		});

		it('shows face count after faces load', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Wait for faces to load and count to appear
			await waitFor(() => {
				expect(screen.getByText(/3 faces detected/)).toBeInTheDocument();
			});
		});

		it('shows singular "face" for count of 1', async () => {
			const face = createTestFace();

			mockResponse('http://localhost:8000/api/v1/faces/assets/42', {
				items: [createMockAllFaces()[0]],
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			await waitFor(() => {
				expect(screen.getByText(/1 face detected/)).toBeInTheDocument();
			});
		});

		it('shows "Selected Face" heading in sidebar', () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			expect(screen.getByText('Selected Face')).toBeInTheDocument();
		});

		it('displays face ID truncated with ellipsis', () => {
			const face = createTestFace({ faceInstanceId: 'abcdef12-3456-7890-abcd-ef1234567890' });

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Should show first 8 characters followed by ...
			expect(screen.getByText('abcdef12...')).toBeInTheDocument();
		});

		it('handles null quality score gracefully', () => {
			const face = createTestFace({ qualityScore: null as unknown as number });

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Should show '--' for null quality
			const dashes = screen.getAllByText('--');
			expect(dashes.length).toBeGreaterThan(0);
		});
	});

	// ============ Modal Close Tests ============

	describe('Modal Close', () => {
		it('calls onClose when close button clicked', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// shadcn Dialog renders a close button with data-dialog-close
			const closeButton = document.querySelector('[data-dialog-close]');
			expect(closeButton).toBeInTheDocument();

			if (closeButton) {
				await fireEvent.click(closeButton);
				await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
			}
		});

		it('calls onClose on Escape key', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			const dialog = screen.getByRole('dialog');
			await fireEvent.keyDown(dialog, { key: 'Escape' });

			await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
		});

		it('does not close when clicking inside modal content', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			const dialog = screen.getByRole('dialog');
			await fireEvent.click(dialog);

			expect(mockOnClose).not.toHaveBeenCalled();
		});
	});

	// ============ API Fetch Tests ============

	describe('Faces for Asset', () => {
		it('fetches faces for asset when opened', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Verify API call was made
			await waitFor(() => {
				expect(globalThis.fetch).toHaveBeenCalledWith(
					'http://localhost:8000/api/v1/faces/assets/42',
					expect.anything()
				);
			});
		});

		it('shows loading state while faces are being fetched', () => {
			const face = createTestFace();

			// Override the default mock with a never-resolving promise to keep the loading state
			// We need to install a custom fetch that returns a pending promise for the faces endpoint
			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn(async (url: string | Request) => {
				const urlString = typeof url === 'string' ? url : url.toString();
				if (urlString.includes('/faces/assets/')) {
					// Return a promise that never resolves to keep loading state
					return new Promise(() => {});
				}
				return originalFetch(url);
			}) as typeof fetch;

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			expect(screen.getByText('Loading faces...')).toBeInTheDocument();
		});

		it('shows error message when face fetch fails', async () => {
			const face = createTestFace();

			mockError('http://localhost:8000/api/v1/faces/assets/42', 500, {
				detail: 'Server error'
			});

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			await waitFor(() => {
				expect(screen.getByText(/Failed to load faces|Server error/i)).toBeInTheDocument();
			});
		});

		it('shows all faces list after successful load', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			await waitFor(() => {
				// "All Faces (3)" heading
				expect(screen.getByText('All Faces (3)')).toBeInTheDocument();
			});

			// Primary face label
			const selectedLabels = screen.getAllByText('Selected Face');
			expect(selectedLabels.length).toBeGreaterThan(0);

			// Assigned face shows person name
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();

			// Unknown face
			expect(screen.getByText('Unknown')).toBeInTheDocument();
		});

		it('shows quality scores in face list', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			await waitFor(() => {
				expect(screen.getByText('All Faces (3)')).toBeInTheDocument();
			});

			// Quality scores formatted as "Q: X.XXX"
			expect(screen.getByText('Q: 0.820')).toBeInTheDocument();
			expect(screen.getByText('Q: 0.650')).toBeInTheDocument();
			expect(screen.getByText('Q: 0.780')).toBeInTheDocument();
		});
	});

	// ============ Face List Interaction Tests ============

	describe('Face List Interactions', () => {
		it('toggles highlight when face list item clicked', async () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			await waitFor(() => {
				expect(screen.getByText('All Faces (3)')).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');

			// Find face list buttons
			const faceListButtons = dialog.querySelectorAll('.face-list-item');
			expect(faceListButtons.length).toBe(3);

			// Click the second face to highlight it
			await fireEvent.click(faceListButtons[1]);

			// It should have the highlighted class
			expect(faceListButtons[1].classList.contains('highlighted')).toBe(true);

			// Click again to un-highlight
			await fireEvent.click(faceListButtons[1]);
			expect(faceListButtons[1].classList.contains('highlighted')).toBe(false);
		});
	});

	// ============ Edge Cases ============

	describe('Edge Cases', () => {
		it('handles non-numeric assetId gracefully', () => {
			const face = createTestFace({ assetId: 'not-a-number' });

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Modal should still render without crashing
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			// Image should show placeholder since assetId is not a valid number
			const dialog = screen.getByRole('dialog');
			const placeholder = dialog.querySelector('.image-placeholder');
			expect(placeholder).toBeInTheDocument();
		});

		it('cleans up pending requests on unmount', async () => {
			const face = createTestFace();

			const { unmount } = render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			// Unmount before requests complete
			unmount();

			// Should not cause errors - no assertions needed, just verify no crashes
		});

		it('does not fetch faces when face is null', () => {
			render(FaceDetailModal, {
				props: { face: null, onClose: mockOnClose }
			});

			// fetch should not have been called for faces API
			const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
			const facesCalls = fetchMock.mock.calls.filter(
				(call: [string, ...unknown[]]) =>
					typeof call[0] === 'string' && call[0].includes('/faces/assets/')
			);
			expect(facesCalls.length).toBe(0);
		});
	});

	// ============ Accessibility Tests ============

	describe('Accessibility', () => {
		it('has proper ARIA attributes on modal', () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			const dialog = screen.getByRole('dialog');
			expect(dialog).toHaveAttribute('aria-modal', 'true');
			expect(dialog).toHaveAttribute('aria-labelledby');
		});

		it('has accessible sidebar label', () => {
			const face = createTestFace();

			render(FaceDetailModal, {
				props: { face, onClose: mockOnClose }
			});

			const sidebar = screen.getByRole('complementary', { name: 'Face details' });
			expect(sidebar).toBeInTheDocument();
		});
	});
});
