import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import UploadCompleteStep from '$lib/components/gdrive/UploadCompleteStep.svelte';
import { createDriveUploadResult, createDriveUploadPartialFailure } from '../../helpers/fixtures';

describe('UploadCompleteStep', () => {
	it('shows success heading for completed upload', () => {
		const status = createDriveUploadResult();
		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose: vi.fn() }
		});

		expect(screen.getByText('Upload Complete')).toBeInTheDocument();
	});

	it('shows summary text with folder name for completed upload', () => {
		const status = createDriveUploadResult({ completed: 5 });
		render(UploadCompleteStep, {
			props: { status, folderName: 'My Photos', onClose: vi.fn() }
		});

		expect(screen.getByText(/All 5 photos uploaded to "My Photos"/)).toBeInTheDocument();
	});

	it('shows partial failure heading for partial upload', () => {
		const status = createDriveUploadPartialFailure();
		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose: vi.fn() }
		});

		expect(screen.getByText('Upload Partially Complete')).toBeInTheDocument();
	});

	it('shows failed count for partial failure', () => {
		const status = createDriveUploadPartialFailure({ completed: 3, failed: 2, total: 5 });
		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose: vi.fn() }
		});

		expect(screen.getByText(/3 of 5 photos uploaded/)).toBeInTheDocument();
		expect(screen.getByText(/2 failed/)).toBeInTheDocument();
	});

	it('shows cancelled heading when upload was cancelled', () => {
		const status = createDriveUploadResult({
			status: 'cancelled',
			completed: 2,
			failed: 0,
			total: 5
		});
		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose: vi.fn() }
		});

		expect(screen.getByText('Upload Cancelled')).toBeInTheDocument();
	});

	it('shows failed heading when upload fully failed', () => {
		const status = createDriveUploadResult({
			status: 'failed',
			completed: 0,
			failed: 5,
			total: 5
		});
		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose: vi.fn() }
		});

		expect(screen.getByText('Upload Failed')).toBeInTheDocument();
	});

	it('displays uploaded and total stats', () => {
		const status = createDriveUploadResult({ completed: 5, total: 5 });
		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose: vi.fn() }
		});

		// Check stats display - "5" appears in Uploaded and Total
		const numberElements = screen.getAllByText('5');
		expect(numberElements.length).toBeGreaterThanOrEqual(2);
	});

	it('shows failed files list when there are failures', () => {
		const status = createDriveUploadPartialFailure();
		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose: vi.fn() }
		});

		expect(screen.getByText('Failed files:')).toBeInTheDocument();
	});

	it('calls onClose when Close button is clicked', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const status = createDriveUploadResult();

		render(UploadCompleteStep, {
			props: { status, folderName: 'Photos', onClose }
		});

		await user.click(screen.getByRole('button', { name: 'Close' }));

		expect(onClose).toHaveBeenCalled();
	});
});
