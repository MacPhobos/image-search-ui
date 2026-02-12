import { describe, it, expect } from 'vitest';
import { mockResponse, assertCalled, getFetchMock } from '../../helpers/mockFetch';
import {
	createUnknownPersonCandidatesResponse,
	createDiscoveryStats,
	createUnknownPersonCandidateGroup
} from '../../helpers/fixtures';
import {
	triggerDiscovery,
	listUnknownPersonCandidates,
	getUnknownPersonCandidateDetail,
	acceptUnknownPersonCandidate,
	dismissUnknownPersonCandidate,
	getDiscoveryStats
} from '$lib/api/faces';

describe('Unknown Persons API', () => {
	describe('triggerDiscovery', () => {
		it('calls POST /api/v1/faces/unknown-persons/discover', async () => {
			const mockResp = {
				jobId: 'job-123',
				status: 'queued',
				progressKey: 'discovery:job-123',
				params: {}
			};
			mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/discover', mockResp);

			const result = await triggerDiscovery();

			assertCalled('/api/v1/faces/unknown-persons/discover');
			expect(result).toEqual(mockResp);
		});

		it('sends clustering parameters in request body', async () => {
			mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/discover', {
				jobId: 'job-1',
				status: 'queued',
				progressKey: 'key',
				params: {}
			});

			await triggerDiscovery({
				minClusterSize: 10,
				minClusterConfidence: 0.85,
				maxFaces: 5000
			});

			const fetchMock = getFetchMock();
			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.minClusterSize).toBe(10);
			expect(body.minClusterConfidence).toBe(0.85);
			expect(body.maxFaces).toBe(5000);
		});

		it('sends POST method', async () => {
			mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/discover', {
				jobId: 'job-1',
				status: 'queued',
				progressKey: 'key',
				params: {}
			});

			await triggerDiscovery();

			const fetchMock = getFetchMock();
			const [, options] = fetchMock.mock.calls[0];
			expect(options.method).toBe('POST');
		});
	});

	describe('listUnknownPersonCandidates', () => {
		it('calls GET /api/v1/faces/unknown-persons/candidates with query params', async () => {
			createUnknownPersonCandidatesResponse();

			await listUnknownPersonCandidates({
				page: 2,
				groupsPerPage: 25,
				minConfidence: 0.8
			});

			// The function was called (assertCalled uses .includes())
			assertCalled('/api/v1/faces/unknown-persons/candidates');

			// The default response will be {} since URL with query params doesn't exactly match
			// Just verify the URL structure
			const fetchMock = getFetchMock();
			const url = fetchMock.mock.calls[0][0] as string;
			expect(url).toContain('/api/v1/faces/unknown-persons/candidates?');
			expect(url).toContain('page=2');
			expect(url).toContain('groups_per_page=25');
			expect(url).toContain('min_confidence=0.8');
		});

		it('transforms camelCase params to snake_case query params', async () => {
			mockResponse('/.*unknown-persons\\/candidates/', createUnknownPersonCandidatesResponse());

			await listUnknownPersonCandidates({
				page: 1,
				groupsPerPage: 50,
				facesPerGroup: 8,
				minConfidence: 0.75,
				minGroupSize: 5,
				sortBy: 'face_count',
				sortOrder: 'desc'
			});

			const fetchMock = getFetchMock();
			const url = fetchMock.mock.calls[0][0] as string;
			expect(url).toContain('groups_per_page=50');
			expect(url).toContain('faces_per_group=8');
			expect(url).toContain('min_confidence=0.75');
			expect(url).toContain('min_group_size=5');
			expect(url).toContain('sort_by=face_count');
			expect(url).toContain('sort_order=desc');
		});

		it('includes include_dismissed when true', async () => {
			mockResponse('/.*unknown-persons\\/candidates/', createUnknownPersonCandidatesResponse());

			await listUnknownPersonCandidates({ includeDismissed: true });

			const fetchMock = getFetchMock();
			const url = fetchMock.mock.calls[0][0] as string;
			expect(url).toContain('include_dismissed=true');
		});
	});

	describe('getUnknownPersonCandidateDetail', () => {
		it('calls GET /api/v1/faces/unknown-persons/candidates/:groupId', async () => {
			const group = createUnknownPersonCandidateGroup({ groupId: 'cluster_42' });
			mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_42', {
				...group,
				faces: group.sampleFaces
			});

			const result = await getUnknownPersonCandidateDetail('cluster_42');

			assertCalled('/api/v1/faces/unknown-persons/candidates/cluster_42');
			expect(result.groupId).toBe('cluster_42');
		});

		it('encodes groupId in URL', async () => {
			mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/candidates/', {
				groupId: 'group/special',
				faces: []
			});

			try {
				await getUnknownPersonCandidateDetail('group/special');
			} catch {
				// May fail due to URL mocking, but we verify the URL encoding
			}

			const fetchMock = getFetchMock();
			const url = fetchMock.mock.calls[0][0] as string;
			expect(url).toContain('group%2Fspecial');
		});
	});

	describe('acceptUnknownPersonCandidate', () => {
		it('calls POST /api/v1/faces/unknown-persons/candidates/:groupId/accept', async () => {
			const mockResp = {
				personId: 'person-1',
				personName: 'Alice',
				facesAssigned: 8,
				facesExcluded: 0,
				prototypesCreated: 3,
				findMoreJobId: 'job-456',
				reclusteringJobId: null
			};
			mockResponse(
				'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_0/accept',
				mockResp
			);

			const result = await acceptUnknownPersonCandidate('cluster_0', {
				name: 'Alice'
			});

			assertCalled('/api/v1/faces/unknown-persons/candidates/cluster_0/accept');
			expect(result.personId).toBe('person-1');
			expect(result.personName).toBe('Alice');
			expect(result.facesAssigned).toBe(8);
		});

		it('sends name and faceIdsToExclude in request body', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_0/accept',
				{
					personId: 'p-1',
					personName: 'Bob',
					facesAssigned: 6,
					facesExcluded: 2,
					prototypesCreated: 2,
					findMoreJobId: 'j-1',
					reclusteringJobId: null
				}
			);

			await acceptUnknownPersonCandidate('cluster_0', {
				name: 'Bob',
				faceIdsToExclude: ['face-a', 'face-b']
			});

			const fetchMock = getFetchMock();
			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.name).toBe('Bob');
			expect(body.faceIdsToExclude).toEqual(['face-a', 'face-b']);
			expect(options.method).toBe('POST');
		});
	});

	describe('dismissUnknownPersonCandidate', () => {
		it('calls POST /api/v1/faces/unknown-persons/candidates/:groupId/dismiss', async () => {
			const mockResp = {
				groupId: 'cluster_0',
				membershipHash: 'hash-abc',
				facesAffected: 8
			};
			mockResponse(
				'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_0/dismiss',
				mockResp
			);

			const result = await dismissUnknownPersonCandidate('cluster_0');

			assertCalled('/api/v1/faces/unknown-persons/candidates/cluster_0/dismiss');
			expect(result.groupId).toBe('cluster_0');
			expect(result.facesAffected).toBe(8);
		});

		it('sends markAsNoise and reason in request body', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_0/dismiss',
				{ groupId: 'cluster_0', membershipHash: 'hash', facesAffected: 5 }
			);

			await dismissUnknownPersonCandidate('cluster_0', {
				markAsNoise: true,
				reason: 'Not a real person'
			});

			const fetchMock = getFetchMock();
			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.markAsNoise).toBe(true);
			expect(body.reason).toBe('Not a real person');
			expect(options.method).toBe('POST');
		});
	});

	describe('getDiscoveryStats', () => {
		it('calls GET /api/v1/faces/unknown-persons/stats', async () => {
			const mockStats = createDiscoveryStats();
			mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/stats', mockStats);

			const result = await getDiscoveryStats();

			assertCalled('/api/v1/faces/unknown-persons/stats');
			expect(result.totalUnassignedFaces).toBe(50000);
			expect(result.candidateGroups).toBe(42);
			expect(result.avgGroupConfidence).toBe(0.82);
			expect(result.lastDiscoveryAt).toBe('2026-02-11T10:30:00Z');
		});

		it('returns all stats fields', async () => {
			const mockStats = createDiscoveryStats({
				totalClusteredFaces: 20000,
				totalDismissedGroups: 10
			});
			mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/stats', mockStats);

			const result = await getDiscoveryStats();

			expect(result.totalClusteredFaces).toBe(20000);
			expect(result.totalNoiseFaces).toBe(35000);
			expect(result.totalDismissedGroups).toBe(10);
		});
	});
});
