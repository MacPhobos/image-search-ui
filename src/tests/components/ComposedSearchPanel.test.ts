import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ComposedSearchPanel from '$lib/components/ComposedSearchPanel.svelte';
import { tid } from '$lib/testing/testid';

describe('ComposedSearchPanel', () => {
	const testId = 'composed-search-panel';
	const mockOnSearch = vi.fn();

	beforeEach(() => {
		mockOnSearch.mockClear();
	});

	it('renders panel with title and description', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		expect(screen.getByText('Composed Search')).toBeInTheDocument();
		expect(
			screen.getByText('Start with a reference image and modify it with text descriptions')
		).toBeInTheDocument();
	});

	it('renders reference image upload section with badge', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		expect(screen.getByText('Reference Image')).toBeInTheDocument();
		expect(screen.getByText('Upload the image you want to start with')).toBeInTheDocument();

		const uploadZone = screen.getByTestId(tid(testId, 'reference-upload'));
		expect(uploadZone).toBeInTheDocument();
	});

	it('renders modifier text input section with badge', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		expect(screen.getByText('Text Modifier')).toBeInTheDocument();
		expect(screen.getByText('Describe how to modify the reference image')).toBeInTheDocument();

		const modifierInput = screen.getByTestId(tid(testId, 'input-modifier'));
		expect(modifierInput).toBeInTheDocument();
		expect(modifierInput).toHaveAttribute('placeholder');
	});

	it('renders alpha slider with default value of 30%', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const slider = screen.getByTestId(tid(testId, 'slider-alpha'));
		expect(slider).toHaveValue('30');

		expect(screen.getByTestId(tid(testId, 'reference-strength'))).toHaveTextContent(
			'Reference: 70%'
		);
		expect(screen.getByTestId(tid(testId, 'modifier-strength'))).toHaveTextContent('Modifier: 30%');
	});

	it('updates strength indicators when slider changes', async () => {
		const user = userEvent.setup();
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const slider = screen.getByTestId(tid(testId, 'slider-alpha'));
		await user.clear(slider);
		await user.type(slider, '60');

		expect(screen.getByTestId(tid(testId, 'reference-strength'))).toHaveTextContent(
			'Reference: 40%'
		);
		expect(screen.getByTestId(tid(testId, 'modifier-strength'))).toHaveTextContent('Modifier: 60%');
	});

	it('disables search button when no inputs provided', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		expect(searchButton).toBeDisabled();
	});

	it('disables search button when only modifier text provided (no image)', async () => {
		const user = userEvent.setup();
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const modifierInput = screen.getByTestId(tid(testId, 'input-modifier'));
		await user.type(modifierInput, 'at sunset');

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		expect(searchButton).toBeDisabled();
	});

	it('displays correct search button text', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, testId } });

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		expect(searchButton).toHaveTextContent('Search with Composition');
	});

	it('displays "Searching..." when disabled', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, disabled: true, testId } });

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		expect(searchButton).toHaveTextContent('Searching...');
	});

	it('calls onSearch with Enter key in modifier input when both inputs filled', async () => {
		const user = userEvent.setup();
		const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

		render(ComposedSearchPanel, {
			props: { onSearch: mockOnSearch, referenceImage: mockFile, testId }
		});

		const modifierInput = screen.getByTestId(tid(testId, 'input-modifier'));
		await user.type(modifierInput, 'with more people{Enter}');

		expect(mockOnSearch).toHaveBeenCalledWith({
			referenceImage: mockFile,
			modifierText: 'with more people',
			alpha: 0.3
		});
	});

	it('respects custom alpha prop', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, alpha: 50, testId } });

		const slider = screen.getByTestId(tid(testId, 'slider-alpha'));
		expect(slider).toHaveValue('50');
	});

	it('respects custom modifierText prop', () => {
		render(ComposedSearchPanel, {
			props: { onSearch: mockOnSearch, modifierText: 'in winter', testId }
		});

		const modifierInput = screen.getByTestId(tid(testId, 'input-modifier'));
		expect(modifierInput).toHaveValue('in winter');
	});

	it('disables all inputs when disabled prop is true', () => {
		render(ComposedSearchPanel, { props: { onSearch: mockOnSearch, disabled: true, testId } });

		const modifierInput = screen.getByTestId(tid(testId, 'input-modifier'));
		const slider = screen.getByTestId(tid(testId, 'slider-alpha'));
		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));

		expect(modifierInput).toBeDisabled();
		expect(slider).toBeDisabled();
		expect(searchButton).toBeDisabled();
	});

	it('trims whitespace from modifier text before calling onSearch', async () => {
		const user = userEvent.setup();
		const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

		render(ComposedSearchPanel, {
			props: { onSearch: mockOnSearch, referenceImage: mockFile, testId }
		});

		const modifierInput = screen.getByTestId(tid(testId, 'input-modifier'));
		await user.type(modifierInput, '  at night  ');

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		await user.click(searchButton);

		expect(mockOnSearch).toHaveBeenCalledWith({
			referenceImage: mockFile,
			modifierText: 'at night',
			alpha: 0.3
		});
	});

	it('converts alpha from percentage (0-100) to decimal (0-1)', async () => {
		const user = userEvent.setup();
		const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

		render(ComposedSearchPanel, {
			props: { onSearch: mockOnSearch, referenceImage: mockFile, testId }
		});

		const slider = screen.getByTestId(tid(testId, 'slider-alpha'));
		await user.clear(slider);
		await user.type(slider, '80');

		const modifierInput = screen.getByTestId(tid(testId, 'input-modifier'));
		await user.type(modifierInput, 'at sunset');

		const searchButton = screen.getByTestId(tid(testId, 'btn-search'));
		await user.click(searchButton);

		expect(mockOnSearch).toHaveBeenCalledWith({
			referenceImage: mockFile,
			modifierText: 'at sunset',
			alpha: 0.8
		});
	});

	it('shows visual separation between reference and modifier sections', () => {
		const { container } = render(ComposedSearchPanel, {
			props: { onSearch: mockOnSearch, testId }
		});

		const referenceSections = container.querySelectorAll('.reference-section');
		const modifierSections = container.querySelectorAll('.modifier-section');

		expect(referenceSections).toHaveLength(1);
		expect(modifierSections).toHaveLength(1);
	});
});
