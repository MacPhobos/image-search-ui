import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FaceListSidebar from '$lib/components/faces/FaceListSidebar.svelte';
import type { FaceInstance, FaceSuggestionItem } from '$lib/api/faces';

/**
 * Test helper: Create a FaceInstance with defaults
 */
function createFaceInstance(overrides?: Partial<FaceInstance>): FaceInstance {
	const id = overrides?.id ?? 'face-uuid-1';

	return {
		id,
		assetId: 1,
		bbox: { x: 10, y: 10, width: 50, height: 50 },
		detectionConfidence: 0.95,
		qualityScore: 8.5,
		clusterId: null,
		personId: null,
		personName: null,
		createdAt: '2024-12-19T10:00:00Z',
		...overrides
	};
}

/**
 * Test helper: Create a face suggestion item
 */
function createFaceSuggestion(
	overrides?: Partial<FaceSuggestionItem>
): FaceSuggestionItem {
	return {
		personId: 'person-uuid-1',
		personName: 'John Doe',
		confidence: 0.85,
		...overrides
	};
}

describe('FaceListSidebar', () => {
	const mockOnFaceClick = vi.fn();
	const mockOnAssignClick = vi.fn();
	const mockOnUnassignClick = vi.fn();
	const mockOnPinClick = vi.fn();
	const mockOnSuggestionAccept = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders list of faces with correct count', () => {
		const faces = [
			createFaceInstance({ id: 'face-1', personName: 'Alice' }),
			createFaceInstance({ id: 'face-2', personName: 'Bob' }),
			createFaceInstance({ id: 'face-3', personName: null })
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick
			}
		});

		expect(screen.getByText('Faces (3)')).toBeInTheDocument();
	});

	it('renders face with person name when assigned', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick
			}
		});

		expect(screen.getByText('Alice Smith')).toBeInTheDocument();
	});

	it('renders "Unknown" for unassigned faces', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personName: null
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick
			}
		});

		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});

	it('shows "Assign" button for unknown faces when onAssignClick provided', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personName: null
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick,
				onAssignClick: mockOnAssignClick
			}
		});

		const assignButton = screen.getByRole('button', { name: /assign this face/i });
		expect(assignButton).toBeInTheDocument();
	});

	it('clicking "Assign" button triggers onAssignClick callback', async () => {
		const faces = [
			createFaceInstance({
				id: 'face-123',
				personName: null
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick,
				onAssignClick: mockOnAssignClick
			}
		});

		const assignButton = screen.getByRole('button', { name: /assign this face/i });
		await fireEvent.click(assignButton);

		expect(mockOnAssignClick).toHaveBeenCalledWith('face-123');
		expect(mockOnAssignClick).toHaveBeenCalledTimes(1);
	});

	it('shows unassign button for assigned faces when showUnassignButton is true', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personId: 'person-1',
				personName: 'Alice Smith'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick,
				onUnassignClick: mockOnUnassignClick,
				showUnassignButton: true
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: /unassign this face from alice smith/i
		});
		expect(unassignButton).toBeInTheDocument();
	});

	it('clicking unassign button triggers onUnassignClick callback', async () => {
		const faces = [
			createFaceInstance({
				id: 'face-456',
				personId: 'person-1',
				personName: 'Alice Smith'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick,
				onUnassignClick: mockOnUnassignClick,
				showUnassignButton: true
			}
		});

		const unassignButton = screen.getByRole('button', {
			name: /unassign this face from alice smith/i
		});
		await fireEvent.click(unassignButton);

		expect(mockOnUnassignClick).toHaveBeenCalledWith('face-456');
		expect(mockOnUnassignClick).toHaveBeenCalledTimes(1);
	});

	it('clicking face card triggers onFaceClick callback', async () => {
		const faces = [
			createFaceInstance({
				id: 'face-789',
				personName: 'Bob Jones'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick
			}
		});

		const faceButton = screen.getByRole('button', { name: /highlight face of bob jones/i });
		await fireEvent.click(faceButton);

		expect(mockOnFaceClick).toHaveBeenCalledWith('face-789');
		expect(mockOnFaceClick).toHaveBeenCalledTimes(1);
	});

	it('highlights face when highlightedFaceId matches', () => {
		const faces = [
			createFaceInstance({ id: 'face-1', personName: 'Alice' }),
			createFaceInstance({ id: 'face-2', personName: 'Bob' })
		];

		const { container } = render(FaceListSidebar, {
			props: {
				faces,
				highlightedFaceId: 'face-2',
				onFaceClick: mockOnFaceClick
			}
		});

		// Check that the highlighted class is applied
		const highlightedItems = container.querySelectorAll('.face-item.highlighted');
		expect(highlightedItems).toHaveLength(1);
	});

	it('shows primary badge when primaryFaceId matches', () => {
		const faces = [
			createFaceInstance({ id: 'face-1', personName: 'Alice' }),
			createFaceInstance({ id: 'face-2', personName: 'Bob' })
		];

		render(FaceListSidebar, {
			props: {
				faces,
				primaryFaceId: 'face-1',
				onFaceClick: mockOnFaceClick
			}
		});

		expect(screen.getByText('Primary')).toBeInTheDocument();
	});

	it('shows suggestion accept button when suggestions are available', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personName: null // Unknown face
			})
		];

		const faceSuggestions = new Map([
			[
				'face-1',
				{
					suggestions: [createFaceSuggestion({ personName: 'Suggested Person', confidence: 0.9 })],
					loading: false,
					error: null
				}
			]
		]);

		const { container } = render(FaceListSidebar, {
			props: {
				faces,
				faceSuggestions,
				showSuggestions: true,
				onFaceClick: mockOnFaceClick,
				onSuggestionAccept: mockOnSuggestionAccept
			}
		});

		expect(screen.getByText(/suggested: suggested person/i)).toBeInTheDocument();
		expect(screen.getByText(/90%/)).toBeInTheDocument();

		// Accept button might not have proper accessible name, use container query
		const acceptButton = container.querySelector('button[title="Accept suggestion"]');
		expect(acceptButton).toBeInTheDocument();
	});

	it('clicking suggestion accept button triggers onSuggestionAccept callback', async () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personName: null
			})
		];

		const faceSuggestions = new Map([
			[
				'face-1',
				{
					suggestions: [
						createFaceSuggestion({
							personId: 'person-123',
							personName: 'Suggested Person',
							confidence: 0.9
						})
					],
					loading: false,
					error: null
				}
			]
		]);

		const { container } = render(FaceListSidebar, {
			props: {
				faces,
				faceSuggestions,
				showSuggestions: true,
				onFaceClick: mockOnFaceClick,
				onSuggestionAccept: mockOnSuggestionAccept
			}
		});

		const acceptButton = container.querySelector('button[title="Accept suggestion"]');
		expect(acceptButton).toBeInTheDocument();
		await fireEvent.click(acceptButton!);

		expect(mockOnSuggestionAccept).toHaveBeenCalledWith(
			'face-1',
			'person-123',
			'Suggested Person'
		);
		expect(mockOnSuggestionAccept).toHaveBeenCalledTimes(1);
	});

	it('does not show suggestions for assigned faces', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personId: 'person-1',
				personName: 'Alice' // Already assigned
			})
		];

		const faceSuggestions = new Map([
			[
				'face-1',
				{
					suggestions: [createFaceSuggestion()],
					loading: false,
					error: null
				}
			]
		]);

		render(FaceListSidebar, {
			props: {
				faces,
				faceSuggestions,
				showSuggestions: true,
				onFaceClick: mockOnFaceClick,
				onSuggestionAccept: mockOnSuggestionAccept
			}
		});

		// Suggestion hint should not be shown for assigned faces
		expect(screen.queryByText(/suggested:/i)).not.toBeInTheDocument();
	});

	it('shows "Pin as Prototype" button for assigned faces when showPinButton is true', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personId: 'person-1',
				personName: 'Alice'
			})
		];

		const { container } = render(FaceListSidebar, {
			props: {
				faces,
				showPinButton: true,
				onFaceClick: mockOnFaceClick,
				onPinClick: mockOnPinClick
			}
		});

		const pinButton = container.querySelector('button[title="Pin this face as a prototype for the person"]');
		expect(pinButton).toBeInTheDocument();
		expect(pinButton?.textContent).toContain('Pin as Prototype');
	});

	it('clicking "Pin as Prototype" button triggers onPinClick callback', async () => {
		const faces = [
			createFaceInstance({
				id: 'face-999',
				personId: 'person-1',
				personName: 'Alice'
			})
		];

		const { container } = render(FaceListSidebar, {
			props: {
				faces,
				showPinButton: true,
				onFaceClick: mockOnFaceClick,
				onPinClick: mockOnPinClick
			}
		});

		const pinButton = container.querySelector('button[title="Pin this face as a prototype for the person"]');
		expect(pinButton).toBeInTheDocument();
		await fireEvent.click(pinButton!);

		expect(mockOnPinClick).toHaveBeenCalledWith('face-999');
		expect(mockOnPinClick).toHaveBeenCalledTimes(1);
	});

	it('displays detection confidence and quality score', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				detectionConfidence: 0.95,
				qualityScore: 8.5,
				personName: 'Alice'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick
			}
		});

		expect(screen.getByText(/IsFace: 95%/i)).toBeInTheDocument();
		expect(screen.getByText(/Quality: 8.5/i)).toBeInTheDocument();
	});

	it('handles null quality score gracefully', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				detectionConfidence: 0.95,
				qualityScore: null,
				personName: 'Alice'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick
			}
		});

		expect(screen.getByText(/IsFace: 95%/i)).toBeInTheDocument();
		// Quality score should not be shown
		expect(screen.queryByText(/Quality:/i)).not.toBeInTheDocument();
	});

	it('shows current badge when face belongs to current person', () => {
		const faces = [
			createFaceInstance({
				id: 'face-1',
				personId: 'current-person-id',
				personName: 'Alice'
			}),
			createFaceInstance({
				id: 'face-2',
				personId: 'other-person-id',
				personName: 'Bob'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				currentPersonId: 'current-person-id',
				onFaceClick: mockOnFaceClick
			}
		});

		expect(screen.getByText('(current)')).toBeInTheDocument();
	});

	it('applies different colors to each face based on index', () => {
		const faces = [
			createFaceInstance({ id: 'face-1', personName: 'Alice' }),
			createFaceInstance({ id: 'face-2', personName: 'Bob' }),
			createFaceInstance({ id: 'face-3', personName: 'Charlie' })
		];

		const { container } = render(FaceListSidebar, {
			props: {
				faces,
				onFaceClick: mockOnFaceClick
			}
		});

		const faceIndicators = container.querySelectorAll('.face-indicator');
		expect(faceIndicators).toHaveLength(3);

		// Each should have a background color (colors are set via inline styles)
		faceIndicators.forEach((indicator) => {
			expect(indicator).toHaveStyle({ backgroundColor: expect.any(String) });
		});
	});

	it('shows primaryFacePersonName for primary face when provided', () => {
		// Bug fix: In SuggestionDetailModal, the primary face should show the suggestion's
		// personName even when the face itself doesn't have personName yet
		const faces = [
			createFaceInstance({
				id: 'primary-face-id',
				personName: null // Face not yet assigned
			}),
			createFaceInstance({
				id: 'other-face-id',
				personName: null
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				primaryFaceId: 'primary-face-id',
				primaryFacePersonName: 'John Doe', // Provided from suggestion
				onFaceClick: mockOnFaceClick
			}
		});

		// Primary face should show "John Doe" instead of "Unknown"
		expect(screen.getByText('John Doe')).toBeInTheDocument();
		// Other face should still show "Unknown"
		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});

	it('falls back to face.personName when primaryFacePersonName not provided', () => {
		const faces = [
			createFaceInstance({
				id: 'primary-face-id',
				personName: 'Alice Smith'
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				primaryFaceId: 'primary-face-id',
				// primaryFacePersonName NOT provided
				onFaceClick: mockOnFaceClick
			}
		});

		// Should use face.personName
		expect(screen.getByText('Alice Smith')).toBeInTheDocument();
	});

	it('shows "Unknown" when primaryFacePersonName not provided and face has no personName', () => {
		const faces = [
			createFaceInstance({
				id: 'primary-face-id',
				personName: null
			})
		];

		render(FaceListSidebar, {
			props: {
				faces,
				primaryFaceId: 'primary-face-id',
				// primaryFacePersonName NOT provided
				onFaceClick: mockOnFaceClick
			}
		});

		// Should show "Unknown" as fallback
		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});
});
