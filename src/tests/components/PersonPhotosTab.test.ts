import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import PersonPhotosTab from '$lib/components/faces/PersonPhotosTab.svelte';
import { mockResponse, mockError } from '../helpers/mockFetch';
import type { PersonPhotosResponse } from '$lib/api/faces';

describe('PersonPhotosTab', () => {
	const mockPersonId = 'person-123';
	const mockPersonName = 'John Doe';

	const createMockPhotosResponse = (photoCount: number = 3): PersonPhotosResponse => ({
		items: Array.from({ length: photoCount }, (_, i) => ({
			photoId: i + 1,
			takenAt: '2024-01-15T10:30:00Z',
			thumbnailUrl: `/api/v1/assets/${i + 1}/thumbnail`,
			fullUrl: `/api/v1/assets/${i + 1}/full`,
			faces: [
				{
					faceInstanceId: `face-${i}-1`,
					bboxX: 100,
					bboxY: 100,
					bboxW: 50,
					bboxH: 50,
					detectionConfidence: 0.95,
					qualityScore: 0.8,
					personId: mockPersonId,
					personName: mockPersonName,
					clusterId: 'cluster-1'
				}
			],
			faceCount: 1,
			hasNonPersonFaces: false
		})),
		total: photoCount,
		page: 1,
		pageSize: 20,
		personId: mockPersonId,
		personName: mockPersonName
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders loading state initially', () => {
		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', createMockPhotosResponse());

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		expect(screen.getByText('Loading photos...')).toBeInTheDocument();
	});

	it('displays photos after loading', async () => {
		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', createMockPhotosResponse(3));

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		await waitFor(() => {
			expect(screen.getByText('3 photos')).toBeInTheDocument();
		});

		// Should display photo cards in grid
		const selectAllBtn = screen.getByRole('button', { name: /select all/i });
		expect(selectAllBtn).toBeInTheDocument();
	});

	it('shows empty state when no photos', async () => {
		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', createMockPhotosResponse(0));

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		await waitFor(() => {
			expect(screen.getByText('No photos found')).toBeInTheDocument();
		});
	});

	it('shows error state on API failure', async () => {
		mockError('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', 'Failed to load photos', 500);

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		await waitFor(() => {
			expect(screen.getByText(/Failed to load photos/i)).toBeInTheDocument();
		});

		expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
	});

	it('allows selecting and deselecting photos', async () => {
		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', createMockPhotosResponse(3));

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		await waitFor(() => {
			expect(screen.getByText('3 photos')).toBeInTheDocument();
		});

		// Select first photo
		const checkboxes = screen.getAllByRole('checkbox', { name: /select photo/i });
		await fireEvent.click(checkboxes[0]);

		// Should show bulk toolbar
		await waitFor(() => {
			expect(screen.getByText('1 selected')).toBeInTheDocument();
		});
	});

	it('select all toggles all photos', async () => {
		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', createMockPhotosResponse(3));

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		await waitFor(() => {
			expect(screen.getByText('3 photos')).toBeInTheDocument();
		});

		// Click select all
		const selectAllBtn = screen.getByRole('button', { name: /select all/i });
		await fireEvent.click(selectAllBtn);

		// Should show all selected
		await waitFor(() => {
			expect(screen.getByText('3 selected')).toBeInTheDocument();
		});

		// Click deselect all
		const deselectAllBtn = screen.getByRole('button', { name: /deselect all/i });
		await fireEvent.click(deselectAllBtn);

		// Should hide bulk toolbar
		await waitFor(() => {
			expect(screen.queryByText('3 selected')).not.toBeInTheDocument();
		});
	});

	it('shows pagination when more than one page', async () => {
		const response = createMockPhotosResponse(3);
		response.total = 50; // More than pageSize (20)

		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', response);

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		await waitFor(() => {
			expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
		});

		expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
		expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
	});

	it('displays mixed badge for photos with non-person faces', async () => {
		const response = createMockPhotosResponse(1);
		response.items[0].hasNonPersonFaces = true;
		response.items[0].faceCount = 3;

		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', response);

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName
			}
		});

		await waitFor(() => {
			expect(screen.getByText('Mixed')).toBeInTheDocument();
		});

		expect(screen.getByText('3 faces')).toBeInTheDocument();
	});

	it('calls onPhotoClick when photo is clicked', async () => {
		mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', createMockPhotosResponse(1));

		const onPhotoClick = vi.fn();

		render(PersonPhotosTab, {
			props: {
				personId: mockPersonId,
				personName: mockPersonName,
				onPhotoClick
			}
		});

		await waitFor(() => {
			expect(screen.getByText('1 photo')).toBeInTheDocument();
		});

		// Click the photo thumbnail (not the checkbox)
		const photoButtons = screen.getAllByRole('button').filter((btn) => {
			// Filter out checkbox, select all, etc.
			return !btn.textContent?.includes('Select') && btn.querySelector('img');
		});

		await fireEvent.click(photoButtons[0]);

		expect(onPhotoClick).toHaveBeenCalledWith(1);
	});
});
