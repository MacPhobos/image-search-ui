import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PersonHistoryPage from '../../routes/faces/persons/[id]/history/+page.svelte';
import { mockResponse, mockError } from '../helpers/mockFetch';
import type { AssignmentHistoryResponse, Person } from '$lib/api/faces';
import { page } from '$app/stores';

// Mock $app/stores
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((callback) => {
			callback({ params: { id: 'person-123' }, url: new URL('http://localhost') });
			return () => {};
		})
	}
}));

describe('Person Assignment History Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders loading state initially', () => {
		// Mock person and history responses (delayed)
		const person: Person = {
			id: 'person-123',
			name: 'John Doe',
			birthDate: null,
			status: 'active',
			faceCount: 10,
			prototypeCount: 2,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		};

		const history: AssignmentHistoryResponse = {
			events: [],
			total: 0,
			offset: 0,
			limit: 20
		};

		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123', person);
		mockResponse(
			'http://localhost:8000/api/v1/faces/persons/person-123/assignment-history?limit=20&offset=0',
			history
		);

		render(PersonHistoryPage);

		expect(screen.getByText('Loading history...')).toBeInTheDocument();
	});

	it('displays assignment events when loaded', async () => {
		const person: Person = {
			id: 'person-123',
			name: 'John Doe',
			birthDate: null,
			status: 'active',
			faceCount: 10,
			prototypeCount: 2,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		};

		const history: AssignmentHistoryResponse = {
			events: [
				{
					id: 'event-1',
					operation: 'ASSIGN_TO_PERSON',
					createdAt: '2024-01-10T10:45:00Z',
					faceCount: 1,
					photoCount: 1,
					faceInstanceIds: ['face-123'],
					assetIds: [1001],
					fromPersonId: null,
					toPersonId: 'person-123',
					fromPersonName: null,
					toPersonName: 'John Doe',
					note: null
				},
				{
					id: 'event-2',
					operation: 'UNASSIGN_FROM_PERSON',
					createdAt: '2024-01-09T15:20:00Z',
					faceCount: 1,
					photoCount: 1,
					faceInstanceIds: ['face-456'],
					assetIds: [1002],
					fromPersonId: 'person-123',
					toPersonId: null,
					fromPersonName: 'John Doe',
					toPersonName: null,
					note: null
				}
			],
			total: 2,
			offset: 0,
			limit: 20
		};

		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123', person);
		// Mock the exact URL with query params
		mockResponse(
			'http://localhost:8000/api/v1/faces/persons/person-123/assignment-history?limit=20&offset=0',
			history
		);

		render(PersonHistoryPage);

		await waitFor(() => {
			expect(screen.getByText('Assignment History')).toBeInTheDocument();
			expect(screen.queryByText('Loading history...')).not.toBeInTheDocument();
		});

		// Check for events
		expect(screen.getByText(/Assigned 1 face/)).toBeInTheDocument();
		expect(screen.getByText(/Unassigned 1 face/)).toBeInTheDocument();

		// Check for photo counts
		expect(screen.getAllByText(/1 photo affected/)).toHaveLength(2);

		// Check for undo buttons
		const undoButtons = screen.getAllByText('Undo');
		expect(undoButtons).toHaveLength(1); // Only the ASSIGN event has undo
	});

	it('shows error message when loading fails', async () => {
		mockError('http://localhost:8000/api/v1/faces/persons/person-123', 'Failed to load person');

		render(PersonHistoryPage);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('Failed to load person');
		});
	});

	it('shows empty state when no events exist', async () => {
		const person: Person = {
			id: 'person-123',
			name: 'John Doe',
			birthDate: null,
			status: 'active',
			faceCount: 10,
			prototypeCount: 2,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		};

		const history: AssignmentHistoryResponse = {
			events: [],
			total: 0,
			offset: 0,
			limit: 20
		};

		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123', person);
		mockResponse(
			'http://localhost:8000/api/v1/faces/persons/person-123/assignment-history?limit=20&offset=0',
			history
		);

		render(PersonHistoryPage);

		await waitFor(() => {
			expect(screen.getByText('No assignment history found.')).toBeInTheDocument();
		});
	});

	it('has back link to person detail page', async () => {
		const person: Person = {
			id: 'person-123',
			name: 'John Doe',
			birthDate: null,
			status: 'active',
			faceCount: 10,
			prototypeCount: 2,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		};

		const history: AssignmentHistoryResponse = {
			events: [],
			total: 0,
			offset: 0,
			limit: 20
		};

		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123', person);
		mockResponse(
			'http://localhost:8000/api/v1/faces/persons/person-123/assignment-history?limit=20&offset=0',
			history
		);

		render(PersonHistoryPage);

		await waitFor(() => {
			const backLink = screen.getByText(/Back to/);
			expect(backLink).toBeInTheDocument();
		});
	});
});
