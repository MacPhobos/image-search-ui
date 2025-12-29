import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import CoverageIndicator from '$lib/components/faces/CoverageIndicator.svelte';
import type { TemporalCoverage, AgeEraBucket } from '$lib/types';

describe('CoverageIndicator', () => {
	const highCoverage: TemporalCoverage = {
		coveredEras: ['infant', 'child', 'teen', 'young_adult', 'adult'] as AgeEraBucket[],
		missingEras: ['senior'] as AgeEraBucket[],
		coveragePercentage: 83.3,
		totalPrototypes: 5
	};

	const mediumCoverage: TemporalCoverage = {
		coveredEras: ['child', 'adult', 'senior'] as AgeEraBucket[],
		missingEras: ['infant', 'teen', 'young_adult'] as AgeEraBucket[],
		coveragePercentage: 50,
		totalPrototypes: 3
	};

	const lowCoverage: TemporalCoverage = {
		coveredEras: ['adult'] as AgeEraBucket[],
		missingEras: ['infant', 'child', 'teen', 'young_adult', 'senior'] as AgeEraBucket[],
		coveragePercentage: 16.7,
		totalPrototypes: 1
	};

	const zeroCoverage: TemporalCoverage = {
		coveredEras: [],
		missingEras: ['infant', 'child', 'teen', 'young_adult', 'adult', 'senior'] as AgeEraBucket[],
		coveragePercentage: 0,
		totalPrototypes: 0
	};

	const fullCoverage: TemporalCoverage = {
		coveredEras: ['infant', 'child', 'teen', 'young_adult', 'adult', 'senior'] as AgeEraBucket[],
		missingEras: [],
		coveragePercentage: 100,
		totalPrototypes: 6
	};

	describe('full mode', () => {
		it('renders coverage bar and text', () => {
			render(CoverageIndicator, {
				props: { coverage: mediumCoverage }
			});

			expect(screen.getByText('3/6 eras')).toBeInTheDocument();
		});

		it('shows high coverage with green color', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: highCoverage }
			});

			const fill = container.querySelector('.coverage-fill.high');
			expect(fill).toBeInTheDocument();
		});

		it('shows medium coverage with orange color', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: mediumCoverage }
			});

			const fill = container.querySelector('.coverage-fill.medium');
			expect(fill).toBeInTheDocument();
		});

		it('shows low coverage with red color', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: lowCoverage }
			});

			const fill = container.querySelector('.coverage-fill.low');
			expect(fill).toBeInTheDocument();
		});

		it('displays correct era count', () => {
			render(CoverageIndicator, {
				props: { coverage: highCoverage }
			});

			expect(screen.getByText('5/6 eras')).toBeInTheDocument();
		});

		it('shows 0/6 eras for zero coverage', () => {
			render(CoverageIndicator, {
				props: { coverage: zeroCoverage }
			});

			expect(screen.getByText('0/6 eras')).toBeInTheDocument();
		});

		it('shows 6/6 eras for full coverage', () => {
			render(CoverageIndicator, {
				props: { coverage: fullCoverage }
			});

			expect(screen.getByText('6/6 eras')).toBeInTheDocument();
		});

		it('sets bar width to coverage percentage', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: mediumCoverage }
			});

			const fill = container.querySelector('.coverage-fill');
			expect(fill).toHaveStyle({ width: '50%' });
		});
	});

	describe('compact mode', () => {
		it('renders compact badge', () => {
			render(CoverageIndicator, {
				props: { coverage: mediumCoverage, compact: true }
			});

			expect(screen.getByText('50%')).toBeInTheDocument();
		});

		it('does not show era count in compact mode', () => {
			render(CoverageIndicator, {
				props: { coverage: mediumCoverage, compact: true }
			});

			expect(screen.queryByText(/eras/)).not.toBeInTheDocument();
		});

		it('shows high coverage badge with green background', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: highCoverage, compact: true }
			});

			const badge = container.querySelector('.coverage-compact.high');
			expect(badge).toBeInTheDocument();
			expect(badge).toHaveTextContent('83%');
		});

		it('shows medium coverage badge with orange background', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: mediumCoverage, compact: true }
			});

			const badge = container.querySelector('.coverage-compact.medium');
			expect(badge).toBeInTheDocument();
			expect(badge).toHaveTextContent('50%');
		});

		it('shows low coverage badge with red background', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: lowCoverage, compact: true }
			});

			const badge = container.querySelector('.coverage-compact.low');
			expect(badge).toBeInTheDocument();
			expect(badge).toHaveTextContent('17%');
		});

		it('rounds percentage to nearest integer', () => {
			render(CoverageIndicator, {
				props: { coverage: highCoverage, compact: true }
			});

			expect(screen.getByText('83%')).toBeInTheDocument();
		});

		it('shows 0% for zero coverage', () => {
			render(CoverageIndicator, {
				props: { coverage: zeroCoverage, compact: true }
			});

			expect(screen.getByText('0%')).toBeInTheDocument();
		});

		it('shows 100% for full coverage', () => {
			render(CoverageIndicator, {
				props: { coverage: fullCoverage, compact: true }
			});

			expect(screen.getByText('100%')).toBeInTheDocument();
		});
	});

	describe('coverage thresholds', () => {
		it('classifies 80% as high', () => {
			const coverage: TemporalCoverage = {
				coveredEras: ['infant', 'child', 'teen', 'young_adult', 'adult'] as AgeEraBucket[],
				missingEras: ['senior'] as AgeEraBucket[],
				coveragePercentage: 80,
				totalPrototypes: 5
			};

			const { container } = render(CoverageIndicator, {
				props: { coverage, compact: true }
			});

			expect(container.querySelector('.coverage-compact.high')).toBeInTheDocument();
		});

		it('classifies 79% as medium', () => {
			const coverage: TemporalCoverage = {
				coveredEras: ['child', 'teen', 'young_adult', 'adult'] as AgeEraBucket[],
				missingEras: ['infant', 'senior'] as AgeEraBucket[],
				coveragePercentage: 79,
				totalPrototypes: 4
			};

			const { container } = render(CoverageIndicator, {
				props: { coverage, compact: true }
			});

			expect(container.querySelector('.coverage-compact.medium')).toBeInTheDocument();
		});

		it('classifies 50% as medium', () => {
			const { container } = render(CoverageIndicator, {
				props: { coverage: mediumCoverage, compact: true }
			});

			expect(container.querySelector('.coverage-compact.medium')).toBeInTheDocument();
		});

		it('classifies 49% as low', () => {
			const coverage: TemporalCoverage = {
				coveredEras: ['child', 'adult'] as AgeEraBucket[],
				missingEras: ['infant', 'teen', 'young_adult', 'senior'] as AgeEraBucket[],
				coveragePercentage: 49,
				totalPrototypes: 2
			};

			const { container } = render(CoverageIndicator, {
				props: { coverage, compact: true }
			});

			expect(container.querySelector('.coverage-compact.low')).toBeInTheDocument();
		});
	});
});
