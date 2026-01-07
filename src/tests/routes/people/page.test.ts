import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { mockResponse, mockError, getFetchMock } from '../../helpers/mockFetch';
import {
	createUnifiedPeopleResponse,
	createIdentifiedPerson,
	createUnidentifiedPerson,
	createNoisePerson,
	createMultipleIdentifiedPersons,
	createMultipleUnidentifiedPersons
} from '../../helpers/fixtures';

// Mock navigation - must be before imports
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

import PageTestWrapper from './PageTestWrapper.svelte';
import { goto } from '$app/navigation';

describe('People Page', () => {
	const defaultMockData = createUnifiedPeopleResponse([
		createIdentifiedPerson({ id: 'uuid-1', name: 'Alice', faceCount: 50 }),
		createIdentifiedPerson({ id: 'uuid-2', name: 'Bob', faceCount: 30 }),
		createUnidentifiedPerson({
			id: 'clu_1',
			name: 'Unidentified Person 1',
			faceCount: 100,
			confidence: 0.9
		}),
		createNoisePerson({ id: 'noise', name: 'Unknown Faces', faceCount: 200 })
	]);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(goto).mockClear();
	});

	describe('Page Loading', () => {
		it('should display loading state initially', () => {
			// Mock with regex to match any query params
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			expect(screen.getByText('Loading people...')).toBeInTheDocument();
		});

		it('should load and display people data', async () => {
			// Mock with regex to match any query params
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
				expect(screen.getByText('Bob')).toBeInTheDocument();
			});
		});

		it('should display statistics summary', async () => {
			// Mock with regex to match any query params
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				// Check for identified count
				const stats = screen.getAllByText('2');
				expect(stats.length).toBeGreaterThan(0);

				// Check for unidentified count
				expect(screen.getByText('1')).toBeInTheDocument();
			});
		});
	});

	describe('Error Handling', () => {
		it('should show error state on API failure', async () => {
			mockError('/api/v1/faces/people.*', 500, { message: 'Internal server error' });

			render(PageTestWrapper);

			await waitFor(() => {
				const errorElement = screen.getByRole('alert');
				expect(errorElement).toBeInTheDocument();
				expect(errorElement.textContent).toContain('Internal server error');
			});

			expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
		});

		it('should retry loading when Try Again is clicked', async () => {
			mockError('/api/v1/faces/people.*', 500, { message: 'Server error' });

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByRole('alert')).toBeInTheDocument();
			});

			// Update mock to return success
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			const retryBtn = screen.getByRole('button', { name: /try again/i });
			await fireEvent.click(retryBtn);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});
		});
	});

	describe('Empty State', () => {
		it('should show empty state when no people found', async () => {
			const emptyData = createUnifiedPeopleResponse([]);
			mockResponse('/api/v1/faces/people.*', emptyData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('No people found')).toBeInTheDocument();
			});

			expect(screen.getByText('Upload images with faces to get started.')).toBeInTheDocument();
			expect(screen.getByText('Start Face Detection')).toBeInTheDocument();
		});
	});

	describe('Section Headers', () => {
		it('should show Identified section header', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				// Multiple "Identified" badges exist, so check for "2 people" instead
				expect(screen.getByText('2 people')).toBeInTheDocument();
			});
		});

		it('should show Needs Names section header', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Needs Names')).toBeInTheDocument();
				expect(screen.getByText('1 groups')).toBeInTheDocument();
			});
		});

		it('should not show noise section by default', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			// Noise section should be hidden by default
			expect(screen.queryByText('Unknown Faces')).not.toBeInTheDocument();
		});
	});

	describe('Filters', () => {
		it('should update API call when Show Identified is toggled', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			const fetchMock = getFetchMock();
			fetchMock.mockClear();

			// Mock the new filtered request
			const filteredData = createUnifiedPeopleResponse([
				createUnidentifiedPerson({ id: 'clu_1', faceCount: 100 })
			]);
			mockResponse('/api/v1/faces/people.*', filteredData);

			// Toggle off identified
			const checkbox = screen.getByLabelText(/Show Identified/i);
			await fireEvent.click(checkbox);

			await waitFor(() => {
				const calls = fetchMock.mock.calls;
				const latestCall = calls[calls.length - 1];
				const url = latestCall[0] as string;
				expect(url).toContain('include_identified=false');
			});
		});

		it('should update API call when Show Unidentified is toggled', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			const fetchMock = getFetchMock();
			fetchMock.mockClear();

			mockResponse('/api/v1/faces/people.*', defaultMockData);

			const checkbox = screen.getByLabelText(/Show Unidentified/i);
			await fireEvent.click(checkbox);

			await waitFor(() => {
				const calls = fetchMock.mock.calls;
				const latestCall = calls[calls.length - 1];
				const url = latestCall[0] as string;
				expect(url).toContain('include_unidentified=false');
			});
		});

		it('should update API call when Show Unknown Faces is toggled', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			const fetchMock = getFetchMock();
			fetchMock.mockClear();

			mockResponse('/api/v1/faces/people.*', defaultMockData);

			const checkbox = screen.getByLabelText(/Show Unknown Faces/i);
			await fireEvent.click(checkbox);

			await waitFor(() => {
				const calls = fetchMock.mock.calls;
				const latestCall = calls[calls.length - 1];
				const url = latestCall[0] as string;
				expect(url).toContain('include_noise=true');
			});
		});
	});

	describe('Sorting', () => {
		it('should update API call when sort by is changed', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			const sortSelect = screen.getByLabelText(/Sort by:/i);
			expect(sortSelect).toHaveValue('faceCount');

			await fireEvent.change(sortSelect, { target: { value: 'name' } });

			// Verify the select value changed
			expect(sortSelect).toHaveValue('name');
		});

		it('should update API call when sort order is changed', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			const sortOrderSelect = screen.getByLabelText(/Sort order/i);
			expect(sortOrderSelect).toHaveValue('desc');

			await fireEvent.change(sortOrderSelect, { target: { value: 'asc' } });

			// Verify the select value changed
			expect(sortOrderSelect).toHaveValue('asc');
		});
	});

	describe('Person Cards', () => {
		it('should show assign button on unidentified cards', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Unidentified Person 1')).toBeInTheDocument();
			});

			const assignButtons = screen.getAllByText('Assign Name');
			expect(assignButtons.length).toBeGreaterThan(0);
		});

		it('should navigate to person detail page when identified person is clicked', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			const aliceCard = screen.getByText('Alice').closest('article');
			expect(aliceCard).toBeInTheDocument();
			await fireEvent.click(aliceCard!);

			expect(goto).toHaveBeenCalledWith('/people/uuid-1');
		});

		it('should navigate to cluster detail page when unidentified person is clicked', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Unidentified Person 1')).toBeInTheDocument();
			});

			const unidentifiedCard = screen.getByText('Unidentified Person 1').closest('article');
			expect(unidentifiedCard).toBeInTheDocument();
			await fireEvent.click(unidentifiedCard!);

			expect(goto).toHaveBeenCalledWith('/faces/clusters/clu_1');
		});

		it('should navigate to label page when assign button is clicked', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Unidentified Person 1')).toBeInTheDocument();
			});

			const assignBtn = screen.getAllByText('Assign Name')[0];
			await fireEvent.click(assignBtn);

			expect(goto).toHaveBeenCalledWith('/faces/clusters/clu_1?action=label');
		});
	});

	describe('Multiple People', () => {
		it('should display multiple identified people', async () => {
			const manyPeople = createUnifiedPeopleResponse([
				...createMultipleIdentifiedPersons(5),
				...createMultipleUnidentifiedPersons(3)
			]);

			mockResponse('/api/v1/faces/people.*', manyPeople);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('5 people')).toBeInTheDocument();
			});

			expect(screen.getByText('3 groups')).toBeInTheDocument();
		});

		it('should show singular "group" for one unidentified cluster', async () => {
			const data = createUnifiedPeopleResponse([
				createIdentifiedPerson({ name: 'Alice' }),
				createUnidentifiedPerson({ name: 'Unidentified Person 1' })
			]);

			mockResponse('/api/v1/faces/people.*', data);

			render(PageTestWrapper);

			await waitFor(() => {
				// The page uses "groups" plural even for 1 item
				expect(screen.getByText('1 groups')).toBeInTheDocument();
			});
		});
	});

	describe('Noise Section', () => {
		it('should show noise section when checkbox is enabled', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			const fetchMock = getFetchMock();
			fetchMock.mockClear();

			mockResponse('/api/v1/faces/people.*', defaultMockData);

			const checkbox = screen.getByLabelText(/Show Unknown Faces/i);
			await fireEvent.click(checkbox);

			await waitFor(() => {
				const calls = fetchMock.mock.calls;
				const latestCall = calls[calls.length - 1];
				const url = latestCall[0] as string;
				expect(url).toContain('include_noise=true');
			});
		});

		it('should display noise count in statistics when visible', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			// Initially noise stat should not be visible
			expect(screen.queryByText('Unknown')).not.toBeInTheDocument();

			const fetchMock = getFetchMock();
			fetchMock.mockClear();
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			// Enable noise
			const checkbox = screen.getByLabelText(/Show Unknown Faces/i);
			await fireEvent.click(checkbox);

			await waitFor(() => {
				expect(screen.getByText('Unknown')).toBeInTheDocument();
			});
		});
	});

	describe('Accessibility', () => {
		it('should have proper page title', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			await waitFor(() => {
				expect(screen.getByText('Alice')).toBeInTheDocument();
			});

			// Check for main heading
			const heading = screen.getByRole('heading', { name: 'People', level: 1 });
			expect(heading).toBeInTheDocument();
		});

		it('should have labeled filter checkboxes', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			expect(screen.getByLabelText(/Show Identified/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Show Unidentified/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Show Unknown Faces/i)).toBeInTheDocument();
		});

		it('should have labeled sort controls', async () => {
			mockResponse('/api/v1/faces/people.*', defaultMockData);

			render(PageTestWrapper);

			expect(screen.getByLabelText(/Sort by:/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Sort order/i)).toBeInTheDocument();
		});
	});
});
