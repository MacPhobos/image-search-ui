import { render, screen, waitFor } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ClustersPage from '../../routes/faces/clusters/+page.svelte';
import { mockResponse } from '../helpers/mockFetch';
import { createFaceCluster } from '../helpers/fixtures';
import type { UnknownFaceClusteringConfig } from '$lib/api/admin';

describe('Face Clusters Page - LocalStorage & Confidence Dropdown', () => {
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

	describe('Confidence Dropdown - Preset Values', () => {
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

			const confidenceSelect = screen.getByLabelText('Min Confidence:');

			// Check all preset options exist
			expect(screen.getByRole('option', { name: '90%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '80%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '70%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '60%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '50%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '40%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '30%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '20%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: '10%' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Custom...' })).toBeInTheDocument();

			// Default should be 60%
			expect(confidenceSelect).toHaveValue('0.6');
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

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, '0.8');

			// Should reload and show new count
			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 1 clusters')).toBeInTheDocument();
			});
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
				expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();
			});

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, '0.8');

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

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			expect(confidenceSelect).toHaveValue('0.8');
		});
	});

	describe('Confidence Dropdown - Custom Value', () => {
		it('should show custom input when "Custom..." selected', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();
			});

			// Custom input should not be visible initially
			expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, 'custom');

			// Custom input and apply button should appear
			await waitFor(() => {
				expect(screen.getByRole('spinbutton')).toBeInTheDocument();
				expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
			});
		});

		it('should apply custom confidence value', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();
			});

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, 'custom');

			// Wait for custom input
			const customInput = await screen.findByRole('spinbutton');
			await user.clear(customInput);
			await user.type(customInput, '0.65');

			// Mock new response
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			const applyBtn = screen.getByRole('button', { name: 'Apply' });
			await user.click(applyBtn);

			// Should persist custom value
			expect(localStorage.setItem).toHaveBeenCalledWith(
				'image-search.clusters.minConfidence',
				'0.65'
			);
		});

		it('should persist custom confidence and restore on mount', async () => {
			// Set custom persisted value (not in presets)
			localStorageMock['image-search.clusters.minConfidence'] = '0.65';

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

			// Should show "Custom..." in dropdown
			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			expect(confidenceSelect).toHaveValue('custom');

			// Custom input should be visible with stored value
			const customInput = screen.getByRole('spinbutton');
			expect(customInput).toHaveValue(0.65);
		});
	});

	describe('Validation', () => {
		it('should disable Apply button for invalid values above 1.0', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();
			});

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, 'custom');

			const customInput = await screen.findByRole('spinbutton');
			const applyBtn = screen.getByRole('button', { name: 'Apply' });

			await user.clear(customInput);
			await user.type(customInput, '1.5');

			await waitFor(() => {
				expect(applyBtn).toBeDisabled();
			});
		});

		it('should disable Apply button for invalid values below 0.01', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();
			});

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, 'custom');

			const customInput = await screen.findByRole('spinbutton');
			const applyBtn = screen.getByRole('button', { name: 'Apply' });

			await user.clear(customInput);
			await user.type(customInput, '0');

			await waitFor(() => {
				expect(applyBtn).toBeDisabled();
			});
		});

		it('should enable Apply button for valid values', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();
			});

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, 'custom');

			const customInput = await screen.findByRole('spinbutton');
			const applyBtn = screen.getByRole('button', { name: 'Apply' });

			await user.clear(customInput);
			await user.type(customInput, '0.5');

			await waitFor(() => {
				expect(applyBtn).not.toBeDisabled();
			});
		});
	});

	describe('Enter Key Support', () => {
		it('should apply custom value when Enter key pressed', async () => {
			const clusters = [createFaceCluster()];
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			render(ClustersPage);

			await waitFor(() => {
				expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();
			});

			const confidenceSelect = screen.getByLabelText('Min Confidence:');
			const user = userEvent.setup();
			await user.selectOptions(confidenceSelect, 'custom');

			const customInput = await screen.findByRole('spinbutton');
			await user.clear(customInput);
			await user.type(customInput, '0.45');

			// Mock new response
			mockResponse('/api/v1/faces/clusters', {
				items: clusters,
				total: 1,
				page: 1,
				pageSize: 100
			});

			// Press Enter
			await user.keyboard('{Enter}');

			// Should persist value
			await waitFor(() => {
				expect(localStorage.setItem).toHaveBeenCalledWith(
					'image-search.clusters.minConfidence',
					'0.45'
				);
			});
		});
	});

	describe('Visual Layout', () => {
		it('should render both dropdowns in results header', async () => {
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

			// Both dropdowns should be present
			expect(screen.getByLabelText('Sort by:')).toBeInTheDocument();
			expect(screen.getByLabelText('Min Confidence:')).toBeInTheDocument();

			// Check they're in the results header section
			const sortSelect = screen.getByLabelText('Sort by:');
			const confidenceSelect = screen.getByLabelText('Min Confidence:');

			// Both should be select elements
			expect(sortSelect.tagName).toBe('SELECT');
			expect(confidenceSelect.tagName).toBe('SELECT');
		});
	});
});
