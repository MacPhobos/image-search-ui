import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Page from '../routes/+page.svelte';
import type { Mock } from 'vitest';

// Mock the API client module
vi.mock('$lib/api/client', () => ({
	searchImages: vi.fn(),
	checkHealth: vi.fn(),
	ApiError: class ApiError extends Error {
		constructor(
			message: string,
			public status: number,
			public data?: unknown
		) {
			super(message);
			this.name = 'ApiError';
		}
	}
}));

import { searchImages, ApiError } from '$lib/api/client';

describe('Dashboard Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders search bar and filters panel', () => {
		render(Page);

		expect(screen.getByRole('textbox', { name: /search query/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
		expect(screen.getByText('Filters')).toBeInTheDocument();
		expect(screen.getByLabelText('Date From')).toBeInTheDocument();
		expect(screen.getByLabelText('Date To')).toBeInTheDocument();
	});

	it('shows initial empty state message', () => {
		render(Page);

		expect(screen.getByText('Enter a search query to find images.')).toBeInTheDocument();
	});

	it('shows loading state during search', async () => {
		// Make search hang indefinitely for this test
		(searchImages as Mock).mockImplementation(() => new Promise(() => {}));

		render(Page);

		const input = screen.getByRole('textbox', { name: /search query/i });
		const form = input.closest('form')!;

		await fireEvent.input(input, { target: { value: 'beach' } });
		await fireEvent.submit(form);

		expect(screen.getByText('Searching...')).toBeInTheDocument();
	});

	it('renders search results when API returns data', async () => {
		const mockResults = {
			results: [
				{
					asset: {
						id: 1,
						path: '/photos/beach-sunset.jpg',
						createdAt: '2024-12-19T10:00:00Z',
						indexedAt: '2024-12-19T10:01:00Z'
					},
					score: 0.95,
					highlights: ['beach', 'sunset', 'ocean']
				},
				{
					asset: {
						id: 2,
						path: '/photos/mountain-view.jpg',
						createdAt: '2024-12-18T09:00:00Z',
						indexedAt: null
					},
					score: 0.78,
					highlights: ['mountain']
				}
			],
			total: 2,
			query: 'beach'
		};

		(searchImages as Mock).mockResolvedValueOnce(mockResults);

		render(Page);

		const input = screen.getByRole('textbox', { name: /search query/i });
		const form = input.closest('form')!;

		await fireEvent.input(input, { target: { value: 'beach' } });
		await fireEvent.submit(form);

		await waitFor(() => {
			expect(screen.getByText('2 results')).toBeInTheDocument();
		});

		// Check that result cards are rendered
		expect(screen.getByText('beach-sunset.jpg')).toBeInTheDocument();
		expect(screen.getByText('mountain-view.jpg')).toBeInTheDocument();

		// Check paths are shown
		expect(screen.getByText('/photos/beach-sunset.jpg')).toBeInTheDocument();

		// Check scores are formatted and displayed
		expect(screen.getByText('95.0%')).toBeInTheDocument();
		expect(screen.getByText('78.0%')).toBeInTheDocument();

		// Check highlights are rendered
		expect(screen.getByText('beach')).toBeInTheDocument();
		expect(screen.getByText('sunset')).toBeInTheDocument();
	});

	it('shows error message when search fails', async () => {
		const apiError = new (ApiError as unknown as new (
			message: string,
			status: number,
			data?: unknown
		) => Error)('Search service is unavailable', 503, {
			message: 'Search service is unavailable'
		});
		(searchImages as Mock).mockRejectedValueOnce(apiError);

		render(Page);

		const input = screen.getByRole('textbox', { name: /search query/i });
		const form = input.closest('form')!;

		await fireEvent.input(input, { target: { value: 'test' } });
		await fireEvent.submit(form);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});

		expect(screen.getByText(/Search service is unavailable/)).toBeInTheDocument();
	});

	it('shows no results message when search returns empty', async () => {
		(searchImages as Mock).mockResolvedValueOnce({
			results: [],
			total: 0,
			query: 'nonexistent'
		});

		render(Page);

		const input = screen.getByRole('textbox', { name: /search query/i });
		const form = input.closest('form')!;

		await fireEvent.input(input, { target: { value: 'nonexistent' } });
		await fireEvent.submit(form);

		await waitFor(() => {
			expect(
				screen.getByText('No results found. Try a different search query.')
			).toBeInTheDocument();
		});
	});

	it('passes filters to search API', async () => {
		(searchImages as Mock).mockResolvedValueOnce({
			results: [],
			total: 0,
			query: 'test'
		});

		render(Page);

		// Set date filters
		const dateFrom = screen.getByLabelText('Date From');
		const dateTo = screen.getByLabelText('Date To');
		await fireEvent.input(dateFrom, { target: { value: '2024-01-01' } });
		await fireEvent.input(dateTo, { target: { value: '2024-12-31' } });

		// Submit search
		const input = screen.getByRole('textbox', { name: /search query/i });
		const form = input.closest('form')!;
		await fireEvent.input(input, { target: { value: 'test' } });
		await fireEvent.submit(form);

		await waitFor(() => {
			expect(searchImages).toHaveBeenCalledWith(
				expect.objectContaining({
					query: 'test',
					filters: expect.objectContaining({
						dateFrom: '2024-01-01',
						dateTo: '2024-12-31'
					})
				})
			);
		});
	});
});
