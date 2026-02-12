import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';

import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ClustersPage from '../../routes/faces/clusters/+page.svelte';
import { mockResponse } from '../helpers/mockFetch';
import { createFaceCluster } from '../helpers/fixtures';
import type { UnknownFaceClusteringConfig } from '$lib/api/admin';

describe('Face Clusters Page - LocalStorage & SimilarityThresholdControl', () => {
	let localStorageMock: Record<string, string>;

	beforeEach(() => {
		// Mock localStorage
		localStorageMock = {};

		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => localStorageMock[key] || null),
			setItem: vi.fn((key: string, value: string) => {
				localStorageMock[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				const keys = Object.keys(localStorageMock);
				if (keys.includes(key)) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { [key]: _, ...rest } = localStorageMock;
					localStorageMock = rest;
				}
			}),
			key: vi.fn((index: number) => Object.keys(localStorageMock)[index]),
			get length() {
				return Object.keys(localStorageMock).length;
			},
			clear: vi.fn(() => {
				localStorageMock = {};
			})
		});

		// Mock config API
		const mockConfig: UnknownFaceClusteringConfig = {
			minConfidence: 0.7,
			minClusterSize: 2
		};
		mockResponse('/api/v1/admin/settings/unknown-clustering', mockConfig);

		// Mock clusters list API with default empty response
		mockResponse('/api/v1/faces/clusters', {
			items: [],
			total: 0,
			page: 1,
			pageSize: 100
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('Sort Order Persistence', () => {
		it('should persist sort order to localStorage when changed', async () => {
			// Mock some clusters
			const clusters = [
				createFaceCluster({ clusterId: 'c1', faceCount: 5, avgQuality: 0.8 }),
				createFaceCluster({ clusterId: 'c2', faceCount: 10, avgQuality: 0.6 })
			];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 2,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			// Wait for clusters to load
			await waitFor(() => {
				expect(screen.getByText('Showing 2 of 2 clusters')).toBeInTheDocument();
			});

			// Find sort dropdown
			const sortSelect = screen.getByLabelText('Sort by:');
			expect(sortSelect).toHaveValue('faceCount');

			// Change to Average Quality
			const user = userEvent.setup();
			await user.selectOptions(sortSelect, 'avgQuality');

			// Check localStorage was updated
			expect(localStorage.setItem).toHaveBeenCalledWith(
				'image-search.clusters.sortBy',
				'"avgQuality"'
			);
			expect(sortSelect).toHaveValue('avgQuality');
		});

		it('should load persisted sort order on mount', async () => {
			// Set persisted value
			localStorageMock['image-search.clusters.sortBy'] = '"avgQuality"';

			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			// Wait for clusters to load
			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			// Check dropdown shows persisted value
			const sortSelect = screen.getByLabelText('Sort by:');
			expect(sortSelect).toHaveValue('avgQuality');
		});
	});

	describe('SimilarityThresholdControl - Preset Values', () => {
		it('should display all preset confidence options', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			// Check the slider exists
			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });
			expect(slider).toBeInTheDocument();

			// Check all preset buttons exist
			expect(screen.getByRole('button', { name: /Exploratory/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /Standard/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /High Confidence/i })).toBeInTheDocument();

			// Default should be 60% (0.6)
			expect(slider).toHaveValue('0.6');
		});

		it('should reload clusters when preset confidence changed', async () => {
			const clusters80 = [createFaceCluster({ clusterId: 'c1' })];
			const clusters60 = [
				createFaceCluster({ clusterId: 'c1' }),
				createFaceCluster({ clusterId: 'c2' })
			];

			// Initial load with 60%
			mockResponse('/api/v1/faces/clusters', {
				items: clusters60,
				total: 2,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 2 of 2 clusters')).toBeInTheDocument();
			});

			// Mock new response for 80%
			mockResponse('/api/v1/faces/clusters', {
				items: clusters80,
				total: 1,
				page: 1,
				pageSize: 100
			});

			// Click the "Standard" preset button (0.8 confidence)
			const user = userEvent.setup();
			const standardButton = screen.getByRole('button', { name: /Standard/i });
			await user.click(standardButton);

			// Should reload and show new count (debounced, so wait longer)
			await waitFor(
				() => {
					expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
				},
				{ timeout: 1000 }
			);
		});

		it('should persist confidence value to localStorage', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByRole('slider', { name: 'Similarity Threshold' })).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });
			// Use fireEvent for slider input
			fireEvent.input(slider, { target: { value: '0.8' } });

			expect(localStorage.setItem).toHaveBeenCalledWith(
				'image-search.clusters.minConfidence',
				'0.8'
			);
		});

		it('should load persisted confidence on mount', async () => {
			// Set persisted value
			localStorageMock['image-search.clusters.minConfidence'] = '0.8';

			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });
			expect(slider).toHaveValue('0.8');
		});
	});

	describe('SimilarityThresholdControl - Slider Value', () => {
		it('should adjust confidence via slider', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });

			// Change slider value
			fireEvent.input(slider, { target: { value: '0.75' } });

			// Should update value
			expect(slider).toHaveValue('0.75');

			// Should show Custom badge (not matching any preset)
			expect(screen.getByText('Custom')).toBeInTheDocument();
		});

		it('should show preset badge when slider matches preset', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });

			// Set to Standard preset (0.8)
			fireEvent.input(slider, { target: { value: '0.8' } });

			// Should show Standard badge (use getAllByText and check that badge exists)
			await waitFor(() => {
				const standardElements = screen.getAllByText('Standard');
				// Should have both button and badge with "Standard"
				expect(standardElements.length).toBeGreaterThanOrEqual(2);
			});
		});

		it('should show Custom badge for non-preset values', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });

			// Set to a custom value (not matching any preset)
			fireEvent.input(slider, { target: { value: '0.85' } });

			// Should show Custom badge
			await waitFor(() => {
				const customBadges = screen.getAllByText('Custom');
				expect(customBadges.length).toBeGreaterThanOrEqual(1);
			});

			// Verify slider has the custom value
			expect(slider).toHaveValue('0.85');
		});
	});

	describe('Slider Constraints', () => {
		it('should enforce min constraint (0.6)', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });

			// Verify min attribute
			expect(slider).toHaveAttribute('min', '0.6');
		});

		it('should enforce max constraint (0.95)', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });

			// Verify max attribute
			expect(slider).toHaveAttribute('max', '0.95');
		});

		it('should enforce step constraint (0.01)', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });

			// Verify step attribute
			expect(slider).toHaveAttribute('step', '0.01');
		});
	});

	describe('Debounced Reload', () => {
		it('should reload clusters after slider change (debounced)', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			const slider = screen.getByRole('slider', { name: 'Similarity Threshold' });

			// Mock new response for higher confidence (empty results)
			mockResponse('/api/v1/faces/clusters', {
				items: [],
				total: 0,
				page: 1,
				pageSize: 100
			});

			// Change slider value
			fireEvent.input(slider, { target: { value: '0.95' } });

			// Should reload after debounce (300ms + some buffer)
			// Using longer timeout to account for debounce + fetch
			await waitFor(
				() => {
					expect(screen.queryByText('Showing 1 of 1 clusters')).not.toBeInTheDocument();
				},
				{ timeout: 1500 }
			);

			// Should now show empty state or 0 clusters
			await waitFor(
				() => {
					const text = screen.queryByText(/Showing \d+ of \d+ clusters/);
					if (text) {
						expect(text.textContent).toContain('Showing 0 of 0 clusters');
					} else {
						// Empty state shown instead
						expect(screen.getByText('No Unknown Face Clusters')).toBeInTheDocument();
					}
				},
				{ timeout: 500 }
			);
		});
	});

	describe('Visual Layout', () => {
		it('should render both slider control and sort dropdown', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			// Sort dropdown should be present
			expect(screen.getByLabelText('Sort by:')).toBeInTheDocument();

			// Similarity threshold control components should be present
			expect(screen.getByRole('slider', { name: 'Similarity Threshold' })).toBeInTheDocument();
			expect(screen.getByText('Exploratory')).toBeInTheDocument();
			expect(screen.getByText('Standard')).toBeInTheDocument();
			expect(screen.getByText('High Confidence')).toBeInTheDocument();

			// Sort dropdown should be a select element
			const sortSelect = screen.getByLabelText('Sort by:');
			expect(sortSelect.tagName).toBe('SELECT');
		});

		it('should include confidence sort option in dropdown', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});

			// Check that confidence sort option exists
			const sortSelect = screen.getByLabelText('Sort by:') as HTMLSelectElement;
			const options = Array.from(sortSelect.options).map((opt) => opt.value);

			expect(options).toContain('faceCount');
			expect(options).toContain('avgQuality');
			expect(options).toContain('confidence');
		});
	});
});
