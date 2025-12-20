import type { Asset, SearchResult, SearchResponse } from '$lib/types';
import type { Category, PaginatedCategoryResponse } from '$lib/api/categories';

/**
 * Create a test Asset with sensible defaults
 */
export function createAsset(overrides?: Partial<Asset>): Asset {
	const id = overrides?.id ?? 1;
	const path = overrides?.path ?? '/photos/test-image.jpg';
	const filename = path.split('/').pop() || 'test-image.jpg';

	const defaults: Asset = {
		id,
		path,
		createdAt: '2024-12-19T10:00:00Z',
		indexedAt: '2024-12-19T10:01:00Z',
		url: `/api/v1/images/${id}/full`,
		thumbnailUrl: `/api/v1/images/${id}/thumbnail`,
		filename
	};

	return { ...defaults, ...overrides };
}

/**
 * Create a test SearchResult with asset and score
 */
export function createSearchResult(overrides?: Partial<SearchResult>): SearchResult {
	const defaults: SearchResult = {
		asset: createAsset(),
		score: 0.85,
		highlights: ['test', 'image']
	};

	// Merge overrides, handling nested asset object
	const result = { ...defaults, ...overrides };
	if (overrides?.asset) {
		result.asset = { ...defaults.asset, ...overrides.asset };
	}

	return result;
}

/**
 * Create a full SearchResponse with results
 */
export function createSearchResponse(
	results?: SearchResult[],
	query: string = 'test'
): SearchResponse {
	const defaultResults = results ?? [createSearchResult()];

	return {
		results: defaultResults,
		total: defaultResults.length,
		query
	};
}

/**
 * Create multiple search results with pagination
 */
export function createPaginatedResults(count: number, startId: number = 1): SearchResult[] {
	return Array.from({ length: count }, (_, i) => {
		const id = startId + i;
		return createSearchResult({
			asset: createAsset({
				id,
				path: `/photos/image-${id}.jpg`,
				createdAt: new Date(2024, 11, 19, 10, i).toISOString()
			}),
			score: 0.9 - i * 0.05,
			highlights: [`result-${id}`]
		});
	});
}

/**
 * Create a beach-themed search result (commonly used in tests)
 */
export function createBeachResult(overrides?: Partial<SearchResult>): SearchResult {
	return createSearchResult({
		asset: createAsset({
			id: 1,
			path: '/photos/beach-sunset.jpg',
			createdAt: '2024-12-19T10:00:00Z',
			indexedAt: '2024-12-19T10:01:00Z'
		}),
		score: 0.95,
		highlights: ['beach', 'sunset', 'ocean'],
		...overrides
	});
}

/**
 * Create a mountain-themed search result (commonly used in tests)
 */
export function createMountainResult(overrides?: Partial<SearchResult>): SearchResult {
	return createSearchResult({
		asset: createAsset({
			id: 2,
			path: '/photos/mountain-view.jpg',
			createdAt: '2024-12-18T09:00:00Z',
			indexedAt: null
		}),
		score: 0.78,
		highlights: ['mountain'],
		...overrides
	});
}

/**
 * Create an empty search response (no results)
 */
export function createEmptySearchResponse(query: string = 'nonexistent'): SearchResponse {
	return {
		results: [],
		total: 0,
		query
	};
}

/**
 * Create a test Category with sensible defaults
 */
export function createCategory(overrides?: Partial<Category>): Category {
	const id = overrides?.id ?? 1;
	const name = overrides?.name ?? `Category ${id}`;

	const defaults: Category = {
		id,
		name,
		description: null,
		color: null,
		isDefault: false,
		createdAt: '2024-12-19T10:00:00Z',
		updatedAt: '2024-12-19T10:00:00Z',
		sessionCount: 0
	};

	return { ...defaults, ...overrides };
}

/**
 * Create a paginated category response
 */
export function createCategoryResponse(
	categories?: Category[],
	page: number = 1,
	pageSize: number = 50
): PaginatedCategoryResponse {
	const items = categories ?? [createCategory()];

	return {
		items,
		total: items.length,
		page,
		pageSize,
		hasMore: false
	};
}

/**
 * Create a default "Uncategorized" category
 */
export function createDefaultCategory(): Category {
	return createCategory({
		id: 1,
		name: 'Uncategorized',
		description: 'Default category for uncategorized images',
		color: '#6B7280',
		isDefault: true
	});
}

/**
 * Create multiple categories for testing
 */
export function createMultipleCategories(count: number, startId: number = 1): Category[] {
	return Array.from({ length: count }, (_, i) => {
		const id = startId + i;
		const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
		return createCategory({
			id,
			name: `Category ${id}`,
			description: `Description for category ${id}`,
			color: colors[i % colors.length],
			sessionCount: i * 3
		});
	});
}
