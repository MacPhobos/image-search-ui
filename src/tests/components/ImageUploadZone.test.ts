import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ImageUploadZone from '$lib/components/ImageUploadZone.svelte';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ImageUploadZone', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders drop zone when no file is selected', () => {
		const onImageSelect = vi.fn();
		const onClear = vi.fn();
		render(ImageUploadZone, {
			props: { selectedFile: null, onImageSelect, onClear }
		});

		expect(screen.getByText(/upload an image/i)).toBeInTheDocument();
		expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
		expect(screen.getByText(/png, jpg, webp/i)).toBeInTheDocument();
	});

	it('shows preview when file is selected', async () => {
		const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		render(ImageUploadZone, {
			props: { selectedFile: file, onImageSelect, onClear }
		});

		await waitFor(() => {
			expect(screen.getByAltText(/search preview/i)).toBeInTheDocument();
		});

		expect(screen.getByText('test.jpg')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /remove image/i })).toBeInTheDocument();
	});

	it('calls onImageSelect when file is selected via input', async () => {
		const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		render(ImageUploadZone, {
			props: { selectedFile: null, onImageSelect, onClear }
		});

		const input = screen.getByTestId('image-upload-zone__input-file') as HTMLInputElement;

		Object.defineProperty(input, 'files', {
			value: [file],
			writable: false
		});

		await fireEvent.change(input);

		expect(onImageSelect).toHaveBeenCalledWith(file);
		expect(onImageSelect).toHaveBeenCalledTimes(1);
	});

	it('calls onImageSelect when image is dropped', async () => {
		const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		render(ImageUploadZone, {
			props: { selectedFile: null, onImageSelect, onClear }
		});

		const dropzone = screen.getByTestId('image-upload-zone__dropzone');

		const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(dropEvent, 'dataTransfer', {
			value: {
				files: [file]
			}
		});

		await fireEvent(dropzone, dropEvent);

		expect(onImageSelect).toHaveBeenCalledWith(file);
	});

	it('ignores non-image files on drop', async () => {
		const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		render(ImageUploadZone, {
			props: { selectedFile: null, onImageSelect, onClear }
		});

		const dropzone = screen.getByTestId('image-upload-zone__dropzone');

		const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(dropEvent, 'dataTransfer', {
			value: {
				files: [file]
			}
		});

		await fireEvent(dropzone, dropEvent);

		expect(onImageSelect).not.toHaveBeenCalled();
	});

	it('calls onClear when clear button is clicked', async () => {
		const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		render(ImageUploadZone, {
			props: { selectedFile: file, onImageSelect, onClear }
		});

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /remove image/i })).toBeInTheDocument();
		});

		const clearBtn = screen.getByRole('button', { name: /remove image/i });
		await fireEvent.click(clearBtn);

		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it('disables upload button when disabled prop is true', () => {
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		render(ImageUploadZone, {
			props: { selectedFile: null, onImageSelect, onClear, disabled: true }
		});

		const uploadBtn = screen.getByRole('button', { name: /upload an image/i });
		expect(uploadBtn).toBeDisabled();
	});

	it('does not handle drops when disabled', async () => {
		const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		render(ImageUploadZone, {
			props: { selectedFile: null, onImageSelect, onClear, disabled: true }
		});

		const dropzone = screen.getByTestId('image-upload-zone__dropzone');

		const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(dropEvent, 'dataTransfer', {
			value: {
				files: [file]
			}
		});

		await fireEvent(dropzone, dropEvent);

		expect(onImageSelect).not.toHaveBeenCalled();
	});

	it('creates and revokes object URL for preview', async () => {
		const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
		const onImageSelect = vi.fn();
		const onClear = vi.fn();

		const { unmount } = render(ImageUploadZone, {
			props: { selectedFile: file, onImageSelect, onClear }
		});

		await waitFor(() => {
			expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
		});

		unmount();

		await waitFor(() => {
			expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
		});
	});
});
