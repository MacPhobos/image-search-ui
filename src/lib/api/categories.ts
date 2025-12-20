/**
 * Category API client functions.
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
				errorData?.message || errorData?.detail || `HTTP ${response.status}: ${response.statusText}`,
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

// Category types

export interface Category {
	id: number;
	name: string;
	description?: string | null;
	color?: string | null;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
	sessionCount?: number;
}

export interface CategoryCreate {
	name: string;
	description?: string | null;
	color?: string | null;
}

export interface CategoryUpdate {
	name?: string;
	description?: string | null;
	color?: string | null;
}

export interface PaginatedCategoryResponse {
	items: Category[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
}

// API Functions

/**
 * List all categories with pagination.
 */
export async function listCategories(
	page: number = 1,
	pageSize: number = 50
): Promise<PaginatedCategoryResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	return apiRequest<PaginatedCategoryResponse>(
		`/api/v1/categories?${params.toString()}`
	);
}

/**
 * Create a new category.
 */
export async function createCategory(data: CategoryCreate): Promise<Category> {
	return apiRequest<Category>('/api/v1/categories', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

/**
 * Get a single category by ID.
 */
export async function getCategory(categoryId: number): Promise<Category> {
	return apiRequest<Category>(`/api/v1/categories/${categoryId}`);
}

/**
 * Update a category.
 */
export async function updateCategory(
	categoryId: number,
	data: CategoryUpdate
): Promise<Category> {
	return apiRequest<Category>(`/api/v1/categories/${categoryId}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

/**
 * Delete a category.
 */
export async function deleteCategory(categoryId: number): Promise<undefined> {
	return apiRequest<undefined>(`/api/v1/categories/${categoryId}`, {
		method: 'DELETE'
	});
}
