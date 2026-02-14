import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import AssignGroupToPersonDialog from '$lib/components/faces/AssignGroupToPersonDialog.svelte';
import { createUnknownPersonCandidateGroup, createPerson } from '../../helpers/fixtures';
import { mockResponse, mockError, assertCalled } from '../../helpers/mockFetch';

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

describe('AssignGroupToPersonDialog', () => {
	const mockGroup = createUnknownPersonCandidateGroup({ groupId: 'test-group-1' });

	function renderDialog(propsOverrides?: Record<string, unknown>) {
		const defaultProps = {
			open: true,
			group: mockGroup,
			excludedFaceIds: [] as string[],
			onOpenChange: vi.fn(),
			onAccepted: vi.fn()
		};

		const props = { ...defaultProps, ...propsOverrides };

		return {
			...props,
			...render(AssignGroupToPersonDialog, { props })
		};
	}

	it('renders dialog title when open', () => {
		renderDialog();

		expect(screen.getByText('Assign Group to Person')).toBeInTheDocument();
	});

	it('renders face count in description', () => {
		renderDialog();

		// Group has 8 faces by default
		expect(screen.getByText(/8 faces/)).toBeInTheDocument();
	});

	it('renders singular "face" for count of 1', () => {
		const singleFaceGroup = createUnknownPersonCandidateGroup({
			faceCount: 1,
			sampleFaces: []
		});
		renderDialog({ group: singleFaceGroup });

		expect(screen.getByText(/1 face[^s]/)).toBeInTheDocument();
	});

	it('renders Choose Person button', () => {
		renderDialog();

		expect(screen.getByRole('button', { name: /Choose Person/i })).toBeInTheDocument();
	});

	it('renders Cancel button', () => {
		renderDialog();

		expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
	});

	it('calls onOpenChange(false) when Cancel clicked', async () => {
		const { onOpenChange } = renderDialog();

		const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
		await fireEvent.click(cancelBtn);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('renders group metadata (confidence and quality)', () => {
		renderDialog();

		expect(screen.getByText(/85%/)).toBeInTheDocument(); // cluster confidence
	});

	it('shows excluded face count in description when faces are excluded', () => {
		const group = createUnknownPersonCandidateGroup({ faceCount: 10 });
		const excludedFaceIds = [group.sampleFaces[0]?.faceInstanceId ?? 'face-0'];
		renderDialog({ group, excludedFaceIds });

		expect(screen.getByText(/9 faces/)).toBeInTheDocument();
		expect(screen.getByText(/1 face.*excluded/)).toBeInTheDocument();
	});

	it('renders face thumbnail previews', () => {
		renderDialog();

		// Face thumbnails are rendered as images
		const images = screen.getAllByRole('img');
		expect(images.length).toBeGreaterThan(0);
	});

	it('opens PersonPickerModal when Choose Person button clicked', async () => {
		// Mock the person list API (fetchAllPersons calls listPersons with pagination params)
		mockResponse('http://localhost:8000/api/v1/faces/persons?page=1&page_size=1000&status=active', {
			items: [
				createPerson({ id: 'person-1', name: 'Alice' }),
				createPerson({ id: 'person-2', name: 'Bob' })
			],
			total: 2,
			page: 1,
			pageSize: 1000
		});

		renderDialog();

		const chooseBtn = screen.getByRole('button', { name: /Choose Person/i });
		await fireEvent.click(chooseBtn);

		// PersonPickerModal should appear with its title
		await waitFor(() => {
			expect(screen.getByText('Move to Person')).toBeInTheDocument();
		});
	});

	it('calls API with personId when existing person is selected', async () => {
		// Mock person list (fetchAllPersons calls listPersons with pagination params)
		mockResponse('http://localhost:8000/api/v1/faces/persons?page=1&page_size=1000&status=active', {
			items: [createPerson({ id: 'person-alice', name: 'Alice', faceCount: 20 })],
			total: 1,
			page: 1,
			pageSize: 1000
		});

		// Mock accept endpoint
		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/test-group-1/accept',
			{
				personId: 'person-alice',
				personName: 'Alice',
				facesAssigned: 8,
				facesExcluded: 0,
				prototypesCreated: 0,
				findMoreJobId: null,
				reclusteringJobId: null,
				assignmentEventId: 'event-uuid-1'
			}
		);

		const { onAccepted } = renderDialog();

		// Open PersonPickerModal
		const chooseBtn = screen.getByRole('button', { name: /Choose Person/i });
		await fireEvent.click(chooseBtn);

		// Wait for person list to load and select a person
		await waitFor(() => {
			expect(screen.getByText('Alice')).toBeInTheDocument();
		});

		const aliceOption = screen.getByText('Alice').closest('button');
		if (aliceOption) {
			await fireEvent.click(aliceOption);
		}

		// Click the confirm/move button
		const moveBtn = screen.getByRole('button', { name: /Move/i });
		await fireEvent.click(moveBtn);

		// Verify API was called with personId
		await waitFor(() => {
			assertCalled('/api/v1/faces/unknown-persons/candidates/test-group-1/accept');
		});

		// Verify onAccepted was called
		await waitFor(() => {
			expect(onAccepted).toHaveBeenCalled();
		});
	});

	it('displays error on API failure', async () => {
		// Mock person list (fetchAllPersons calls listPersons with pagination params)
		mockResponse('http://localhost:8000/api/v1/faces/persons?page=1&page_size=1000&status=active', {
			items: [createPerson({ id: 'person-fail', name: 'FailPerson', faceCount: 5 })],
			total: 1,
			page: 1,
			pageSize: 1000
		});

		// Mock accept endpoint to fail
		mockError(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/test-group-1/accept',
			500,
			{ detail: 'Internal server error' }
		);

		renderDialog();

		// Open PersonPickerModal
		const chooseBtn = screen.getByRole('button', { name: /Choose Person/i });
		await fireEvent.click(chooseBtn);

		// Wait for person list and select
		await waitFor(() => {
			expect(screen.getByText('FailPerson')).toBeInTheDocument();
		});

		const personOption = screen.getByText('FailPerson').closest('button');
		if (personOption) {
			await fireEvent.click(personOption);
		}

		const moveBtn = screen.getByRole('button', { name: /Move/i });
		await fireEvent.click(moveBtn);

		// Verify error is shown
		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});

	it('does not render dialog content when group is null', () => {
		renderDialog({ group: null });

		// Dialog title should still be visible (from Dialog.Header)
		expect(screen.getByText('Assign Group to Person')).toBeInTheDocument();

		// But Choose Person button should not be present (content guarded by {#if group})
		expect(screen.queryByRole('button', { name: /Choose Person/i })).not.toBeInTheDocument();
	});

	it('shows correct assigned count when faces are excluded', () => {
		const group = createUnknownPersonCandidateGroup({
			faceCount: 10,
			sampleFaces: [
				{
					faceInstanceId: 'f-1',
					assetId: '1',
					qualityScore: 0.8,
					detectionConfidence: 0.9,
					bboxX: 0,
					bboxY: 0,
					bboxW: 50,
					bboxH: 50,
					thumbnailUrl: null
				},
				{
					faceInstanceId: 'f-2',
					assetId: '2',
					qualityScore: 0.8,
					detectionConfidence: 0.9,
					bboxX: 0,
					bboxY: 0,
					bboxW: 50,
					bboxH: 50,
					thumbnailUrl: null
				},
				{
					faceInstanceId: 'f-3',
					assetId: '3',
					qualityScore: 0.8,
					detectionConfidence: 0.9,
					bboxX: 0,
					bboxY: 0,
					bboxW: 50,
					bboxH: 50,
					thumbnailUrl: null
				}
			]
		});

		renderDialog({ group, excludedFaceIds: ['f-1', 'f-2'] });

		// Should show "8 faces" (10 total - 2 excluded = 8)
		expect(screen.getByText(/8 faces/)).toBeInTheDocument();
	});
});
