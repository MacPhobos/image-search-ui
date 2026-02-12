import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import UnlabeledGroupCard from '$lib/components/faces/UnlabeledGroupCard.svelte';
import { createUnknownPersonCandidateGroup } from '../../helpers/fixtures';
import { mockResponse, mockError } from '../../helpers/mockFetch';

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

		expect(screen.getByText('Dismissed')).toBeInTheDocument();
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
});
