import type {
	SearchParams,
	SearchResponse,
	HealthResponse,
	ApiErrorData,
	SearchRequest
} from '$lib/types';
import { env } from '$env/dynamic/public';

const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public data?: ApiErrorData
	) {
		super(message);
		this.name = 'ApiError';
	}
}

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
				errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
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

/**
 * Search for images using semantic search.
 * Uses POST /api/v1/search endpoint.
 */
export async function searchImages(params: SearchParams): Promise<SearchResponse> {
	// Convert frontend SearchParams to API SearchRequest
	const requestBody: SearchRequest = {
		query: params.query,
		limit: params.limit ?? 50,
		offset: params.offset ?? 0,
		filters: undefined
	};

	// Convert date filters to API format if provided
	if (params.filters) {
		const apiFilters: Record<string, string> = {};
		if (params.filters.dateFrom) {
			apiFilters['dateFrom'] = params.filters.dateFrom;
		}
		if (params.filters.dateTo) {
			apiFilters['dateTo'] = params.filters.dateTo;
		}
		if (params.filters.personId) {
			apiFilters['personId'] = params.filters.personId;
		}
		if (Object.keys(apiFilters).length > 0) {
			requestBody.filters = apiFilters;
		}
	}

	return apiRequest<SearchResponse>('/api/v1/search', {
		method: 'POST',
		body: JSON.stringify(requestBody)
	});
}

/**
 * Check backend health status.
 * Uses GET /health endpoint (no /api/v1 prefix).
 */
export async function checkHealth(): Promise<HealthResponse> {
	return apiRequest<HealthResponse>('/health');
}

export { API_BASE_URL };
