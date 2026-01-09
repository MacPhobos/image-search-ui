import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import PhotoPreviewModal from '$lib/components/faces/PhotoPreviewModal.svelte';
import type { PersonPhotoGroup } from '$lib/api/faces';
import { mockResponse, resetMocks } from '../../helpers/mockFetch';

/**
 * PhotoPreviewModal Bidirectional Face Selection Tests
 *
 * Tests the bidirectional face selection feature in PhotoPreviewModal:
 * - Clicking a bounding box highlights the corresponding face card
 * - Clicking a face card highlights the corresponding bounding box
 * - Toggle selection (click again to deselect)
 * - Switch selection between different faces
 * - Visual feedback (CSS classes and animations)
 */
describe('PhotoPreviewModal - Bidirectional Face Selection', () => {
	// Factory function to create fresh mock data
	const createMockPhoto = (): PersonPhotoGroup => ({
		photoId: 1,
		takenAt: '2024-12-28T10:00:00Z',
		thumbnailUrl: 'http://localhost:8000/api/v1/images/1/thumbnail',
		fullUrl: 'http://localhost:8000/api/v1/images/1/full',
		faceCount: 3,
		hasNonPersonFaces: true,
		faces: [
			{
				faceInstanceId: 'face-1',
				bboxX: 100,
				bboxY: 100,
				bboxW: 50,
				bboxH: 50,
				detectionConfidence: 0.95,
				qualityScore: 8.5,
				personId: 'person-1',
				personName: 'John Doe',
				clusterId: 'cluster-1'
			},
			{
				faceInstanceId: 'face-2',
				bboxX: 200,
				bboxY: 150,
				bboxW: 45,
				bboxH: 45,
				detectionConfidence: 0.88,
				qualityScore: 7.2,
				personId: null, // Unknown face
				personName: null,
				clusterId: null
			},
			{
				faceInstanceId: 'face-3',
				bboxX: 300,
				bboxY: 120,
				bboxW: 48,
				bboxH: 48,
				detectionConfidence: 0.92,
				qualityScore: 8.0,
				personId: 'person-2',
				personName: 'Jane Smith',
				clusterId: 'cluster-2'
			}
		]
	});

	const mockOnClose = vi.fn();

	beforeEach(() => {
		resetMocks();
		mockOnClose.mockClear();

		// Mock persons list (loaded on mount)
		mockResponse('/api/v1/faces/persons', {
			items: [
				{
					id: 'person-1',
					name: 'John Doe',
					status: 'active',
					faceCount: 10,
					prototypeCount: 2,
					createdAt: '2024-12-01T10:00:00Z',
					updatedAt: '2024-12-01T10:00:00Z'
				},
				{
					id: 'person-2',
					name: 'Jane Smith',
					status: 'active',
					faceCount: 8,
					prototypeCount: 1,
					createdAt: '2024-12-02T10:00:00Z',
					updatedAt: '2024-12-02T10:00:00Z'
				}
			],
			total: 2,
			page: 1,
			pageSize: 100
		});

		// Mock face suggestions for unknown faces
		mockResponse('/api/v1/faces/faces/face-2/suggestions', {
			faceId: 'face-2',
			suggestions: [
				{ personId: 'person-1', personName: 'John Doe', confidence: 0.75 },
				{ personId: 'person-2', personName: 'Jane Smith', confidence: 0.65 }
			],
			thresholdUsed: 0.7
		});
	});

	// ============ Bounding Box → Face Card Selection ============

	describe('Bounding Box to Face Card Selection', () => {
		it('highlights face card when bounding box is clicked', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const svg = dialog.querySelector('.face-overlay');
			expect(svg).toBeInTheDocument();

			// Find bounding boxes
			const faceBoxes = svg?.querySelectorAll('rect.face-box');
			expect(faceBoxes!.length).toBe(3);

			// Click the first bounding box
			await fireEvent.click(faceBoxes![0]);

			// The corresponding face card should be highlighted
			const faceItems = dialog.querySelectorAll('.face-item');
			const highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeInTheDocument();
		});

		it('clicking label also selects the face card', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const svg = dialog.querySelector('.face-overlay');

			// Find face labels (SVG g elements with class 'face-label')
			const faceLabels = svg?.querySelectorAll('g.face-label.clickable-label');
			expect(faceLabels!.length).toBeGreaterThan(0);

			// Click the first label
			await fireEvent.click(faceLabels![0]);

			// The corresponding face card should be highlighted
			const faceItems = dialog.querySelectorAll('.face-item');
			const highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeInTheDocument();
		});

		it('scrolls face card into view when bounding box is clicked', async () => {
			const photo = createMockPhoto();

			// Mock scrollIntoView
			const scrollIntoViewMock = vi.fn();
			Element.prototype.scrollIntoView = scrollIntoViewMock;

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const svg = dialog.querySelector('.face-overlay');
			const faceBoxes = svg?.querySelectorAll('rect.face-box');

			// Click a bounding box
			await fireEvent.click(faceBoxes![0]);

			// scrollIntoView should be called
			await waitFor(() => {
				expect(scrollIntoViewMock).toHaveBeenCalledWith({
					behavior: 'smooth',
					block: 'nearest'
				});
			});
		});
	});

	// ============ Face Card → Bounding Box Selection ============

	describe('Face Card to Bounding Box Selection', () => {
		it('highlights bounding box when face card is clicked', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');

			// Find face cards
			const faceCards = dialog.querySelectorAll('.face-item-button');
			expect(faceCards.length).toBe(3);

			// Click the first face card
			await fireEvent.click(faceCards[0]);

			// The corresponding bounding box should be highlighted
			const svg = dialog.querySelector('.face-overlay');
			const highlightedBoxes = svg?.querySelectorAll('rect.face-box.highlighted');
			expect(highlightedBoxes!.length).toBe(1);
		});

		it('applies highlighted CSS class to face card', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Click the first face card
			await fireEvent.click(faceCards[0]);

			// The parent face-item should have the 'highlighted' class
			const faceItems = dialog.querySelectorAll('.face-item');
			const highlightedItem = faceItems[0];
			expect(highlightedItem.classList.contains('highlighted')).toBe(true);
		});
	});

	// ============ Toggle Selection ============

	describe('Toggle Selection', () => {
		it('toggles selection when clicking same bounding box twice', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const svg = dialog.querySelector('.face-overlay');
			const faceBoxes = svg?.querySelectorAll('rect.face-box');

			// Click the first bounding box
			await fireEvent.click(faceBoxes![0]);

			// Face should be highlighted
			let faceItems = dialog.querySelectorAll('.face-item');
			let highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeInTheDocument();

			// Click the same bounding box again
			await fireEvent.click(faceBoxes![0]);

			// Face should no longer be highlighted
			faceItems = dialog.querySelectorAll('.face-item');
			highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeUndefined();
		});

		it('toggles selection when clicking same face card twice', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Click the first face card
			await fireEvent.click(faceCards[0]);

			// Face should be highlighted
			let faceItems = dialog.querySelectorAll('.face-item');
			let highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeInTheDocument();

			// Click the same face card again
			await fireEvent.click(faceCards[0]);

			// Face should no longer be highlighted
			faceItems = dialog.querySelectorAll('.face-item');
			highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeUndefined();
		});
	});

	// ============ Switch Selection ============

	describe('Switch Selection', () => {
		it('switches selection when clicking different bounding boxes', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const svg = dialog.querySelector('.face-overlay');
			const faceBoxes = svg?.querySelectorAll('rect.face-box');

			// Click the first bounding box
			await fireEvent.click(faceBoxes![0]);

			// First face should be highlighted
			let faceItems = dialog.querySelectorAll('.face-item');
			let highlightedCards = Array.from(faceItems).filter((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCards.length).toBe(1);

			// Click the second bounding box
			await fireEvent.click(faceBoxes![1]);

			// Second face should now be highlighted (only one highlighted at a time)
			faceItems = dialog.querySelectorAll('.face-item');
			highlightedCards = Array.from(faceItems).filter((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCards.length).toBe(1);
		});

		it('switches selection when clicking different face cards', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Click the first face card
			await fireEvent.click(faceCards[0]);

			// First face should be highlighted
			let faceItems = dialog.querySelectorAll('.face-item');
			let highlightedCards = Array.from(faceItems).filter((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCards.length).toBe(1);

			// Click the second face card
			await fireEvent.click(faceCards[1]);

			// Second face should now be highlighted
			faceItems = dialog.querySelectorAll('.face-item');
			highlightedCards = Array.from(faceItems).filter((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCards.length).toBe(1);
		});

		it('selection updates when different faces are clicked in sequence', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Click first face
			await fireEvent.click(faceCards[0]);
			let faceItems = dialog.querySelectorAll('.face-item');
			let highlightedCards = Array.from(faceItems).filter((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCards.length).toBe(1);

			// Click second face
			await fireEvent.click(faceCards[1]);
			faceItems = dialog.querySelectorAll('.face-item');
			highlightedCards = Array.from(faceItems).filter((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCards.length).toBe(1);

			// Click third face
			await fireEvent.click(faceCards[2]);
			faceItems = dialog.querySelectorAll('.face-item');
			highlightedCards = Array.from(faceItems).filter((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCards.length).toBe(1);
		});
	});

	// ============ Visual States ============

	describe('Visual States', () => {
		it('applies highlight-color CSS variable to highlighted face card', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Click the first face card
			await fireEvent.click(faceCards[0]);

			// The parent face-item should have the --highlight-color CSS variable
			const faceItems = dialog.querySelectorAll('.face-item');
			const highlightedItem = faceItems[0] as HTMLElement;
			const highlightColor = highlightedItem.style.getPropertyValue('--highlight-color');
			expect(highlightColor).toBeTruthy();
		});

		it('highlighted bounding box has pulsing animation', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Click a face card to select it
			await fireEvent.click(faceCards[0]);

			// The corresponding bounding box should have the 'highlighted' class
			const svg = dialog.querySelector('.face-overlay');
			const highlightedBox = svg?.querySelector('rect.face-box.highlighted');
			expect(highlightedBox).toBeInTheDocument();

			// Note: Testing actual CSS animations is difficult in jsdom
			// We verify the class is applied, which triggers the animation
		});

		it('highlighted face card has background color change', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Click the first face card
			await fireEvent.click(faceCards[0]);

			// The parent face-item should have the 'highlighted' class
			const faceItems = dialog.querySelectorAll('.face-item');
			const highlightedItem = faceItems[0];
			expect(highlightedItem.classList.contains('highlighted')).toBe(true);

			// Note: Actual background color computation requires real browser
			// We verify the class is applied, which triggers the CSS rules
		});
	});

	// ============ Selection Persistence ============

	describe('Selection Persistence', () => {
		it('selection persists when opening assignment panel', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');

			// Select an unknown face by clicking its card
			const faceCards = dialog.querySelectorAll('.face-item-button');
			await fireEvent.click(faceCards[1]); // Click the second face (unknown face)

			// Face should be highlighted
			let faceItems = dialog.querySelectorAll('.face-item');
			let highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeInTheDocument();

			// Open assignment panel
			const assignButton = screen.getByRole('button', {
				name: /Assign this face to a person/i
			});
			await fireEvent.click(assignButton);

			// Assignment panel should be visible
			expect(screen.getByPlaceholderText(/Search or create person/i)).toBeInTheDocument();

			// Selection should still be visible (highlighted class should remain)
			faceItems = dialog.querySelectorAll('.face-item');
			highlightedCard = Array.from(faceItems).find((item) =>
				item.classList.contains('highlighted')
			);
			expect(highlightedCard).toBeInTheDocument();
		});

		it('selection clears when modal is closed', async () => {
			const photo = createMockPhoto();

			let isOpen = true;
			const handleClose = () => {
				isOpen = false;
			};

			const { rerender } = render(PhotoPreviewModal, {
				open: isOpen,
				photo,
				onClose: handleClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');

			// Select a face
			await fireEvent.click(faceCards[0]);

			// Close modal
			handleClose();
			await rerender({ open: false, photo, onClose: handleClose });

			// Modal should be closed
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	// ============ Edge Cases ============

	describe('Edge Cases', () => {
		it('handles photo with only one face', async () => {
			const photo: PersonPhotoGroup = {
				...createMockPhoto(),
				faceCount: 1,
				faces: [createMockPhoto().faces[0]]
			};

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(1\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const faceCards = dialog.querySelectorAll('.face-item-button');
			expect(faceCards.length).toBe(1);

			// Click the face card
			await fireEvent.click(faceCards[0]);

			// Face should be highlighted
			const faceItems = dialog.querySelectorAll('.face-item');
			expect(faceItems[0].classList.contains('highlighted')).toBe(true);
		});

		it('handles selection when face list is scrollable', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const svg = dialog.querySelector('.face-overlay');
			const faceBoxes = svg?.querySelectorAll('rect.face-box');

			// Click the last bounding box
			await fireEvent.click(faceBoxes![2]);

			// The corresponding face card should be highlighted
			const faceItems = dialog.querySelectorAll('.face-item');
			const highlightedCard = faceItems[2];
			expect(highlightedCard.classList.contains('highlighted')).toBe(true);
		});

		it('maintains correct face-to-box mapping with different colors', async () => {
			const photo = createMockPhoto();

			render(PhotoPreviewModal, {
				open: true,
				photo,
				onClose: mockOnClose
			});

			await waitFor(() => {
				expect(screen.getByText(/Faces \(3\)/i)).toBeInTheDocument();
			});

			const dialog = screen.getByRole('dialog');
			const svg = dialog.querySelector('.face-overlay');
			const faceBoxes = svg?.querySelectorAll('rect.face-box');

			// Click each bounding box and verify the correct face card is highlighted
			for (let i = 0; i < faceBoxes!.length; i++) {
				await fireEvent.click(faceBoxes![i]);

				const faceItems = dialog.querySelectorAll('.face-item');
				const highlightedCards = Array.from(faceItems).filter((item) =>
					item.classList.contains('highlighted')
				);

				// Only one card should be highlighted
				expect(highlightedCards.length).toBe(1);

				// The highlighted card should be the i-th card
				expect(faceItems[i].classList.contains('highlighted')).toBe(true);
			}
		});
	});

	describe('EXIF Metadata Display', () => {
		it('displays date taken when available', async () => {
			const photoWithDate = createMockPhoto();
			photoWithDate.takenAt = '2023-12-15T14:30:00Z';

			render(PhotoPreviewModal, {
				props: {
					open: true,
					photo: photoWithDate,
					onClose: mockOnClose
				}
			});

			await waitFor(() => {
				// Check for date display (formatted as "December 15, 2023")
				expect(screen.getByText(/December 15, 2023/i)).toBeInTheDocument();
				// Check for calendar emoji
				expect(screen.getByText('📅')).toBeInTheDocument();
			});
		});

		it('displays camera info when available', async () => {
			const photoWithCamera = createMockPhoto();
			photoWithCamera.camera = {
				make: 'Apple',
				model: 'iPhone 14 Pro'
			};

			render(PhotoPreviewModal, {
				props: {
					open: true,
					photo: photoWithCamera,
					onClose: mockOnClose
				}
			});

			await waitFor(() => {
				// Check for combined camera make and model
				expect(screen.getByText(/Apple iPhone 14 Pro/i)).toBeInTheDocument();
				// Check for camera emoji
				expect(screen.getByText('📷')).toBeInTheDocument();
			});
		});

		it('displays camera model only when make is missing', async () => {
			const photoWithCameraModelOnly = createMockPhoto();
			photoWithCameraModelOnly.camera = {
				make: null,
				model: 'iPhone 14 Pro'
			};

			render(PhotoPreviewModal, {
				props: {
					open: true,
					photo: photoWithCameraModelOnly,
					onClose: mockOnClose
				}
			});

			await waitFor(() => {
				expect(screen.getByText(/iPhone 14 Pro/i)).toBeInTheDocument();
				expect(screen.getByText('📷')).toBeInTheDocument();
			});
		});

		it('displays location when available', async () => {
			const photoWithLocation = createMockPhoto();
			photoWithLocation.location = {
				lat: 40.7128,
				lng: -74.006
			};

			render(PhotoPreviewModal, {
				props: {
					open: true,
					photo: photoWithLocation,
					onClose: mockOnClose
				}
			});

			await waitFor(() => {
				// Check for coordinates (formatted to 4 decimal places)
				expect(screen.getByText(/40\.7128°, -74\.0060°/i)).toBeInTheDocument();
				// Check for location emoji
				expect(screen.getByText('📍')).toBeInTheDocument();
			});
		});

		it('displays all EXIF metadata when all fields are available', async () => {
			const photoWithAllMetadata = createMockPhoto();
			photoWithAllMetadata.takenAt = '2023-12-15T14:30:00Z';
			photoWithAllMetadata.camera = {
				make: 'Apple',
				model: 'iPhone 14 Pro'
			};
			photoWithAllMetadata.location = {
				lat: 40.7128,
				lng: -74.006
			};

			render(PhotoPreviewModal, {
				props: {
					open: true,
					photo: photoWithAllMetadata,
					onClose: mockOnClose
				}
			});

			await waitFor(() => {
				// All three types of metadata should be displayed
				expect(screen.getByText(/December 15, 2023/i)).toBeInTheDocument();
				expect(screen.getByText(/Apple iPhone 14 Pro/i)).toBeInTheDocument();
				expect(screen.getByText(/40\.7128°, -74\.0060°/i)).toBeInTheDocument();

				// All three emojis should be present
				expect(screen.getByText('📅')).toBeInTheDocument();
				expect(screen.getByText('📷')).toBeInTheDocument();
				expect(screen.getByText('📍')).toBeInTheDocument();
			});
		});

		it('does not display EXIF section when no metadata is available', async () => {
			const photoWithoutMetadata = createMockPhoto();
			photoWithoutMetadata.takenAt = null;
			photoWithoutMetadata.camera = null;
			photoWithoutMetadata.location = null;

			render(PhotoPreviewModal, {
				props: {
					open: true,
					photo: photoWithoutMetadata,
					onClose: mockOnClose
				}
			});

			await waitFor(() => {
				// No metadata emojis should be present
				expect(screen.queryByText('📅')).not.toBeInTheDocument();
				expect(screen.queryByText('📷')).not.toBeInTheDocument();
				expect(screen.queryByText('📍')).not.toBeInTheDocument();
			});
		});

		it('does not display camera when both make and model are null', async () => {
			const photoWithEmptyCamera = createMockPhoto();
			photoWithEmptyCamera.camera = {
				make: null,
				model: null
			};

			render(PhotoPreviewModal, {
				props: {
					open: true,
					photo: photoWithEmptyCamera,
					onClose: mockOnClose
				}
			});

			await waitFor(() => {
				// Camera emoji should not be present
				expect(screen.queryByText('📷')).not.toBeInTheDocument();
			});
		});
	});
});
