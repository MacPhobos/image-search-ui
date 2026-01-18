import { describe, it, expect } from 'vitest';
import type { UnifiedPersonResponse } from '$lib/api/faces';

/**
 * Test the search filtering logic for the people page.
 * These tests verify the matchesSearch function behavior without rendering components.
 */
describe('People Page - Search Functionality', () => {
	/**
	 * Helper function that matches the logic from the people page.
	 * Returns true if the person matches the search query.
	 */
	function matchesSearch(person: UnifiedPersonResponse, searchQuery: string): boolean {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		if (!normalizedQuery) return true;
		return person.name.toLowerCase().includes(normalizedQuery);
	}

	const mockPeople: UnifiedPersonResponse[] = [
		{
			id: 'person-1',
			name: 'John Doe',
			type: 'identified',
			faceCount: 10,
			thumbnailUrl: '/images/1/thumbnail',
			confidence: 0.95
		},
		{
			id: 'person-2',
			name: 'Jane Smith',
			type: 'identified',
			faceCount: 8,
			thumbnailUrl: '/images/2/thumbnail',
			confidence: 0.92
		},
		{
			id: 'cluster-1',
			name: 'Unknown Group 1',
			type: 'unidentified',
			faceCount: 5,
			thumbnailUrl: '/images/3/thumbnail',
			confidence: null
		},
		{
			id: 'cluster-2',
			name: 'Unknown Group 2',
			type: 'unidentified',
			faceCount: 3,
			thumbnailUrl: '/images/4/thumbnail',
			confidence: null
		}
	];

	it('should return all people when search query is empty', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, ''));
		expect(filtered).toHaveLength(4);
	});

	it('should return all people when search query is whitespace', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, '   '));
		expect(filtered).toHaveLength(4);
	});

	it('should filter people by exact name match', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, 'John Doe'));
		expect(filtered).toHaveLength(1);
		expect(filtered[0].name).toBe('John Doe');
	});

	it('should filter people by partial name match', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, 'doe'));
		expect(filtered).toHaveLength(1);
		expect(filtered[0].name).toBe('John Doe');
	});

	it('should be case-insensitive', () => {
		const filteredUpper = mockPeople.filter((p) => matchesSearch(p, 'JANE'));
		const filteredLower = mockPeople.filter((p) => matchesSearch(p, 'jane'));
		const filteredMixed = mockPeople.filter((p) => matchesSearch(p, 'JaNe'));

		expect(filteredUpper).toHaveLength(1);
		expect(filteredLower).toHaveLength(1);
		expect(filteredMixed).toHaveLength(1);
		expect(filteredUpper[0].name).toBe('Jane Smith');
	});

	it('should handle searches with leading/trailing whitespace', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, '  john  '));
		expect(filtered).toHaveLength(1);
		expect(filtered[0].name).toBe('John Doe');
	});

	it('should return empty array when no matches found', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, 'NonexistentName'));
		expect(filtered).toHaveLength(0);
	});

	it('should match across different person types', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, 'unknown'));
		expect(filtered).toHaveLength(2);
		expect(filtered[0].type).toBe('unidentified');
		expect(filtered[1].type).toBe('unidentified');
	});

	it('should match substring in middle of name', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, 'Group'));
		expect(filtered).toHaveLength(2);
		expect(filtered.every((p) => p.name.includes('Group'))).toBe(true);
	});

	it('should filter by last name', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, 'Smith'));
		expect(filtered).toHaveLength(1);
		expect(filtered[0].name).toBe('Jane Smith');
	});

	it('should filter by first name', () => {
		const filtered = mockPeople.filter((p) => matchesSearch(p, 'Jane'));
		expect(filtered).toHaveLength(1);
		expect(filtered[0].name).toBe('Jane Smith');
	});

	describe('Combined filtering (search + type)', () => {
		it('should filter identified people by search', () => {
			const identifiedPeople = mockPeople.filter((p) => p.type === 'identified');
			const filtered = identifiedPeople.filter((p) => matchesSearch(p, 'john'));
			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe('John Doe');
		});

		it('should filter unidentified people by search', () => {
			const unidentifiedPeople = mockPeople.filter((p) => p.type === 'unidentified');
			const filtered = unidentifiedPeople.filter((p) => matchesSearch(p, 'Group 1'));
			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe('Unknown Group 1');
		});

		it('should return empty when search does not match type filter', () => {
			const identifiedPeople = mockPeople.filter((p) => p.type === 'identified');
			const filtered = identifiedPeople.filter((p) => matchesSearch(p, 'Unknown'));
			expect(filtered).toHaveLength(0);
		});
	});
});
