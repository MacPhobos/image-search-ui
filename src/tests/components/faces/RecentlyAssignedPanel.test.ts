import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RecentlyAssignedPanel, {
	type RecentAssignment
} from '$lib/components/faces/RecentlyAssignedPanel.svelte';

describe('RecentlyAssignedPanel', () => {
	const mockAssignments: RecentAssignment[] = [
		{
			faceId: 'face-1',
			personId: 'person-1',
			personName: 'John Doe',
			thumbnailUrl: '/api/v1/faces/faces/face-1/thumbnail',
			photoFilename: 'IMG_001.jpg',
			assignedAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
		},
		{
			faceId: 'face-2',
			personId: 'person-2',
			personName: 'Jane Smith',
			thumbnailUrl: '/api/v1/faces/faces/face-2/thumbnail',
			photoFilename: 'IMG_002.jpg',
			assignedAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
		}
	];

	it('renders empty state when no assignments', () => {
		render(RecentlyAssignedPanel, { props: { assignments: [] } });

		expect(screen.getByText('Recently Assigned')).toBeInTheDocument();
		expect(screen.getByText('No recent assignments')).toBeInTheDocument();
	});

	it('renders assignment list with correct data', () => {
		render(RecentlyAssignedPanel, { props: { assignments: mockAssignments } });

		// Check person names are displayed
		expect(screen.getByText('John Doe')).toBeInTheDocument();
		expect(screen.getByText('Jane Smith')).toBeInTheDocument();

		// Check filenames are displayed
		expect(screen.getByText('IMG_001.jpg')).toBeInTheDocument();
		expect(screen.getByText('IMG_002.jpg')).toBeInTheDocument();

		// Check relative time formatting
		expect(screen.getByText('2 min ago')).toBeInTheDocument();
		expect(screen.getByText('5 min ago')).toBeInTheDocument();
	});

	it('calls onUndo when undo button is clicked', async () => {
		const user = userEvent.setup();
		const onUndo = vi.fn().mockResolvedValue(undefined);

		render(RecentlyAssignedPanel, { props: { assignments: mockAssignments, onUndo } });

		const undoButtons = screen.getAllByText('Undo');
		await user.click(undoButtons[0]);

		expect(onUndo).toHaveBeenCalledWith('face-1');
	});

	it('disables undo button while undoing', async () => {
		const user = userEvent.setup();
		let resolveUndo: (() => void) | null = null;
		const onUndo = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveUndo = resolve;
				})
		);

		render(RecentlyAssignedPanel, { props: { assignments: mockAssignments, onUndo } });

		const undoButtons = screen.getAllByText('Undo');
		await user.click(undoButtons[0]);

		// Button should show loading state
		expect(screen.getByText('...')).toBeInTheDocument();
		expect(undoButtons[0]).toBeDisabled();

		// Resolve the promise
		resolveUndo?.();
	});

	it('limits displayed items to maxItems prop', () => {
		const manyAssignments: RecentAssignment[] = Array.from({ length: 15 }, (_, i) => ({
			faceId: `face-${i}`,
			personId: `person-${i}`,
			personName: `Person ${i}`,
			thumbnailUrl: `/api/v1/faces/faces/face-${i}/thumbnail`,
			photoFilename: `IMG_${String(i).padStart(3, '0')}.jpg`,
			assignedAt: new Date(Date.now() - i * 60 * 1000)
		}));

		render(RecentlyAssignedPanel, { props: { assignments: manyAssignments, maxItems: 5 } });

		// Should only show 5 items
		expect(screen.getByText('Person 0')).toBeInTheDocument();
		expect(screen.getByText('Person 4')).toBeInTheDocument();
		expect(screen.queryByText('Person 5')).not.toBeInTheDocument();
	});

	it('can be collapsed when collapsible is true', async () => {
		const user = userEvent.setup();

		render(RecentlyAssignedPanel, {
			props: { assignments: mockAssignments, collapsible: true }
		});

		// Initially expanded
		expect(screen.getByText('John Doe')).toBeInTheDocument();

		// Click header to collapse
		const header = screen.getByRole('button', { expanded: true });
		await user.click(header);

		// Content should be hidden
		expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
	});

	it('renders face thumbnails with correct URLs', () => {
		render(RecentlyAssignedPanel, { props: { assignments: mockAssignments } });

		const thumbnails = screen.getAllByAltText('Face thumbnail');
		expect(thumbnails).toHaveLength(2);

		// Check absolute URL conversion happens (via toAbsoluteUrl)
		expect(thumbnails[0]).toHaveAttribute(
			'src',
			expect.stringContaining('/api/v1/faces/faces/face-1/thumbnail')
		);
	});
});
