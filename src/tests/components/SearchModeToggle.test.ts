import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SearchModeToggle from '$lib/components/SearchModeToggle.svelte';

describe('SearchModeToggle', () => {
	it('renders both mode buttons', () => {
		const onModeChange = vi.fn();
		render(SearchModeToggle, { props: { mode: 'text', onModeChange } });

		expect(screen.getByRole('button', { name: /text search mode/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /image search mode/i })).toBeInTheDocument();
	});

	it('highlights text mode button when text mode is active', () => {
		const onModeChange = vi.fn();
		render(SearchModeToggle, { props: { mode: 'text', onModeChange } });

		const textBtn = screen.getByRole('button', { name: /text search mode/i });
		const imageBtn = screen.getByRole('button', { name: /image search mode/i });

		expect(textBtn).toHaveAttribute('aria-pressed', 'true');
		expect(imageBtn).toHaveAttribute('aria-pressed', 'false');
	});

	it('highlights image mode button when image mode is active', () => {
		const onModeChange = vi.fn();
		render(SearchModeToggle, { props: { mode: 'image', onModeChange } });

		const textBtn = screen.getByRole('button', { name: /text search mode/i });
		const imageBtn = screen.getByRole('button', { name: /image search mode/i });

		expect(textBtn).toHaveAttribute('aria-pressed', 'false');
		expect(imageBtn).toHaveAttribute('aria-pressed', 'true');
	});

	it('calls onModeChange with "text" when text button is clicked', async () => {
		const onModeChange = vi.fn();
		render(SearchModeToggle, { props: { mode: 'image', onModeChange } });

		const textBtn = screen.getByRole('button', { name: /text search mode/i });
		await fireEvent.click(textBtn);

		expect(onModeChange).toHaveBeenCalledWith('text');
		expect(onModeChange).toHaveBeenCalledTimes(1);
	});

	it('calls onModeChange with "image" when image button is clicked', async () => {
		const onModeChange = vi.fn();
		render(SearchModeToggle, { props: { mode: 'text', onModeChange } });

		const imageBtn = screen.getByRole('button', { name: /image search mode/i });
		await fireEvent.click(imageBtn);

		expect(onModeChange).toHaveBeenCalledWith('image');
		expect(onModeChange).toHaveBeenCalledTimes(1);
	});

	it('allows clicking the already active mode', async () => {
		const onModeChange = vi.fn();
		render(SearchModeToggle, { props: { mode: 'text', onModeChange } });

		const textBtn = screen.getByRole('button', { name: /text search mode/i });
		await fireEvent.click(textBtn);

		expect(onModeChange).toHaveBeenCalledWith('text');
	});
});
