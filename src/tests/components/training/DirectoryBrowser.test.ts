import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DirectoryBrowser from '$lib/components/training/DirectoryBrowser.svelte';
import { mockResponse, mockError } from '../../helpers/mockFetch';
import type { SubdirectoryInfo } from '$lib/types';

const mockSubdirs: SubdirectoryInfo[] = [
	{ path: 'vacation-photos', imageCount: 50 },
	{ path: 'family-2024', imageCount: 30 },
	{ path: 'work-events', imageCount: 20 },
	{ path: 'vacation-summer', imageCount: 45 }
];

describe('DirectoryBrowser - Filter Functionality', () => {
	beforeEach(() => {
		// Mock the API response for directory listing (with include_training_status=true)
		mockResponse('http://localhost:8000/api/v1/training/directories?path=%2Fphotos&include_training_status=true', mockSubdirs);
	});

	describe('Filter input rendering', () => {
		it('should render filter input when directories are loaded', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			// Wait for directories to load
			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			// Filter input should be present
			const filterInput = screen.getByPlaceholderText('Filter directories...');
			expect(filterInput).toBeInTheDocument();
			expect(filterInput).toHaveAttribute('aria-label', 'Filter directories');
		});

		it('should not render filter input during loading state', async () => {
			// Don't mock anything - just render and immediately check before API completes
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			// Should show loading state immediately
			expect(screen.getByText('Loading directories...')).toBeInTheDocument();

			// Filter input should not be present during loading
			expect(screen.queryByPlaceholderText('Filter directories...')).not.toBeInTheDocument();

			// Wait for loading to complete to avoid act() warnings
			await waitFor(() => {
				expect(screen.queryByText('Loading directories...')).not.toBeInTheDocument();
			});
		});

		it('should not render filter input when no directories exist', async () => {
			mockResponse('http://localhost:8000/api/v1/training/directories?path=%2Fempty&include_training_status=true', []);

			render(DirectoryBrowser, {
				props: {
					rootPath: '/empty',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('No subdirectories found.')).toBeInTheDocument();
			});

			expect(screen.queryByPlaceholderText('Filter directories...')).not.toBeInTheDocument();
		});
	});

	describe('Filter functionality', () => {
		it('should filter displayed directories based on input text', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Type "vacation" in filter
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// Should show only vacation directories
			expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			expect(screen.getByText('vacation-summer')).toBeInTheDocument();

			// Should not show non-vacation directories
			expect(screen.queryByText('family-2024')).not.toBeInTheDocument();
			expect(screen.queryByText('work-events')).not.toBeInTheDocument();
		});

		it('should be case-insensitive', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Type "VACATION" (uppercase) in filter
			await fireEvent.input(filterInput, { target: { value: 'VACATION' } });

			// Should still show vacation directories
			expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			expect(screen.getByText('vacation-summer')).toBeInTheDocument();
		});

		it('should show all directories when filter is empty', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Type filter, then clear it
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });
			await fireEvent.input(filterInput, { target: { value: '' } });

			// Should show all directories
			expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			expect(screen.getByText('vacation-summer')).toBeInTheDocument();
			expect(screen.getByText('family-2024')).toBeInTheDocument();
			expect(screen.getByText('work-events')).toBeInTheDocument();
		});

		it('should show empty state message when filter has no matches', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Type a filter that matches nothing
			await fireEvent.input(filterInput, { target: { value: 'nonexistent' } });

			// Should show empty state message
			await waitFor(() => {
				expect(screen.getByText('No directories match the filter.')).toBeInTheDocument();
			});

			// Should not show any directories
			expect(screen.queryByText('vacation-photos')).not.toBeInTheDocument();
			expect(screen.queryByText('family-2024')).not.toBeInTheDocument();
		});
	});

	describe('Filter count display', () => {
		it('should show count when filter is active', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Type "vacation" in filter (should match 2 directories)
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// Should show count
			expect(screen.getByText('Showing 2 of 4 directories')).toBeInTheDocument();
		});

		it('should not show count when filter is empty', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			// No filter applied, so no count should be shown
			expect(screen.queryByText(/Showing .* of .* directories/)).not.toBeInTheDocument();
		});

		it('should update count as filter changes', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Type "vacation" (matches 2)
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });
			expect(screen.getByText('Showing 2 of 4 directories')).toBeInTheDocument();

			// Change to "family" (matches 1)
			await fireEvent.input(filterInput, { target: { value: 'family' } });
			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 4 directories')).toBeInTheDocument();
			});

			// Change to "work" (matches 1)
			await fireEvent.input(filterInput, { target: { value: 'work' } });
			await waitFor(() => {
				expect(screen.getByText('Showing 1 of 4 directories')).toBeInTheDocument();
			});
		});
	});

	describe('Select All with filter', () => {
		it('should only select filtered directories when filter is active', async () => {
			const onSelectionChange = vi.fn();

			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Apply filter to show only "vacation" directories
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// Click "Select All"
			const selectAllBtn = screen.getByRole('button', { name: 'Select All' });
			await fireEvent.click(selectAllBtn);

			// Should only select the filtered directories
			await waitFor(() => {
				expect(onSelectionChange).toHaveBeenCalledWith(
					expect.arrayContaining(['vacation-photos', 'vacation-summer'])
				);
			});

			// Should not include non-filtered directories
			const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
			expect(lastCall).not.toContain('family-2024');
			expect(lastCall).not.toContain('work-events');
			expect(lastCall).toHaveLength(2);
		});

		it('should preserve existing selections not in current filter', async () => {
			const onSelectionChange = vi.fn();

			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: ['family-2024'], // Pre-select a directory
					onSelectionChange
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Apply filter to show only "vacation" directories (which excludes family-2024)
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// Click "Select All"
			const selectAllBtn = screen.getByRole('button', { name: 'Select All' });
			await fireEvent.click(selectAllBtn);

			// Should include both the pre-selected directory AND the filtered directories
			await waitFor(() => {
				expect(onSelectionChange).toHaveBeenCalled();
			});

			const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
			expect(lastCall).toContain('family-2024'); // Pre-existing selection preserved
			expect(lastCall).toContain('vacation-photos'); // From filter
			expect(lastCall).toContain('vacation-summer'); // From filter
			expect(lastCall).toHaveLength(3);
		});

		it('should be disabled when no filtered results', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Apply filter that matches nothing
			await fireEvent.input(filterInput, { target: { value: 'nonexistent' } });

			// Select All button should be disabled
			const selectAllBtn = screen.getByRole('button', { name: 'Select All' });
			expect(selectAllBtn).toBeDisabled();
		});

		it('should select all directories when no filter is applied', async () => {
			const onSelectionChange = vi.fn();

			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			// Click "Select All" without any filter
			const selectAllBtn = screen.getByRole('button', { name: 'Select All' });
			await fireEvent.click(selectAllBtn);

			// Should select all 4 directories
			await waitFor(() => {
				expect(onSelectionChange).toHaveBeenCalledWith(
					expect.arrayContaining([
						'vacation-photos',
						'family-2024',
						'work-events',
						'vacation-summer'
					])
				);
			});

			const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
			expect(lastCall).toHaveLength(4);
		});
	});

	describe('Deselect All behavior', () => {
		it('should clear ALL selections including non-filtered ones', async () => {
			const onSelectionChange = vi.fn();

			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: ['vacation-photos', 'family-2024', 'work-events'],
					onSelectionChange
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Apply filter to show only "vacation" directories
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// Click "Deselect All"
			const deselectAllBtn = screen.getByRole('button', { name: 'Deselect All' });
			await fireEvent.click(deselectAllBtn);

			// Should clear ALL selections, not just the filtered ones
			await waitFor(() => {
				expect(onSelectionChange).toHaveBeenCalledWith([]);
			});
		});

		it('should be disabled when no selections exist', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: [],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			// Deselect All button should be disabled
			const deselectAllBtn = screen.getByRole('button', { name: 'Deselect All' });
			expect(deselectAllBtn).toBeDisabled();
		});

		it('should be enabled when selections exist even if not in current filter', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: ['family-2024'], // Selected but will be filtered out
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			const filterInput = screen.getByPlaceholderText('Filter directories...');

			// Apply filter that excludes the selected directory
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// Deselect All should still be enabled because there's a selection (even if not visible)
			const deselectAllBtn = screen.getByRole('button', { name: 'Deselect All' });
			expect(deselectAllBtn).not.toBeDisabled();
		});
	});

	describe('Integration: Filter with selection state', () => {
		it('should show checkboxes correctly for filtered and selected items', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: ['vacation-photos', 'family-2024'],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			// Check initial state - both checkboxes should be checked
			const vacationCheckbox = screen
				.getByText('vacation-photos')
				.closest('label')
				?.querySelector('input[type="checkbox"]') as HTMLInputElement;
			const familyCheckbox = screen
				.getByText('family-2024')
				.closest('label')
				?.querySelector('input[type="checkbox"]') as HTMLInputElement;

			expect(vacationCheckbox.checked).toBe(true);
			expect(familyCheckbox.checked).toBe(true);

			// Apply filter to show only "vacation" directories
			const filterInput = screen.getByPlaceholderText('Filter directories...');
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// family-2024 should not be visible
			expect(screen.queryByText('family-2024')).not.toBeInTheDocument();

			// vacation-photos should still be checked
			const visibleCheckbox = screen
				.getByText('vacation-photos')
				.closest('label')
				?.querySelector('input[type="checkbox"]') as HTMLInputElement;
			expect(visibleCheckbox.checked).toBe(true);
		});

		it('should maintain selection summary during filtering', async () => {
			render(DirectoryBrowser, {
				props: {
					rootPath: '/photos',
					selectedSubdirs: ['vacation-photos', 'family-2024'],
					onSelectionChange: () => {}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('vacation-photos')).toBeInTheDocument();
			});

			// Should show 2 selected
			expect(screen.getByText('2 subdirectory(ies) selected')).toBeInTheDocument();

			// Apply filter
			const filterInput = screen.getByPlaceholderText('Filter directories...');
			await fireEvent.input(filterInput, { target: { value: 'vacation' } });

			// Selection summary should still show 2 (includes non-visible selection)
			expect(screen.getByText('2 subdirectory(ies) selected')).toBeInTheDocument();
		});
	});
});
