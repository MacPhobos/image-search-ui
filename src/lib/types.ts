// Re-export generated types for convenience
import type { components } from '$lib/api/generated';

// Alias generated types
export type Asset = components['schemas']['Asset'];
export type SearchRequest = components['schemas']['SearchRequest'];
export type SearchResponse = components['schemas']['SearchResponse'];
export type SearchResult = components['schemas']['SearchResult'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type PaginatedAssetResponse = components['schemas']['PaginatedResponse_Asset_'];

// Health check response
export interface HealthResponse {
	status: string;
}

// Search filters for UI (date range + future face filter)
export interface SearchFilters {
	dateFrom?: string; // ISO 8601 date
	dateTo?: string; // ISO 8601 date
	personId?: string; // Face filter (future)
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
