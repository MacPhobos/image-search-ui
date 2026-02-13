import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SelectableFaceThumbnail from '$lib/components/faces/SelectableFaceThumbnail.svelte';

describe('SelectableFaceThumbnail', () => {
	const defaultProps = {
		thumbnailUrl: '/api/v1/faces/faces/face-1/thumbnail',
		selected: false,
		onSelect: vi.fn(),
		onClick: vi.fn()
	};

	function renderThumbnail(overrides?: Partial<typeof defaultProps>) {
		const props = { ...defaultProps, ...overrides };
		// Reset mocks before each render
		props.onSelect = overrides?.onSelect ?? vi.fn();
		props.onClick = overrides?.onClick ?? vi.fn();

		return {
			props,
			...render(SelectableFaceThumbnail, { props })
		};
	}

	it('renders at specified size', () => {
		renderThumbnail({ size: 96 } as never);

		const container = screen.getByRole('button', { name: 'Face' });
		expect(container).toHaveStyle('width: 96px');
		expect(container).toHaveStyle('height: 96px');
	});

	it('renders at default size of 128px', () => {
		renderThumbnail();

		const container = screen.getByRole('button', { name: 'Face' });
		expect(container).toHaveStyle('width: 128px');
		expect(container).toHaveStyle('height: 128px');
	});

	it('shows checkbox when showCheckbox is true (default)', () => {
		renderThumbnail();

		const checkbox = screen.getByRole('checkbox', { name: 'Select face' });
		expect(checkbox).toBeInTheDocument();
	});

	it('hides checkbox when showCheckbox is false', () => {
		renderThumbnail({ showCheckbox: false } as never);

		const checkbox = screen.queryByRole('checkbox', { name: 'Select face' });
		expect(checkbox).not.toBeInTheDocument();
	});

	it('calls onSelect when checkbox toggled', async () => {
		const onSelect = vi.fn();
		renderThumbnail({ onSelect } as never);

		const checkbox = screen.getByRole('checkbox', { name: 'Select face' });
		await fireEvent.click(checkbox);

		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it('calls onClick when container clicked', async () => {
		const onClick = vi.fn();
		renderThumbnail({ onClick } as never);

		const container = screen.getByRole('button', { name: 'Face' });
		await fireEvent.click(container);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('calls onClick on Enter key', async () => {
		const onClick = vi.fn();
		renderThumbnail({ onClick } as never);

		const container = screen.getByRole('button', { name: 'Face' });
		await fireEvent.keyDown(container, { key: 'Enter' });

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('calls onClick on Space key', async () => {
		const onClick = vi.fn();
		renderThumbnail({ onClick } as never);

		const container = screen.getByRole('button', { name: 'Face' });
		await fireEvent.keyDown(container, { key: ' ' });

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('does not call onClick on other keys', async () => {
		const onClick = vi.fn();
		renderThumbnail({ onClick } as never);

		const container = screen.getByRole('button', { name: 'Face' });
		await fireEvent.keyDown(container, { key: 'Escape' });

		expect(onClick).not.toHaveBeenCalled();
	});

	it('applies selected class when selected is true', () => {
		renderThumbnail({ selected: true });

		const container = screen.getByRole('button', { name: 'Face' });
		expect(container.className).toMatch(/selected/);
	});

	it('does not apply selected class when selected is false', () => {
		renderThumbnail({ selected: false });

		const container = screen.getByRole('button', { name: 'Face' });
		expect(container.className).not.toMatch(/selected/);
	});

	it('has role="button" and tabindex="0"', () => {
		renderThumbnail();

		const container = screen.getByRole('button', { name: 'Face' });
		expect(container).toHaveAttribute('role', 'button');
		expect(container).toHaveAttribute('tabindex', '0');
	});

	it('passes dataUri through to FaceThumbnail', () => {
		const dataUri = 'data:image/jpeg;base64,/9j/4AAQ...';
		renderThumbnail({ dataUri } as never);

		// FaceThumbnail renders a wrapper div with role="img" and an inner <img> tag.
		// Both share the same alt text, so use getAllByRole and find the actual <img>.
		const images = screen.getAllByRole('img', { name: 'Face' });
		const imgElement = images.find((el) => el.tagName === 'IMG');
		expect(imgElement).toBeDefined();
		expect(imgElement).toHaveAttribute('src', dataUri);
	});

	it('uses custom alt text', () => {
		renderThumbnail({ alt: 'John face' } as never);

		const container = screen.getByRole('button', { name: 'John face' });
		expect(container).toBeInTheDocument();
	});

	it('does not propagate click from checkbox to container', async () => {
		const onClick = vi.fn();
		const onSelect = vi.fn();
		renderThumbnail({ onClick, onSelect } as never);

		const checkbox = screen.getByRole('checkbox', { name: 'Select face' });
		await fireEvent.click(checkbox);

		// onSelect should be called (from checkbox), but onClick should NOT be called
		// because the checkbox overlay has stopPropagation
		expect(onSelect).toHaveBeenCalled();
		expect(onClick).not.toHaveBeenCalled();
	});
});
