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

// Vector Management Fixtures

import type {
	DirectoryStats,
	DeletionLogEntry,
	DirectoryStatsResponse,
	DeletionLogsResponse
} from '$lib/api/vectors';

/**
 * Create a test DirectoryStats with sensible defaults
 */
export function createDirectoryStats(overrides?: Partial<DirectoryStats>): DirectoryStats {
	const defaults: DirectoryStats = {
		pathPrefix: '/photos/vacation',
		vectorCount: 150,
		lastIndexed: '2024-12-19T10:00:00Z'
	};

	return { ...defaults, ...overrides };
}

/**
 * Create a test DeletionLogEntry with sensible defaults
 */
export function createDeletionLog(overrides?: Partial<DeletionLogEntry>): DeletionLogEntry {
	const defaults: DeletionLogEntry = {
		id: 1,
		deletionType: 'DIRECTORY',
		deletionTarget: '/photos/vacation',
		vectorCount: 150,
		deletionReason: 'Cleanup',
		createdAt: '2024-12-19T10:00:00Z'
	};

	return { ...defaults, ...overrides };
}

/**
 * Create a DirectoryStatsResponse with multiple directories
 */
export function createDirectoryStatsResponse(
	directories?: DirectoryStats[]
): DirectoryStatsResponse {
	const items = directories ?? [createDirectoryStats()];
	const totalVectors = items.reduce((sum, d) => sum + d.vectorCount, 0);

	return {
		directories: items,
		totalVectors
	};
}

/**
 * Create a DeletionLogsResponse with pagination
 */
export function createDeletionLogsResponse(
	logs?: DeletionLogEntry[],
	page: number = 1,
	pageSize: number = 10
): DeletionLogsResponse {
	const items = logs ?? [createDeletionLog()];

	return {
		logs: items,
		total: items.length,
		page,
		pageSize
	};
}

/**
 * Create multiple directory stats for testing
 */
export function createMultipleDirectories(count: number): DirectoryStats[] {
	return Array.from({ length: count }, (_, i) => {
		return createDirectoryStats({
			pathPrefix: `/photos/dir-${i + 1}`,
			vectorCount: (i + 1) * 50,
			lastIndexed: i % 2 === 0 ? new Date(2024, 11, 19 - i).toISOString() : null
		});
	});
}

/**
 * Create multiple deletion logs for testing
 */
export function createMultipleDeletionLogs(count: number): DeletionLogEntry[] {
	const types = ['DIRECTORY', 'SESSION', 'CATEGORY', 'ASSET', 'ORPHAN'];
	return Array.from({ length: count }, (_, i) => {
		const type = types[i % types.length];
		return createDeletionLog({
			id: i + 1,
			deletionType: type,
			deletionTarget: type === 'DIRECTORY' ? `/photos/dir-${i}` : `${type.toLowerCase()}-${i}`,
			vectorCount: (i + 1) * 25,
			deletionReason: i % 2 === 0 ? `Reason ${i}` : null,
			createdAt: new Date(2024, 11, 19, 10, i).toISOString()
		});
	});
}

// Person Fixtures (for face recognition)

import type { Person, PersonListResponse } from '$lib/api/faces';

/**
 * Create a test Person with sensible defaults
 */
export function createPerson(overrides?: Partial<Person>): Person {
	const id = overrides?.id ?? 'person-uuid-1';
	const name = overrides?.name ?? 'John Doe';

	const defaults: Person = {
		id,
		name,
		status: 'active',
		faceCount: 10,
		prototypeCount: 2,
		createdAt: '2024-12-19T10:00:00Z',
		updatedAt: '2024-12-19T10:00:00Z'
	};

	return { ...defaults, ...overrides };
}

/**
 * Create a paginated person response
 */
export function createPersonResponse(
	persons?: Person[],
	page: number = 1,
	pageSize: number = 20
): PersonListResponse {
	const items = persons ?? [createPerson()];

	return {
		items,
		total: items.length,
		page,
		pageSize
	};
}

/**
 * Create multiple persons for testing
 */
