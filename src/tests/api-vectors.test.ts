import { describe, it, expect } from 'vitest';
import {
	getDirectoryStats,
	deleteVectorsByDirectory,
	retrainDirectory,
	deleteVectorsByAsset,
	deleteVectorsBySession,
	deleteVectorsByCategory,
	cleanupOrphanVectors,
	resetCollection,
	getDeletionLogs
} from '$lib/api/vectors';
import { ApiError } from '$lib/api/client';
import { mockResponse, mockError, getFetchMock } from './helpers/mockFetch';
import {
	createDirectoryStatsResponse,
	createDeletionLogsResponse,
	createMultipleDirectories,
	createMultipleDeletionLogs
} from './helpers/fixtures';

describe('Vectors API Client', () => {
	describe('getDirectoryStats', () => {
		it('makes correct GET API call and returns directory statistics', async () => {
			const mockData = createDirectoryStatsResponse(createMultipleDirectories(3));
			mockResponse('http://localhost:8000/api/v1/vectors/directories/stats', mockData);

			const result = await getDirectoryStats();

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/directories/stats',
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);

			expect(result.directories).toHaveLength(3);
			expect(result.totalVectors).toBe(300); // 50 + 100 + 150
			expect(result.directories[0].pathPrefix).toBe('/photos/dir-1');
		});

		it('handles empty directory list', async () => {
			const mockData = createDirectoryStatsResponse([]);
			mockResponse('http://localhost:8000/api/v1/vectors/directories/stats', mockData);

			const result = await getDirectoryStats();

			expect(result.directories).toHaveLength(0);
			expect(result.totalVectors).toBe(0);
		});

		it('throws ApiError on HTTP error', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/vectors/directories/stats',
				{ detail: 'Database connection failed' },
				503
			);

			try {
				await getDirectoryStats();
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).status).toBe(503);
			}
		});
	});

	describe('deleteVectorsByDirectory', () => {
		it('makes correct DELETE API call with request body', async () => {
			const mockData = {
				pathPrefix: '/photos/vacation',
				vectorsDeleted: 150,
				message: 'Successfully deleted 150 vectors'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/by-directory', mockData);

			const result = await deleteVectorsByDirectory({
				pathPrefix: '/photos/vacation',
				deletionReason: 'Cleanup old photos',
				confirm: true
			});

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/by-directory',
				expect.objectContaining({
					method: 'DELETE',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify({
						pathPrefix: '/photos/vacation',
						deletionReason: 'Cleanup old photos',
						confirm: true
					})
				})
			);

			expect(result.vectorsDeleted).toBe(150);
			expect(result.message).toContain('150 vectors');
		});

		it('handles deletion without reason', async () => {
			const mockData = {
				pathPrefix: '/photos/test',
				vectorsDeleted: 50,
				message: 'Successfully deleted 50 vectors'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/by-directory', mockData);

			await deleteVectorsByDirectory({
				pathPrefix: '/photos/test',
				confirm: true
			});

			const fetchMock = getFetchMock();
			const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
			expect(callBody.deletionReason).toBeUndefined();
		});

		it('throws ApiError when confirmation is false', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/vectors/by-directory',
				{ detail: 'Confirmation required' },
				400
			);

			try {
				await deleteVectorsByDirectory({
					pathPrefix: '/photos/test',
					confirm: false
				});
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).status).toBe(400);
			}
		});
	});

	describe('retrainDirectory', () => {
		it('makes correct POST API call with retrain request', async () => {
			const mockData = {
				pathPrefix: '/photos/2024',
				vectorsDeleted: 200,
				newSessionId: 42,
				message: 'Successfully retrained directory'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/retrain', mockData);

			const result = await retrainDirectory({
				pathPrefix: '/photos/2024',
				categoryId: 5,
				deletionReason: 'Model update'
			});

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/retrain',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify({
						pathPrefix: '/photos/2024',
						categoryId: 5,
						deletionReason: 'Model update'
					})
				})
			);

			expect(result.vectorsDeleted).toBe(200);
			expect(result.newSessionId).toBe(42);
		});

		it('handles retrain without deletion reason', async () => {
			const mockData = {
				pathPrefix: '/photos/test',
				vectorsDeleted: 100,
				newSessionId: 10,
				message: 'Success'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/retrain', mockData);

			await retrainDirectory({
				pathPrefix: '/photos/test',
				categoryId: 1
			});

			const fetchMock = getFetchMock();
			const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
			expect(callBody.categoryId).toBe(1);
			expect(callBody.deletionReason).toBeUndefined();
		});
	});

	describe('deleteVectorsByAsset', () => {
		it('makes correct DELETE API call for asset', async () => {
			const mockData = {
				vectorsDeleted: 5,
				message: 'Successfully deleted 5 vectors for asset 123'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/by-asset/123', mockData);

			const result = await deleteVectorsByAsset(123);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/by-asset/123',
				expect.objectContaining({
					method: 'DELETE'
				})
			);

			expect(result.vectorsDeleted).toBe(5);
		});
	});

	describe('deleteVectorsBySession', () => {
		it('makes correct DELETE API call for session', async () => {
			const mockData = {
				vectorsDeleted: 250,
				message: 'Successfully deleted 250 vectors for session 42'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/by-session/42', mockData);

			const result = await deleteVectorsBySession(42);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/by-session/42',
				expect.objectContaining({
					method: 'DELETE'
				})
			);

			expect(result.vectorsDeleted).toBe(250);
		});
	});

	describe('deleteVectorsByCategory', () => {
		it('makes correct DELETE API call for category', async () => {
			const mockData = {
				vectorsDeleted: 500,
				message: 'Successfully deleted 500 vectors for category 7'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/by-category/7', mockData);

			const result = await deleteVectorsByCategory(7);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/by-category/7',
				expect.objectContaining({
					method: 'DELETE'
				})
			);

			expect(result.vectorsDeleted).toBe(500);
		});
	});

	describe('cleanupOrphanVectors', () => {
		it('makes correct POST API call for orphan cleanup', async () => {
			const mockData = {
				vectorsDeleted: 75,
				message: 'Successfully cleaned up 75 orphan vectors'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/cleanup-orphans', mockData);

			const result = await cleanupOrphanVectors({
				confirm: true,
				deletionReason: 'Regular maintenance'
			});

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/cleanup-orphans',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify({
						confirm: true,
						deletionReason: 'Regular maintenance'
					})
				})
			);

			expect(result.vectorsDeleted).toBe(75);
		});

		it('handles cleanup without reason', async () => {
			const mockData = {
				vectorsDeleted: 0,
				message: 'No orphan vectors found'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/cleanup-orphans', mockData);

			const result = await cleanupOrphanVectors({ confirm: true });

			expect(result.vectorsDeleted).toBe(0);
		});
	});

	describe('resetCollection', () => {
		it('makes correct POST API call for full reset', async () => {
			const mockData = {
				vectorsDeleted: 10000,
				message: 'Successfully reset collection'
			};
			mockResponse('http://localhost:8000/api/v1/vectors/reset', mockData);

			const result = await resetCollection({
				confirm: true,
				confirmationText: 'DELETE ALL VECTORS',
				deletionReason: 'Full rebuild'
			});

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/vectors/reset',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify({
						confirm: true,
						confirmationText: 'DELETE ALL VECTORS',
						deletionReason: 'Full rebuild'
					})
				})
			);

			expect(result.vectorsDeleted).toBe(10000);
		});

		it('throws ApiError when confirmation text is incorrect', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/vectors/reset',
				{ detail: 'Incorrect confirmation text' },
				400
			);

			try {
				await resetCollection({
					confirm: true,
					confirmationText: 'wrong text',
					deletionReason: 'mistake'
				});
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).status).toBe(400);
			}
		});
	});

	describe('getDeletionLogs', () => {
		it('makes correct GET API call with pagination parameters', async () => {
			const mockData = createDeletionLogsResponse(createMultipleDeletionLogs(10), 1, 20);
			mockResponse(
				'http://localhost:8000/api/v1/vectors/deletion-logs?page=1&page_size=20',
				mockData
			);

			const result = await getDeletionLogs(1, 20);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/vectors/deletion-logs'),
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);

			const url = fetchMock.mock.calls[0][0];
			expect(url).toContain('page=1');
			expect(url).toContain('page_size=20');

			expect(result.logs).toHaveLength(10);
			expect(result.total).toBe(10);
			expect(result.page).toBe(1);
			expect(result.pageSize).toBe(20);
		});

		it('uses default pagination values when not provided', async () => {
			const mockData = createDeletionLogsResponse(createMultipleDeletionLogs(5));
			mockResponse(
				'http://localhost:8000/api/v1/vectors/deletion-logs?page=1&page_size=20',
				mockData
			);

			await getDeletionLogs();

			const fetchMock = getFetchMock();
			const url = fetchMock.mock.calls[0][0];
			expect(url).toContain('page=1');
			expect(url).toContain('page_size=20');
		});

		it('handles empty deletion logs', async () => {
			const mockData = createDeletionLogsResponse([]);
			mockResponse(
				'http://localhost:8000/api/v1/vectors/deletion-logs?page=1&page_size=20',
				mockData
			);

			const result = await getDeletionLogs();

			expect(result.logs).toHaveLength(0);
			expect(result.total).toBe(0);
		});

		it('handles different log types correctly', async () => {
			const logs = [
				createMultipleDeletionLogs(1)[0],
				{ ...createMultipleDeletionLogs(1)[0], deletionType: 'SESSION', id: 2 },
				{ ...createMultipleDeletionLogs(1)[0], deletionType: 'ORPHAN', id: 3 }
			];
			const mockData = createDeletionLogsResponse(logs);
			mockResponse(
				'http://localhost:8000/api/v1/vectors/deletion-logs?page=1&page_size=20',
				mockData
			);

			const result = await getDeletionLogs();

			expect(result.logs[0].deletionType).toBe('DIRECTORY');
			expect(result.logs[1].deletionType).toBe('SESSION');
			expect(result.logs[2].deletionType).toBe('ORPHAN');
		});

		it('throws ApiError on network error', async () => {
			mockError(
				'http://localhost:8000/api/v1/vectors/deletion-logs?page=1&page_size=20',
				new Error('Network failed')
			);

			try {
				await getDeletionLogs();
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).message).toBe('Network request failed');
			}
		});
	});
});
