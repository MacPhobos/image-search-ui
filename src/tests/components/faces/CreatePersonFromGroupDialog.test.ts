import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import CreatePersonFromGroupDialog from '$lib/components/faces/CreatePersonFromGroupDialog.svelte';
import { createUnknownPersonCandidateGroup } from '../../helpers/fixtures';
import { mockResponse, mockError, getFetchMock } from '../../helpers/mockFetch';

describe('CreatePersonFromGroupDialog', () => {
	function renderDialog(overrides?: {
		open?: boolean;
		groupOverrides?: Parameters<typeof createUnknownPersonCandidateGroup>[0];
		excludedFaceIds?: string[];
		onOpenChange?: (open: boolean) => void;
		onAccepted?: (...args: unknown[]) => void;
	}) {
		const group = createUnknownPersonCandidateGroup(overrides?.groupOverrides);
		const onOpenChange = overrides?.onOpenChange ?? vi.fn();
		const onAccepted = overrides?.onAccepted ?? vi.fn();

		return {
			group,
			onOpenChange,
			onAccepted,
			...render(CreatePersonFromGroupDialog, {
				props: {
					open: overrides?.open ?? true,
					group,
					excludedFaceIds: overrides?.excludedFaceIds ?? [],
					onOpenChange,
					onAccepted
				}
			})
		};
	}

	it('renders dialog title when open', () => {
		renderDialog({ open: true });

		expect(screen.getByText('Create Person from Group')).toBeInTheDocument();
	});

	it('renders Person Name label', () => {
		renderDialog({ open: true });

		expect(screen.getByText('Person Name')).toBeInTheDocument();
	});

	it('renders name input with placeholder', () => {
		renderDialog({ open: true });

		expect(screen.getByPlaceholderText('Enter person name...')).toBeInTheDocument();
	});

	it('displays face count in description', () => {
		renderDialog({
			open: true,
			groupOverrides: { faceCount: 12 }
		});

		// The description says "Assign a name to this group of N faces."
		// N is the number of included faces (representative + unique sample faces)
		expect(screen.getByText(/Assign a name to this group of/)).toBeInTheDocument();
	});

	it('shows excluded count in description when faces are excluded', () => {
		const group = createUnknownPersonCandidateGroup();
		const excludedId = group.sampleFaces.at(0)?.faceInstanceId ?? '';

		render(CreatePersonFromGroupDialog, {
			props: {
				open: true,
				group,
				excludedFaceIds: [excludedId],
				onOpenChange: vi.fn(),
				onAccepted: vi.fn()
			}
		});

		expect(screen.getByText(/excluded/i)).toBeInTheDocument();
	});

	it('renders Cancel button', () => {
		renderDialog({ open: true });

		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
	});

	it('renders submit button that is disabled when name is empty', () => {
		renderDialog({ open: true });

		// Submit button should show 'Create "..."' when name is empty
		const submitBtn = screen.getByRole('button', { name: /Create "/ });
		expect(submitBtn).toBeDisabled();
	});

	it('enables submit button when name has at least 2 characters', async () => {
		renderDialog({ open: true });

		const input = screen.getByPlaceholderText('Enter person name...');
		await fireEvent.input(input, { target: { value: 'Al' } });

		await waitFor(() => {
			const submitBtn = screen.getByRole('button', { name: /Create "Al"/ });
			expect(submitBtn).not.toBeDisabled();
		});
	});

	it('shows validation error for single character name', async () => {
		renderDialog({ open: true });

		const input = screen.getByPlaceholderText('Enter person name...');
		await fireEvent.input(input, { target: { value: 'A' } });

		await waitFor(() => {
			expect(screen.getByText('Name must be at least 2 characters.')).toBeInTheDocument();
		});
	});

	it('calls acceptUnknownPersonCandidate API with correct params on submit', async () => {
		const onAccepted = vi.fn();
		const group = createUnknownPersonCandidateGroup({ groupId: 'cluster_99' });

		const acceptResp = {
			personId: 'person-new',
			personName: 'Alice',
			facesAssigned: 7,
			facesExcluded: 0,
			prototypesCreated: 3,
			findMoreJobId: 'job-x',
			reclusteringJobId: null
		};

		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_99/accept',
			acceptResp
		);

		render(CreatePersonFromGroupDialog, {
			props: {
				open: true,
				group,
				excludedFaceIds: [],
				onOpenChange: vi.fn(),
				onAccepted
			}
		});

		const input = screen.getByPlaceholderText('Enter person name...');
		await fireEvent.input(input, { target: { value: 'Alice' } });

		await waitFor(() => {
			const submitBtn = screen.getByRole('button', { name: /Create "Alice"/ });
			expect(submitBtn).not.toBeDisabled();
		});

		const submitBtn = screen.getByRole('button', { name: /Create "Alice"/ });
		await fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(onAccepted).toHaveBeenCalledTimes(1);
			expect(onAccepted).toHaveBeenCalledWith(acceptResp);
		});

		// Verify the API was called with correct body
		const fetchMock = getFetchMock();
		const acceptCall = fetchMock.mock.calls.find((call: unknown[]) =>
			(call[0] as string).includes('/accept')
		);
		expect(acceptCall).toBeTruthy();
		const body = JSON.parse((acceptCall as [string, { body: string }])[1].body);
		expect(body.name).toBe('Alice');
	});

	it('sends faceIdsToExclude when faces are excluded', async () => {
		const group = createUnknownPersonCandidateGroup({ groupId: 'cluster_ex' });
		const excludedIds = ['face-0', 'face-1'];

		mockResponse(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_ex/accept',
			{
				personId: 'p-1',
				personName: 'Bob',
				facesAssigned: 5,
				facesExcluded: 2,
				prototypesCreated: 2,
				findMoreJobId: 'j-1',
				reclusteringJobId: null
			}
		);

		render(CreatePersonFromGroupDialog, {
			props: {
				open: true,
				group,
				excludedFaceIds: excludedIds,
				onOpenChange: vi.fn(),
				onAccepted: vi.fn()
			}
		});

		const input = screen.getByPlaceholderText('Enter person name...');
		await fireEvent.input(input, { target: { value: 'Bob' } });

		await waitFor(() => {
			const submitBtn = screen.getByRole('button', { name: /Create "Bob"/ });
			expect(submitBtn).not.toBeDisabled();
		});

		const submitBtn = screen.getByRole('button', { name: /Create "Bob"/ });
		await fireEvent.click(submitBtn);

		await waitFor(() => {
			const fetchMock = getFetchMock();
			const acceptCall = fetchMock.mock.calls.find((call: unknown[]) =>
				(call[0] as string).includes('/accept')
			);
			expect(acceptCall).toBeTruthy();
			const body = JSON.parse((acceptCall as [string, { body: string }])[1].body);
			expect(body.faceIdsToExclude).toEqual(excludedIds);
		});
	});

	it('shows error message when API call fails', async () => {
		const group = createUnknownPersonCandidateGroup({ groupId: 'cluster_err' });

		mockError(
			'http://localhost:8000/api/v1/faces/unknown-persons/candidates/cluster_err/accept',
			500,
			{ detail: 'Internal server error' }
		);

		render(CreatePersonFromGroupDialog, {
			props: {
				open: true,
				group,
				excludedFaceIds: [],
				onOpenChange: vi.fn(),
				onAccepted: vi.fn()
			}
		});

		const input = screen.getByPlaceholderText('Enter person name...');
		await fireEvent.input(input, { target: { value: 'Charlie' } });

		await waitFor(() => {
			const submitBtn = screen.getByRole('button', { name: /Create "Charlie"/ });
			expect(submitBtn).not.toBeDisabled();
		});

		const submitBtn = screen.getByRole('button', { name: /Create "Charlie"/ });
		await fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});

	it('displays group metadata (total faces, confidence, quality)', () => {
		renderDialog({
			open: true,
			groupOverrides: {
				faceCount: 15,
				clusterConfidence: 0.92,
				avgQuality: 0.85
			}
		});

		expect(screen.getByText('15')).toBeInTheDocument();
		expect(screen.getByText('92%')).toBeInTheDocument();
		expect(screen.getByText('0.85')).toBeInTheDocument();
	});
});
