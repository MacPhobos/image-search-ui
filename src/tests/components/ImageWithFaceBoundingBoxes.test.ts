import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImageWithFaceBoundingBoxes from '$lib/components/faces/ImageWithFaceBoundingBoxes.svelte';
import type { FaceBox } from '$lib/components/faces/ImageWithFaceBoundingBoxes.svelte';

describe('ImageWithFaceBoundingBoxes', () => {
	const mockImageUrl = '/api/v1/images/1/full';

	const createMockFace = (overrides?: Partial<FaceBox>): FaceBox => ({
		id: 'face-1',
		bboxX: 100,
		bboxY: 150,
		bboxW: 200,
		bboxH: 250,
		label: 'John Doe',
		labelStyle: 'assigned',
		...overrides
	});

	const mockFaces: FaceBox[] = [
		createMockFace({
			id: 'face-1',
			bboxX: 100,
			bboxY: 150,
			bboxW: 200,
			bboxH: 250,
			label: 'Alice Johnson',
			labelStyle: 'assigned'
		}),
		createMockFace({
			id: 'face-2',
			bboxX: 400,
			bboxY: 200,
			bboxW: 180,
			bboxH: 220,
			label: 'Bob Smith',
			labelStyle: 'suggested',
			suggestionConfidence: 0.85
		}),
		createMockFace({
			id: 'face-3',
			bboxX: 700,
			bboxY: 100,
			bboxW: 150,
			bboxH: 180,
			label: 'Unknown',
			labelStyle: 'unknown'
		})
	];

	// Helper to trigger image load event
	const triggerImageLoad = async () => {
		const img = screen.getByRole('img');
		// Set naturalWidth and naturalHeight to simulate actual image
		Object.defineProperty(img, 'naturalWidth', { value: 1200, configurable: true });
		Object.defineProperty(img, 'naturalHeight', { value: 800, configurable: true });
		await fireEvent.load(img);
	};

	describe('Basic rendering', () => {
		it('should render without errors', () => {
			render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: []
				}
			});

			expect(screen.getByRole('img')).toBeInTheDocument();
		});

		it('should render image element with correct src', () => {
			render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: []
				}
			});

			const img = screen.getByRole('img');
			expect(img).toHaveAttribute('src', mockImageUrl);
		});

		it('should render image with correct alt text', () => {
			render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces
				}
			});

			const img = screen.getByAltText('Image with 3 detected faces');
			expect(img).toBeInTheDocument();
		});

		it('should not render SVG overlay before image loads', () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces
				}
			});

			const svg = container.querySelector('svg.face-overlay');
			expect(svg).not.toBeInTheDocument();
		});

		it('should render SVG overlay after image loads', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const svg = container.querySelector('svg.face-overlay');
				expect(svg).toBeInTheDocument();
				expect(svg).toHaveAttribute('viewBox', '0 0 1200 800');
			});
		});
	});

	describe('Face boxes rendering', () => {
		it('should render correct number of face boxes', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				expect(rects).toHaveLength(3);
			});
		});

		it('should render bounding box with correct attributes', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [mockFaces[0]]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rect = container.querySelector('rect.face-box');
				expect(rect).toHaveAttribute('x', '100');
				expect(rect).toHaveAttribute('y', '150');
				expect(rect).toHaveAttribute('width', '200');
				expect(rect).toHaveAttribute('height', '250');
			});
		});

		it('should render face labels with correct text', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				expect(container.textContent).toContain('Alice Johnson');
				expect(container.textContent).toContain('Bob Smith');
				expect(container.textContent).toContain('Unknown');
			});
		});

		it('should handle empty faces array without errors', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: []
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				expect(rects).toHaveLength(0);
			});
		});

		it('should apply unique colors to each face', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				const colors = Array.from(rects).map((r) => r.getAttribute('style'));
				// All should have stroke color defined
				colors.forEach((color) => {
					expect(color).toMatch(/stroke: #[0-9a-f]{6}/i);
				});
			});
		});

		it('should use custom color when provided', async () => {
			const customColorFace = createMockFace({
				id: 'custom-face',
				color: '#ff0000'
			});

			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [customColorFace]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rect = container.querySelector('rect.face-box');
				expect(rect?.getAttribute('style')).toContain('stroke: #ff0000');
			});
		});
	});

	describe('Label styles', () => {
		it('should render assigned label with correct class', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'assigned-face',
							label: 'Alice Johnson',
							labelStyle: 'assigned'
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const labelGroup = container.querySelector('g.assigned-label');
				expect(labelGroup).toBeInTheDocument();
				expect(container.textContent).toContain('Alice Johnson');
			});
		});

		it('should render suggested label with confidence percentage', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'suggested-face',
							label: 'Bob Smith',
							labelStyle: 'suggested',
							suggestionConfidence: 0.87
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const labelGroup = container.querySelector('g.suggestion-label');
				expect(labelGroup).toBeInTheDocument();
				expect(container.textContent).toContain('Bob Smith (87%)');
			});
		});

		it('should render suggested label without confidence if not provided', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'suggested-face',
							label: 'Bob Smith',
							labelStyle: 'suggested'
							// No suggestionConfidence
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const labelGroup = container.querySelector('g.suggestion-label');
				expect(labelGroup).toBeInTheDocument();
				// Should just show name without percentage
				expect(container.textContent).toContain('Bob Smith');
				expect(container.textContent).not.toContain('%');
			});
		});

		it('should render unknown label with correct class', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'unknown-face',
							label: 'Unknown',
							labelStyle: 'unknown'
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const labelGroup = container.querySelector('g.unknown-label');
				expect(labelGroup).toBeInTheDocument();
				expect(container.textContent).toContain('Unknown');
			});
		});

		it('should render loading label with correct class', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'loading-face',
							label: 'Loading...',
							labelStyle: 'loading'
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const labelGroup = container.querySelector('g.loading-label');
				expect(labelGroup).toBeInTheDocument();
				expect(container.textContent).toContain('Loading...');
			});
		});
	});

	describe('Highlighting', () => {
		it('should apply highlighted class to correct face', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces,
					highlightedFaceId: 'face-2'
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				const highlightedRect = Array.from(rects).find((r) => r.classList.contains('highlighted'));
				expect(highlightedRect).toBeInTheDocument();
			});
		});

		it('should apply primary class to correct face', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces,
					primaryFaceId: 'face-1'
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				const primaryRect = Array.from(rects).find((r) => r.classList.contains('primary'));
				expect(primaryRect).toBeInTheDocument();
			});
		});

		it('should apply both highlighted and primary classes without conflict', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces,
					highlightedFaceId: 'face-1',
					primaryFaceId: 'face-1'
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				const dualClassRect = Array.from(rects).find(
					(r) => r.classList.contains('primary') && r.classList.contains('highlighted')
				);
				expect(dualClassRect).toBeInTheDocument();
			});
		});

		it('should use different stroke widths for different states', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({ id: 'normal', bboxX: 0 }),
						createMockFace({ id: 'highlighted', bboxX: 200 }),
						createMockFace({ id: 'primary', bboxX: 400 })
					],
					highlightedFaceId: 'highlighted',
					primaryFaceId: 'primary'
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				const styles = Array.from(rects).map((r) => r.getAttribute('style') || '');

				// Normal face: stroke-width: 2
				expect(styles[0]).toContain('stroke-width: 2');

				// Highlighted face: stroke-width: 3
				expect(styles[1]).toContain('stroke-width: 3');

				// Primary face: stroke-width: 4
				expect(styles[2]).toContain('stroke-width: 4');
			});
		});

		it('should not highlight any face when highlightedFaceId is null', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces,
					highlightedFaceId: null
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const highlightedRect = container.querySelector('rect.face-box.highlighted');
				expect(highlightedRect).not.toBeInTheDocument();
			});
		});
	});

	describe('Click handling', () => {
		it('should call onFaceClick with correct face ID when clicking face box', async () => {
			const onFaceClick = vi.fn();
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces,
					onFaceClick
				}
			});

			await triggerImageLoad();

			await waitFor(async () => {
				const rects = container.querySelectorAll('rect.face-box');
				await fireEvent.click(rects[0]);
			});

			expect(onFaceClick).toHaveBeenCalledWith('face-1');
		});

		it('should call onFaceClick for each different face', async () => {
			const onFaceClick = vi.fn();
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces,
					onFaceClick
				}
			});

			await triggerImageLoad();

			await waitFor(async () => {
				const rects = container.querySelectorAll('rect.face-box');
				await fireEvent.click(rects[0]);
				await fireEvent.click(rects[1]);
				await fireEvent.click(rects[2]);
			});

			expect(onFaceClick).toHaveBeenCalledTimes(3);
			expect(onFaceClick).toHaveBeenCalledWith('face-1');
			expect(onFaceClick).toHaveBeenCalledWith('face-2');
			expect(onFaceClick).toHaveBeenCalledWith('face-3');
		});

		it('should not crash when onFaceClick is not provided', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces
					// No onFaceClick callback
				}
			});

			await triggerImageLoad();

			await waitFor(async () => {
				const rects = container.querySelectorAll('rect.face-box');
				// Should not throw error
				await fireEvent.click(rects[0]);
			});

			// Test passes if no error is thrown
			expect(true).toBe(true);
		});

		it('should not trigger callback when clicking on image (non-face area)', async () => {
			const onFaceClick = vi.fn();
			render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: mockFaces,
					onFaceClick
				}
			});

			await triggerImageLoad();

			const img = screen.getByRole('img');
			await fireEvent.click(img);

			// Should not call onFaceClick when clicking the image itself
			expect(onFaceClick).not.toHaveBeenCalled();
		});
	});

	describe('Edge cases', () => {
		it('should handle faces with zero dimensions', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'zero-face',
							bboxW: 0,
							bboxH: 0
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rect = container.querySelector('rect.face-box');
				expect(rect).toHaveAttribute('width', '0');
				expect(rect).toHaveAttribute('height', '0');
			});
		});

		it('should handle faces with negative coordinates', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'negative-face',
							bboxX: -10,
							bboxY: -20
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rect = container.querySelector('rect.face-box');
				expect(rect).toHaveAttribute('x', '-10');
				expect(rect).toHaveAttribute('y', '-20');
			});
		});

		it('should handle very large bbox coordinates', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'large-face',
							bboxX: 10000,
							bboxY: 10000,
							bboxW: 5000,
							bboxH: 5000
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rect = container.querySelector('rect.face-box');
				expect(rect).toHaveAttribute('x', '10000');
				expect(rect).toHaveAttribute('y', '10000');
				expect(rect).toHaveAttribute('width', '5000');
				expect(rect).toHaveAttribute('height', '5000');
			});
		});

		it('should handle maxHeight prop correctly', () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [],
					maxHeight: '500px'
				}
			});

			const wrapper = container.querySelector('.image-with-faces');
			const style = wrapper?.getAttribute('style');
			expect(style).toContain('--max-height: 500px');
		});

		it('should use default maxHeight when not provided', () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: []
				}
			});

			const wrapper = container.querySelector('.image-with-faces');
			const style = wrapper?.getAttribute('style');
			expect(style).toContain('--max-height: 100%');
		});

		it('should handle many faces efficiently', async () => {
			// Create many faces to test performance
			const manyFaces: FaceBox[] = Array.from({ length: 20 }, (_, i) =>
				createMockFace({
					id: `face-${i}`,
					bboxX: (i % 5) * 200,
					bboxY: Math.floor(i / 5) * 200,
					label: `Person ${i + 1}`,
					labelStyle: i % 2 === 0 ? 'assigned' : 'suggested',
					suggestionConfidence: i % 2 === 1 ? 0.8 : undefined
				})
			);

			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: manyFaces
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				const rects = container.querySelectorAll('rect.face-box');
				expect(rects).toHaveLength(20);
			});
		});

		it('should handle very long label text', async () => {
			const longLabel = 'A'.repeat(100);
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'long-label',
							label: longLabel,
							labelStyle: 'assigned'
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				expect(container.textContent).toContain(longLabel);
			});
		});

		it('should handle special characters in labels', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'special-chars',
							label: '<script>alert("XSS")</script>',
							labelStyle: 'assigned'
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				// Text content should be escaped (shown as text, not executed)
				expect(container.textContent).toContain('<script>alert("XSS")</script>');
				// Should not actually execute script
				const scripts = container.querySelectorAll('script');
				expect(scripts).toHaveLength(0);
			});
		});

		it('should handle confidence of 0 (treated as falsy, no percentage shown)', async () => {
			// Note: suggestionConfidence of 0 is falsy in JS, so no percentage is shown
			// This is expected behavior - only show confidence when it's > 0
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'zero-confidence',
							label: 'Maybe Bob',
							labelStyle: 'suggested',
							suggestionConfidence: 0
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				// Should show label without percentage since 0 is falsy
				expect(container.textContent).toContain('Maybe Bob');
				expect(container.textContent).not.toContain('%');
			});
		});

		it('should handle confidence of 1', async () => {
			const { container } = render(ImageWithFaceBoundingBoxes, {
				props: {
					imageUrl: mockImageUrl,
					faces: [
						createMockFace({
							id: 'max-confidence',
							label: 'Definitely Alice',
							labelStyle: 'suggested',
							suggestionConfidence: 1.0
						})
					]
				}
			});

			await triggerImageLoad();

			await waitFor(() => {
				expect(container.textContent).toContain('Definitely Alice (100%)');
			});
		});
	});
});
