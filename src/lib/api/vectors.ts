/**
 * Vector management API client functions.
 *
 * @example
 * ```typescript
 * // Get directory statistics
 * const stats = await getDirectoryStats();
 * console.log(stats.totalVectors);
 *
 * // Delete vectors for a directory
 * const result = await deleteVectorsByDirectory({
 *   pathPrefix: '/photos/2024',
 *   deletionReason: 'Cleanup old photos',
 *   confirm: true
 * });
 *
 * // Retrain a directory (delete + create new session)
 * const retrain = await retrainDirectory({
 *   pathPrefix: '/photos/2024',
 *   categoryId: 1,
 *   deletionReason: 'Model update'
 * });
 *
 * // Get deletion history
 * const logs = await getDeletionLogs(1, 20);
 * ```
 */

import { env } from '$env/dynamic/public';
import { ApiError } from './client';

const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options?.headers
			}
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => null);
			throw new ApiError(
				errorData?.message ||
					errorData?.detail ||
					`HTTP ${response.status}: ${response.statusText}`,
				response.status,
				errorData
			);
		}

		// Handle 204 No Content
		if (response.status === 204) {
			return undefined as T;
		}

		return await response.json();
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError('Network request failed', 0, undefined);
	}
}

// Types

export interface DirectoryStats {
	pathPrefix: string;
	vectorCount: number;
	lastIndexed: string | null;
}

export interface DirectoryStatsResponse {
	directories: DirectoryStats[];
	totalVectors: number;
}

export interface DirectoryDeleteRequest {
	pathPrefix: string;
	deletionReason?: string;
	confirm: boolean;
}

export interface DirectoryDeleteResponse {
	pathPrefix: string;
	vectorsDeleted: number;
	message: string;
}

export interface RetrainRequest {
	pathPrefix: string;
	categoryId: number;
	deletionReason?: string;
}

export interface RetrainResponse {
	pathPrefix: string;
	vectorsDeleted: number;
	newSessionId: number;
	message: string;
}

export interface DeletionResponse {
	vectorsDeleted: number;
	message: string;
}

export interface OrphanCleanupRequest {
	confirm: boolean;
	deletionReason?: string;
}

export interface ResetRequest {
	confirm: boolean;
	confirmationText: string;
	deletionReason?: string;
}

export interface DeletionLogEntry {
	id: number;
	deletionType: string;
	deletionTarget: string;
	vectorCount: number;
	deletionReason: string | null;
	createdAt: string;
}

export interface DeletionLogsResponse {
	logs: DeletionLogEntry[];
	total: number;
	page: number;
	pageSize: number;
}

// API Functions

/**
 * Get statistics about vectors grouped by directory path prefix.
 */
export async function getDirectoryStats(): Promise<DirectoryStatsResponse> {
	return apiRequest<DirectoryStatsResponse>('/api/v1/vectors/directories/stats');
}

/**
 * Delete all vectors for a specific directory path prefix.
 */
export async function deleteVectorsByDirectory(
	request: DirectoryDeleteRequest
): Promise<DirectoryDeleteResponse> {
	return apiRequest<DirectoryDeleteResponse>('/api/v1/vectors/by-directory', {
		method: 'DELETE',
		body: JSON.stringify(request)
	});
}

/**
 * Delete all vectors for a directory and create a new training session.
 */
export async function retrainDirectory(request: RetrainRequest): Promise<RetrainResponse> {
	return apiRequest<RetrainResponse>('/api/v1/vectors/retrain', {
		method: 'POST',
		body: JSON.stringify(request)
	});
}

/**
 * Delete all vectors associated with a specific asset.
 */
export async function deleteVectorsByAsset(assetId: number): Promise<DeletionResponse> {
	return apiRequest<DeletionResponse>(`/api/v1/vectors/by-asset/${assetId}`, {
		method: 'DELETE'
	});
}

/**
 * Delete all vectors associated with a specific training session.
 */
export async function deleteVectorsBySession(sessionId: number): Promise<DeletionResponse> {
	return apiRequest<DeletionResponse>(`/api/v1/vectors/by-session/${sessionId}`, {
		method: 'DELETE'
	});
}

/**
 * Delete all vectors associated with a specific category.
 */
export async function deleteVectorsByCategory(categoryId: number): Promise<DeletionResponse> {
	return apiRequest<DeletionResponse>(`/api/v1/vectors/by-category/${categoryId}`, {
		method: 'DELETE'
	});
}

/**
 * Clean up orphaned vectors that have no corresponding assets in the database.
 */
export async function cleanupOrphanVectors(
	request: OrphanCleanupRequest
): Promise<DeletionResponse> {
	return apiRequest<DeletionResponse>('/api/v1/vectors/cleanup-orphans', {
		method: 'POST',
		body: JSON.stringify(request)
	});
}

/**
 * Reset the entire vector collection (delete all vectors).
 * Requires confirmation text "DELETE ALL VECTORS".
 */
export async function resetCollection(request: ResetRequest): Promise<DeletionResponse> {
	return apiRequest<DeletionResponse>('/api/v1/vectors/reset', {
		method: 'POST',
		body: JSON.stringify(request)
	});
}

/**
 * Get deletion history logs with pagination.
 */
export async function getDeletionLogs(
	page: number = 1,
	pageSize: number = 20
): Promise<DeletionLogsResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	return apiRequest<DeletionLogsResponse>(`/api/v1/vectors/deletion-logs?${params.toString()}`);
}
