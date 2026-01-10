import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PersonAssignmentPanel from '$lib/components/faces/PersonAssignmentPanel.svelte';
import type { Person } from '$lib/api/faces';

/**
 * Test helper: Create a Person with defaults
 */
function createPerson(overrides?: Partial<Person>): Person {
	const id = overrides?.id ?? 'person-uuid-1';
	const name = overrides?.name ?? 'John Doe';

	return {
		id,
		name,
		status: 'active',
		faceCount: 10,
		prototypeCount: 2,
		createdAt: '2024-12-19T10:00:00Z',
		updatedAt: '2024-12-19T10:00:00Z',
		...overrides
	};
}

describe('PersonAssignmentPanel', () => {
	const mockOnCancel = vi.fn();
	const mockOnAssignToExisting = vi.fn();
	const mockOnCreateAndAssign = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders when open is true', () => {
		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		expect(screen.getByText('Assign to Person')).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Search or create person...')
		).toBeInTheDocument();
	});

	it('does not render when open is false', () => {
		render(PersonAssignmentPanel, {
			props: {
				open: false,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		expect(screen.queryByText('Assign to Person')).not.toBeInTheDocument();
	});

	it('renders list of persons', () => {
		const persons = [
			createPerson({ id: 'person-1', name: 'Alice Smith', faceCount: 15 }),
			createPerson({ id: 'person-2', name: 'Bob Jones', faceCount: 8 })
		];

		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		expect(screen.getByText('Alice Smith')).toBeInTheDocument();
		expect(screen.getByText('Bob Jones')).toBeInTheDocument();
		expect(screen.getByText('15 faces')).toBeInTheDocument();
		expect(screen.getByText('8 faces')).toBeInTheDocument();
	});

	it('filters persons as user types in search input', async () => {
		const persons = [
			createPerson({ id: 'person-1', name: 'Alice Smith' }),
			createPerson({ id: 'person-2', name: 'Bob Jones' }),
			createPerson({ id: 'person-3', name: 'Alice Cooper' })
		];

		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const searchInput = screen.getByPlaceholderText('Search or create person...');
		await fireEvent.input(searchInput, { target: { value: 'Alice' } });

		// Should show both Alice entries
		expect(screen.getByText('Alice Smith')).toBeInTheDocument();
		expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
		// Should not show Bob
		expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
	});

	it('shows "Create [name]" option for non-matching queries', async () => {
		const persons = [
			createPerson({ id: 'person-1', name: 'Alice Smith' }),
			createPerson({ id: 'person-2', name: 'Bob Jones' })
		];

		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const searchInput = screen.getByPlaceholderText('Search or create person...');
		await fireEvent.input(searchInput, { target: { value: 'Charlie Brown' } });

		expect(screen.getByText(/create "charlie brown"/i)).toBeInTheDocument();
	});

	it('does not show "Create" option for exact matches (case-insensitive)', async () => {
		const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];

		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const searchInput = screen.getByPlaceholderText('Search or create person...');
		await fireEvent.input(searchInput, { target: { value: 'alice smith' } });

		// Should show existing person
		expect(screen.getByText('Alice Smith')).toBeInTheDocument();
		// Should not show create option
		expect(screen.queryByText(/create/i)).not.toBeInTheDocument();
	});

	it('clicking person triggers onAssignToExisting callback', async () => {
		const persons = [createPerson({ id: 'person-123', name: 'Alice Smith' })];

		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const personButton = screen.getByRole('button', { name: /alice smith/i });
		await fireEvent.click(personButton);

		expect(mockOnAssignToExisting).toHaveBeenCalledWith('person-123');
		expect(mockOnAssignToExisting).toHaveBeenCalledTimes(1);
	});

	it('clicking "Create" option triggers onCreateAndAssign callback', async () => {
		const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];

		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const searchInput = screen.getByPlaceholderText('Search or create person...');
		await fireEvent.input(searchInput, { target: { value: 'New Person' } });

		const createButton = screen.getByRole('button', { name: /create "new person"/i });
		await fireEvent.click(createButton);

		expect(mockOnCreateAndAssign).toHaveBeenCalledWith('New Person');
		expect(mockOnCreateAndAssign).toHaveBeenCalledTimes(1);
	});

	it('shows loading state when personsLoading is true', () => {
		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: true,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		expect(screen.getByText('Loading persons...')).toBeInTheDocument();
	});

	it('shows error message when error prop is set', () => {
		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: 'Failed to assign person',
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		expect(screen.getByText('Failed to assign person')).toBeInTheDocument();
		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	it('clicking cancel button triggers onCancel callback', async () => {
		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const buttons = screen.getAllByRole('button', { name: /cancel/i });
		const cancelButton = buttons.find((btn) => btn.textContent === 'Cancel');
		expect(cancelButton).toBeDefined();
		await fireEvent.click(cancelButton!);

		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});

	it('clicking close button (×) triggers onCancel callback', async () => {
		const { container } = render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const closeButton = container.querySelector('.close-btn');
		expect(closeButton).toBeInTheDocument();
		await fireEvent.click(closeButton!);

		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});

	it('disables person options when submitting is true', () => {
		const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];

		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: true,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const personButton = screen.getByRole('button', { name: /alice smith/i });
		expect(personButton).toBeDisabled();
	});

	it('disables cancel button when submitting is true', () => {
		render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: true,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const buttons = screen.getAllByRole('button', { name: /cancel/i });
		const cancelButton = buttons.find((btn) => btn.textContent === 'Cancel');
		expect(cancelButton).toBeDefined();
		expect(cancelButton).toBeDisabled();
	});

	it('shows "No persons found" when filtered list is empty', async () => {
		const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];

		const { container } = render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const searchInput = screen.getByPlaceholderText('Search or create person...');
		await fireEvent.input(searchInput, { target: { value: 'xyz' } });

		// Wait for reactive update - check for create option instead
		await waitFor(() => {
			// When no matches, should show "Create xyz" option
			expect(screen.getByText(/create "xyz"/i)).toBeInTheDocument();
		});

		// Should not show any existing persons
		expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
	});

	it('sorts persons with recent persons first, then alphabetically', () => {
		const persons = [
			createPerson({ id: 'person-1', name: 'Zoe' }),
			createPerson({ id: 'person-2', name: 'Alice' }),
			createPerson({ id: 'person-3', name: 'Bob' })
		];

		const recentPersonIds = ['person-3', 'person-1']; // Bob, Zoe recently used

		const { container } = render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				recentPersonIds,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const personNameElements = container.querySelectorAll('.person-option-name');
		const personNames = Array.from(personNameElements).map((el) => el.textContent);

		// Expected order: Bob (recent), Zoe (recent), Alice (alphabetical)
		expect(personNames).toEqual(['Bob', 'Zoe', 'Alice']);
	});

	it('resets search query when panel closes', async () => {
		const { rerender } = render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const searchInput = screen.getByPlaceholderText('Search or create person...');
		await fireEvent.input(searchInput, { target: { value: 'Test Query' } });

		expect(searchInput).toHaveValue('Test Query');

		// Close panel
		rerender({
			open: false,
			faceId: 'face-1',
			persons: [],
			personsLoading: false,
			submitting: false,
			error: null,
			onCancel: mockOnCancel,
			onAssignToExisting: mockOnAssignToExisting,
			onCreateAndAssign: mockOnCreateAndAssign
		});

		// Reopen panel
		await waitFor(() => {
			rerender({
				open: true,
				faceId: 'face-1',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			});
		});

		const newSearchInput = screen.getByPlaceholderText('Search or create person...');
		expect(newSearchInput).toHaveValue('');
	});

	it('displays person avatar with first letter of name', () => {
		const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];

		const { container } = render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-1',
				persons,
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const avatar = container.querySelector('.person-avatar');
		expect(avatar).toBeInTheDocument();
		expect(avatar?.textContent).toBe('A');
	});

	it('sets data-face-id attribute on panel', () => {
		const { container } = render(PersonAssignmentPanel, {
			props: {
				open: true,
				faceId: 'face-xyz-123',
				persons: [],
				personsLoading: false,
				submitting: false,
				error: null,
				onCancel: mockOnCancel,
				onAssignToExisting: mockOnAssignToExisting,
				onCreateAndAssign: mockOnCreateAndAssign
			}
		});

		const panel = container.querySelector('[data-face-id]');
		expect(panel).toHaveAttribute('data-face-id', 'face-xyz-123');
	});
});
