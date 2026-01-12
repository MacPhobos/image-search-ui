import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import JobsTable from '$lib/components/training/JobsTable.svelte';
import {
	createTrainingJob,
	createSkippedJob,
	createRunningJob,
	createFailedJob
} from '../../helpers/fixtures';

describe('JobsTable', () => {
	const mockPageChange = vi.fn();

	it('renders table headers correctly', () => {
		const jobs = [createTrainingJob()];
		render(JobsTable, {
			props: {
				jobs,
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		expect(screen.getByText('Job ID')).toBeInTheDocument();
		expect(screen.getByText('Asset ID')).toBeInTheDocument();
		expect(screen.getByText('Image Path')).toBeInTheDocument();
		expect(screen.getByText('Status')).toBeInTheDocument();
		expect(screen.getByText('Progress')).toBeInTheDocument();
		expect(screen.getByText('Duration')).toBeInTheDocument();
		expect(screen.getByText('Completed At')).toBeInTheDocument();
		expect(screen.getByText('Error')).toBeInTheDocument();
	});

	it('displays job data correctly', () => {
		const job = createTrainingJob({
			id: 123,
			assetId: 456,
			imagePath: '/photos/test-image.jpg'
		});

		render(JobsTable, {
			props: {
				jobs: [job],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		expect(screen.getByText('123')).toBeInTheDocument();
		expect(screen.getByText('456')).toBeInTheDocument();
		expect(screen.getByText('/photos/test-image.jpg')).toBeInTheDocument();
	});

	it('displays N/A for missing image path', () => {
		const job = createTrainingJob({ imagePath: null });

		render(JobsTable, {
			props: {
				jobs: [job],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		expect(screen.getByText('N/A')).toBeInTheDocument();
	});

	it('shows skip reason for skipped jobs', () => {
		const job = createSkippedJob({
			skipReason: 'Duplicate detected (hash match)'
		});

		render(JobsTable, {
			props: {
				jobs: [job],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		expect(screen.getByText('Duplicate detected (hash match)')).toBeInTheDocument();
	});

	it('shows dash for progress on skipped jobs', () => {
		const job = createSkippedJob();

		const { container } = render(JobsTable, {
			props: {
				jobs: [job],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		// Find the progress cell (5th cell in the row)
		const progressCell = container.querySelectorAll('td')[4];
		expect(progressCell?.textContent?.trim()).toBe('-');
	});

	it('shows progress bar for running jobs', () => {
		const job = createRunningJob({ progress: 45 });

		render(JobsTable, {
			props: {
				jobs: [job],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		expect(screen.getByText('45%')).toBeInTheDocument();
	});

	it('shows error message for failed jobs', () => {
		const job = createFailedJob({
			errorMessage: 'Failed to process image: Invalid format'
		});

		render(JobsTable, {
			props: {
				jobs: [job],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		expect(screen.getByText(/Failed to process image/)).toBeInTheDocument();
	});

	it('truncates long error messages', () => {
		const longError = 'A'.repeat(100);
		const job = createFailedJob({ errorMessage: longError });

		const { container } = render(JobsTable, {
			props: {
				jobs: [job],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		const errorCell = container.querySelector('.error-text');
		expect(errorCell?.textContent).toMatch(/\.\.\.$/);
	});

	it('shows loading state', () => {
		render(JobsTable, {
			props: {
				jobs: [],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange,
				loading: true
			}
		});

		expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
	});

	it('shows empty state when no jobs', () => {
		render(JobsTable, {
			props: {
				jobs: [],
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange,
				loading: false
			}
		});

		expect(screen.getByText('No jobs found.')).toBeInTheDocument();
	});

	it('displays pagination when multiple pages', () => {
		const jobs = [createTrainingJob()];

		render(JobsTable, {
			props: {
				jobs,
				currentPage: 2,
				totalPages: 5,
				onPageChange: mockPageChange
			}
		});

		expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
		expect(screen.getByText('Previous')).toBeInTheDocument();
		expect(screen.getByText('Next')).toBeInTheDocument();
	});

	it('hides pagination for single page', () => {
		const jobs = [createTrainingJob()];

		render(JobsTable, {
			props: {
				jobs,
				currentPage: 1,
				totalPages: 1,
				onPageChange: mockPageChange
			}
		});

		expect(screen.queryByText('Previous')).not.toBeInTheDocument();
		expect(screen.queryByText('Next')).not.toBeInTheDocument();
	});
});
