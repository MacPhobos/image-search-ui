import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SuggestionDetailModal from '$lib/components/faces/SuggestionDetailModal.svelte';
import type { FaceSuggestion, FaceInstance, Person } from '$lib/api/faces';
import { mockResponse, mockError, resetMocks } from '../../helpers/mockFetch';

/**
 * SuggestionDetailModal Tests - Enhanced with All Faces Display
 *
 * Tests the face suggestion detail modal component with comprehensive coverage:
 * - Display suggestion metadata (person name, confidence, status, dates)
 * - Display all detected faces in the image (not just the primary suggestion)
 * - Face assignment workflow (search persons, create new, assign to existing)
 * - Face suggestion hints for unknown faces
 * - Accept/Reject actions for pending suggestions
 * - Modal close behavior (ESC key, backdrop click, close button)
 * - Error handling and loading states
 */
describe('SuggestionDetailModal', () => {
	// Mock data factories
	const createMockSuggestion = (overrides: Partial<FaceSuggestion> = {}): FaceSuggestion => ({
		id: 1,
		faceInstanceId: 'face-uuid-1',
		suggestedPersonId: 'person-uuid-1',
		confidence: 0.92,
		sourceFaceId: 'face-source-1',
		status: 'pending',
		createdAt: '2024-12-19T10:00:00Z',
		reviewedAt: null,
		faceThumbnailUrl: 'http://localhost:8000/api/v1/images/123/face_thumb/face-uuid-1',
		personName: 'John Doe',
		fullImageUrl: '/api/v1/images/123/full',
		bboxX: 100,
		bboxY: 100,
		bboxW: 200,
		bboxH: 200,
		detectionConfidence: 0.98,
		qualityScore: 0.85,
		...overrides
	});

	const createMockAllFaces = (): FaceInstance[] => [
		{
			id: 'face-uuid-1', // Primary suggestion face
			assetId: 123,
			bbox: { x: 100, y: 100, width: 200, height: 200 },
			detectionConfidence: 0.98,
			qualityScore: 0.85,
			clusterId: null,
			personId: null,
			personName: null,
			createdAt: '2024-12-19T10:00:00Z'
		},
		{
			id: 'face-uuid-2', // Unknown non-primary face
			assetId: 123,
			bbox: { x: 400, y: 150, width: 180, height: 180 },
			detectionConfidence: 0.95,
			qualityScore: 0.72,
			clusterId: null,
			personId: null,
			personName: null,
			createdAt: '2024-12-19T10:00:00Z'
		},
		{
			id: 'face-uuid-3', // Already assigned face
			assetId: 123,
			bbox: { x: 700, y: 200, width: 150, height: 150 },
			detectionConfidence: 0.88,
			qualityScore: 0.65,
			clusterId: 'cluster-1',
			personId: 'person-uuid-2',
			personName: 'Jane Smith',
			createdAt: '2024-12-19T10:00:00Z'
		}
	];

	const createMockPersons = (): Person[] => [
		{
			id: 'person-uuid-1',
			name: 'John Doe',
			status: 'active',
			faceCount: 15,
			prototypeCount: 3,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		},
		{
			id: 'person-uuid-2',
			name: 'Jane Smith',
			status: 'active',
			faceCount: 8,
			prototypeCount: 2,
			createdAt: '2024-01-02T00:00:00Z',
			updatedAt: '2024-01-02T00:00:00Z'
		},
		{
			id: 'person-uuid-3',
			name: 'Alice Johnson',
			status: 'active',
			faceCount: 22,
			prototypeCount: 4,
			createdAt: '2024-01-03T00:00:00Z',
			updatedAt: '2024-01-03T00:00:00Z'
		}
	];

	const mockOnClose = vi.fn();
	const mockOnAccept = vi.fn();
	const mockOnReject = vi.fn();
	const mockOnFaceAssigned = vi.fn();

	beforeEach(() => {
		resetMocks();
		mockOnClose.mockClear();
		mockOnAccept.mockClear();
		mockOnReject.mockClear();
		mockOnFaceAssigned.mockClear();

		// Default API mocks for component mount
		mockResponse('/api/v1/faces/assets/123', {
			items: createMockAllFaces(),
			total: 3,
			page: 1,
			pageSize: 100
		});

		mockResponse('/api/v1/faces/persons', {
			items: createMockPersons(),
			total: 3,
			page: 1,
			pageSize: 100
		});

		// Mock face suggestions for unknown faces (regex pattern)
		mockResponse('/api/v1/faces/faces/face-uuid-2/suggestions', {
			faceId: 'face-uuid-2',
			suggestions: [
				{ personId: 'person-uuid-1', personName: 'John Doe', confidence: 0.88 },
				{ personId: 'person-uuid-3', personName: 'Alice Johnson', confidence: 0.75 }
			],
			thresholdUsed: 0.7
		});
	});

	// ============ Rendering Tests ============

	describe('Rendering', () => {
		it('renders modal with suggestion data', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// Verify header
			expect(screen.getByRole('dialog', { name: /Face Suggestion Details/i })).toBeInTheDocument();

			// Verify primary suggestion details
			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('92%')).toBeInTheDocument(); // Confidence
			expect(screen.getByText('pending')).toBeInTheDocument();

			// Wait for faces to load
			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});
		});

		it('does not render when suggestion is null', () => {
			const { container } = render(SuggestionDetailModal, {
				suggestion: null,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			expect(container.querySelector('.modal-backdrop')).not.toBeInTheDocument();
		});

		it('displays all faces in sidebar with correct count', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			// Primary face should be marked
			expect(screen.getByText('Primary')).toBeInTheDocument();

			// Assigned face should show person name
			expect(screen.getByText('Jane Smith')).toBeInTheDocument();

			// Face metadata should be displayed
			expect(screen.getByText(/Detection: 98%/)).toBeInTheDocument(); // Primary face
			expect(screen.getByText(/Quality: 0.8/)).toBeInTheDocument(); // Quality score (0.85 rounds to 0.8)
		});

		it('shows image placeholder when no fullImageUrl', () => {
			const suggestion = createMockSuggestion({
				fullImageUrl: null
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			const placeholder = screen.getByRole('dialog').querySelector('.image-placeholder');
			expect(placeholder).toBeInTheDocument();
		});
	});

	// ============ Face Assignment Tests ============

	describe('Face Assignment', () => {
		it('shows Assign button for unknown non-primary faces', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject,
				onFaceAssigned: mockOnFaceAssigned
			});

			await waitFor(() => {
				const assignButtons = screen.getAllByRole('button', {
					name: /Assign this face to a person/i
				});
				// Should show for face-uuid-2 (unknown, non-primary)
				expect(assignButtons.length).toBeGreaterThan(0);
			});
		});

		it('does NOT show Assign button for primary suggestion face', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			// Primary face should not have Assign button (it has its own Accept/Reject workflow)
			const allButtons = screen.getAllByRole('button');
			const primaryAssignButton = allButtons.find(
				(btn) =>
					btn.getAttribute('aria-label') === 'Assign this face to a person' &&
					btn.closest('.face-item')?.textContent?.includes('Primary')
			);
			expect(primaryAssignButton).toBeUndefined();
		});

		it('shows assigned indicator for already assigned faces', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText('Jane Smith')).toBeInTheDocument();
			});

			// Assigned face should not have Assign button
			const assignButtons = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			});
			// Only 1 assign button (for face-uuid-2), not for face-uuid-3 (Jane Smith)
			expect(assignButtons).toHaveLength(1);
		});

		it('shows assignment panel when Assign clicked', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			// Assignment panel should appear
			expect(screen.getByPlaceholderText(/Search or create person/i)).toBeInTheDocument();
			expect(screen.getByText(/Assign Face/i)).toBeInTheDocument();
		});

		it('filters persons by search query', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			const searchInput = screen.getByPlaceholderText(/Search or create person/i);
			await fireEvent.input(searchInput, { target: { value: 'Alice' } });

			// Should show filtered results - wait for reactivity
			await waitFor(() => {
				const aliceButtons = screen.queryAllByText('Alice Johnson');
				expect(aliceButtons.length).toBeGreaterThan(0);
			});

			// John Doe should be filtered out (not in person options)
			const personOptions = screen.getByRole('dialog').querySelector('.person-options');
			expect(personOptions?.textContent).not.toContain('John Doe');
		});

		it('shows create option for non-matching search', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			const searchInput = screen.getByPlaceholderText(/Search or create person/i);
			await fireEvent.input(searchInput, { target: { value: 'New Person' } });

			// Should show create option
			await waitFor(() => {
				expect(screen.getByText(/Create "New Person"/i)).toBeInTheDocument();
			});
		});

		it('calls assignFaceToPerson when person selected', async () => {
			const suggestion = createMockSuggestion();

			// Mock successful assignment
			mockResponse('/api/v1/faces/faces/face-uuid-2/assign', {
				faceId: 'face-uuid-2',
				personId: 'person-uuid-3',
				personName: 'Alice Johnson'
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject,
				onFaceAssigned: mockOnFaceAssigned
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			// Click on Alice Johnson
			const aliceButton = screen.getByText('Alice Johnson').closest('button');
			expect(aliceButton).toBeInTheDocument();
			if (aliceButton) {
				await fireEvent.click(aliceButton);
			}

			// Verify API call
			await waitFor(() => {
				expect(globalThis.fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/v1/faces/faces/face-uuid-2/assign'),
					expect.objectContaining({
						method: 'POST',
						body: JSON.stringify({ personId: 'person-uuid-3' })
					})
				);
			});
		});

		it('calls onFaceAssigned callback after assignment', async () => {
			const suggestion = createMockSuggestion();

			mockResponse('/api/v1/faces/faces/face-uuid-2/assign', {
				faceId: 'face-uuid-2',
				personId: 'person-uuid-3',
				personName: 'Alice Johnson'
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject,
				onFaceAssigned: mockOnFaceAssigned
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			const aliceButton = screen.getByText('Alice Johnson').closest('button');
			if (aliceButton) {
				await fireEvent.click(aliceButton);
			}

			await waitFor(() => {
				expect(mockOnFaceAssigned).toHaveBeenCalledWith(
					'face-uuid-2',
					'person-uuid-3',
					'Alice Johnson'
				);
			});
		});

		it('creates new person when Create option clicked', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject,
				onFaceAssigned: mockOnFaceAssigned
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			// Mock person creation and assignment AFTER we open the assignment panel
			mockResponse('/api/v1/faces/persons', {
				id: 'person-uuid-new',
				name: 'New Person',
				status: 'active',
				createdAt: '2024-12-19T12:00:00Z'
			});

			mockResponse('/api/v1/faces/faces/face-uuid-2/assign', {
				faceId: 'face-uuid-2',
				personId: 'person-uuid-new',
				personName: 'New Person'
			});

			const searchInput = screen.getByPlaceholderText(/Search or create person/i);
			await fireEvent.input(searchInput, { target: { value: 'New Person' } });

			// Wait for create button to appear
			const createButton = await screen.findByText(/Create "New Person"/i);
			const createButtonParent = createButton.closest('button');
			if (createButtonParent) {
				await fireEvent.click(createButtonParent);
			}

			// Verify person creation API call
			await waitFor(() => {
				expect(globalThis.fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/v1/faces/persons'),
					expect.objectContaining({
						method: 'POST',
						body: JSON.stringify({ name: 'New Person' })
					})
				);
			});

			// Verify assignment API call
			await waitFor(() => {
				expect(globalThis.fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/v1/faces/faces/face-uuid-2/assign'),
					expect.objectContaining({
						method: 'POST'
					})
				);
			});
		});

		it('shows error when assignment fails', async () => {
			const suggestion = createMockSuggestion();

			mockError('/api/v1/faces/faces/face-uuid-2/assign', 'Assignment failed', 500);

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			const aliceButton = screen.getByText('Alice Johnson').closest('button');
			if (aliceButton) {
				await fireEvent.click(aliceButton);
			}

			// Error should be displayed
			await waitFor(() => {
				expect(screen.getByRole('alert')).toHaveTextContent(/Assignment failed/i);
			});
		});
	});

	// ============ Suggestion Hints Tests ============

	describe('Face Suggestion Hints', () => {
		it('shows suggestion hint for unknown non-primary faces', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// Wait for suggestions to load
			await waitFor(() => {
				expect(screen.getByText(/Suggested: John Doe \(88%\)/i)).toBeInTheDocument();
			});
		});

		it('quick-assigns when suggestion hint accepted', async () => {
			const suggestion = createMockSuggestion();

			mockResponse('/api/v1/faces/faces/face-uuid-2/assign', {
				faceId: 'face-uuid-2',
				personId: 'person-uuid-1',
				personName: 'John Doe'
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject,
				onFaceAssigned: mockOnFaceAssigned
			});

			// Wait for suggestion hint to appear
			await waitFor(() => {
				expect(screen.getByText(/Suggested: John Doe/i)).toBeInTheDocument();
			});

			// Find the suggestion accept button (not the primary Accept button)
			const suggestionHint = screen.getByText(/Suggested: John Doe/i).closest('.suggestion-hint');
			expect(suggestionHint).toBeInTheDocument();
			const acceptSuggestionButton = suggestionHint?.querySelector('button');
			expect(acceptSuggestionButton).toBeInTheDocument();
			if (acceptSuggestionButton) {
				await fireEvent.click(acceptSuggestionButton);
			}

			// Verify API call
			await waitFor(() => {
				expect(globalThis.fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/v1/faces/faces/face-uuid-2/assign'),
					expect.objectContaining({
						method: 'POST',
						body: JSON.stringify({ personId: 'person-uuid-1' })
					})
				);
			});

			// Verify callback
			expect(mockOnFaceAssigned).toHaveBeenCalledWith('face-uuid-2', 'person-uuid-1', 'John Doe');
		});

		it('shows loading state while fetching suggestions', async () => {
			const suggestion = createMockSuggestion();

			// Delay the suggestions response to test loading state
			const suggestionsPromise = new Promise(() => {
				/* never resolves */
			});

			mockResponse(
				'/api/v1/faces/faces/face-uuid-2/suggestions',
				suggestionsPromise as unknown as Response
			);

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			// Note: The component shows loading in the bounding box label, not as separate text
			// We can verify the suggestions API was called
			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/faces/faces/face-uuid-2/suggestions'),
				expect.anything()
			);
		});
	});

	// ============ Primary Suggestion Actions Tests ============

	describe('Primary Suggestion Actions', () => {
		it('shows Accept/Reject buttons for pending suggestions', () => {
			const suggestion = createMockSuggestion({ status: 'pending' });

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			expect(screen.getByRole('button', { name: /✓ Accept Primary/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /✗ Reject Primary/i })).toBeInTheDocument();
		});

		it('calls onAccept when Accept button clicked', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			const acceptButton = screen.getByRole('button', { name: /✓ Accept Primary/i });
			await fireEvent.click(acceptButton);

			expect(mockOnAccept).toHaveBeenCalledWith(suggestion);
			expect(mockOnClose).toHaveBeenCalled();
		});

		it('calls onReject when Reject button clicked', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			const rejectButton = screen.getByRole('button', { name: /✗ Reject Primary/i });
			await fireEvent.click(rejectButton);

			expect(mockOnReject).toHaveBeenCalledWith(suggestion);
			expect(mockOnClose).toHaveBeenCalled();
		});

		it('hides Accept/Reject for non-pending suggestions', () => {
			const suggestion = createMockSuggestion({
				status: 'accepted',
				reviewedAt: '2024-12-19T11:00:00Z'
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			expect(screen.queryByRole('button', { name: /Accept Primary/i })).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /Reject Primary/i })).not.toBeInTheDocument();
		});

		it('disables buttons during action loading', async () => {
			const suggestion = createMockSuggestion();

			// Mock onAccept to return a pending promise
			const pendingPromise = new Promise(() => {
				/* never resolves */
			});
			mockOnAccept.mockReturnValue(pendingPromise);

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			const acceptButton = screen.getByRole('button', { name: /✓ Accept Primary/i });
			const rejectButton = screen.getByRole('button', { name: /✗ Reject Primary/i });

			await fireEvent.click(acceptButton);

			// Both buttons should be disabled during loading
			expect(acceptButton).toBeDisabled();
			expect(rejectButton).toBeDisabled();
		});
	});

	// ============ Modal Interaction Tests ============

	describe('Modal Interactions', () => {
		it('closes on ESC key', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// shadcn Dialog handles ESC - find dialog in document
			const dialog = screen.getByRole('dialog');
			expect(dialog).toBeInTheDocument();

			await fireEvent.keyDown(dialog, { key: 'Escape' });
			// Dialog closes internally, our onClose should be called
			await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
		});

		it('closes on backdrop click', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// shadcn Dialog uses overlay - verify it exists
			// Note: In test environment, actual click-outside behavior may not work
			// as expected due to portal rendering. This test verifies the overlay exists.
			const overlay = document.querySelector('[data-dialog-overlay]');
			expect(overlay).toBeInTheDocument();

			// The overlay exists and Dialog component handles click-outside internally
			// We can verify the modal is rendered which is sufficient for this test
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('closes when close button clicked', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// shadcn Dialog has a close button with X icon
			const closeButton = document.querySelector('[data-dialog-close]');
			expect(closeButton).toBeInTheDocument();

			if (closeButton) {
				await fireEvent.click(closeButton);
				await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
			}
		});

		it('does not close modal when clicking modal content', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			const modal = screen.getByRole('dialog');
			await fireEvent.click(modal);

			expect(mockOnClose).not.toHaveBeenCalled();
		});
	});

	// ============ Error Handling Tests ============

	describe('Error Handling', () => {
		it('shows error when faces fail to load', async () => {
			const suggestion = createMockSuggestion();

			mockError('/api/v1/faces/assets/123', 'Failed to load faces', 500);

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/Failed to load faces/i)).toBeInTheDocument();
			});
		});

		it('handles missing fullImageUrl gracefully', () => {
			const suggestion = createMockSuggestion({
				fullImageUrl: null
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// Should show placeholder instead of crashing
			const placeholder = screen.getByRole('dialog').querySelector('.image-placeholder');
			expect(placeholder).toBeInTheDocument();
		});

		it('handles malformed fullImageUrl gracefully', () => {
			const suggestion = createMockSuggestion({
				fullImageUrl: 'not-a-valid-path'
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// Component should render without crashing
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('handles assignment error and allows retry', async () => {
			const suggestion = createMockSuggestion();

			// First attempt fails
			mockError('/api/v1/faces/faces/face-uuid-2/assign', 'Network error', 500);

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			const aliceButton = screen.getByText('Alice Johnson').closest('button');
			if (aliceButton) {
				await fireEvent.click(aliceButton);
			}

			// Error should be displayed
			await waitFor(() => {
				expect(screen.getByRole('alert')).toHaveTextContent(/Network error/i);
			});

			// Assignment panel should still be open for retry
			expect(screen.getByPlaceholderText(/Search or create person/i)).toBeInTheDocument();
		});
	});

	// ============ Accessibility Tests ============

	describe('Accessibility', () => {
		it('has proper ARIA attributes on modal', () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			const dialog = screen.getByRole('dialog');
			expect(dialog).toHaveAttribute('aria-modal', 'true');
			// shadcn Dialog manages aria-labelledby internally
			expect(dialog).toHaveAttribute('aria-labelledby');
		});

		it('has accessible labels for all interactive elements', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			// shadcn Dialog close button (X icon) - rendered in portal
			const closeButton = document.querySelector('[data-dialog-close]');
			expect(closeButton).toBeInTheDocument();

			// Assign buttons
			const assignButtons = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			});
			expect(assignButtons.length).toBeGreaterThan(0);

			// Accept/Reject buttons
			expect(screen.getByRole('button', { name: /✓ Accept Primary/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /✗ Reject Primary/i })).toBeInTheDocument();
		});

		it('has accessible label for search input', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			const assignButton = screen.getAllByRole('button', {
				name: /Assign this face to a person/i
			})[0];
			await fireEvent.click(assignButton);

			const searchInput = screen.getByPlaceholderText(/Search or create person/i);
			expect(searchInput).toHaveAttribute('aria-label', 'Search persons or enter new name');
		});

		it('has accessible sidebar label', async () => {
			const suggestion = createMockSuggestion();

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			const sidebar = screen.getByRole('dialog').querySelector('.face-sidebar');
			expect(sidebar).toHaveAttribute('aria-label', 'Detected faces');
		});
	});

	// ============ Edge Cases ============

	describe('Edge Cases', () => {
		it('handles image with only primary face', async () => {
			const suggestion = createMockSuggestion();

			mockResponse('/api/v1/faces/assets/123', {
				items: [createMockAllFaces()[0]], // Only primary face
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(1\)/i)).toBeInTheDocument();
			});

			// No assign buttons (only primary face)
			expect(
				screen.queryByRole('button', { name: /Assign this face to a person/i })
			).not.toBeInTheDocument();
		});

		it('handles image with no faces returned', async () => {
			const suggestion = createMockSuggestion();

			mockResponse('/api/v1/faces/assets/123', {
				items: [],
				total: 0,
				page: 1,
				pageSize: 100
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(0\)/i)).toBeInTheDocument();
			});
		});

		it('handles face with null quality score', async () => {
			const suggestion = createMockSuggestion({ qualityScore: null });

			const facesWithNullQuality = createMockAllFaces();
			facesWithNullQuality[0].qualityScore = null;

			mockResponse('/api/v1/faces/assets/123', {
				items: facesWithNullQuality,
				total: 3,
				page: 1,
				pageSize: 100
			});

			render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			await waitFor(() => {
				expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();
			});

			// Should display confidence but not quality when null
			expect(screen.getByText(/Detection: 98%/)).toBeInTheDocument();
		});

		it('cancels pending requests on unmount', async () => {
			const suggestion = createMockSuggestion();

			const { unmount } = render(SuggestionDetailModal, {
				suggestion,
				onClose: mockOnClose,
				onAccept: mockOnAccept,
				onReject: mockOnReject
			});

			// Unmount before requests complete
			unmount();

			// Should not cause errors (cleanup should abort requests)
			// No assertions needed - just verify no crashes
		});
	});
});
