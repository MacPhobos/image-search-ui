import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import AdminQueuesWrapper from './AdminQueuesTestWrapper.svelte';
import type { Mock } from 'vitest';
import { createQueuesOverviewResponse, createWorkersResponse } from '../helpers/fixtures';

// Mock the queues API module
vi.mock('$lib/api/queues', () => ({
	getQueuesOverview: vi.fn(),
	getWorkers: vi.fn()
}));

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock dev viewId
vi.mock('$lib/dev/viewId', () => ({
	setViewId: vi.fn(() => vi.fn())
}));

import { getQueuesOverview, getWorkers } from '$lib/api/queues';
import { goto } from '$app/navigation';

describe('Admin Queues Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mocks for queue APIs
		(getQueuesOverview as Mock).mockResolvedValue(createQueuesOverviewResponse());
		(getWorkers as Mock).mockResolvedValue(createWorkersResponse());
	});

	it('renders page title', async () => {
		render(AdminQueuesWrapper);

		expect(screen.getByText('Queue Monitoring')).toBeInTheDocument();
	});

	it('loads queues and workers on mount', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(getQueuesOverview).toHaveBeenCalledTimes(1);
			expect(getWorkers).toHaveBeenCalledTimes(1);
		});
	});

	it('displays queue overview stats after loading', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByText('high')).toBeInTheDocument();
		});

		// Once queue cards render, the stats bar should also be visible
		expect(screen.getByText('Total Jobs')).toBeInTheDocument();
		// "Idle" label appears in both stats bar and WorkersPanel
		const idleElements = screen.getAllByText('Idle');
		expect(idleElements.length).toBeGreaterThanOrEqual(1);
	});

	it('displays queue cards for each queue', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByText('high')).toBeInTheDocument();
			expect(screen.getByText('default')).toBeInTheDocument();
			expect(screen.getByText('low')).toBeInTheDocument();
		});
	});

	it('shows connection indicator when overview is loaded', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByText('Connected')).toBeInTheDocument();
		});
	});

	it('shows disconnected indicator when redis is not connected', async () => {
		(getQueuesOverview as Mock).mockResolvedValue(
			createQueuesOverviewResponse({ redisConnected: false })
		);

		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByText('Disconnected')).toBeInTheDocument();
		});
	});

	// Error handling tests
	it('shows queue error banner when queue API fails', async () => {
		(getQueuesOverview as Mock).mockRejectedValue(new Error('Network request failed'));

		render(AdminQueuesWrapper);

		await waitFor(() => {
			const alerts = screen.getAllByRole('alert');
			const queueAlert = alerts.find((el) => el.textContent?.includes('Network request failed'));
			expect(queueAlert).toBeTruthy();
		});
	});

	it('shows worker error banner when worker API fails', async () => {
		(getWorkers as Mock).mockRejectedValue(new Error('Worker service unavailable'));

		render(AdminQueuesWrapper);

		await waitFor(() => {
			const alerts = screen.getAllByRole('alert');
			const workerAlert = alerts.find((el) =>
				el.textContent?.includes('Worker service unavailable')
			);
			expect(workerAlert).toBeTruthy();
		});
	});

	it('shows separate error banners when both APIs fail', async () => {
		(getQueuesOverview as Mock).mockRejectedValue(new Error('Queue error'));
		(getWorkers as Mock).mockRejectedValue(new Error('Worker error'));

		render(AdminQueuesWrapper);

		await waitFor(() => {
			const alerts = screen.getAllByRole('alert');
			expect(alerts).toHaveLength(2);
		});
	});

	it('retries queue load when retry button is clicked on queue error', async () => {
		(getQueuesOverview as Mock).mockRejectedValueOnce(new Error('Queue error'));

		render(AdminQueuesWrapper);

		await waitFor(() => {
			const alerts = screen.getAllByRole('alert');
			expect(alerts.find((el) => el.textContent?.includes('Queue error'))).toBeTruthy();
		});

		// Reset mock to succeed on retry
		(getQueuesOverview as Mock).mockResolvedValue(createQueuesOverviewResponse());

		// Find the retry button within the queue error banner
		const retryButtons = screen.getAllByRole('button', { name: /retry/i });
		await fireEvent.click(retryButtons[0]);

		await waitFor(() => {
			expect(getQueuesOverview).toHaveBeenCalledTimes(2);
		});
	});

	it('retries worker load when retry button is clicked on worker error', async () => {
		(getWorkers as Mock).mockRejectedValueOnce(new Error('Worker error'));

		render(AdminQueuesWrapper);

		await waitFor(() => {
			const alerts = screen.getAllByRole('alert');
			expect(alerts.find((el) => el.textContent?.includes('Worker error'))).toBeTruthy();
		});

		// Reset mock to succeed on retry
		(getWorkers as Mock).mockResolvedValue(createWorkersResponse());

		// Find the retry button within the worker error banner
		const retryButtons = screen.getAllByRole('button', { name: /retry/i });
		await fireEvent.click(retryButtons[0]);

		await waitFor(() => {
			expect(getWorkers).toHaveBeenCalledTimes(2);
		});
	});

	it('clears queue error on successful retry', async () => {
		(getQueuesOverview as Mock)
			.mockRejectedValueOnce(new Error('Queue error'))
			.mockResolvedValue(createQueuesOverviewResponse());

		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getAllByRole('alert')).toHaveLength(1);
		});

		const retryButtons = screen.getAllByRole('button', { name: /retry/i });
		await fireEvent.click(retryButtons[0]);

		await waitFor(() => {
			expect(screen.queryByText('Queue error')).not.toBeInTheDocument();
		});
	});

	it('shows queue data even when worker API fails', async () => {
		(getWorkers as Mock).mockRejectedValue(new Error('Worker error'));

		render(AdminQueuesWrapper);

		await waitFor(() => {
			// Queue data should still be displayed
			expect(screen.getByText('Total Jobs')).toBeInTheDocument();
			expect(screen.getByText('high')).toBeInTheDocument();
		});
	});

	it('shows workers panel even when queue API fails', async () => {
		(getQueuesOverview as Mock).mockRejectedValue(new Error('Queue error'));

		render(AdminQueuesWrapper);

		await waitFor(() => {
			// Workers panel header should be visible
			expect(screen.getByText('Workers')).toBeInTheDocument();
		});
	});

	// Loading state tests
	it('shows skeleton loading on initial load', () => {
		// Make APIs never resolve to keep loading state
		(getQueuesOverview as Mock).mockReturnValue(new Promise(() => {}));
		(getWorkers as Mock).mockReturnValue(new Promise(() => {}));

		render(AdminQueuesWrapper);

		expect(screen.getByText('Refreshing...')).toBeInTheDocument();
	});

	it('disables refresh button while loading', () => {
		(getQueuesOverview as Mock).mockReturnValue(new Promise(() => {}));
		(getWorkers as Mock).mockReturnValue(new Promise(() => {}));

		render(AdminQueuesWrapper);

		const refreshBtn = screen.getByRole('button', { name: /refreshing/i });
		expect(refreshBtn).toBeDisabled();
	});

	it('enables refresh button after loading completes', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			const refreshBtn = screen.getByRole('button', { name: /refresh/i });
			expect(refreshBtn).not.toBeDisabled();
		});
	});

	// Refresh button test
	it('calls fetchData when refresh button clicked', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /^refresh$/i })).toBeInTheDocument();
		});

		vi.clearAllMocks();
		(getQueuesOverview as Mock).mockResolvedValue(createQueuesOverviewResponse());
		(getWorkers as Mock).mockResolvedValue(createWorkersResponse());

		const refreshBtn = screen.getByRole('button', { name: /^refresh$/i });
		await fireEvent.click(refreshBtn);

		await waitFor(() => {
			expect(getQueuesOverview).toHaveBeenCalled();
			expect(getWorkers).toHaveBeenCalled();
		});
	});

	// Navigation test
	it('navigates to queue detail when queue card is clicked', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByText('high')).toBeInTheDocument();
		});

		// QueueCard wraps content in a button
		const queueButtons = screen.getAllByRole('button', { name: /high|default|low/i });
		await fireEvent.click(queueButtons[0]);

		expect(goto).toHaveBeenCalledWith('/admin/queues/high');
	});

	// Workers panel integration test
	it('passes worker data to WorkersPanel', async () => {
		render(AdminQueuesWrapper);

		await waitFor(() => {
			// Worker names should appear in the workers panel table
			expect(screen.getByText(/worker-1/)).toBeInTheDocument();
			expect(screen.getByText(/worker-2/)).toBeInTheDocument();
		});
	});

	it('shows loading state in workers panel while fetching workers', () => {
		(getWorkers as Mock).mockReturnValue(new Promise(() => {}));

		render(AdminQueuesWrapper);

		// WorkersPanel shows "Loading workers..." when loading prop is true
		expect(screen.getByText('Loading workers...')).toBeInTheDocument();
	});

	it('handles empty queues gracefully', async () => {
		(getQueuesOverview as Mock).mockResolvedValue(
			createQueuesOverviewResponse({
				queues: [],
				totalJobs: 0,
				totalWorkers: 0,
				workersBusy: 0
			})
		);

		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByText('Queues')).toBeInTheDocument();
			// Stats should show zeros
			const statValues = screen.getAllByText('0');
			expect(statValues.length).toBeGreaterThan(0);
		});
	});

	it('handles empty workers list gracefully', async () => {
		(getWorkers as Mock).mockResolvedValue(
			createWorkersResponse({
				workers: [],
				total: 0,
				active: 0,
				idle: 0
			})
		);

		render(AdminQueuesWrapper);

		await waitFor(() => {
			expect(screen.getByText('No workers connected')).toBeInTheDocument();
		});
	});
});
