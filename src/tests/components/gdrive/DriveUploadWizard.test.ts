import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DriveUploadWizard from '$lib/components/gdrive/DriveUploadWizard.svelte';
import { mockResponse } from '../../helpers/mockFetch';
import {
	createDriveFolderTree,
	createDriveStartUploadResponse,
	createDriveUploadStatus
} from '../../helpers/fixtures';
import type { PersonPhotoGroup } from '$lib/api/faces';

function createTestPhotos(count: number): PersonPhotoGroup[] {
	return Array.from({ length: count }, (_, i) => ({
		photoId: i + 1,
		thumbnailUrl: `/api/v1/images/${i + 1}/thumbnail`,
		faceCount: 1,
		hasNonPersonFaces: false,
		takenAt: null
	}));
}

describe('DriveUploadWizard', () => {
	const testPhotos = createTestPhotos(5);

	const defaultProps = {
		open: true,
		personId: 'person-123',
		personName: 'John Doe',
		photos: testPhotos,
		initialPhotoIds: [1, 2, 3, 4, 5],
		onClose: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders Step 1 review by default', () => {
		render(DriveUploadWizard, { props: defaultProps });

		expect(screen.getByText('Review Photos')).toBeInTheDocument();
		expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
	});

	it('shows photo count in step 1', () => {
		render(DriveUploadWizard, { props: defaultProps });

		expect(screen.getByText(/5 photos selected/)).toBeInTheDocument();
	});

	it('shows Next: Choose Folder button in step 1', () => {
		render(DriveUploadWizard, { props: defaultProps });

		expect(screen.getByRole('button', { name: 'Next: Choose Folder' })).toBeInTheDocument();
	});

	it('shows Cancel button', () => {
		render(DriveUploadWizard, { props: defaultProps });

		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
	});

	it('transitions to step 2 when Next clicked', async () => {
		const user = userEvent.setup();
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());

		render(DriveUploadWizard, { props: defaultProps });

		await user.click(screen.getByRole('button', { name: 'Next: Choose Folder' }));

		expect(screen.getByText('Choose Destination')).toBeInTheDocument();
		expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
	});

	it('shows Back button in step 2', async () => {
		const user = userEvent.setup();
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());

		render(DriveUploadWizard, { props: defaultProps });

		await user.click(screen.getByRole('button', { name: 'Next: Choose Folder' }));

		expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
	});

	it('can navigate back from step 2 to step 1', async () => {
		const user = userEvent.setup();
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());

		render(DriveUploadWizard, { props: defaultProps });

		await user.click(screen.getByRole('button', { name: 'Next: Choose Folder' }));
		expect(screen.getByText('Choose Destination')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Back' }));
		expect(screen.getByText('Review Photos')).toBeInTheDocument();
	});

	it('shows step progress indicator', () => {
		render(DriveUploadWizard, { props: defaultProps });

		// The step indicator shows "Step 1 of 4" text
		expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
	});

	it('renders with open=false as hidden', () => {
		render(DriveUploadWizard, { props: { ...defaultProps, open: false } });

		// The dialog should not show its content when closed
		expect(screen.queryByText('Review Photos')).not.toBeInTheDocument();
	});

	it('navigates through step 1 -> step 2 -> starts upload -> shows step 3', async () => {
		const user = userEvent.setup();

		// Mock folder list
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());
		// Mock upload start
		mockResponse(
			'/api/v1/gdrive/upload',
			createDriveStartUploadResponse({ batchId: 'test-batch-001' })
		);
		// Mock upload status polling
		mockResponse(
			'/api/v1/gdrive/upload/test-batch-001/status',
			createDriveUploadStatus({ batchId: 'test-batch-001' })
		);

		render(DriveUploadWizard, { props: defaultProps });

		// Step 1: Review Photos
		expect(screen.getByText('Review Photos')).toBeInTheDocument();

		// Navigate to Step 2
		await user.click(screen.getByRole('button', { name: 'Next: Choose Folder' }));
		expect(screen.getByText('Choose Destination')).toBeInTheDocument();

		// Wait for folders to load and select a folder by clicking on it
		await waitFor(() => {
			expect(screen.getByText('People')).toBeInTheDocument();
		});
		await user.click(screen.getByText('People'));

		// Now "Start Upload" should be enabled
		const startButton = screen.getByRole('button', { name: 'Start Upload' });
		expect(startButton).not.toBeDisabled();

		// Click Start Upload to transition to step 3
		await user.click(startButton);

		// Step 3: Upload in progress
		await waitFor(() => {
			expect(screen.getByText('Uploading')).toBeInTheDocument();
			expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
		});
	});
});
