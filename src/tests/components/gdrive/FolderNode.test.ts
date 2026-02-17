import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import FolderNode from '$lib/components/gdrive/FolderNode.svelte';
import { mockResponse } from '../../helpers/mockFetch';
import { createDriveFolder, createDriveFolderTree } from '../../helpers/fixtures';

describe('FolderNode', () => {
	const onSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders folder name', () => {
		const folder = createDriveFolder({ name: 'Photos' });
		render(FolderNode, { props: { folder, depth: 0, selectedFolderId: null, onSelect } });

		expect(screen.getByText('Photos')).toBeInTheDocument();
	});

	it('shows expand arrow when folder has children', () => {
		const folder = createDriveFolder({ hasChildren: true });
		const { container } = render(FolderNode, {
			props: { folder, depth: 0, selectedFolderId: null, onSelect }
		});

		expect(container.querySelector('button[aria-label="Expand folder"]')).toBeInTheDocument();
	});

	it('does not show expand arrow when folder has no children', () => {
		const folder = createDriveFolder({ hasChildren: false });
		const { container } = render(FolderNode, {
			props: { folder, depth: 0, selectedFolderId: null, onSelect }
		});

		expect(container.querySelector('button[aria-label="Expand folder"]')).not.toBeInTheDocument();
	});

	it('calls onSelect when clicked', async () => {
		const user = userEvent.setup();
		const folder = createDriveFolder({ id: 'folder_1', name: 'Photos' });
		render(FolderNode, { props: { folder, depth: 0, selectedFolderId: null, onSelect } });

		await user.click(screen.getByText('Photos'));

		expect(onSelect).toHaveBeenCalledWith(folder);
	});

	it('applies selected style when selectedFolderId matches', () => {
		const folder = createDriveFolder({ id: 'folder_1' });
		const { container } = render(FolderNode, {
			props: { folder, depth: 0, selectedFolderId: 'folder_1', onSelect }
		});

		const item = container.querySelector('[aria-selected="true"]');
		expect(item).toBeInTheDocument();
	});

	it('does not apply selected style for different folder', () => {
		const folder = createDriveFolder({ id: 'folder_1' });
		const { container } = render(FolderNode, {
			props: { folder, depth: 0, selectedFolderId: 'folder_2', onSelect }
		});

		const item = container.querySelector('[aria-selected="true"]');
		expect(item).not.toBeInTheDocument();
	});

	it('loads children when expanded', async () => {
		const user = userEvent.setup();
		const folder = createDriveFolder({ id: 'parent_1', hasChildren: true });
		const childFolders = createDriveFolderTree({
			parentId: 'parent_1',
			folders: [createDriveFolder({ id: 'child_1', name: 'Child Folder', parentId: 'parent_1' })],
			total: 1
		});
		mockResponse('/api/v1/gdrive/folders', childFolders);

		const { container } = render(FolderNode, {
			props: { folder, depth: 0, selectedFolderId: null, onSelect }
		});

		const expandBtn = container.querySelector('button[aria-label="Expand folder"]') as HTMLElement;
		await user.click(expandBtn);

		await vi.waitFor(() => {
			expect(screen.getByText('Child Folder')).toBeInTheDocument();
		});
	});

	it('sets correct aria-level based on depth', () => {
		const folder = createDriveFolder();
		const { container } = render(FolderNode, {
			props: { folder, depth: 2, selectedFolderId: null, onSelect }
		});

		const item = container.querySelector('[aria-level="3"]');
		expect(item).toBeInTheDocument();
	});
});
