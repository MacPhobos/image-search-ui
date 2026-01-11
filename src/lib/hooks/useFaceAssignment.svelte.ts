/**
 * useFaceAssignment - Svelte 5 runes-based hook for face assignment logic.
 *
 * Manages:
 * - Loading persons list from API (paginated, gets all pages)
 * - Assigning faces to existing persons
 * - Creating new persons and assigning faces
 * - MRU (Most Recently Used) tracking via localStorage
 *
 * Shared between PhotoPreviewModal, SuggestionDetailModal, and other face assignment UIs.
 */

import { localSettings } from '$lib/stores/localSettings.svelte';
import { assignFaceToPerson, createPerson, fetchAllPersons } from '$lib/api/faces';
import type { Person } from '$lib/api/faces';

// ============ Types ============

/** Result from successful face assignment. */
export interface AssignmentResult {
	faceId: string;
	personId: string;
	personName: string;
}

// ============ MRU Tracking ============

const RECENT_PERSONS_KEY = 'suggestions.recentPersonIds';
const MAX_RECENT_PERSONS = 20;

/**
 * Record a person ID to MRU list after successful assignment.
 * Moves person to front of list, keeps max 20 entries.
 */
function recordRecentPerson(personId: string): void {
	const recent = localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
	const filtered = recent.filter((id) => id !== personId);
	const updated = [personId, ...filtered].slice(0, MAX_RECENT_PERSONS);
	localSettings.set(RECENT_PERSONS_KEY, updated);
}

/**
 * Get list of recent person IDs (most recent first).
 */
export function getRecentPersonIds(): string[] {
	return localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
}

// ============ Hook ============

/**
 * Create a face assignment state manager with reactive state.
 *
 * @returns Reactive hook object with state getters and action functions
 *
 * @example
 * ```typescript
 * import { useFaceAssignment } from '$lib/hooks/useFaceAssignment.svelte';
 *
 * const assignment = useFaceAssignment();
 *
 * // Load persons list
 * onMount(() => {
 *   assignment.loadPersons();
 * });
 *
 * // Assign to existing person
 * const result = await assignment.assignToExisting(faceId, personId);
 *
 * // Create new person and assign
 * const result = await assignment.createAndAssign(faceId, 'John Doe');
 * ```
 */
export function useFaceAssignment() {
	// Reactive state
	let persons = $state<Person[]>([]);
	let personsLoading = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	/**
	 * Load all persons from API (paginated, fetches all pages).
	 * Uses fetchAllPersons() which handles pagination internally.
	 */
	async function loadPersons(): Promise<void> {
		personsLoading = true;
		error = null;

		try {
			persons = await fetchAllPersons('active');
		} catch (err) {
			console.error('Failed to load persons:', err);
			error = err instanceof Error ? err.message : 'Failed to load persons';
		} finally {
			personsLoading = false;
		}
	}

	/**
	 * Assign a face to an existing person.
	 *
	 * @param faceId - Face instance ID (UUID)
	 * @param personId - Target person ID (UUID)
	 * @returns Promise with assignment result
	 * @throws Error if API call fails
	 */
	async function assignToExisting(faceId: string, personId: string): Promise<AssignmentResult> {
		if (submitting) {
			throw new Error('Assignment already in progress');
		}

		const person = persons.find((p) => p.id === personId);
		if (!person) {
			throw new Error(`Person not found: ${personId}`);
		}

		submitting = true;
		error = null;

		try {
			await assignFaceToPerson(faceId, person.id);

			// Track MRU
			recordRecentPerson(person.id);

			return {
				faceId,
				personId: person.id,
				personName: person.name
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to assign face';
			error = message;
			throw new Error(message);
		} finally {
			submitting = false;
		}
	}

	/**
	 * Create a new person and assign face to them.
	 *
	 * @param faceId - Face instance ID (UUID)
	 * @param name - New person's name
	 * @returns Promise with assignment result
	 * @throws Error if API call fails
	 */
	async function createAndAssign(faceId: string, name: string): Promise<AssignmentResult> {
		if (submitting) {
			throw new Error('Assignment already in progress');
		}

		if (!name || name.trim().length === 0) {
			throw new Error('Person name is required');
		}

		submitting = true;
		error = null;

		try {
			// Create person
			const newPerson = await createPerson(name.trim());

			// Assign face to new person
			await assignFaceToPerson(faceId, newPerson.id);

			// Add to local persons list (for immediate UI update)
			persons = [
				...persons,
				{
					id: newPerson.id,
					name: newPerson.name,
					status: newPerson.status as 'active' | 'merged' | 'hidden',
					faceCount: 1,
					prototypeCount: 0,
					birthDate: null,
					createdAt: newPerson.createdAt,
					updatedAt: newPerson.createdAt
				}
			];

			// Track MRU
			recordRecentPerson(newPerson.id);

			return {
				faceId,
				personId: newPerson.id,
				personName: newPerson.name
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create person';
			error = message;
			throw new Error(message);
		} finally {
			submitting = false;
		}
	}

	/**
	 * Clear error state.
	 * Useful after displaying error message to user and dismissing it.
	 */
	function reset(): void {
		error = null;
	}

	// Return object with getters for reactivity
	return {
		// State getters (reactive)
		get persons() {
			return persons;
		},
		get personsLoading() {
			return personsLoading;
		},
		get submitting() {
			return submitting;
		},
		get error() {
			return error;
		},

		// MRU helper (non-reactive, reads directly from localStorage)
		getRecentPersonIds,

		// Actions
		loadPersons,
		assignToExisting,
		createAndAssign,
		reset
	};
}
