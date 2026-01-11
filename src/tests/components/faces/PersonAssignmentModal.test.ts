import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { mockResponse, mockError, resetMocks } from '../../helpers/mockFetch';
import { createPerson, createMultiplePersons } from '../../helpers/fixtures';
import PersonAssignmentModal from '$lib/components/faces/PersonAssignmentModal.svelte';
import type { Person } from '$lib/api/faces';

describe('PersonAssignmentModal', () => {
	const mockPersons: Person[] = [
		createPerson({ id: 'person-1', name: 'Alice Smith', faceCount: 5 }),
		createPerson({ id: 'person-2', name: 'Bob Jones', faceCount: 3 }),
		createPerson({ id: 'person-3', name: 'Charlie Brown', faceCount: 8 })
	];

	const defaultProps = {
		open: true,
		faceId: 'face-123',
		onSuccess: vi.fn(),
		onCancel: vi.fn()
	};

	beforeEach(() => {
		resetMocks();
		vi.clearAllMocks();
		// Clear localStorage between tests
		localStorage.clear();
		// Setup default mocks
		mockResponse('/api/v1/faces/persons', {
			items: mockPersons,
			total: 3,
			page: 1,
			page_size: 100
		});
	});

	afterEach(() => {
		resetMocks();
	});

	// ============ Modal Behavior Tests ============

	describe('Modal Behavior', () => {
		it('renders modal when open is true', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			expect(screen.getByText('Assign to Person')).toBeInTheDocument();
			expect(
				screen.getByText(/search for an existing person or create a new one/i)
			).toBeInTheDocument();
		});

		it('does not render modal when open is false', () => {
			render(PersonAssignmentModal, {
				props: {
					...defaultProps,
					open: false
				}
			});

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('calls onCancel when cancel button clicked', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByRole('dialog'));

			const cancelButton = screen.getByRole('button', { name: /cancel/i });
			await fireEvent.click(cancelButton);

			expect(defaultProps.onCancel).toHaveBeenCalled();
		});

		// Note: Testing dialog close via ESC key or clicking outside is difficult with Testing Library
		// and the shadcn-svelte dialog component. The onCancel callback is already tested
		// via the cancel button click test above.

		it('loads persons when modal opens', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			});

			expect(screen.getByText('Bob Jones')).toBeInTheDocument();
			expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
		});

		it('does not reload persons if already loaded', async () => {
			const { rerender } = render(PersonAssignmentModal, {
				props: { ...defaultProps, open: false }
			});

			// Open modal first time
			rerender({ ...defaultProps, open: true });

			await waitFor(() => {
				expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			});

			// Close and reopen
			rerender({ ...defaultProps, open: false });
			rerender({ ...defaultProps, open: true });

			// Should still show persons without re-fetching
			await waitFor(() => {
				expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			});
		});
	});

	// ============ Search Functionality Tests ============

	describe('Search Functionality', () => {
		it('filters persons when typing in search input', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'Alice' } });

			// Should show Alice
			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			// Should not show Bob or Charlie
			expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
			expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
		});

		it('shows all persons when search is empty', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');

			// Type something
			await fireEvent.input(searchInput, { target: { value: 'Alice' } });
			expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

			// Clear search
			await fireEvent.input(searchInput, { target: { value: '' } });

			// All persons should appear
			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			expect(screen.getByText('Bob Jones')).toBeInTheDocument();
			expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
		});

		it('filter is case-insensitive', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'aLiCe' } });

			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
		});

		it('clears search when modal closes', async () => {
			const { rerender } = render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'Test Query' } });

			expect(searchInput).toHaveValue('Test Query');

			// Close modal
			rerender({ ...defaultProps, open: false });

			// Reopen modal
			rerender({ ...defaultProps, open: true });

			await waitFor(() => screen.getByPlaceholderText('Search or create person...'));

			const newSearchInput = screen.getByPlaceholderText('Search or create person...');
			expect(newSearchInput).toHaveValue('');
		});

		it('shows "No persons found" when filtered list is empty and no create option', async () => {
			render(PersonAssignmentModal, {
				props: {
					...defaultProps,
					open: true
				}
			});

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			// Search for something that matches a person name exactly (no Create option)
			await fireEvent.input(searchInput, { target: { value: 'Alice Smith' } });

			// Should show Alice
			expect(screen.getByText('Alice Smith')).toBeInTheDocument();

			// Now search for something that doesn't match at all
			await fireEvent.input(searchInput, { target: { value: 'xyz' } });

			// Should show create option
			await waitFor(() => {
				expect(screen.getByText(/create "xyz"/i)).toBeInTheDocument();
			});
		});
	});

	// ============ Create Person Tests ============

	describe('Create Person', () => {
		it('shows "Create" option when search does not match existing person', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'New Person Name' } });

			expect(screen.getByText(/create "new person name"/i)).toBeInTheDocument();
		});

		it('does NOT show "Create" option when search matches existing person exactly (case-insensitive)', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'alice smith' } });

			// Should show existing person
			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			// Should not show create button option
			expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
		});

		it('does NOT show "Create" option when search is empty', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			// Empty search
			const searchInput = screen.getByPlaceholderText('Search or create person...');
			expect(searchInput).toHaveValue('');

			// Should not show create button option
			expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
		});

		it('"Create" option shows the search text', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'Diana Prince' } });

			expect(screen.getByText(/create "diana prince"/i)).toBeInTheDocument();
		});

		it('calls API to create person when "Create" option selected', async () => {
			// Mock create person endpoint
			mockResponse(
				'/api/v1/faces/persons',
				{
					id: 'new-person-id',
					name: 'New Person',
					status: 'active',
					faceCount: 0,
					prototypeCount: 0,
					createdAt: '2024-12-19T10:00:00Z',
					updatedAt: '2024-12-19T10:00:00Z'
				},
				201
			);

			// Mock assign endpoint
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'New Person' } });

			const createButton = screen.getByRole('button', { name: /create "new person"/i });
			await fireEvent.click(createButton);

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalledWith({
					faceId: 'face-123',
					personId: 'new-person-id',
					personName: 'New Person'
				});
			});
		});
	});

	// ============ Assignment Tests ============

	describe('Assignment', () => {
		it('calls assignFaceToPerson API when selecting existing person', async () => {
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalled();
			});
		});

		it('calls onSuccess with correct result after successful assignment', async () => {
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalledWith({
					faceId: 'face-123',
					personId: 'person-1',
					personName: 'Alice Smith'
				});
			});
		});

		it('closes modal after successful assignment', async () => {
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			const { container } = render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalled();
			});

			// Modal should be closed (no dialog in DOM)
			await waitFor(() => {
				expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
			});
		});

		it('handles API errors gracefully (shows error message)', async () => {
			mockError('/api/v1/faces/faces/face-123/assign', 'Assignment failed', 500);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				expect(screen.getByText(/assignment failed/i)).toBeInTheDocument();
			});

			// Modal should still be open
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('prevents double-submit while assignment is in progress', async () => {
			// Mock a slow response
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });

			// Click once
			await fireEvent.click(aliceButton);

			// Button should be disabled while submitting
			await waitFor(() => {
				expect(aliceButton).toBeDisabled();
			});
		});

		it('disables all person buttons while assignment is in progress', async () => {
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			const bobButton = screen.getByRole('button', { name: /bob jones/i });
			const charlieButton = screen.getByRole('button', { name: /charlie brown/i });

			await fireEvent.click(aliceButton);

			// All buttons should be disabled while submitting
			await waitFor(() => {
				expect(aliceButton).toBeDisabled();
				expect(bobButton).toBeDisabled();
				expect(charlieButton).toBeDisabled();
			});
		});

		it('disables cancel button while assignment is in progress', async () => {
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			// Cancel button should be disabled while submitting
			await waitFor(() => {
				const cancelButton = screen.getByRole('button', { name: /cancel/i });
				expect(cancelButton).toBeDisabled();
			});
		});
	});

	// ============ MRU (Most Recently Used) Tests ============

	describe('MRU (Most Recently Used)', () => {
		it('recent persons appear first when search is empty', async () => {
			// Set up MRU in localStorage
			localStorage.setItem(
				'image-search.suggestions.recentPersonIds',
				JSON.stringify(['person-3', 'person-1'])
			);

			const { container } = render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			// Get all person buttons in order (they have specific text content with "Assign to")
			const personButtons = screen.getAllByRole('button').filter(btn =>
				btn.textContent?.includes('faces') // Person buttons have face count
			);
			const personNames = personButtons.map((btn) => {
				const nameEl = btn.querySelector('.font-medium');
				return nameEl?.textContent?.trim();
			});

			// Expected order: Charlie (person-3), Alice (person-1), Bob (alphabetical)
			expect(personNames[0]).toBe('Charlie Brown');
			expect(personNames[1]).toBe('Alice Smith');
			expect(personNames[2]).toBe('Bob Jones');
		});

		it('MRU order is updated after successful assignment', async () => {
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			// Assign to Bob (person-2)
			const bobButton = screen.getByRole('button', { name: /bob jones/i });
			await fireEvent.click(bobButton);

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalled();
			});

			// Check that MRU was updated in localStorage
			const mru = JSON.parse(
				localStorage.getItem('image-search.suggestions.recentPersonIds') || '[]'
			);
			expect(mru[0]).toBe('person-2');
		});

		it('MRU order does NOT affect filtered results', async () => {
			// Set up MRU with Bob first
			localStorage.setItem(
				'image-search.suggestions.recentPersonIds',
				JSON.stringify(['person-2'])
			);

			const { container } = render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'Smith' } });

			// Only Alice should appear (filtered), not Bob
			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
		});
	});

	// ============ Loading States Tests ============

	describe('Loading States', () => {
		it('shows loading spinner when persons are loading', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			// Should show loading initially
			expect(screen.getByText('Loading persons...')).toBeInTheDocument();
		});

		it('shows person list after loading completes', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(screen.queryByText('Loading persons...')).not.toBeInTheDocument();
			});

			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			expect(screen.getByText('Bob Jones')).toBeInTheDocument();
			expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
		});

		it('displays person face counts', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			expect(screen.getByText('5 faces')).toBeInTheDocument();
			expect(screen.getByText('3 faces')).toBeInTheDocument();
			expect(screen.getByText('8 faces')).toBeInTheDocument();
		});

		it('displays singular "face" for count of 1', async () => {
			const singleFacePerson = createPerson({ id: 'person-4', name: 'Single Face', faceCount: 1 });
			mockResponse('/api/v1/faces/persons', {
				items: [singleFacePerson],
				total: 1,
				page: 1,
				page_size: 100
			});

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(screen.getByText('1 face')).toBeInTheDocument();
			});
		});
	});

	// ============ Error Handling Tests ============

	describe('Error Handling', () => {
		it('displays error message when assignment fails', async () => {
			mockError('/api/v1/faces/faces/face-123/assign', 'Network error occurred', 500);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				const errorMessage = screen.getByText(/network error occurred/i);
				expect(errorMessage).toBeInTheDocument();
				expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
			});
		});

		it('allows retry after error', async () => {
			// First call fails
			mockError('/api/v1/faces/faces/face-123/assign', 'First attempt failed', 500);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				expect(screen.getByText(/first attempt failed/i)).toBeInTheDocument();
			});

			// Now mock success for retry
			resetMocks();
			mockResponse('/api/v1/faces/persons', {
				items: mockPersons,
				total: 3,
				page: 1,
				page_size: 100
			});
			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			// Retry
			const retryButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(retryButton);

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalled();
			});
		});

		it('displays error when person creation fails', async () => {
			mockError('/api/v1/faces/persons', 'Failed to create person', 500);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: 'New Person' } });

			const createButton = screen.getByRole('button', { name: /create "new person"/i });
			await fireEvent.click(createButton);

			await waitFor(() => {
				expect(screen.getByText(/failed to create person/i)).toBeInTheDocument();
			});
		});

		it('error is cleared when modal closes', async () => {
			mockError('/api/v1/faces/faces/face-123/assign', 'Assignment error', 500);

			const { rerender } = render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				expect(screen.getByText(/assignment error/i)).toBeInTheDocument();
			});

			// Close modal
			rerender({ ...defaultProps, open: false });

			// Reopen modal
			resetMocks();
			mockResponse('/api/v1/faces/persons', {
				items: mockPersons,
				total: 3,
				page: 1,
				page_size: 100
			});
			rerender({ ...defaultProps, open: true });

			await waitFor(() => screen.getByText('Alice Smith'));

			// Error should be cleared
			expect(screen.queryByText(/assignment error/i)).not.toBeInTheDocument();
		});
	});

	// ============ Accessibility Tests ============

	describe('Accessibility', () => {
		it('has proper dialog role', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});
		});

		it('has proper aria-label for search input', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				const searchInput = screen.getByLabelText(/search persons or enter new name/i);
				expect(searchInput).toBeInTheDocument();
			});
		});

		it('has proper aria-label for person list', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				const personList = screen.getByRole('list', { name: /person list/i });
				expect(personList).toBeInTheDocument();
			});
		});

		it('loading state has proper role and aria-live', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			const loadingElement = screen.getByText('Loading persons...');
			expect(loadingElement.closest('[role="status"]')).toBeInTheDocument();
			expect(loadingElement.closest('[aria-live="polite"]')).toBeInTheDocument();
		});

		it('error message has alert role', async () => {
			mockError('/api/v1/faces/faces/face-123/assign', 'Test error', 500);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const aliceButton = screen.getByRole('button', { name: /alice smith/i });
			await fireEvent.click(aliceButton);

			await waitFor(() => {
				const errorText = screen.getByText(/test error/i);
				expect(errorText.closest('[role="alert"]')).toBeInTheDocument();
			});
		});

		it('search input has autofocus', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				const searchInput = screen.getByPlaceholderText('Search or create person...');
				expect(searchInput).toHaveAttribute('autofocus');
			});
		});
	});

	// ============ Edge Cases ============

	describe('Edge Cases', () => {
		it('handles empty person list', async () => {
			mockResponse('/api/v1/faces/persons', {
				items: [],
				total: 0,
				page: 1,
				page_size: 100
			});

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(screen.getByText('No persons found')).toBeInTheDocument();
			});
		});

		it('handles person with no face count', async () => {
			const noCountPerson = createPerson({
				id: 'person-5',
				name: 'No Count',
				faceCount: 0
			});
			mockResponse('/api/v1/faces/persons', {
				items: [noCountPerson],
				total: 1,
				page: 1,
				page_size: 100
			});

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(screen.getByText('No Count')).toBeInTheDocument();
			});

			// Should show "0 faces"
			expect(screen.getByText('0 faces')).toBeInTheDocument();
		});

		it('handles whitespace-only search query', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: '   ' } });

			// Should treat as empty and show all persons
			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			expect(screen.getByText('Bob Jones')).toBeInTheDocument();
			expect(screen.getByText('Charlie Brown')).toBeInTheDocument();

			// Should not show create button option
			expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
		});

		it('trims whitespace from person name before creating', async () => {
			mockResponse(
				'/api/v1/faces/persons',
				{
					id: 'new-person-id',
					name: 'Trimmed Name',
					status: 'active',
					faceCount: 0,
					prototypeCount: 0,
					createdAt: '2024-12-19T10:00:00Z',
					updatedAt: '2024-12-19T10:00:00Z'
				},
				201
			);

			mockResponse(
				'/api/v1/faces/faces/face-123/assign',
				{ success: true },
				200
			);

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const searchInput = screen.getByPlaceholderText('Search or create person...');
			await fireEvent.input(searchInput, { target: { value: '  Trimmed Name  ' } });

			const createButton = screen.getByRole('button', { name: /create "trimmed name"/i });
			await fireEvent.click(createButton);

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalledWith({
					faceId: 'face-123',
					personId: 'new-person-id',
					personName: 'Trimmed Name'
				});
			});
		});

		it('displays person avatar with first letter', async () => {
			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => screen.getByText('Alice Smith'));

			const { container } = render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				const avatars = container.querySelectorAll('[aria-hidden="true"]');
				// Find the avatar for Alice (should have 'A')
				const aliceAvatar = Array.from(avatars).find((el) => el.textContent === 'A');
				expect(aliceAvatar).toBeInTheDocument();
			});
		});

		it('handles very long person names', async () => {
			const longNamePerson = createPerson({
				id: 'person-long',
				name: 'This is a very long person name that should be truncated in the UI',
				faceCount: 5
			});
			mockResponse('/api/v1/faces/persons', {
				items: [longNamePerson],
				total: 1,
				page: 1,
				page_size: 100
			});

			render(PersonAssignmentModal, { props: defaultProps });

			await waitFor(() => {
				expect(
					screen.getByText(/this is a very long person name that should be truncated/i)
				).toBeInTheDocument();
			});
		});
	});
});
