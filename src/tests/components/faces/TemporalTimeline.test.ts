import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import TemporalTimeline from '$lib/components/faces/TemporalTimeline.svelte';
import type { Prototype, TemporalCoverage, AgeEraBucket } from '$lib/types';

describe('TemporalTimeline', () => {
	const mockCoverage: TemporalCoverage = {
		coveredEras: ['child', 'adult'] as AgeEraBucket[],
		missingEras: ['infant', 'teen', 'young_adult', 'senior'] as AgeEraBucket[],
		coveragePercentage: 33.3,
		totalPrototypes: 2
	};

	const mockPrototypes: Prototype[] = [
		{
			id: '1',
			faceInstanceId: 'f1',
			role: 'temporal',
			ageEraBucket: 'child',
			decadeBucket: '2000s',
			isPinned: false,
			qualityScore: 0.9,
			createdAt: '2025-01-01T00:00:00Z',
			thumbnailUrl: '/api/v1/faces/thumbnails/f1'
		},
		{
			id: '2',
			faceInstanceId: 'f2',
			role: 'primary',
			ageEraBucket: 'adult',
			decadeBucket: '2020s',
			isPinned: true,
			qualityScore: 0.95,
			createdAt: '2025-01-01T00:00:00Z',
			thumbnailUrl: '/api/v1/faces/thumbnails/f2'
		}
	];

	const emptyCoverage: TemporalCoverage = {
		coveredEras: [],
		missingEras: ['infant', 'child', 'teen', 'young_adult', 'adult', 'senior'] as AgeEraBucket[],
		coveragePercentage: 0,
		totalPrototypes: 0
	};

	it('renders all 6 era slots', () => {
		render(TemporalTimeline, {
			props: { prototypes: [], coverage: emptyCoverage }
		});

		expect(screen.getByText('Infant')).toBeInTheDocument();
		expect(screen.getByText('Child')).toBeInTheDocument();
		expect(screen.getByText('Teen')).toBeInTheDocument();
		expect(screen.getByText('Young Adult')).toBeInTheDocument();
		expect(screen.getByText('Adult')).toBeInTheDocument();
		expect(screen.getByText('Senior')).toBeInTheDocument();
	});

	it('shows coverage percentage', () => {
		render(TemporalTimeline, {
			props: { prototypes: mockPrototypes, coverage: mockCoverage }
		});

		expect(screen.getByText('33% Coverage')).toBeInTheDocument();
	});

	it('shows age ranges for each era', () => {
		render(TemporalTimeline, {
			props: { prototypes: [], coverage: emptyCoverage }
		});

		expect(screen.getByText('0-3 yrs')).toBeInTheDocument();
		expect(screen.getByText('4-12 yrs')).toBeInTheDocument();
		expect(screen.getByText('13-19 yrs')).toBeInTheDocument();
		expect(screen.getByText('20-35 yrs')).toBeInTheDocument();
		expect(screen.getByText('36-55 yrs')).toBeInTheDocument();
		expect(screen.getByText('56+ yrs')).toBeInTheDocument();
	});

	it('shows prototype role badges for covered eras', () => {
		render(TemporalTimeline, {
			props: { prototypes: mockPrototypes, coverage: mockCoverage }
		});

		const badges = screen.getAllByText(/temporal|primary/);
		expect(badges).toHaveLength(2);
		expect(screen.getByText('temporal')).toBeInTheDocument();
		expect(screen.getByText('primary')).toBeInTheDocument();
	});

	it('shows pin indicator for pinned prototypes', () => {
		render(TemporalTimeline, {
			props: { prototypes: mockPrototypes, coverage: mockCoverage }
		});

		const unpinButton = screen.getByLabelText('Unpin prototype');
		expect(unpinButton).toBeInTheDocument();
	});

	it('shows "No photos" for empty eras', () => {
		render(TemporalTimeline, {
			props: { prototypes: [], coverage: emptyCoverage }
		});

		const noPhotosLabels = screen.getAllByText('No photos');
		expect(noPhotosLabels).toHaveLength(6);
	});

	it('shows pin buttons when onPinClick is provided', () => {
		const onPinClick = vi.fn();

		render(TemporalTimeline, {
			props: { prototypes: [], coverage: emptyCoverage, onPinClick }
		});

		const pinButtons = screen.getAllByText('+ Pin');
		expect(pinButtons).toHaveLength(6);
	});

	it('hides pin buttons when onPinClick is not provided', () => {
		render(TemporalTimeline, {
			props: { prototypes: [], coverage: emptyCoverage }
		});

		const pinButtons = screen.queryAllByText('+ Pin');
		expect(pinButtons).toHaveLength(0);
	});

	it('calls onPinClick when pin button clicked', async () => {
		const onPinClick = vi.fn();

		render(TemporalTimeline, {
			props: { prototypes: [], coverage: emptyCoverage, onPinClick }
		});

		const pinButton = screen.getByLabelText('Pin photo for Infant');
		await fireEvent.click(pinButton);

		expect(onPinClick).toHaveBeenCalledWith('infant');
	});

	it('calls onUnpinClick when unpin button clicked', async () => {
		const onUnpinClick = vi.fn();

		render(TemporalTimeline, {
			props: { prototypes: mockPrototypes, coverage: mockCoverage, onUnpinClick }
		});

		const unpinButton = screen.getByLabelText('Unpin prototype');
		await fireEvent.click(unpinButton);

		expect(onUnpinClick).toHaveBeenCalledWith(mockPrototypes[1]);
	});

	it('shows 100% coverage when all eras are covered', () => {
		const fullCoverage: TemporalCoverage = {
			coveredEras: ['infant', 'child', 'teen', 'young_adult', 'adult', 'senior'] as AgeEraBucket[],
			missingEras: [],
			coveragePercentage: 100,
			totalPrototypes: 6
		};

		const fullPrototypes: Prototype[] = [
			{
				id: '1',
				faceInstanceId: 'f1',
				role: 'temporal',
				ageEraBucket: 'infant',
				decadeBucket: '1990s',
				isPinned: false,
				qualityScore: 0.8,
				createdAt: '2025-01-01T00:00:00Z',
				thumbnailUrl: '/api/v1/faces/thumbnails/f1'
			},
			{
				id: '2',
				faceInstanceId: 'f2',
				role: 'temporal',
				ageEraBucket: 'child',
				decadeBucket: '2000s',
				isPinned: false,
				qualityScore: 0.85,
				createdAt: '2025-01-01T00:00:00Z',
				thumbnailUrl: '/api/v1/faces/thumbnails/f2'
			},
			{
				id: '3',
				faceInstanceId: 'f3',
				role: 'temporal',
				ageEraBucket: 'teen',
				decadeBucket: '2010s',
				isPinned: false,
				qualityScore: 0.9,
				createdAt: '2025-01-01T00:00:00Z',
				thumbnailUrl: '/api/v1/faces/thumbnails/f3'
			},
			{
				id: '4',
				faceInstanceId: 'f4',
				role: 'temporal',
				ageEraBucket: 'young_adult',
				decadeBucket: '2015s',
				isPinned: false,
				qualityScore: 0.92,
				createdAt: '2025-01-01T00:00:00Z',
				thumbnailUrl: '/api/v1/faces/thumbnails/f4'
			},
			{
				id: '5',
				faceInstanceId: 'f5',
				role: 'primary',
				ageEraBucket: 'adult',
				decadeBucket: '2020s',
				isPinned: true,
				qualityScore: 0.95,
				createdAt: '2025-01-01T00:00:00Z',
				thumbnailUrl: '/api/v1/faces/thumbnails/f5'
			},
			{
				id: '6',
				faceInstanceId: 'f6',
				role: 'temporal',
				ageEraBucket: 'senior',
				decadeBucket: '2025s',
				isPinned: false,
				qualityScore: 0.88,
				createdAt: '2025-01-01T00:00:00Z',
				thumbnailUrl: '/api/v1/faces/thumbnails/f6'
			}
		];

		render(TemporalTimeline, {
			props: { prototypes: fullPrototypes, coverage: fullCoverage }
		});

		expect(screen.getByText('100% Coverage')).toBeInTheDocument();
		expect(screen.queryByText('No photos')).not.toBeInTheDocument();
	});

	it('renders with aria-labels for accessibility', () => {
		const onPinClick = vi.fn();

		render(TemporalTimeline, {
			props: { prototypes: [], coverage: emptyCoverage, onPinClick }
		});

		expect(screen.getByLabelText('Pin photo for Infant')).toBeInTheDocument();
		expect(screen.getByLabelText('Pin photo for Child')).toBeInTheDocument();
		expect(screen.getByLabelText('Pin photo for Teen')).toBeInTheDocument();
		expect(screen.getByLabelText('Pin photo for Young Adult')).toBeInTheDocument();
		expect(screen.getByLabelText('Pin photo for Adult')).toBeInTheDocument();
		expect(screen.getByLabelText('Pin photo for Senior')).toBeInTheDocument();
	});
});
