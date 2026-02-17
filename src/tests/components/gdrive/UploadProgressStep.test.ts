import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import UploadProgressStep from '$lib/components/gdrive/UploadProgressStep.svelte';
import { mockResponse } from '../../helpers/mockFetch';
import { createDriveUploadStatus, createDriveUploadResult } from '../../helpers/fixtures';

describe('UploadProgressStep', () => {
	const defaultProps = {
		batchId: 'batch_abc123',
		onComplete: vi.fn(),
		onCancel: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders uploading header text', () => {
		const status = createDriveUploadStatus();
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', status);

		render(UploadProgressStep, { props: defaultProps });

		expect(screen.getByText('Uploading photos to Google Drive')).toBeInTheDocument();
	});

	it('shows Cancel Upload button', () => {
		const status = createDriveUploadStatus();
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', status);

		render(UploadProgressStep, { props: defaultProps });

		expect(screen.getByRole('button', { name: 'Cancel Upload' })).toBeInTheDocument();
	});

	it('shows progress counts after first poll', async () => {
		const status = createDriveUploadStatus({
			completed: 3,
			total: 5,
			percentage: 60
		});
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', status);

		render(UploadProgressStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByText('3/5')).toBeInTheDocument();
		});
	});

	it('displays ETA when available', async () => {
		const status = createDriveUploadStatus({
			etaSeconds: 45
		});
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', status);

		render(UploadProgressStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByText('45s remaining')).toBeInTheDocument();
		});
	});

	it('shows failed count when files fail', async () => {
		const status = createDriveUploadStatus({
			failed: 2
		});
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', status);

		render(UploadProgressStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByText('2 failed')).toBeInTheDocument();
		});
	});

	it('calls onComplete when upload finishes', async () => {
		const completedStatus = createDriveUploadResult();
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', completedStatus);

		render(UploadProgressStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(defaultProps.onComplete).toHaveBeenCalledWith(completedStatus);
		});
	});

	it('shows Cancelling... text when cancel is in progress', () => {
		const status = createDriveUploadStatus();
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', status);

		render(UploadProgressStep, {
			props: { ...defaultProps, cancelInProgress: true }
		});

		expect(screen.getByRole('button', { name: 'Cancelling...' })).toBeDisabled();
	});

	it('shows file rows for each file in status', async () => {
		const status = createDriveUploadStatus();
		mockResponse('/api/v1/gdrive/upload/batch_abc123/status', status);

		render(UploadProgressStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByText('photo_001.jpg')).toBeInTheDocument();
			expect(screen.getByText('photo_003.jpg')).toBeInTheDocument();
		});
	});
});
