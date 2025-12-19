import type { ApiResponse, SearchParams, SearchResult } from '$lib/types';
import { env } from '$env/dynamic/public';

const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public data?: unknown
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
		throw new ApiError('Network request failed', 0, error);
	}
}

export async function searchImages(params: SearchParams): Promise<ApiResponse<SearchResult[]>> {
	const queryParams = new URLSearchParams({
		q: params.query,
		...(params.page && { page: params.page.toString() }),
		...(params.pageSize && { pageSize: params.pageSize.toString() })
	});

	// Add filters to query params if provided
	if (params.filters) {
		if (params.filters.category) {
			queryParams.append('category', params.filters.category);
		}
		if (params.filters.sortBy) {
			queryParams.append('sortBy', params.filters.sortBy);
		}
	}

	return apiRequest<ApiResponse<SearchResult[]>>(`/api/search?${queryParams.toString()}`);
}

export { ApiError };
