import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DirectoryStatsTable from '$lib/components/vectors/DirectoryStatsTable.svelte';
import { createMultipleDirectories, createDirectoryStats } from '../../helpers/fixtures';

describe('DirectoryStatsTable', () => {
	it('renders loading state', () => {
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories: [], loading: true, onDelete, onRetrain }
		});

		expect(screen.getByText(/loading directory statistics/i)).toBeInTheDocument();
		const spinner = document.querySelector('.spinner');
		expect(spinner).toBeInTheDocument();
	});

	it('displays empty state when no directories', () => {
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories: [], loading: false, onDelete, onRetrain }
		});

		expect(screen.getByText(/no directories with vectors found/i)).toBeInTheDocument();
	});

	it('displays directory list correctly', () => {
		const directories = createMultipleDirectories(3);
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		// Check table headers
		expect(screen.getByText(/directory/i)).toBeInTheDocument();
		expect(screen.getByText(/vector count/i)).toBeInTheDocument();
		expect(screen.getByText(/last indexed/i)).toBeInTheDocument();
		expect(screen.getByText(/actions/i)).toBeInTheDocument();

		// Check directory data is displayed
		expect(screen.getByText(/dir-1/i)).toBeInTheDocument();
		expect(screen.getByText(/dir-2/i)).toBeInTheDocument();
		expect(screen.getByText(/dir-3/i)).toBeInTheDocument();

		// Check vector counts (formatted with commas)
		expect(screen.getByText('50')).toBeInTheDocument();
		expect(screen.getByText('100')).toBeInTheDocument();
		expect(screen.getByText('150')).toBeInTheDocument();
	});

	it('formats dates correctly', () => {
		const directories = [
			createDirectoryStats({
				pathPrefix: '/photos/test',
				lastIndexed: '2024-12-19T10:30:00Z'
			})
		];
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		// Should display formatted date (not exact format, just check it's not 'Never')
		const dateCell = screen.getByText(/dec/i);
		expect(dateCell).toBeInTheDocument();
	});

	it('displays "Never" for null lastIndexed', () => {
		const directories = [
			createDirectoryStats({
				pathPrefix: '/photos/test',
				lastIndexed: null
			})
		];
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		expect(screen.getByText(/never/i)).toBeInTheDocument();
	});

	it('calls onDelete callback when delete button clicked', async () => {
		const directories = [
			createDirectoryStats({
				pathPrefix: '/photos/vacation'
			})
		];
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
		await fireEvent.click(deleteButtons[0]);

		expect(onDelete).toHaveBeenCalledWith('/photos/vacation');
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it('calls onRetrain callback when retrain button clicked', async () => {
		const directories = [
			createDirectoryStats({
				pathPrefix: '/photos/2024'
			})
		];
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		const retrainButtons = screen.getAllByRole('button', { name: /retrain/i });
		await fireEvent.click(retrainButtons[0]);

		expect(onRetrain).toHaveBeenCalledWith('/photos/2024');
		expect(onRetrain).toHaveBeenCalledTimes(1);
	});

	it('renders multiple directories with correct action buttons', () => {
		const directories = createMultipleDirectories(2);
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
		const retrainButtons = screen.getAllByRole('button', { name: /retrain/i });

		expect(deleteButtons).toHaveLength(2);
		expect(retrainButtons).toHaveLength(2);
	});

	it('formats large vector counts with commas', () => {
		const directories = [
			createDirectoryStats({
				pathPrefix: '/photos/large',
				vectorCount: 123456
			})
		];
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		expect(screen.getByText('123,456')).toBeInTheDocument();
	});

	it('truncates long paths in display', () => {
		const directories = [
			createDirectoryStats({
				pathPrefix: '/very/long/path/to/photos/vacation/2024/summer/beach'
			})
		];
		const onDelete = vi.fn();
		const onRetrain = vi.fn();
		render(DirectoryStatsTable, {
			props: { directories, loading: false, onDelete, onRetrain }
		});

		// Should display only last 3 parts
		expect(screen.getByText(/2024\/summer\/beach/i)).toBeInTheDocument();
	});
});
