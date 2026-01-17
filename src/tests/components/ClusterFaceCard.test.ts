import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ClusterFaceCard from '$lib/components/faces/ClusterFaceCard.svelte';
import type { FaceInstance } from '$lib/api/faces';

describe('ClusterFaceCard', () => {
	const mockFace: FaceInstance = {
		id: 'face-123',
		assetId: 456,
		bbox: { x: 100, y: 100, width: 50, height: 50 },
		detectionConfidence: 0.95,
		qualityScore: 0.87,
		clusterId: 'cluster-789',
		personId: null,
		personName: null,
		createdAt: '2024-01-01T00:00:00Z'
	};

	it('renders full image thumbnail with correct src', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 1,
				onClick: vi.fn()
			}
		});

		const fullImage = screen.getByAltText('Photo 456');
		expect(fullImage).toBeInTheDocument();
		expect(fullImage).toHaveAttribute('src', 'http://localhost:8000/api/v1/images/456/thumbnail');
	});

	it('renders zoomed face using FaceThumbnail component', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 1,
				onClick: vi.fn()
			}
		});

		// FaceThumbnail should render with the face bbox
		const zoomedFace = screen.getByAltText('Face from photo 456');
		expect(zoomedFace).toBeInTheDocument();
	});

	it('shows quality score as percentage', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 1,
				onClick: vi.fn()
			}
		});

		expect(screen.getByText('Quality: 87%')).toBeInTheDocument();
	});

	it('shows face count badge when totalFacesInImage > 1', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 3,
				onClick: vi.fn()
			}
		});

		expect(screen.getByText('3 faces')).toBeInTheDocument();
	});

	it('hides face count badge when totalFacesInImage === 1', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 1,
				onClick: vi.fn()
			}
		});

		expect(screen.queryByText('1 faces')).not.toBeInTheDocument();
		expect(screen.queryByText(/faces/)).not.toBeInTheDocument();
	});

	it('calls onClick when card is clicked', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();

		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 1,
				onClick: handleClick
			}
		});

		const card = screen.getByRole('button');
		await user.click(card);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it('handles missing quality score (null)', () => {
		const faceWithoutQuality: FaceInstance = {
			...mockFace,
			qualityScore: null
		};

		render(ClusterFaceCard, {
			props: {
				face: faceWithoutQuality,
				totalFacesInImage: 1,
				onClick: vi.fn()
			}
		});

		// Should show 0% when quality is null
		expect(screen.getByText('Quality: 0%')).toBeInTheDocument();
	});

	it('formats quality score correctly for various values', () => {
		const testCases = [
			{ qualityScore: 1.0, expected: '100%' },
			{ qualityScore: 0.5, expected: '50%' },
			{ qualityScore: 0.123, expected: '12%' },
			{ qualityScore: 0.0, expected: '0%' }
		];

		testCases.forEach(({ qualityScore, expected }) => {
			const { unmount } = render(ClusterFaceCard, {
				props: {
					face: { ...mockFace, qualityScore },
					totalFacesInImage: 1,
					onClick: vi.fn()
				}
			});

			expect(screen.getByText(`Quality: ${expected}`)).toBeInTheDocument();
			unmount();
		});
	});

	it('displays correct face count for multi-face images', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 5,
				onClick: vi.fn()
			}
		});

		expect(screen.getByText('5 faces')).toBeInTheDocument();
	});

	it('is a button with proper semantics', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 1,
				onClick: vi.fn()
			}
		});

		const card = screen.getByRole('button');
		expect(card).toHaveAttribute('type', 'button');
	});

	it('includes loading="lazy" on full image for performance', () => {
		render(ClusterFaceCard, {
			props: {
				face: mockFace,
				totalFacesInImage: 1,
				onClick: vi.fn()
			}
		});

		const fullImage = screen.getByAltText('Photo 456');
		expect(fullImage).toHaveAttribute('loading', 'lazy');
	});
});
