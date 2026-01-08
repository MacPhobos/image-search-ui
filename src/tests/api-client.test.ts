import { describe, it, expect } from 'vitest';
import { searchImages, checkHealth, ApiError } from '$lib/api/client';
import { regenerateSuggestions } from '$lib/api/faces';
import { mockResponse, mockError, getFetchMock } from './helpers/mockFetch';
import { createSearchResponse, createBeachResult } from './helpers/fixtures';

describe('API Client', () => {
	describe('searchImages', () => {
		it('makes correct POST API call with query', async () => {
			const mockData = createSearchResponse([createBeachResult()], 'test');
			mockResponse('http://localhost:8000/api/v1/search', mockData);

			const result = await searchImages({ query: 'test' });

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
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

			expect(result).toEqual(mockData);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].asset.path).toBe('/photos/beach-sunset.jpg');
		});

		it('includes filters in request body when provided', async () => {
			const mockData = createSearchResponse([], 'test');
			mockResponse('http://localhost:8000/api/v1/search', mockData);

			await searchImages({
				query: 'test',
				filters: {
					dateFrom: '2024-01-01',
					dateTo: '2024-12-31'
				},
				limit: 20,
				offset: 10
			});

			const fetchMock = getFetchMock();
			const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
			expect(callBody.query).toBe('test');
			expect(callBody.limit).toBe(20);
			expect(callBody.offset).toBe(10);
			expect(callBody.filters).toEqual({
				dateFrom: '2024-01-01',
				dateTo: '2024-12-31'
			});
		});

		it('includes categoryId filter as string in request body', async () => {
			const mockData = createSearchResponse([], 'test');
			mockResponse('http://localhost:8000/api/v1/search', mockData);

			await searchImages({
				query: 'test',
				filters: {
					categoryId: 42
				}
			});

			const fetchMock = getFetchMock();
			const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
			expect(callBody.filters).toEqual({
				categoryId: '42'
			});
		});

		it('includes all filter types together', async () => {
			const mockData = createSearchResponse([], 'test');
			mockResponse('http://localhost:8000/api/v1/search', mockData);

			await searchImages({
				query: 'test',
				filters: {
					dateFrom: '2024-01-01',
					dateTo: '2024-12-31',
					personId: 'person-123',
					categoryId: 5
				}
			});

			const fetchMock = getFetchMock();
			const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
			expect(callBody.filters).toEqual({
				dateFrom: '2024-01-01',
				dateTo: '2024-12-31',
				personId: 'person-123',
				categoryId: '5'
			});
		});

		it('throws ApiError on HTTP error', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/search',
				{
					error: 'SERVICE_UNAVAILABLE',
					message: 'Search service is not available'
				},
				503
			);

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
			mockError('http://localhost:8000/api/v1/search', new Error('Network failed'));

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
			mockResponse('http://localhost:8000/health', { status: 'ok' });

			const result = await checkHealth();

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
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
			mockError('http://localhost:8000/health', new Error('Connection refused'));

			try {
				await checkHealth();
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).message).toBe('Network request failed');
			}
		});
	});

	describe('regenerateSuggestions', () => {
		it('calls correct endpoint and returns result', async () => {
			const mockData = {
				status: 'queued',
				message: 'Suggestion regeneration queued',
				expiredCount: 5
			};
			mockResponse(
				'http://localhost:8000/api/v1/faces/persons/person-123/suggestions/regenerate',
				mockData
			);

			const result = await regenerateSuggestions('person-123');

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/faces/persons/person-123/suggestions/regenerate',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);

			expect(result.status).toBe('queued');
			expect(result.message).toBe('Suggestion regeneration queued');
			expect(result.expiredCount).toBe(5);
		});

		it('handles response without expiredCount', async () => {
			const mockData = {
				status: 'queued',
				message: 'Suggestion regeneration queued'
			};
			mockResponse(
				'http://localhost:8000/api/v1/faces/persons/person-456/suggestions/regenerate',
				mockData
			);

			const result = await regenerateSuggestions('person-456');

			expect(result.status).toBe('queued');
			expect(result.message).toBe('Suggestion regeneration queued');
			expect(result.expiredCount).toBeUndefined();
		});

		it('throws ApiError on failure', async () => {
			mockError(
				'http://localhost:8000/api/v1/faces/persons/person-999/suggestions/regenerate',
				400,
				{
					detail: 'No prototypes found for person'
				}
			);

			try {
				await regenerateSuggestions('person-999');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).status).toBe(400);
				expect((error as ApiError).message).toContain('No prototypes found');
			}
		});

		it('handles network errors', async () => {
			mockError(
				'http://localhost:8000/api/v1/faces/persons/person-error/suggestions/regenerate',
				new Error('Network failed')
			);

			try {
				await regenerateSuggestions('person-error');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).message).toBe('Network request failed');
				expect((error as ApiError).status).toBe(0);
			}
		});
	});
});
