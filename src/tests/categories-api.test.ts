import { describe, it, expect } from 'vitest';
import {
	listCategories,
	createCategory,
	getCategory,
	updateCategory,
	deleteCategory
} from '$lib/api/categories';
import { mockResponse, mockError, getFetchMock } from './helpers/mockFetch';

describe('Categories API Client', () => {
	describe('listCategories', () => {
		it('makes correct GET request with default pagination', async () => {
			const mockData = {
				items: [
					{
						id: 1,
						name: 'General',
						description: 'Default category',
						color: null,
						isDefault: true,
						createdAt: '2024-12-19T10:00:00Z',
						updatedAt: '2024-12-19T10:00:00Z',
						sessionCount: 5
					}
				],
				total: 1,
				page: 1,
				pageSize: 50,
				hasMore: false
			};
			mockResponse('http://localhost:8000/api/v1/categories?page=1&page_size=50', mockData);

			const result = await listCategories();

			expect(result).toEqual(mockData);
			expect(result.items).toHaveLength(1);
			expect(result.items[0].name).toBe('General');
		});

		it('makes correct GET request with custom pagination', async () => {
			const mockData = {
				items: [],
				total: 0,
				page: 2,
				pageSize: 25,
				hasMore: false
			};
			mockResponse('http://localhost:8000/api/v1/categories?page=2&page_size=25', mockData);

			await listCategories(2, 25);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/categories?page=2&page_size=25',
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);
		});
	});

	describe('createCategory', () => {
		it('makes correct POST request to create category', async () => {
			const newCategory = {
				name: 'Vacation',
				description: 'Photos from trips',
				color: '#10B981'
			};
			const mockData = {
				id: 2,
				...newCategory,
				isDefault: false,
				createdAt: '2024-12-19T11:00:00Z',
				updatedAt: '2024-12-19T11:00:00Z'
			};
			mockResponse('http://localhost:8000/api/v1/categories', mockData);

			const result = await createCategory(newCategory);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/categories',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify(newCategory)
				})
			);

			expect(result.id).toBe(2);
			expect(result.name).toBe('Vacation');
		});

		it('throws ApiError on conflict (duplicate name)', async () => {
			mockError('http://localhost:8000/api/v1/categories', 409, {
				detail: "Category with name 'Vacation' already exists"
			});

			await expect(
				createCategory({ name: 'Vacation', description: null, color: null })
			).rejects.toThrow();
		});
	});

	describe('getCategory', () => {
		it('makes correct GET request for single category', async () => {
			const mockData = {
				id: 2,
				name: 'Vacation',
				description: 'Photos from trips',
				color: '#10B981',
				isDefault: false,
				createdAt: '2024-12-19T11:00:00Z',
				updatedAt: '2024-12-19T11:00:00Z',
				sessionCount: 3
			};
			mockResponse('http://localhost:8000/api/v1/categories/2', mockData);

			const result = await getCategory(2);

			expect(result).toEqual(mockData);
			expect(result.sessionCount).toBe(3);
		});

		it('throws ApiError on not found', async () => {
			mockError('http://localhost:8000/api/v1/categories/999', 404, {
				detail: 'Category not found'
			});

			await expect(getCategory(999)).rejects.toThrow();
		});
	});

	describe('updateCategory', () => {
		it('makes correct PATCH request to update category', async () => {
			const updateData = {
				name: 'Updated Name',
				description: 'Updated description'
			};
			const mockData = {
				id: 2,
				name: 'Updated Name',
				description: 'Updated description',
				color: '#10B981',
				isDefault: false,
				createdAt: '2024-12-19T11:00:00Z',
				updatedAt: '2024-12-19T12:00:00Z'
			};
			mockResponse('http://localhost:8000/api/v1/categories/2', mockData);

			const result = await updateCategory(2, updateData);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/categories/2',
				expect.objectContaining({
					method: 'PATCH',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify(updateData)
				})
			);

			expect(result.name).toBe('Updated Name');
		});
	});

	describe('deleteCategory', () => {
		it('makes correct DELETE request', async () => {
			mockResponse('http://localhost:8000/api/v1/categories/2', undefined, 204);

			const result = await deleteCategory(2);

			const fetchMock = getFetchMock();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://localhost:8000/api/v1/categories/2',
				expect.objectContaining({
					method: 'DELETE',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);

			expect(result).toBeUndefined();
		});

		it('throws ApiError when deleting default category', async () => {
			mockError('http://localhost:8000/api/v1/categories/1', 400, {
				detail: 'Cannot delete the default category'
			});

			await expect(deleteCategory(1)).rejects.toThrow();
		});

		it('throws ApiError when category has sessions', async () => {
			mockError('http://localhost:8000/api/v1/categories/2', 409, {
				detail: 'Cannot delete category with 5 training sessions. Reassign sessions first.'
			});

			await expect(deleteCategory(2)).rejects.toThrow();
		});
	});
});
