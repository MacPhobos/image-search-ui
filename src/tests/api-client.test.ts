import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchImages, ApiError } from '$lib/api/client';
import type { Mock } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn() as Mock;

describe('API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('searchImages makes correct API call', async () => {
		const mockResponse = {
			data: [
				{
					id: '1',
					url: 'https://example.com/image.jpg',
					thumbnailUrl: 'https://example.com/thumb.jpg',
					title: 'Test Image'
				}
			],
			total: 1
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		const result = await searchImages({ query: 'test' });

		expect(global.fetch).toHaveBeenCalledWith(
			'http://localhost:8000/api/search?q=test',
			expect.objectContaining({
				headers: expect.objectContaining({
					'Content-Type': 'application/json'
				})
			})
		);

		expect(result).toEqual(mockResponse);
	});

	it('searchImages includes filters in query params', async () => {
		const mockResponse = { data: [], total: 0 };

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		await searchImages({
			query: 'test',
			filters: {
				category: 'nature',
				sortBy: 'date'
			},
			page: 2,
			pageSize: 20
		});

		const callUrl = (global.fetch as Mock).mock.calls[0][0] as string;
		expect(callUrl).toContain('q=test');
		expect(callUrl).toContain('category=nature');
		expect(callUrl).toContain('sortBy=date');
		expect(callUrl).toContain('page=2');
		expect(callUrl).toContain('pageSize=20');
	});

	it('searchImages throws ApiError on HTTP error', async () => {
		(global.fetch as Mock).mockResolvedValue({
			ok: false,
			status: 404,
			statusText: 'Not Found',
			json: async () => ({ message: 'Resource not found' })
		});

		try {
			await searchImages({ query: 'test' });
			expect.fail('Should have thrown an error');
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).message).toBe('Resource not found');
		}
	});

	it('searchImages throws ApiError on network error', async () => {
		(global.fetch as Mock).mockRejectedValue(new Error('Network failed'));

		try {
			await searchImages({ query: 'test' });
			expect.fail('Should have thrown an error');
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).message).toBe('Network request failed');
		}
	});
});
