import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DriveSettingsPanel from '$lib/components/admin/DriveSettingsPanel.svelte';
import { mockResponse, mockError } from '../../helpers/mockFetch';
import { createDriveHealth, createDriveHealthDisconnected } from '../../helpers/fixtures';

describe('DriveSettingsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows loading state initially', () => {
		mockResponse('/api/v1/gdrive/health', createDriveHealth());
		render(DriveSettingsPanel);

		expect(screen.getByText('Loading status...')).toBeInTheDocument();
	});

	it('renders Google Drive heading', () => {
		mockResponse('/api/v1/gdrive/health', createDriveHealth());
		render(DriveSettingsPanel);

		expect(screen.getByText('Google Drive')).toBeInTheDocument();
	});

	it('shows connection status for connected Drive', async () => {
		mockResponse('/api/v1/gdrive/health', createDriveHealth());
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByText('Connected')).toBeInTheDocument();
		});
	});

	it('shows service account email when connected', async () => {
		const health = createDriveHealth({
			serviceAccountEmail: 'test@project.iam.gserviceaccount.com'
		});
		mockResponse('/api/v1/gdrive/health', health);
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByText('test@project.iam.gserviceaccount.com')).toBeInTheDocument();
		});
	});

	it('shows storage usage when available', async () => {
		const health = createDriveHealth({
			storageUsedBytes: 5_000_000_000,
			storageTotalBytes: 15_000_000_000,
			storageUsagePercentage: 33.3
		});
		mockResponse('/api/v1/gdrive/health', health);
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByText(/4.7 GB \/ 14.0 GB/)).toBeInTheDocument();
		});
	});

	it('shows root folder name when connected', async () => {
		const health = createDriveHealth({ rootFolderName: 'Image Search' });
		mockResponse('/api/v1/gdrive/health', health);
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByText('Image Search')).toBeInTheDocument();
		});
	});

	it('shows Not Configured status for disconnected Drive', async () => {
		mockResponse('/api/v1/gdrive/health', createDriveHealthDisconnected());
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByText('Not Configured')).toBeInTheDocument();
		});
	});

	it('shows environment variable hint when not enabled', async () => {
		mockResponse(
			'/api/v1/gdrive/health',
			createDriveHealthDisconnected({ enabled: false, connected: false })
		);
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByText(/GOOGLE_DRIVE_ENABLED/)).toBeInTheDocument();
		});
	});

	it('shows error state when health check fails', async () => {
		mockError('/api/v1/gdrive/health', 500, { detail: 'Internal error' });
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});

	it('has Test Connection button', async () => {
		mockResponse('/api/v1/gdrive/health', createDriveHealth());
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByRole('button', { name: 'Test Connection' })).toBeInTheDocument();
		});
	});

	it('shows error details when Drive reports an error', async () => {
		const health = createDriveHealth({
			connected: false,
			error: 'Service account key file not found'
		});
		mockResponse('/api/v1/gdrive/health', health);
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByText('Service account key file not found')).toBeInTheDocument();
		});
	});

	it('shows Retry button on error', async () => {
		mockError('/api/v1/gdrive/health', 500, { detail: 'Internal error' });
		render(DriveSettingsPanel);

		await vi.waitFor(() => {
			expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
		});
	});
});
