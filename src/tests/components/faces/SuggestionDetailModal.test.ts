import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SuggestionDetailModal from '$lib/components/faces/SuggestionDetailModal.svelte';
import type { FaceSuggestion } from '$lib/api/faces';
import { resetMocks } from '../../helpers/mockFetch';

/**
 * SuggestionDetailModal Tests
 *
 * Tests the face suggestion detail modal component:
 * - Display suggestion metadata (person name, confidence, status, dates)
 * - Display face bounding boxes on full image
 * - Accept/Reject actions for pending suggestions
 * - Modal close behavior (ESC key, backdrop click, close button)
 */
describe('SuggestionDetailModal', () => {
	const createMockSuggestion = (
		overrides: Partial<FaceSuggestion> = {}
	): FaceSuggestion => ({
		id: 1,
		faceInstanceId: 'face-1',
		suggestedPersonId: 'person-1',
		confidence: 0.85,
		sourceFaceId: 'face-source-1',
		status: 'pending',
		createdAt: '2024-12-19T10:00:00Z',
		reviewedAt: null,
		faceThumbnailUrl: 'http://localhost:8000/api/v1/images/1/face_thumb/face-1',
		personName: 'John Doe',
		fullImageUrl: 'http://localhost:8000/api/v1/images/1/full',
		bboxX: 100,
		bboxY: 150,
		bboxW: 80,
		bboxH: 100,
		detectionConfidence: 0.92,
		qualityScore: 0.88,
		...overrides
	});

	const mockOnClose = vi.fn();
	const mockOnAccept = vi.fn();
	const mockOnReject = vi.fn();

	beforeEach(() => {
		resetMocks();
		mockOnClose.mockClear();
		mockOnAccept.mockClear();
		mockOnReject.mockClear();
	});

	it('renders suggestion details correctly', () => {
		const suggestion = createMockSuggestion();

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		// Verify header
		expect(screen.getByRole('dialog', { name: /Face Suggestion Details/i })).toBeInTheDocument();

		// Verify person name
		expect(screen.getByText('John Doe')).toBeInTheDocument();

		// Verify confidence
		expect(screen.getByText('85%')).toBeInTheDocument(); // Main confidence

		// Verify status badge
		expect(screen.getByText('pending')).toBeInTheDocument();

		// Verify additional metadata
		expect(screen.getByText('Detection Confidence:')).toBeInTheDocument();
		expect(screen.getByText('92%')).toBeInTheDocument();

		expect(screen.getByText('Quality Score:')).toBeInTheDocument();
		expect(screen.getByText('88%')).toBeInTheDocument();
	});

	it('displays Accept/Reject buttons for pending suggestions', () => {
		const suggestion = createMockSuggestion({ status: 'pending' });

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument();
	});

	it('hides Accept/Reject buttons for accepted suggestions', () => {
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

		expect(screen.queryByRole('button', { name: /Accept/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Reject/i })).not.toBeInTheDocument();

		// Should show reviewed date
		expect(screen.getByText('Reviewed:')).toBeInTheDocument();
	});

	it('calls onAccept when Accept button is clicked', async () => {
		const suggestion = createMockSuggestion();

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		const acceptButton = screen.getByRole('button', { name: /Accept/i });
		await fireEvent.click(acceptButton);

		expect(mockOnAccept).toHaveBeenCalledWith(suggestion);
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('calls onReject when Reject button is clicked', async () => {
		const suggestion = createMockSuggestion();

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		const rejectButton = screen.getByRole('button', { name: /Reject/i });
		await fireEvent.click(rejectButton);

		expect(mockOnReject).toHaveBeenCalledWith(suggestion);
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('closes modal when close button is clicked', async () => {
		const suggestion = createMockSuggestion();

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		const closeButton = screen.getByRole('button', { name: /Close modal/i });
		await fireEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalled();
	});

	it('closes modal when ESC key is pressed', async () => {
		const suggestion = createMockSuggestion();

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(mockOnClose).toHaveBeenCalled();
	});

	it('closes modal when backdrop is clicked', async () => {
		const suggestion = createMockSuggestion();

		const { container } = render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		const backdrop = container.querySelector('.modal-backdrop');
		expect(backdrop).toBeInTheDocument();

		if (backdrop) {
			await fireEvent.click(backdrop);
			expect(mockOnClose).toHaveBeenCalled();
		}
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

	it('displays image with bounding box when bbox data is available', () => {
		const suggestion = createMockSuggestion();

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		// The ImageWithFaceBoundingBoxes component should be present
		const imageContainer = screen.getByRole('dialog').querySelector('.image-container');
		expect(imageContainer).toBeInTheDocument();
	});

	it('falls back to plain image when no bbox data', () => {
		const suggestion = createMockSuggestion({
			bboxX: null,
			bboxY: null,
			bboxW: null,
			bboxH: null
		});

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		// Should show fallback image
		const img = screen.getByAltText(/Face for John Doe/i);
		expect(img).toBeInTheDocument();
	});

	it('shows placeholder when no image URL', () => {
		const suggestion = createMockSuggestion({
			fullImageUrl: null,
			faceThumbnailUrl: null
		});

		render(SuggestionDetailModal, {
			suggestion,
			onClose: mockOnClose,
			onAccept: mockOnAccept,
			onReject: mockOnReject
		});

		// Should show placeholder SVG
		const placeholder = screen.getByRole('dialog').querySelector('.image-placeholder');
		expect(placeholder).toBeInTheDocument();
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

		const acceptButton = screen.getByRole('button', { name: /Accept/i });
		const rejectButton = screen.getByRole('button', { name: /Reject/i });

		await fireEvent.click(acceptButton);

		// Both buttons should be disabled during loading
		expect(acceptButton).toBeDisabled();
		expect(rejectButton).toBeDisabled();
	});
});
