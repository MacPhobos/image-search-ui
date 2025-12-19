// Image search result interface
export interface SearchResult {
	id: string;
	url: string;
	thumbnailUrl: string;
	title: string;
	description?: string;
	source?: string;
	timestamp?: string;
}

// Search filter options
export interface SearchFilters {
	category?: string;
	dateRange?: {
		start: string;
		end: string;
	};
	sortBy?: 'relevance' | 'date' | 'popularity';
}

// API response wrapper
export interface ApiResponse<T> {
	data: T;
	total?: number;
	page?: number;
	pageSize?: number;
}

// Search request parameters
export interface SearchParams {
	query: string;
	filters?: SearchFilters;
	page?: number;
	pageSize?: number;
}
