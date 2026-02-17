import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CreateFolderInline from '$lib/components/gdrive/CreateFolderInline.svelte';
import { mockResponse, mockError } from '../../helpers/mockFetch';
import { createDriveFolderResponse } from '../../helpers/fixtures';

describe('CreateFolderInline', () => {
	const defaultProps = {
		parentFolderId: 'parent_123',
		onCreated: vi.fn(),
		onCancel: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders input and action buttons', () => {
		render(CreateFolderInline, { props: defaultProps });

		expect(screen.getByLabelText('New folder name')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
	});

	it('disables Create button when input is empty', () => {
		render(CreateFolderInline, { props: defaultProps });

		expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
	});

	it('enables Create button when folder name is entered', async () => {
		const user = userEvent.setup();
		render(CreateFolderInline, { props: defaultProps });

		const input = screen.getByLabelText('New folder name');
		await user.type(input, 'My New Folder');

		expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
	});

	it('shows validation error for slashes in name', async () => {
		const user = userEvent.setup();
		render(CreateFolderInline, { props: defaultProps });

		const input = screen.getByLabelText('New folder name');
		await user.type(input, 'path/with/slash');

		expect(screen.getByText('Folder name cannot contain slashes')).toBeInTheDocument();
	});

	it('calls onCreated on successful creation', async () => {
		const user = userEvent.setup();
		const folderResponse = createDriveFolderResponse({ name: 'Test Folder' });
		mockResponse('/api/v1/gdrive/folders', folderResponse);

		render(CreateFolderInline, { props: defaultProps });

		const input = screen.getByLabelText('New folder name');
		await user.type(input, 'Test Folder');
		await user.click(screen.getByRole('button', { name: 'Create' }));

		// Wait for the async operation
		await vi.waitFor(() => {
			expect(defaultProps.onCreated).toHaveBeenCalledWith(folderResponse);
		});
	});

	it('shows error on creation failure', async () => {
		const user = userEvent.setup();
		mockError('/api/v1/gdrive/folders', 500, { detail: 'Internal server error' });

		render(CreateFolderInline, { props: defaultProps });

		const input = screen.getByLabelText('New folder name');
		await user.type(input, 'Test Folder');
		await user.click(screen.getByRole('button', { name: 'Create' }));

		await vi.waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});

	it('calls onCancel when Cancel is clicked', async () => {
		const user = userEvent.setup();
		render(CreateFolderInline, { props: defaultProps });

		await user.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(defaultProps.onCancel).toHaveBeenCalled();
	});
});
