import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import UnlabeledGroupCard from '$lib/components/faces/UnlabeledGroupCard.svelte';
import { createUnknownPersonCandidateGroup } from '../../helpers/fixtures';
import { mockResponse, mockError } from '../../helpers/mockFetch';

// Mock thumbnailCache module used by UnlabeledGroupCard
vi.mock('$lib/stores/thumbnailCache.svelte', () => ({
	thumbnailCache: {
		get: vi.fn(() => undefined),
		isPending: vi.fn(() => false),
		has: vi.fn(() => false),
		fetchBatch: vi.fn(),
		clear: vi.fn(),
		state: { cache: new Map(), pending: new Set(), error: null }
	}
}));

describe('UnlabeledGroupCard', () => {
	function renderCard(
		groupOverrides?: Parameters<typeof createUnknownPersonCandidateGroup>[0],
		callbacks?: {
			onCreatePerson?: (...args: unknown[]) => void;
			onDismissed?: () => void;
		}
	) {
		const group = createUnknownPersonCandidateGroup(groupOverrides);
		const onCreatePerson = callbacks?.onCreatePerson ?? vi.fn();
		const onDismissed = callbacks?.onDismissed ?? vi.fn();

		return {
			group,
			onCreatePerson,
			onDismissed,
			...render(UnlabeledGroupCard, {
				props: { group, onCreatePerson, onDismissed }
			})
		};
	}

	it('renders face count in header', () => {
		renderCard({ faceCount: 12 });

		expect(screen.getByText('12 faces')).toBeInTheDocument();
	});

	it('renders singular "face" for count of 1', () => {
		renderCard({ faceCount: 1 });

		expect(screen.getByText('1 face')).toBeInTheDocument();
	});

	it('renders confidence badge', () => {
		renderCard({ clusterConfidence: 0.85 });

		expect(screen.getByText('85% confidence')).toBeInTheDocument();
	});

	it('renders Create Person button', () => {
		renderCard();

		expect(screen.getByRole('button', { name: /Create Person/ })).toBeInTheDocument();
	});

	it('renders Dismiss button', () => {
		renderCard();

		expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
	});

	it('renders Mark as Noise button', () => {
		renderCard();

		expect(screen.getByRole('button', { name: 'Mark as Noise' })).toBeInTheDocument();
	});

	it('calls onCreatePerson with group and empty excludedFaceIds when Create Person clicked', async () => {
		const onCreatePerson = vi.fn();
		const { group } = renderCard(undefined, { onCreatePerson });

		const createBtn = screen.getByRole('button', { name: /Create Person/ });
		await fireEvent.click(createBtn);

		expect(onCreatePerson).toHaveBeenCalledTimes(1);
		expect(onCreatePerson).toHaveBeenCalledWith(group, []);
	});

	it('calls dismiss API and onDismissed when Dismiss button clicked', async () => {
		const onDismissed = vi.fn();
		const group = createUnknownPersonCandidateGroup({ groupId: 'cluster_test' });

		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_test/dismiss',
			{ groupId: 'cluster_test', membershipHash: 'hash', facesAffected: 8 }
		);

		render(UnlabeledGroupCard, {
			props: { group, onCreatePerson: vi.fn(), onDismissed }
		});

		const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
		await fireEvent.click(dismissBtn);

		await waitFor(() => {
			expect(onDismissed).toHaveBeenCalledTimes(1);
		});
	});

	it('shows error when dismiss API fails', async () => {
		const group = createUnknownPersonCandidateGroup({ groupId: 'cluster_fail' });

		mockError(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_fail/dismiss',
			500,
			{ detail: 'Server error' }
		);

		render(UnlabeledGroupCard, {
			props: { group, onCreatePerson: vi.fn(), onDismissed: vi.fn() }
		});

		const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
		await fireEvent.click(dismissBtn);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});

	it('renders selection count text', () => {
		// Group has 1 representative + 6 sample faces (but some may overlap)
		renderCard();

		// Should show "N/N selected" text
		expect(screen.getByText(/selected/)).toBeInTheDocument();
	});

	it('renders Select all / Deselect all toggle', () => {
		renderCard();

		// All selected by default, so it shows "Deselect all"
		expect(screen.getByRole('button', { name: 'Deselect all' })).toBeInTheDocument();
	});

	it('shows Dismissed badge when group is dismissed', () => {
		renderCard({ isDismissed: true });

		expect(screen.getByText(/Dismissed/)).toBeInTheDocument();
	});

	it('disables Create Person button when group is dismissed', () => {
		renderCard({ isDismissed: true });

		const createBtn = screen.getByRole('button', { name: /Create Person/ });
		expect(createBtn).toBeDisabled();
	});

	it('disables Dismiss button when group is dismissed', () => {
		renderCard({ isDismissed: true });

		const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
		expect(dismissBtn).toBeDisabled();
	});

	it('renders face thumbnails with role="button" attribute', () => {
		renderCard();

		// Each face thumbnail is rendered via SelectableFaceThumbnail which has role="button"
		const faceButtons = screen.getAllByRole('button', { name: 'Face in group' });
		expect(faceButtons.length).toBeGreaterThan(0);

		// Each should have tabindex for keyboard access
		faceButtons.forEach((btn) => {
			expect(btn).toHaveAttribute('tabindex', '0');
		});
	});

	it('renders checkboxes on each face thumbnail', () => {
		renderCard();

		const checkboxes = screen.getAllByRole('checkbox', { name: 'Select face' });
		expect(checkboxes.length).toBeGreaterThan(0);
	});

	// ============ onThumbnailClick Tests ============

	describe('onThumbnailClick behavior', () => {
		function renderCardWithThumbnailClick(
			groupOverrides?: Parameters<typeof createUnknownPersonCandidateGroup>[0],
			callbacks?: {
				onCreatePerson?: (...args: unknown[]) => void;
				onDismissed?: () => void;
				onThumbnailClick?: (face: unknown) => void;
			}
		) {
			const group = createUnknownPersonCandidateGroup(groupOverrides);
			const onCreatePerson = callbacks?.onCreatePerson ?? vi.fn();
			const onDismissed = callbacks?.onDismissed ?? vi.fn();
			const onThumbnailClick = callbacks?.onThumbnailClick ?? vi.fn();

			return {
				group,
				onCreatePerson,
				onDismissed,
				onThumbnailClick,
				...render(UnlabeledGroupCard, {
					props: { group, onCreatePerson, onDismissed, onThumbnailClick }
				})
			};
		}

		it('calls onThumbnailClick when thumbnail body is clicked', async () => {
			const onThumbnailClick = vi.fn();
			renderCardWithThumbnailClick(undefined, { onThumbnailClick });

			// Click the first face thumbnail (role="button" with aria-label "Face in group")
			const faceButtons = screen.getAllByRole('button', { name: 'Face in group' });
			expect(faceButtons.length).toBeGreaterThan(0);

			await fireEvent.click(faceButtons[0]);

			expect(onThumbnailClick).toHaveBeenCalledTimes(1);
			// Should be called with the face object
			expect(onThumbnailClick).toHaveBeenCalledWith(
				expect.objectContaining({
					faceInstanceId: expect.any(String),
					assetId: expect.any(String)
				})
			);
		});

		it('does not toggle selection when thumbnail body is clicked and onThumbnailClick is provided', async () => {
			const onThumbnailClick = vi.fn();
			renderCardWithThumbnailClick(undefined, { onThumbnailClick });

			// All faces should be selected initially
			const selectionText = screen.getByText(/selected/);
			const initialText = selectionText.textContent;

			// Click a face thumbnail body
			const faceButtons = screen.getAllByRole('button', { name: 'Face in group' });
			await fireEvent.click(faceButtons[0]);

			// Selection count should remain unchanged (thumbnail click should not toggle selection)
			const updatedText = screen.getByText(/selected/).textContent;
			expect(updatedText).toBe(initialText);
		});

		it('checkbox still toggles selection when onThumbnailClick is provided', async () => {
			const onThumbnailClick = vi.fn();
			renderCardWithThumbnailClick(undefined, { onThumbnailClick });

			// Parse "N/N selected" text to get counts
			function getSelectionCount(): { selected: number; total: number } {
				const text = screen.getByText(/selected/).textContent ?? '';
				const match = text.match(/(\d+)\/(\d+)/);
				expect(match).toBeTruthy();
				return {
					selected: parseInt(match?.[1] ?? '0', 10),
					total: parseInt(match?.[2] ?? '0', 10)
				};
			}

			const initial = getSelectionCount();

			// All should be selected initially
			expect(initial.selected).toBe(initial.total);

			// Click a checkbox (not the thumbnail body)
			const checkboxes = screen.getAllByRole('checkbox', { name: 'Select face' });
			expect(checkboxes.length).toBeGreaterThan(0);
			await fireEvent.click(checkboxes[0]);

			// Selection count should decrease by 1
			await waitFor(() => {
				const updated = getSelectionCount();
				expect(updated.selected).toBe(initial.selected - 1);
			});

			// onThumbnailClick should NOT have been called by the checkbox
			expect(onThumbnailClick).not.toHaveBeenCalled();
		});

		it('without onThumbnailClick, clicking thumbnail body toggles selection', async () => {
			// Render without onThumbnailClick
			renderCard();

			// Parse "N/N selected" text
			function getSelectedCount(): number {
				const text = screen.getByText(/selected/).textContent ?? '';
				const match = text.match(/(\d+)\/(\d+)/);
				expect(match).toBeTruthy();
				return parseInt(match?.[1] ?? '0', 10);
			}

			const initialCount = getSelectedCount();

			// Click a face thumbnail body
			const faceButtons = screen.getAllByRole('button', { name: 'Face in group' });
			await fireEvent.click(faceButtons[0]);

			// Selection count should have changed (decreased by 1 since all were selected)
			await waitFor(() => {
				expect(getSelectedCount()).toBe(initialCount - 1);
			});
		});
	});
});
