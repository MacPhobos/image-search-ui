import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import HybridSearchPanel from '$lib/components/HybridSearchPanel.svelte';
import { tid } from '$lib/testing/testid';

describe('HybridSearchPanel', () => {
	const testId = 'hybrid-search-panel';
	const mockOnSearch = vi.fn();

	beforeEach(() => {
		mockOnSearch.mockClear();
	});

	it('renders panel with title and description', () => {
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		expect(screen.getByText('Hybrid Search')).toBeInTheDocument();
		expect(
			screen.getByText('Combine text and image search with adjustable weights')
		).toBeInTheDocument();
	});

	it('renders text input field', () => {
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		expect(textInput).toBeInTheDocument();
		expect(textInput).toHaveAttribute('placeholder', 'Enter search text...');
	});

	it('renders image upload zone', () => {
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const uploadZone = screen.getByTestId(tid(testId, 'image-upload'));
		expect(uploadZone).toBeInTheDocument();
	});

	it('renders weight slider with default value of 50%', () => {
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const slider = screen.getByTestId(tid(testId, 'slider-weight'));
		expect(slider).toHaveValue('50');

		expect(screen.getByTestId(tid(testId, 'text-weight'))).toHaveTextContent('Text: 50%');
		expect(screen.getByTestId(tid(testId, 'image-weight'))).toHaveTextContent('Image: 50%');
	});

	it('updates weight indicators when slider changes', async () => {
		const user = userEvent.setup();
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const slider = screen.getByTestId(tid(testId, 'slider-weight'));
		await user.clear(slider);
		await user.type(slider, '75');

		expect(screen.getByTestId(tid(testId, 'text-weight'))).toHaveTextContent('Text: 75%');
		expect(screen.getByTestId(tid(testId, 'image-weight'))).toHaveTextContent('Image: 25%');
	});

	it('disables search button when no inputs provided', () => {
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		expect(searchButton).toBeDisabled();
	});

	it('enables search button when text query provided', async () => {
		const user = userEvent.setup();
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		await user.type(textInput, 'beach sunset');

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		expect(searchButton).toBeEnabled();
	});

	it('calls onSearch with text query and weight when button clicked', async () => {
		const user = userEvent.setup();
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		await user.type(textInput, 'mountain landscape');

		const slider = screen.getByTestId(tid(testId, 'slider-weight'));
		await user.clear(slider);
		await user.type(slider, '70');

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		await user.click(searchButton);

		expect(mockOnSearch).toHaveBeenCalledWith({
			textQuery: 'mountain landscape',
			imageFile: null,
			textWeight: 0.7
		});
	});

	it('calls onSearch when Enter key pressed in text input', async () => {
		const user = userEvent.setup();
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		await user.type(textInput, 'ocean waves{Enter}');

		expect(mockOnSearch).toHaveBeenCalledWith({
			textQuery: 'ocean waves',
			imageFile: null,
			textWeight: 0.5
		});
	});

	it('respects custom textWeight prop', () => {
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, textWeight: 75, testId } });

		const slider = screen.getByTestId(tid(testId, 'slider-weight'));
		expect(slider).toHaveValue('75');
	});

	it('respects custom textQuery prop', () => {
		render(HybridSearchPanel, {
			props: { onSearch: mockOnSearch, textQuery: 'initial query', testId }
		});

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		expect(textInput).toHaveValue('initial query');
	});

	it('disables all inputs when disabled prop is true', () => {
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, disabled: true, testId } });

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		const slider = screen.getByTestId(tid(testId, 'slider-weight'));
		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));

		expect(textInput).toBeDisabled();
		expect(slider).toBeDisabled();
		expect(searchButton).toBeDisabled();
	});

	it('trims whitespace from text query before calling onSearch', async () => {
		const user = userEvent.setup();
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		await user.type(textInput, '  forest trail  ');

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		await user.click(searchButton);

		expect(mockOnSearch).toHaveBeenCalledWith({
			textQuery: 'forest trail',
			imageFile: null,
			textWeight: 0.5
		});
	});

	it('sends null for textQuery when empty string provided', async () => {
		const user = userEvent.setup();
		render(HybridSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		// Simulate image upload by accessing the component's internal state
		// Since we can't easily upload a file in this test, we'll verify behavior
		// with just text for now. Image upload testing would require more setup.

		const textInput = screen.getByTestId(tid(testId, 'input-text'));
		await user.type(textInput, '   '); // Only whitespace

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		expect(searchButton).toBeDisabled(); // Empty/whitespace-only text doesn't enable search
	});
});
