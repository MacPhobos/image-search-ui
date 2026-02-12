import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MergeGroupsDialog from '$lib/components/faces/MergeGroupsDialog.svelte';
import { mockResponse, mockError } from '../../helpers/mockFetch';
import { createUnknownPersonCandidateGroup } from '../../helpers/fixtures';

describe('MergeGroupsDialog', () => {
	const groupA = createUnknownPersonCandidateGroup({
		groupId: 'cluster_a',
		faceCount: 8
	});

	const groupB = createUnknownPersonCandidateGroup({
		groupId: 'cluster_b',
		faceCount: 5
	});

	const similarity = 0.82;
	const onOpenChange = vi.fn();
	const onMerged = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders dialog title', () => {
		render(MergeGroupsDialog, {
			props: {
				open: true,
				groupA,
				groupB,
				similarity,
				onOpenChange,
				onMerged
			}
		});

		expect(screen.getByText('Merge Face Groups')).toBeInTheDocument();
	});

	it('shows similarity percentage', () => {
		render(MergeGroupsDialog, {
			props: {
				open: true,
				groupA,
				groupB,
				similarity,
				onOpenChange,
				onMerged
			}
		});

		expect(screen.getByText('82% similar')).toBeInTheDocument();
	});

	it('shows face counts for both groups', () => {
		render(MergeGroupsDialog, {
			props: {
				open: true,
				groupA,
				groupB,
				similarity,
				onOpenChange,
				onMerged
			}
		});

		expect(screen.getByText(/Group 1 \(8 faces\)/)).toBeInTheDocument();
		expect(screen.getByText(/Group 2 \(5 faces\)/)).toBeInTheDocument();
	});

	it('shows combined total after merge', () => {
		render(MergeGroupsDialog, {
			props: {
				open: true,
				groupA,
				groupB,
				similarity,
				onOpenChange,
				onMerged
			}
		});

		expect(screen.getByText(/13 faces total/)).toBeInTheDocument();
	});

	it('merge button calls API and onMerged callback', async () => {
		const user = userEvent.setup();

		mockResponse('/api/v1/faces/unknown-persons/candidates/merge', {
			mergedGroupId: 'cluster_merged',
			totalFaces: 13,
			facesMoved: 5
		});

		render(MergeGroupsDialog, {
			props: {
				open: true,
				groupA,
				groupB,
				similarity,
				onOpenChange,
				onMerged
			}
		});

		const mergeButton = screen.getByRole('button', { name: /Merge Groups/i });
		await user.click(mergeButton);

		await waitFor(() => {
			expect(onMerged).toHaveBeenCalledWith('cluster_merged');
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it('shows error on API failure', async () => {
		const user = userEvent.setup();

		mockError('/api/v1/faces/unknown-persons/candidates/merge', 'Merge failed', 500);

		render(MergeGroupsDialog, {
			props: {
				open: true,
				groupA,
				groupB,
				similarity,
				onOpenChange,
				onMerged
			}
		});

		const mergeButton = screen.getByRole('button', { name: /Merge Groups/i });
		await user.click(mergeButton);

		await waitFor(() => {
			expect(screen.getByText(/Merge failed/)).toBeInTheDocument();
		});

		expect(onMerged).not.toHaveBeenCalled();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('disables buttons during merge', async () => {
		const user = userEvent.setup();

		mockResponse('/api/v1/faces/unknown-persons/candidates/merge', {
			mergedGroupId: 'cluster_merged',
			totalFaces: 13,
			facesMoved: 5
		});

		render(MergeGroupsDialog, {
			props: {
				open: true,
				groupA,
				groupB,
				similarity,
				onOpenChange,
				onMerged
			}
		});

		const mergeButton = screen.getByRole('button', { name: /Merge Groups/i });
		const cancelButton = screen.getByRole('button', { name: /Cancel/i });

		expect(mergeButton).not.toBeDisabled();
		expect(cancelButton).not.toBeDisabled();

		await user.click(mergeButton);

		await waitFor(() => {
			expect(onMerged).toHaveBeenCalled();
		});
	});
});
