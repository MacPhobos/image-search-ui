import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchImages, checkHealth, ApiError } from '$lib/api/client';
import type { Mock } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn() as Mock;

describe('API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('searchImages', () => {
		it('makes correct POST API call with query', async () => {
			const mockResponse = {
				results: [
					{
						asset: {
							id: 1,
							path: '/photos/test.jpg',
							createdAt: '2024-12-19T10:00:00Z',
							indexedAt: '2024-12-19T10:01:00Z'
						},
						score: 0.89,
						highlights: ['beach', 'sunset']
					}
				],
				total: 1,
				query: 'test'
			};

			(global.fetch as Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await searchImages({ query: 'test' });

			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/search',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify({
						query: 'test',
						limit: 50,
						offset: 0,
						filters: undefined
					})
				})
			);

			expect(result).toEqual(mockResponse);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].asset.path).toBe('/photos/test.jpg');
		});

		it('includes filters in request body when provided', async () => {
			const mockResponse = { results: [], total: 0, query: 'test' };

			(global.fetch as Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await searchImages({
				query: 'test',
				filters: {
					dateFrom: '2024-01-01',
					dateTo: '2024-12-31'
				},
				limit: 20,
				offset: 10
			});

			const callBody = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
			expect(callBody.query).toBe('test');
			expect(callBody.limit).toBe(20);
			expect(callBody.offset).toBe(10);
			expect(callBody.filters).toEqual({
				dateFrom: '2024-01-01',
				dateTo: '2024-12-31'
			});
		});

		it('throws ApiError on HTTP error', async () => {
			(global.fetch as Mock).mockResolvedValue({
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				json: async () => ({
					error: 'SERVICE_UNAVAILABLE',
					message: 'Search service is not available'
				})
			});

			try {
				await searchImages({ query: 'test' });
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).status).toBe(503);
				expect((error as ApiError).message).toBe('Search service is not available');
			}
		});

		it('throws ApiError on network error', async () => {
			(global.fetch as Mock).mockRejectedValue(new Error('Network failed'));

			try {
				await searchImages({ query: 'test' });
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).message).toBe('Network request failed');
				expect((error as ApiError).status).toBe(0);
			}
		});
	});

	describe('checkHealth', () => {
		it('returns health status when backend is healthy', async () => {
			(global.fetch as Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ status: 'ok' })
			});

			const result = await checkHealth();

			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:8000/health',
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);

			expect(result.status).toBe('ok');
		});

		it('throws ApiError when backend is unavailable', async () => {
			(global.fetch as Mock).mockRejectedValue(new Error('Connection refused'));

			try {
				await checkHealth();
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).message).toBe('Network request failed');
			}
		});
	});
});
