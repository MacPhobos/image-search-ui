import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SearchBar from '$lib/components/SearchBar.svelte';

describe('SearchBar', () => {
	it('renders with default placeholder', () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		const input = screen.getByRole('textbox', { name: /search query/i });
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('placeholder', 'Search images...');
	});

	it('renders with custom placeholder', () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch, placeholder: 'Custom placeholder' } });

		const input = screen.getByRole('textbox', { name: /search query/i });
		expect(input).toHaveAttribute('placeholder', 'Custom placeholder');
	});

	it('disables search button when input is empty', () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		const button = screen.getByRole('button', { name: /search/i });
		expect(button).toBeDisabled();
	});

	it('enables search button when input has text', async () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		const input = screen.getByRole('textbox', { name: /search query/i });
		await fireEvent.input(input, { target: { value: 'beach sunset' } });

		// Get the submit button specifically (not the clear button)
		const button = screen.getByRole('button', { name: /^search$/i });
		expect(button).not.toBeDisabled();
	});

	it('calls onSearch with trimmed query on form submit', async () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		const input = screen.getByRole('textbox', { name: /search query/i });
		const form = input.closest('form');
		if (!form) throw new Error('Form not found');

		await fireEvent.input(input, { target: { value: '  beach sunset  ' } });
		await fireEvent.submit(form);

		expect(onSearch).toHaveBeenCalledWith('beach sunset');
		expect(onSearch).toHaveBeenCalledTimes(1);
	});

	it('does not call onSearch when query is empty', async () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		const input = screen.getByRole('textbox', { name: /search query/i });
		const form = input.closest('form');
		if (!form) throw new Error('Form not found');

		await fireEvent.input(input, { target: { value: '   ' } });
		await fireEvent.submit(form);

		expect(onSearch).not.toHaveBeenCalled();
	});

	it('shows clear button when input has text', async () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		// Initially no clear button
		expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();

		const input = screen.getByRole('textbox', { name: /search query/i });
		await fireEvent.input(input, { target: { value: 'test' } });

		// Now clear button should be visible
		expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
	});

	it('clears input when clear button is clicked', async () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		const input = screen.getByRole('textbox', { name: /search query/i }) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'test query' } });

		const clearButton = screen.getByRole('button', { name: /clear/i });
		await fireEvent.click(clearButton);

		expect(input.value).toBe('');
	});
});
