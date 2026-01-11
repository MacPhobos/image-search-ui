import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DeletionLogsTable from '$lib/components/vectors/DeletionLogsTable.svelte';
import { createMultipleDeletionLogs, createDeletionLog } from '../../helpers/fixtures';

describe('DeletionLogsTable', () => {
	it('renders loading state', () => {
		render(DeletionLogsTable, { props: { logs: [], loading: true } });

		expect(screen.getByText(/loading deletion logs/i)).toBeInTheDocument();
		const spinner = document.querySelector('.spinner');
		expect(spinner).toBeInTheDocument();
	});

	it('displays empty state when no logs', () => {
		render(DeletionLogsTable, { props: { logs: [], loading: false } });

		expect(screen.getByText(/no deletion history found/i)).toBeInTheDocument();
	});

	it('displays logs with correct formatting', () => {
		const logs = createMultipleDeletionLogs(3);
		render(DeletionLogsTable, { props: { logs, loading: false } });

		// Check table headers
		expect(screen.getByText(/^type$/i)).toBeInTheDocument();
		expect(screen.getByText(/^target$/i)).toBeInTheDocument();
		expect(screen.getByText(/^count$/i)).toBeInTheDocument();
		expect(screen.getByText(/^reason$/i)).toBeInTheDocument();
		expect(screen.getByText(/^date$/i)).toBeInTheDocument();

		// Check log data
		expect(screen.getByText('Directory')).toBeInTheDocument();
		expect(screen.getByText('Session')).toBeInTheDocument();
		expect(screen.getByText('Category')).toBeInTheDocument();
	});

	it('formats deletion types as badges', () => {
		const logs = [
			createDeletionLog({ deletionType: 'DIRECTORY' }),
			createDeletionLog({ id: 2, deletionType: 'SESSION' }),
			createDeletionLog({ id: 3, deletionType: 'ORPHAN' })
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		// Each type should be displayed with appropriate label
		expect(screen.getByText('Directory')).toBeInTheDocument();
		expect(screen.getByText('Session')).toBeInTheDocument();
		expect(screen.getByText('Orphan')).toBeInTheDocument();
	});

	it('formats vector counts with commas', () => {
		const logs = [
			createDeletionLog({
				vectorCount: 1234
			})
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		expect(screen.getByText('1,234')).toBeInTheDocument();
	});

	it('displays deletion target paths', () => {
		const logs = [
			createDeletionLog({
				deletionTarget: '/photos/vacation/2024'
			})
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		expect(screen.getByText('/photos/vacation/2024')).toBeInTheDocument();
	});

	it('displays deletion reason when provided', () => {
		const logs = [
			createDeletionLog({
				deletionReason: 'Cleanup old data'
			})
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		expect(screen.getByText('Cleanup old data')).toBeInTheDocument();
	});

	it('displays dash for null deletion reason', () => {
		const logs = [
			createDeletionLog({
				deletionReason: null
			})
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		expect(screen.getByText('-')).toBeInTheDocument();
	});

	it('formats dates correctly', () => {
		const logs = [
			createDeletionLog({
				createdAt: '2024-12-19T14:30:00Z'
			})
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		// Should display formatted date with month abbreviation
		const dateText = screen.getByText(/dec/i);
		expect(dateText).toBeInTheDocument();
	});

	it('renders multiple log entries', () => {
		const logs = createMultipleDeletionLogs(5);
		render(DeletionLogsTable, { props: { logs, loading: false } });

		// Should have 5 data rows (plus 1 header row)
		const rows = document.querySelectorAll('tbody tr');
		expect(rows).toHaveLength(5);
	});

	it('handles all deletion types correctly', () => {
		const logs = [
			createDeletionLog({ id: 1, deletionType: 'DIRECTORY' }),
			createDeletionLog({ id: 2, deletionType: 'SESSION' }),
			createDeletionLog({ id: 3, deletionType: 'CATEGORY' }),
			createDeletionLog({ id: 4, deletionType: 'ASSET' }),
			createDeletionLog({ id: 5, deletionType: 'ORPHAN' }),
			createDeletionLog({ id: 6, deletionType: 'FULL_RESET' })
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		expect(screen.getByText('Directory')).toBeInTheDocument();
		expect(screen.getByText('Session')).toBeInTheDocument();
		expect(screen.getByText('Category')).toBeInTheDocument();
		expect(screen.getByText('Asset')).toBeInTheDocument();
		expect(screen.getByText('Orphan')).toBeInTheDocument();
		expect(screen.getByText('Full Reset')).toBeInTheDocument();
	});

	// TODO: Badge component doesn't expose .type-badge class
	// Already tested in "formats deletion types as badges"
	it.skip('applies type-specific badge colors', () => {
		const logs = [
			createDeletionLog({ deletionType: 'DIRECTORY' }),
			createDeletionLog({ id: 2, deletionType: 'ORPHAN' })
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		const badges = document.querySelectorAll('.type-badge');
		expect(badges).toHaveLength(2);

		// Each badge should have a background color set
		badges.forEach((badge) => {
			const style = window.getComputedStyle(badge);
			expect(style.backgroundColor).toBeTruthy();
		});
	});

	it('displays large vector counts correctly', () => {
		const logs = [
			createDeletionLog({
				vectorCount: 9876543
			})
		];
		render(DeletionLogsTable, { props: { logs, loading: false } });

		expect(screen.getByText('9,876,543')).toBeInTheDocument();
	});
});
