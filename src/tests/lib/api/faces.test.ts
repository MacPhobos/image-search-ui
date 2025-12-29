import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listUnifiedPeople } from '$lib/api/faces';
import { mockResponse, mockError, getFetchMock } from '../../helpers/mockFetch';
import { createUnifiedPeopleResponse, createIdentifiedPerson, createUnidentifiedPerson } from '../../helpers/fixtures';

describe('listUnifiedPeople', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch unified people list with default parameters', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse('http://localhost:8000/api/v1/faces/people', mockData);

		const result = await listUnifiedPeople();

		expect(result).toEqual(mockData);
		const fetchMock = getFetchMock();
		expect(fetchMock).toHaveBeenCalledWith(
			'http://localhost:8000/api/v1/faces/people',
			expect.objectContaining({
				headers: expect.objectContaining({
					'Content-Type': 'application/json'
				})
			})
		);
	});

	it('should pass includeIdentified filter parameter', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse(
			'http://localhost:8000/api/v1/faces/people?include_identified=true',
			mockData
		);

		await listUnifiedPeople({
			includeIdentified: true
		});

		const fetchMock = getFetchMock();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('include_identified=true'),
			expect.any(Object)
		);
	});

	it('should pass includeUnidentified filter parameter', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse(
			'http://localhost:8000/api/v1/faces/people?include_unidentified=false',
			mockData
		);

		await listUnifiedPeople({
			includeUnidentified: false
		});

		const fetchMock = getFetchMock();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('include_unidentified=false'),
			expect.any(Object)
		);
	});

	it('should pass includeNoise filter parameter', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse(
			'http://localhost:8000/api/v1/faces/people?include_noise=true',
			mockData
		);

		await listUnifiedPeople({
			includeNoise: true
		});

		const fetchMock = getFetchMock();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('include_noise=true'),
			expect.any(Object)
		);
	});

	it('should pass sortBy parameter and convert faceCount to face_count', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse(
			'http://localhost:8000/api/v1/faces/people?sort_by=face_count',
			mockData
		);

		await listUnifiedPeople({
			sortBy: 'faceCount'
		});

		const fetchMock = getFetchMock();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('sort_by=face_count'),
			expect.any(Object)
		);
	});

	it('should pass sortBy parameter with name unchanged', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse(
			'http://localhost:8000/api/v1/faces/people?sort_by=name',
			mockData
		);

		await listUnifiedPeople({
			sortBy: 'name'
		});

		const fetchMock = getFetchMock();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('sort_by=name'),
			expect.any(Object)
		);
	});

	it('should pass sortOrder parameter', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse(
			'http://localhost:8000/api/v1/faces/people?sort_order=asc',
			mockData
		);

		await listUnifiedPeople({
			sortOrder: 'asc'
		});

		const fetchMock = getFetchMock();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('sort_order=asc'),
			expect.any(Object)
		);
	});

	it('should pass multiple filter parameters with faceCount conversion', async () => {
		const mockData = createUnifiedPeopleResponse();
		mockResponse(
			'http://localhost:8000/api/v1/faces/people?include_identified=true&include_unidentified=false&include_noise=false&sort_by=face_count&sort_order=desc',
			mockData
		);

		await listUnifiedPeople({
			includeIdentified: true,
			includeUnidentified: false,
			includeNoise: false,
			sortBy: 'faceCount',
			sortOrder: 'desc'
		});

		const fetchMock = getFetchMock();
		const callUrl = fetchMock.mock.calls[0][0] as string;
		expect(callUrl).toContain('include_identified=true');
		expect(callUrl).toContain('include_unidentified=false');
		expect(callUrl).toContain('include_noise=false');
		expect(callUrl).toContain('sort_by=face_count');
		expect(callUrl).toContain('sort_order=desc');
	});

	it('should transform relative thumbnail URLs to absolute URLs', async () => {
		const mockData = createUnifiedPeopleResponse([
			createIdentifiedPerson({
				id: 'uuid-1',
				name: 'Alice',
				thumbnailUrl: '/api/v1/images/1/thumbnail'
			}),
			createUnidentifiedPerson({
				id: 'clu_1',
				name: 'Unidentified Person 1',
				thumbnailUrl: null
			})
		]);

		mockResponse('http://localhost:8000/api/v1/faces/people', mockData);

		const result = await listUnifiedPeople();

		// Identified person with relative URL should be converted to absolute
		expect(result.people[0].thumbnailUrl).toBe(
			'http://localhost:8000/api/v1/images/1/thumbnail'
		);

		// Unidentified person with null should remain null
		expect(result.people[1].thumbnailUrl).toBeNull();
	});

	it('should preserve absolute thumbnail URLs', async () => {
		const absoluteUrl = 'http://example.com/thumbnail.jpg';
		const mockData = createUnifiedPeopleResponse([
			createIdentifiedPerson({
				id: 'uuid-1',
				name: 'Alice',
				thumbnailUrl: absoluteUrl
			})
		]);

		mockResponse('http://localhost:8000/api/v1/faces/people', mockData);

		const result = await listUnifiedPeople();

		// Absolute URL should be unchanged
		expect(result.people[0].thumbnailUrl).toBe(absoluteUrl);
	});

	it('should return correct counts for different person types', async () => {
		const mockData = createUnifiedPeopleResponse();

		mockResponse('http://localhost:8000/api/v1/faces/people', mockData);

		const result = await listUnifiedPeople();

		expect(result.identifiedCount).toBe(2);
		expect(result.unidentifiedCount).toBe(1);
		expect(result.noiseCount).toBe(1);
		expect(result.total).toBe(4);
	});

	it('should throw ApiError on HTTP error response', async () => {
		mockError(
			'http://localhost:8000/api/v1/faces/people',
			500,
			{ message: 'Internal server error', detail: 'Database connection failed' }
		);

		await expect(listUnifiedPeople()).rejects.toThrow('Internal server error');
	});

	it('should throw ApiError on network failure', async () => {
		mockError(
			'http://localhost:8000/api/v1/faces/people',
			new Error('Network error')
		);

		await expect(listUnifiedPeople()).rejects.toThrow();
	});

	it('should handle empty people list', async () => {
		const emptyData = createUnifiedPeopleResponse([]);

		mockResponse('http://localhost:8000/api/v1/faces/people', emptyData);

		const result = await listUnifiedPeople();

		expect(result.people).toEqual([]);
		expect(result.total).toBe(0);
		expect(result.identifiedCount).toBe(0);
		expect(result.unidentifiedCount).toBe(0);
		expect(result.noiseCount).toBe(0);
	});
});
