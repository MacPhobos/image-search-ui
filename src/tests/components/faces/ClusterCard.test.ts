import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ClusterCard from '$lib/components/faces/ClusterCard.svelte';
import { createFaceCluster } from '../../helpers/fixtures';

describe('ClusterCard', () => {
	it('renders cluster face count', () => {
		const cluster = createFaceCluster({ faceCount: 15 });

		render(ClusterCard, {
			props: { cluster }
		});

		expect(screen.getByText('15 faces')).toBeInTheDocument();
	});

	it('renders cluster confidence badge when clusterConfidence exists', () => {
		const cluster = createFaceCluster({ clusterConfidence: 0.85 });

		render(ClusterCard, {
			props: { cluster }
		});

		expect(screen.getByText('85% match')).toBeInTheDocument();
	});

	it('does not render confidence badge when clusterConfidence is null', () => {
		const cluster = createFaceCluster({ clusterConfidence: null });

		render(ClusterCard, {
			props: { cluster }
		});

		expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
	});

	it('renders average quality', () => {
		const cluster = createFaceCluster({ avgQuality: 0.75 });

		render(ClusterCard, {
			props: { cluster }
		});

		expect(screen.getByText(/Avg Quality:/)).toBeInTheDocument();
		expect(screen.getByText('75%')).toBeInTheDocument();
	});

	it('does not render Create Person button when onCreatePerson is not provided', () => {
		const cluster = createFaceCluster();

		render(ClusterCard, {
			props: { cluster }
		});

		expect(screen.queryByRole('button', { name: /Create Person/i })).not.toBeInTheDocument();
	});

	it('renders Create Person button when onCreatePerson is provided', () => {
		const cluster = createFaceCluster();
		const onCreatePerson = vi.fn();

		render(ClusterCard, {
			props: {
				cluster,
				onCreatePerson
			}
		});

		expect(screen.getByRole('button', { name: /Create Person/i })).toBeInTheDocument();
	});

	it('calls onCreatePerson with clusterId when button is clicked', async () => {
		const user = userEvent.setup();
		const cluster = createFaceCluster({ clusterId: 'cluster_123' });
		const onCreatePerson = vi.fn();

		render(ClusterCard, {
			props: {
				cluster,
				onCreatePerson
			}
		});

		const button = screen.getByRole('button', { name: /Create Person/i });
		await user.click(button);

		expect(onCreatePerson).toHaveBeenCalledWith('cluster_123');
	});

	it('stops event propagation when Create Person button is clicked', async () => {
		const user = userEvent.setup();
		const cluster = createFaceCluster();
		const onClick = vi.fn();
		const onCreatePerson = vi.fn();

		render(ClusterCard, {
			props: {
				cluster,
				onClick,
				onCreatePerson
			}
		});

		const button = screen.getByRole('button', { name: /Create Person/i });
		await user.click(button);

		// onCreatePerson should be called
		expect(onCreatePerson).toHaveBeenCalled();
		// onClick should NOT be called (event propagation stopped)
		expect(onClick).not.toHaveBeenCalled();
	});

	it('calls onClick when card is clicked', async () => {
		const user = userEvent.setup();
		const cluster = createFaceCluster();
		const onClick = vi.fn();

		render(ClusterCard, {
			props: {
				cluster,
				onClick
			}
		});

		// Click on the card (not on the button)
		const card = screen.getByRole('button', { name: /Face cluster with/i });
		await user.click(card);

		expect(onClick).toHaveBeenCalled();
	});
});
