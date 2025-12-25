/**
 * Admin API client functions for system-wide administrative operations.
 *
 * @example
 * ```typescript
 * // Delete all application data
 * const result = await deleteAllData({
 *   confirm: true,
 *   confirmationText: 'DELETE ALL DATA',
 *   reason: 'Development reset'
 * });
 * console.log(result.message);
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

		return await response.json();
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError('Network request failed', 0, undefined);
	}
}

// Types

export interface DeleteAllDataRequest {
	confirm: boolean;
	confirmationText: string;
	reason?: string;
}

export interface DeleteAllDataResponse {
	qdrantCollectionsDeleted: Record<string, number>;
	postgresTruncated: Record<string, number>;
	alembicVersionPreserved: string;
	message: string;
	timestamp: string;
}

// API Functions

/**
 * Delete all application data (vectors and database records).
 * Requires confirmation text "DELETE ALL DATA".
 * WARNING: This is a destructive operation that cannot be undone.
 */
export async function deleteAllData(
	request: DeleteAllDataRequest
): Promise<DeleteAllDataResponse> {
	return apiRequest<DeleteAllDataResponse>('/api/v1/admin/data/delete-all', {
		method: 'POST',
		body: JSON.stringify(request)
	});
}
