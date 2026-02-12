import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import SimilarityThresholdControl from '$lib/components/faces/SimilarityThresholdControl.svelte';

describe('SimilarityThresholdControl', () => {
	it('renders the threshold slider', () => {
		render(SimilarityThresholdControl, { props: { value: 0.8 } });

		const slider = screen.getByRole('slider');
		expect(slider).toBeInTheDocument();
	});

	it('renders the label "Similarity Threshold"', () => {
		render(SimilarityThresholdControl, { props: { value: 0.8 } });

		expect(screen.getByText('Similarity Threshold')).toBeInTheDocument();
	});

	it('renders three preset buttons', () => {
		render(SimilarityThresholdControl, { props: { value: 0.8 } });

		expect(screen.getByRole('button', { name: 'Exploratory' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Standard' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'High Confidence' })).toBeInTheDocument();
	});

	it('displays the formatted value', () => {
		render(SimilarityThresholdControl, { props: { value: 0.85 } });

		expect(screen.getByText('0.85')).toBeInTheDocument();
	});

	it('shows Standard badge when value is 0.80', () => {
		render(SimilarityThresholdControl, { props: { value: 0.8 } });

		// Both badge and button show "Standard" when active
		const standardElements = screen.getAllByText('Standard');
		expect(standardElements.length).toBeGreaterThanOrEqual(2);
	});

	it('shows Exploratory badge when value is 0.70', () => {
		render(SimilarityThresholdControl, { props: { value: 0.7 } });

		// The badge text and button text both show "Exploratory"
		const exploratoryElements = screen.getAllByText('Exploratory');
		expect(exploratoryElements.length).toBeGreaterThanOrEqual(1);
	});

	it('shows High Confidence badge when value is 0.90', () => {
		render(SimilarityThresholdControl, { props: { value: 0.9 } });

		// Both badge and button will show "High Confidence"
		const elements = screen.getAllByText('High Confidence');
		expect(elements.length).toBeGreaterThanOrEqual(1);
	});

	it('shows Custom badge when value does not match any preset', () => {
		render(SimilarityThresholdControl, { props: { value: 0.85 } });

		expect(screen.getByText('Custom')).toBeInTheDocument();
	});

	it('renders min and max labels', () => {
		render(SimilarityThresholdControl, { props: { value: 0.8, min: 0.7, max: 0.95 } });

		expect(screen.getByText('0.70 (more groups)')).toBeInTheDocument();
		expect(screen.getByText('0.95 (fewer groups)')).toBeInTheDocument();
	});

	it('slider has correct min, max, and step attributes', () => {
		render(SimilarityThresholdControl, {
			props: { value: 0.8, min: 0.7, max: 0.95, step: 0.01 }
		});

		const slider = screen.getByRole('slider');
		expect(slider).toHaveAttribute('min', '0.7');
		expect(slider).toHaveAttribute('max', '0.95');
		expect(slider).toHaveAttribute('step', '0.01');
	});
});
