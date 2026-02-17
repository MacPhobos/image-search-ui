import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import FolderPickerStep from '$lib/components/gdrive/FolderPickerStep.svelte';
import { mockResponse, mockError } from '../../helpers/mockFetch';
import { createDriveFolderTree, createDriveFolder } from '../../helpers/fixtures';

describe('FolderPickerStep', () => {
	const defaultProps = {
		personName: 'John Doe',
		onSelect: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows loading state initially', () => {
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());
		render(FolderPickerStep, { props: defaultProps });

		expect(screen.getByText('Loading folders...')).toBeInTheDocument();
	});

	it('renders folder list after loading', async () => {
		const folders = createDriveFolderTree();
		mockResponse('/api/v1/gdrive/folders', folders);

		render(FolderPickerStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByText('People')).toBeInTheDocument();
			expect(screen.getByText('Events')).toBeInTheDocument();
			expect(screen.getByText('Archive')).toBeInTheDocument();
		});
	});

	it('shows error state when loading fails', async () => {
		mockError('/api/v1/gdrive/folders', 503, { detail: 'Service unavailable' });

		render(FolderPickerStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});

	it('filters folders by search input', async () => {
		const user = userEvent.setup();
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());

		render(FolderPickerStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByText('People')).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText('Filter folders'), 'Arc');

		expect(screen.queryByText('People')).not.toBeInTheDocument();
		expect(screen.getByText('Archive')).toBeInTheDocument();
	});

	it('shows description text with person name', async () => {
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());
		render(FolderPickerStep, { props: defaultProps });

		expect(screen.getByText(/Choose a destination folder for John Doe/)).toBeInTheDocument();
	});

	it('shows New Folder button', async () => {
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());
		render(FolderPickerStep, { props: defaultProps });

		expect(screen.getByRole('button', { name: 'New Folder' })).toBeInTheDocument();
	});

	it('shows empty state when no folders match filter', async () => {
		const user = userEvent.setup();
		mockResponse('/api/v1/gdrive/folders', createDriveFolderTree());

		render(FolderPickerStep, { props: defaultProps });

		await vi.waitFor(() => {
			expect(screen.getByText('People')).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText('Filter folders'), 'zzzzz_no_match');

		expect(screen.getByText('No folders match your search.')).toBeInTheDocument();
	});

	it('auto-selects folder matching person name', async () => {
		const folders = createDriveFolderTree({
			folders: [
				createDriveFolder({ id: 'f_john', name: 'John Doe', hasChildren: false }),
				createDriveFolder({ id: 'f_other', name: 'Other', hasChildren: false })
			],
			total: 2
		});
		mockResponse('/api/v1/gdrive/folders', folders);

		render(FolderPickerStep, { props: defaultProps });

		// The auto-selected folder shows "John Doe" highlighted in the tree (aria-selected=true)
		await vi.waitFor(() => {
			const selectedItem = screen.getByRole('treeitem', { selected: true });
			expect(selectedItem).toBeInTheDocument();
			expect(selectedItem).toHaveTextContent('John Doe');
		});
	});
});
