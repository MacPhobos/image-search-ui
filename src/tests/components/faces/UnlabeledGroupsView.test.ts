import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import UnlabeledGroupsView from '$lib/components/faces/UnlabeledGroupsView.svelte';
import {
	createUnknownPersonCandidatesResponse,
	createUnknownPersonCandidateGroup,
	createDiscoveryStats,
	createMergeSuggestion
} from '../../helpers/fixtures';
import { mockResponse, mockError, assertCalled } from '../../helpers/mockFetch';

// Mock localSettings to avoid localStorage dependencies
vi.mock('$lib/stores/localSettings.svelte', () => ({
	localSettings: {
		get: (_key: string, defaultValue: unknown) => defaultValue,
		set: vi.fn()
	}
}));

describe('UnlabeledGroupsView', () => {
	/**
	 * Setup mocks that match URLs with query params.
	 * The candidates endpoint gets called with query params appended,
	 * so we use a regex pattern (starting with /) to match.
	 */
	function setupDefaultMocks() {
		const candidatesResp = createUnknownPersonCandidatesResponse();
		const statsResp = createDiscoveryStats();
		const mergeSuggestionsResp = { suggestions: [], totalGroupsCompared: 0 };

		// Regex pattern matches any URL containing this path (with or without query params)
		mockResponse('/unknown-persons\\/candidates\\?', candidatesResp);
		mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/stats', statsResp);
		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/merge-suggestions',
			mergeSuggestionsResp
		);

		return { candidatesResp, statsResp };
	}

	function setupMocksWithCandidates(
		candidatesOverrides?: Parameters<typeof createUnknownPersonCandidatesResponse>[0]
	) {
		const candidatesResp = createUnknownPersonCandidatesResponse(candidatesOverrides);
		const statsResp = createDiscoveryStats();
		const mergeSuggestionsResp = { suggestions: [], totalGroupsCompared: 0 };

		mockResponse('/unknown-persons\\/candidates\\?', candidatesResp);
		mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/stats', statsResp);
		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/merge-suggestions',
			mergeSuggestionsResp
		);

		return { candidatesResp, statsResp };
	}

	it('renders the heading "Suggested New Persons"', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		expect(screen.getByText('Suggested New Persons')).toBeInTheDocument();
	});

	it('fetches candidates on mount', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		await waitFor(() => {
			assertCalled('/api/v1/faces/unknown-persons/candidates');
		});
	});

	it('fetches discovery stats on mount', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		await waitFor(() => {
			assertCalled('/api/v1/faces/unknown-persons/stats');
		});
	});

	it('renders group cards after data loads', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		await waitFor(() => {
			// Each group card shows face count + " faces" or " face"
			const faceCountElements = screen.getAllByText(/\d+ faces?$/);
			expect(faceCountElements.length).toBeGreaterThanOrEqual(1);
		});
	});

	it('renders stats info after loading', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByText(/50,000 unassigned faces/)).toBeInTheDocument();
		});
	});

	it('shows empty state when no groups returned', async () => {
		setupMocksWithCandidates({ groups: [], totalGroups: 0 });

		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByText('No candidate groups found')).toBeInTheDocument();
		});
	});

	it('shows empty state help text', async () => {
		setupMocksWithCandidates({ groups: [], totalGroups: 0 });

		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByText(/Try lowering the confidence threshold/)).toBeInTheDocument();
		});
	});

	it('shows error state on API failure', async () => {
		// Use regex for error mock too, since URL will have query params
		mockError('/unknown-persons\\/candidates', 500, { detail: 'Internal error' });
		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/stats',
			createDiscoveryStats()
		);

		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});

	it('renders Discover New Persons button', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		expect(screen.getByRole('button', { name: 'Discover New Persons' })).toBeInTheDocument();
	});

	it('calls triggerDiscovery when Discover button clicked', async () => {
		setupDefaultMocks();
		mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/discover', {
			jobId: 'job-new',
			status: 'queued',
			progressKey: 'key',
			params: {}
		});

		render(UnlabeledGroupsView);

		const discoverBtn = screen.getByRole('button', {
			name: 'Discover New Persons'
		});
		await fireEvent.click(discoverBtn);

		await waitFor(() => {
			assertCalled('/api/v1/faces/unknown-persons/discover');
		});
	});

	it('shows discovering state when discovery is in progress', async () => {
		setupDefaultMocks();
		mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/discover', {
			jobId: 'job-active',
			status: 'queued',
			progressKey: 'key',
			params: {}
		});

		render(UnlabeledGroupsView);

		const discoverBtn = screen.getByRole('button', {
			name: 'Discover New Persons'
		});
		await fireEvent.click(discoverBtn);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Discovering...' })).toBeInTheDocument();
		});
	});

	it('renders SimilarityThresholdControl', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		expect(screen.getByText('Similarity Threshold')).toBeInTheDocument();
	});

	it('renders pagination when totalPages > 1', async () => {
		// 100 groups / 50 per page = 2 pages
		setupMocksWithCandidates({ totalGroups: 100 });

		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
		});
	});

	it('disables Previous button on first page', async () => {
		setupMocksWithCandidates({ totalGroups: 100 });

		render(UnlabeledGroupsView);

		await waitFor(() => {
			const prevBtn = screen.getByRole('button', { name: 'Previous' });
			expect(prevBtn).toBeDisabled();
		});
	});

	it('shows page info text in pagination', async () => {
		setupMocksWithCandidates({ totalGroups: 100 });

		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
			expect(screen.getByText(/100 groups/)).toBeInTheDocument();
		});
	});

	it('does not show pagination when results fit on one page', async () => {
		// totalGroups=3 < groupsPerPage=50, so no pagination
		setupMocksWithCandidates({ totalGroups: 3 });

		render(UnlabeledGroupsView);

		// Wait for groups to render
		await waitFor(() => {
			const faceCountElements = screen.getAllByText(/\d+ faces?$/);
			expect(faceCountElements.length).toBeGreaterThanOrEqual(1);
		});

		expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('renders Advanced Mode link', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		expect(screen.getByText('Advanced Mode')).toBeInTheDocument();
	});

	it('fetches merge suggestions on mount', async () => {
		setupDefaultMocks();
		render(UnlabeledGroupsView);

		await waitFor(() => {
			assertCalled('/api/v1/faces/unknown-persons/candidates/merge-suggestions');
		});
	});

	it('renders merge suggestions section when suggestions exist', async () => {
		const candidatesResp = createUnknownPersonCandidatesResponse();
		const statsResp = createDiscoveryStats();
		const mergeSuggestionsResp = {
			suggestions: [createMergeSuggestion()],
			totalGroupsCompared: 10
		};

		mockResponse('/unknown-persons\\/candidates\\?', candidatesResp);
		mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/stats', statsResp);
		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/merge-suggestions',
			mergeSuggestionsResp
		);

		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByText('Suggested Merges')).toBeInTheDocument();
		});
	});

	it('clicking a merge suggestion opens the dialog', async () => {
		// Create groups that match the merge suggestion IDs
		const candidatesResp = createUnknownPersonCandidatesResponse({
			groups: [
				createUnknownPersonCandidateGroup({ groupId: 'cluster_a' }),
				createUnknownPersonCandidateGroup({ groupId: 'cluster_b' }),
				createUnknownPersonCandidateGroup({ groupId: 'cluster_c' })
			]
		});
		const statsResp = createDiscoveryStats();
		const mergeSuggestionsResp = {
			suggestions: [createMergeSuggestion()],
			totalGroupsCompared: 10
		};

		mockResponse('/unknown-persons\\/candidates\\?', candidatesResp);
		mockResponse('http://localhost:8000/api/v1/faces/unknown-persons/stats', statsResp);
		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/merge-suggestions',
			mergeSuggestionsResp
		);

		render(UnlabeledGroupsView);

		await waitFor(() => {
			expect(screen.getByText('Suggested Merges')).toBeInTheDocument();
		});

		const suggestionButton = screen.getByText(/82% similar/).closest('button');
		expect(suggestionButton).toBeInTheDocument();

		if (suggestionButton) {
			await fireEvent.click(suggestionButton);

			// Dialog should open (check for dialog title)
			await waitFor(() => {
				expect(screen.getByText('Merge Face Groups')).toBeInTheDocument();
			});
		}
	});
});
