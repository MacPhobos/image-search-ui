import type {
	SearchParams,
	SearchResponse,
	HealthResponse,
	ApiErrorData,
	SearchRequest
} from '$lib/types';
import { env } from '$env/dynamic/public';

const API_BASE_URL = env.PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
		if (params.filters.categoryId) {
			apiFilters['categoryId'] = params.filters.categoryId.toString();
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
 * Search for images using an uploaded image file.
 * Uses POST /api/v1/search/image endpoint.
 */
export async function searchByImage(params: {
	file: File;
	filters?: SearchParams['filters'];
	limit?: number;
	offset?: number;
}): Promise<SearchResponse> {
	const formData = new FormData();
	formData.append('file', params.file);

	// Build query parameters
	const queryParams = new URLSearchParams();
	queryParams.set('limit', String(params.limit ?? 50));
	queryParams.set('offset', String(params.offset ?? 0));

	if (params.filters) {
		if (params.filters.dateFrom) {
			queryParams.set('start_date', params.filters.dateFrom);
		}
		if (params.filters.dateTo) {
			queryParams.set('end_date', params.filters.dateTo);
		}
		if (params.filters.categoryId) {
			queryParams.set('category_id', String(params.filters.categoryId));
		}
		if (params.filters.personId) {
			queryParams.set('person_id', params.filters.personId);
		}
	}

	const url = `${API_BASE_URL}/api/v1/search/image?${queryParams}`;

	try {
		const response = await fetch(url, {
			method: 'POST',
			body: formData
			// Note: Don't set Content-Type header - browser will set it with boundary for multipart/form-data
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
 * Find images similar to an existing asset by ID.
 * Uses GET /api/v1/search/similar/{asset_id} endpoint.
 */
export async function searchSimilar(assetId: number, limit = 50): Promise<SearchResponse> {
	const queryParams = new URLSearchParams();
	queryParams.set('limit', String(limit));
	queryParams.set('exclude_self', 'true');

	return apiRequest<SearchResponse>(`/api/v1/search/similar/${assetId}?${queryParams}`);
}

/**
 * Hybrid search combining text query and image similarity.
 * Uses POST /api/v1/search/hybrid endpoint.
 */
export async function searchHybrid(
	textQuery: string | null,
	imageFile: File | null,
	textWeight: number = 0.5,
	limit: number = 20
): Promise<SearchResponse> {
	const formData = new FormData();

	if (textQuery) {
		formData.append('text_query', textQuery);
	}
	if (imageFile) {
		formData.append('image', imageFile);
	}
	formData.append('text_weight', String(textWeight));
	formData.append('limit', String(limit));

	const url = `${API_BASE_URL}/api/v1/search/hybrid`;

	try {
		const response = await fetch(url, {
			method: 'POST',
			body: formData
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
 * Composed search: modify a reference image with text description.
 * Uses POST /api/v1/search/composed endpoint.
 */
export async function searchComposed(
	referenceImage: File,
	modifierText: string,
	alpha: number = 0.3,
	limit: number = 20
): Promise<SearchResponse> {
	const formData = new FormData();
	formData.append('reference_image', referenceImage);
	formData.append('modifier_text', modifierText);
	formData.append('alpha', String(alpha));
	formData.append('limit', String(limit));

	const url = `${API_BASE_URL}/api/v1/search/composed`;

	try {
		const response = await fetch(url, {
			method: 'POST',
			body: formData
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
 * Check backend health status.
 * Uses GET /health endpoint (no /api/v1 prefix).
 */
export async function checkHealth(): Promise<HealthResponse> {
	return apiRequest<HealthResponse>('/health');
}

export { API_BASE_URL };
