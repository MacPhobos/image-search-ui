import { describe, it, expect, vi } from 'vitest';

import { render, screen, fireEvent } from '@testing-library/svelte';
import ResultsGrid from '$lib/components/ResultsGrid.svelte';
import {
	createAsset,
	createBeachResult,
	createMountainResult,
	createSearchResult
} from '../helpers/fixtures';

describe('ResultsGrid', () => {
	it('shows initial empty state when no search performed', () => {
		render(ResultsGrid, {
			props: {
				results: [],
				loading: false,
				hasSearched: false
			}
		});

		expect(screen.getByText('Enter a search query to find images.')).toBeInTheDocument();
	});

	it('shows no results message when search returns empty', () => {
		render(ResultsGrid, {
			props: {
				results: [],
				loading: false,
				hasSearched: true
			}
		});

		expect(screen.getByText('No results found. Try a different search query.')).toBeInTheDocument();
	});

	it('shows loading state during search', () => {
		render(ResultsGrid, {
			props: {
				results: [],
				loading: true,
				hasSearched: true
			}
		});

		expect(screen.getByText('Searching...')).toBeInTheDocument();
	});

	it('renders grid of results with images and paths', () => {
		const results = [createBeachResult(), createMountainResult()];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		// Check result count header
		expect(screen.getByText('2 results')).toBeInTheDocument();

		// Check images are displayed with alt text for filenames
		expect(screen.getByAltText('beach-sunset.jpg')).toBeInTheDocument();
		expect(screen.getByAltText('mountain-view.jpg')).toBeInTheDocument();

		// Check full paths are displayed
		expect(screen.getByText('/photos/beach-sunset.jpg')).toBeInTheDocument();
		expect(screen.getByText('/photos/mountain-view.jpg')).toBeInTheDocument();
	});

	it('displays score as percentage', () => {
		const results = [
			createSearchResult({
				score: 0.95
			}),
			createSearchResult({
				asset: createAsset({ id: 2, path: '/photos/test2.jpg', createdAt: '2024-12-19T10:00:00Z' }),
				score: 0.78
			})
		];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		expect(screen.getByText('Cosine Score: 95.0%')).toBeInTheDocument();
		expect(screen.getByText('Cosine Score: 78.0%')).toBeInTheDocument();
	});

	it('displays highlights when available', () => {
		const results = [
			createSearchResult({
				highlights: ['beach', 'sunset', 'ocean']
			})
		];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		expect(screen.getByText('beach')).toBeInTheDocument();
		expect(screen.getByText('sunset')).toBeInTheDocument();
		expect(screen.getByText('ocean')).toBeInTheDocument();
	});

	it('handles single result with correct pluralization', () => {
		const results = [createSearchResult()];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		expect(screen.getByText('1 result')).toBeInTheDocument();
	});

	it('renders result cards with proper structure', () => {
		const results = [createBeachResult()];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		// Should render article element for semantic markup
		const article = screen.getByRole('article');
		expect(article).toBeInTheDocument();
	});

	it('formats dates correctly', () => {
		const results = [
			createSearchResult({
				asset: createAsset({
					id: 1,
					path: '/photos/test.jpg',
					createdAt: '2024-12-19T10:00:00Z',
					indexedAt: null
				})
			})
		];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		// Date should be formatted (exact format depends on locale)
		const dateElement = screen.getByTitle('Created');
		expect(dateElement).toBeInTheDocument();
		expect(dateElement.textContent).toBeTruthy();
	});

	it('handles empty highlights array', () => {
		const results = [
			createSearchResult({
				highlights: []
			})
		];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		// Component should render without highlights section
		expect(screen.getByAltText('test-image.jpg')).toBeInTheDocument();
	});

	it('displays images with lazy loading and correct URLs', () => {
		const results = [createBeachResult()];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		const img = screen.getByAltText('beach-sunset.jpg') as HTMLImageElement;
		expect(img).toHaveAttribute('loading', 'lazy');
		expect(img.src).toContain('/api/v1/images/1/thumbnail');
	});

	it('does not show Find Similar button when onFindSimilar is not provided', () => {
		const results = [createBeachResult()];

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true
			}
		});

		expect(screen.queryByTestId('results-grid__btn-find-similar')).not.toBeInTheDocument();
	});

	it('shows Find Similar button on hover when onFindSimilar is provided', async () => {
		const results = [createBeachResult()];
		const onFindSimilar = vi.fn();

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true,
				onFindSimilar
			}
		});

		// Initially button should not be visible
		expect(screen.queryByTestId('results-grid__btn-find-similar')).not.toBeInTheDocument();

		// Hover over the card
		const card = screen.getByRole('article');
		await fireEvent.mouseEnter(card);

		// Button should now be visible
		expect(screen.getByTestId('results-grid__btn-find-similar')).toBeInTheDocument();
	});

	it('calls onFindSimilar with correct asset ID when button is clicked', async () => {
		const results = [createBeachResult()];
		const onFindSimilar = vi.fn();

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true,
				onFindSimilar
			}
		});

		// Hover over the card to show the button
		const card = screen.getByRole('article');
		await fireEvent.mouseEnter(card);

		// Click the Find Similar button
		const findSimilarBtn = screen.getByTestId('results-grid__btn-find-similar');
		await fireEvent.click(findSimilarBtn);

		expect(onFindSimilar).toHaveBeenCalledWith(1); // beach result has asset ID 1
		expect(onFindSimilar).toHaveBeenCalledTimes(1);
	});

	it('hides Find Similar button when mouse leaves the card', async () => {
		const results = [createBeachResult()];
		const onFindSimilar = vi.fn();

		render(ResultsGrid, {
			props: {
				results,
				loading: false,
				hasSearched: true,
				onFindSimilar
			}
		});

		const card = screen.getByRole('article');

		// Hover to show button
		await fireEvent.mouseEnter(card);
		expect(screen.getByTestId('results-grid__btn-find-similar')).toBeInTheDocument();

		// Leave hover
		await fireEvent.mouseLeave(card);
		expect(screen.queryByTestId('results-grid__btn-find-similar')).not.toBeInTheDocument();
	});
});