export function createMultiplePersons(count: number, startId: number = 1): Person[] {
	const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
	return Array.from({ length: count }, (_, i) => {
		const id = `person-uuid-${startId + i}`;
		const name = names[i % names.length] || `Person ${startId + i}`;
		return createPerson({
			id,
			name,
			faceCount: (i + 1) * 5,
			prototypeCount: i % 3 === 0 ? 3 : 2
		});
	});
}

// Unified People Fixtures (for unified people view)

import type { UnifiedPersonResponse, UnifiedPeopleListResponse, PersonType } from '$lib/api/faces';

/**
 * Create a test UnifiedPersonResponse with sensible defaults
 */
export function createUnifiedPerson(
	overrides?: Partial<UnifiedPersonResponse>
): UnifiedPersonResponse {
	const id = overrides?.id ?? 'uuid-1';
	const type: PersonType = overrides?.type ?? 'identified';
	const name =
		overrides?.name ??
		(type === 'identified'
			? 'John Doe'
			: type === 'noise'
				? 'Unknown Faces'
				: 'Unidentified Person 1');

	const defaults: UnifiedPersonResponse = {
		id,
		name,
		type,
		faceCount: 10,
		thumbnailUrl:
			type === 'identified' ? `http://localhost:8000/api/v1/images/${id}/thumbnail` : null,
		confidence: type === 'unidentified' ? 0.85 : null
	};

	return { ...defaults, ...overrides };
}

/**
 * Create an identified person
 */
export function createIdentifiedPerson(
	overrides?: Partial<UnifiedPersonResponse>
): UnifiedPersonResponse {
	return createUnifiedPerson({
		type: 'identified',
		confidence: null,
		...overrides
	});
}

/**
 * Create an unidentified person (cluster)
 */
export function createUnidentifiedPerson(
	overrides?: Partial<UnifiedPersonResponse>
): UnifiedPersonResponse {
	return createUnifiedPerson({
		id: 'clu_' + (overrides?.id ?? 'abc123'),
		type: 'unidentified',
		name: 'Unidentified Person 1',
		thumbnailUrl: null,
		confidence: 0.85,
		...overrides
	});
}

/**
 * Create a noise person
 */
export function createNoisePerson(
	overrides?: Partial<UnifiedPersonResponse>
): UnifiedPersonResponse {
	return createUnifiedPerson({
		id: 'noise',
		type: 'noise',
		name: 'Unknown Faces',
		thumbnailUrl: null,
		confidence: null,
		faceCount: 312,
		...overrides
	});
}

/**
 * Create a unified people list response
 */
export function createUnifiedPeopleResponse(
	people?: UnifiedPersonResponse[]
): UnifiedPeopleListResponse {
	const allPeople = people ?? [
		createIdentifiedPerson({ id: 'uuid-1', name: 'Alice', faceCount: 50 }),
		createIdentifiedPerson({ id: 'uuid-2', name: 'Bob', faceCount: 30 }),
		createUnidentifiedPerson({ id: 'clu_1', faceCount: 100, confidence: 0.9 }),
		createNoisePerson()
	];

	const identifiedCount = allPeople.filter((p) => p.type === 'identified').length;
	const unidentifiedCount = allPeople.filter((p) => p.type === 'unidentified').length;
	const noiseCount = allPeople.filter((p) => p.type === 'noise').length;

	return {
		people: allPeople,
		total: allPeople.length,
		identifiedCount,
		unidentifiedCount,
		noiseCount
	};
}

/**
 * Create multiple identified persons for testing
 */
export function createMultipleIdentifiedPersons(count: number): UnifiedPersonResponse[] {
	const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
	return Array.from({ length: count }, (_, i) => {
		return createIdentifiedPerson({
			id: `uuid-${i + 1}`,
			name: names[i % names.length] || `Person ${i + 1}`,
			faceCount: (i + 1) * 10
		});
	});
}

/**
 * Create multiple unidentified persons for testing
 */
export function createMultipleUnidentifiedPersons(count: number): UnifiedPersonResponse[] {
	return Array.from({ length: count }, (_, i) => {
		return createUnidentifiedPerson({
			id: `clu_${i + 1}`,
			name: `Unidentified Person ${i + 1}`,
			faceCount: (count - i) * 15,
			confidence: 0.9 - i * 0.05
		});
	});
}
