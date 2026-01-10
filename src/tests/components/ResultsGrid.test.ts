import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ResultsGrid from '$lib/components/ResultsGrid.svelte';
import { createAsset, createBeachResult, createMountainResult, createSearchResult } from '../helpers/fixtures';

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
});
