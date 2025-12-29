// Re-export generated types for convenience
import type { components } from '$lib/api/generated';

// Alias generated types - Search
export type Asset = components['schemas']['Asset'];
export type SearchRequest = components['schemas']['SearchRequest'];
export type SearchResponse = components['schemas']['SearchResponse'];
export type SearchResult = components['schemas']['SearchResult'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type PaginatedAssetResponse = components['schemas']['PaginatedResponse_Asset_'];

// Alias generated types - Training
export type TrainingSession = components['schemas']['TrainingSessionResponse'];
export type TrainingSessionCreate = components['schemas']['TrainingSessionCreate'];
export type TrainingSessionUpdate = components['schemas']['TrainingSessionUpdate'];
export type TrainingJob = components['schemas']['TrainingJobResponse'];
export type TrainingProgress = components['schemas']['TrainingProgressResponse'];
export type ProgressStats = components['schemas']['ProgressStats'];
export type TrainingSubdirectory = components['schemas']['TrainingSubdirectoryResponse'];
export type SubdirectorySelection = components['schemas']['SubdirectorySelectionUpdate'];
export type DirectoryScanResponse = components['schemas']['DirectoryScanResponse'];
export type SubdirectoryInfo = components['schemas']['DirectoryInfo'];
export type ControlResponse = components['schemas']['ControlResponse'];
export type PaginatedTrainingSessionResponse =
	components['schemas']['PaginatedResponse_TrainingSessionResponse_'];
export type PaginatedTrainingJobResponse =
	components['schemas']['PaginatedResponse_TrainingJobResponse_'];

// Health check response
export interface HealthResponse {
	status: string;
}

// Search filters for UI (date range + future face filter)
export interface SearchFilters {
	dateFrom?: string; // ISO 8601 date
	dateTo?: string; // ISO 8601 date
	personId?: string; // Face filter (future)
	categoryId?: number; // Category filter
}

// Frontend search params (what the UI uses)
export interface SearchParams {
	query: string;
	filters?: SearchFilters;
	limit?: number;
	offset?: number;
}

// API error with parsed response
export interface ApiErrorData {
	error: string;
	message: string;
	details?: Record<string, string>;
}

// Category types (re-export from categories API)
export type {
	Category,
	CategoryCreate,
	CategoryUpdate,
	PaginatedCategoryResponse
} from '$lib/api/categories';

// Vector management types (re-export from vectors API)
export type {
	DirectoryStats,
	DirectoryStatsResponse,
	DirectoryDeleteRequest,
	DirectoryDeleteResponse,
	RetrainRequest,
	RetrainResponse,
	DeletionResponse,
	OrphanCleanupRequest,
	ResetRequest,
	DeletionLogEntry,
	DeletionLogsResponse
} from '$lib/api/vectors';

// Face detection and person types (re-export from faces API)
export type {
	BoundingBox,
	FaceInstance,
	ClusterSummary,
	ClusterListResponse,
	ClusterDetailResponse,
	Person,
	PersonListResponse,
	LabelClusterResponse,
	MergePersonsResponse,
	SplitClusterResponse,
	DetectFacesResponse,
	ClusteringResultResponse,
	Prototype,
	AgeEraBucket,
	TemporalCoverage,
	PrototypeListResponse,
	PinPrototypeRequest,
	RecomputePrototypesRequest,
	RecomputePrototypesResponse
} from '$lib/api/faces';
