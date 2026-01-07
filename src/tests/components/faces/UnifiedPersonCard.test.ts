import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import UnifiedPersonCard from '$lib/components/faces/UnifiedPersonCard.svelte';
import {
	createIdentifiedPerson,
	createUnidentifiedPerson,
	createNoisePerson
} from '../../helpers/fixtures';

describe('UnifiedPersonCard', () => {
	const identifiedPerson = createIdentifiedPerson({
		id: 'uuid-123',
		name: 'John Doe',
		faceCount: 45,
		thumbnailUrl: 'http://example.com/thumb.jpg'
	});

	const unidentifiedPerson = createUnidentifiedPerson({
		id: 'clu_abc123',
		name: 'Unidentified Person 1',
		faceCount: 87,
		thumbnailUrl: null,
		confidence: 0.85
	});

	const noisePerson = createNoisePerson({
		id: 'noise_1',
		name: 'Unknown Faces',
		faceCount: 312,
		thumbnailUrl: null
	});

	describe('Rendering', () => {
		it('should render identified person correctly', () => {
			render(UnifiedPersonCard, { props: { person: identifiedPerson } });

			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('45', { exact: false })).toBeInTheDocument();
			expect(screen.getByText(/faces/)).toBeInTheDocument();
			expect(screen.getByText('Identified')).toBeInTheDocument();
		});

		it('should render unidentified person with Needs Name badge', () => {
			render(UnifiedPersonCard, { props: { person: unidentifiedPerson } });

			expect(screen.getByText('Unidentified Person 1')).toBeInTheDocument();
			expect(screen.getByText('Needs Name')).toBeInTheDocument();
			expect(screen.getByText('87', { exact: false })).toBeInTheDocument();
			expect(screen.getByText(/faces/)).toBeInTheDocument();
		});

		it('should show confidence for unidentified persons', () => {
			render(UnifiedPersonCard, { props: { person: unidentifiedPerson } });

			// Look for the confidence percentage text
			const confidenceText = screen.getByText(/85%/);
			expect(confidenceText).toBeInTheDocument();
			expect(confidenceText.parentElement?.textContent).toContain('confidence');
		});

		it('should render noise person with Review badge', () => {
			render(UnifiedPersonCard, { props: { person: noisePerson } });

			expect(screen.getByText('Unknown Faces')).toBeInTheDocument();
			expect(screen.getByText('Review')).toBeInTheDocument();
			// Check that face count is displayed (312 faces)
			const faceCountElement = screen.getByText('312');
			expect(faceCountElement.parentElement?.textContent).toContain('faces');
		});

		it('should display singular "face" for count of 1', () => {
			const singleFacePerson = createIdentifiedPerson({ faceCount: 1 });
			render(UnifiedPersonCard, { props: { person: singleFacePerson } });

			expect(screen.getByText('1', { exact: false })).toBeInTheDocument();
			expect(screen.getByText(/face/)).toBeInTheDocument();
		});
	});

	describe('Thumbnail Display', () => {
		it('should show thumbnail image when available', () => {
			render(UnifiedPersonCard, { props: { person: identifiedPerson } });

			const img = screen.getByRole('img');
			expect(img).toHaveAttribute('src', 'http://example.com/thumb.jpg');
			expect(img).toHaveAttribute('alt', 'John Doe');
		});

		it('should show initial placeholder when no thumbnail', () => {
			render(UnifiedPersonCard, { props: { person: unidentifiedPerson } });

			// Should show first two letters (UP for Unidentified Person)
			const placeholder = screen.getByText('UP');
			expect(placeholder).toBeInTheDocument();
			expect(placeholder.className).toContain('thumbnail-placeholder');
		});

		it('should show first two initials for multi-word names', () => {
			const person = createIdentifiedPerson({
				name: 'John Doe',
				thumbnailUrl: null
			});
			render(UnifiedPersonCard, { props: { person } });

			expect(screen.getByText('JD')).toBeInTheDocument();
		});

		it('should handle single-word names', () => {
			const person = createIdentifiedPerson({
				name: 'Alice',
				thumbnailUrl: null
			});
			render(UnifiedPersonCard, { props: { person } });

			expect(screen.getByText('A')).toBeInTheDocument();
		});
	});

	describe('Badge Variants', () => {
		it('should render badge with success variant for identified persons', () => {
			render(UnifiedPersonCard, { props: { person: identifiedPerson } });

			const badge = screen.getByText('Identified');
			// shadcn Badge with success variant uses green background
			expect(badge.className).toContain('bg-green-500');
		});

		it('should render badge with warning variant for unidentified persons', () => {
			render(UnifiedPersonCard, { props: { person: unidentifiedPerson } });

			const badge = screen.getByText('Needs Name');
			// shadcn Badge with warning variant uses amber background
			expect(badge.className).toContain('bg-amber-500');
		});

		it('should render badge with destructive variant for noise persons', () => {
			render(UnifiedPersonCard, { props: { person: noisePerson } });

			const badge = screen.getByText('Review');
			// shadcn Badge with destructive variant uses destructive background
			expect(badge.className).toContain('bg-destructive');
		});

		it('should render badge with uppercase text', () => {
			render(UnifiedPersonCard, { props: { person: identifiedPerson } });

			const badge = screen.getByText('Identified');
			expect(badge.className).toContain('uppercase');
		});
	});

	describe('Click Handlers', () => {
		it('should call onClick when clickable card is clicked', async () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, onClick }
			});

			const card = screen.getByRole('button');
			await fireEvent.click(card);

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(onClick).toHaveBeenCalledWith(identifiedPerson);
		});

		it('should call onClick when Enter key is pressed', async () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, onClick }
			});

			const card = screen.getByRole('button');
			await fireEvent.keyDown(card, { key: 'Enter' });

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(onClick).toHaveBeenCalledWith(identifiedPerson);
		});

		it('should call onClick when Space key is pressed', async () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, onClick }
			});

			const card = screen.getByRole('button');
			await fireEvent.keyDown(card, { key: ' ' });

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(onClick).toHaveBeenCalledWith(identifiedPerson);
		});

		it('should not respond to other keys', async () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, onClick }
			});

			const card = screen.getByRole('button');
			await fireEvent.keyDown(card, { key: 'a' });

			expect(onClick).not.toHaveBeenCalled();
		});

		it('should have role="article" when onClick is not provided', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson }
			});

			const card = screen.getByRole('article');
			expect(card).toBeInTheDocument();
		});

		it('should have role="button" when onClick is provided', () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, onClick }
			});

			const card = screen.getByRole('button');
			expect(card).toBeInTheDocument();
		});

		it('should NOT call onClick for noise faces even when onClick is provided', async () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: noisePerson, onClick }
			});

			// Noise faces should have role="article" not "button"
			const card = screen.getByRole('article');
			await fireEvent.click(card);

			expect(onClick).not.toHaveBeenCalled();
		});

		it('should have role="article" for noise faces even with onClick', () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: noisePerson, onClick }
			});

			const card = screen.getByRole('article');
			expect(card).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /Person:/ })).not.toBeInTheDocument();
		});

		it('should not respond to keyboard events for noise faces', async () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: noisePerson, onClick }
			});

			const card = screen.getByRole('article');
			await fireEvent.keyDown(card, { key: 'Enter' });
			await fireEvent.keyDown(card, { key: ' ' });

			expect(onClick).not.toHaveBeenCalled();
		});
	});

	describe('Assign Button', () => {
		it('should show assign button for unidentified when enabled', () => {
			render(UnifiedPersonCard, {
				props: { person: unidentifiedPerson, showAssignButton: true }
			});

			expect(screen.getByText('Assign Name')).toBeInTheDocument();
		});

		it('should NOT show assign button for noise faces even when enabled', () => {
			render(UnifiedPersonCard, {
				props: { person: noisePerson, showAssignButton: true }
			});

			expect(screen.queryByText('Assign Name')).not.toBeInTheDocument();
		});

		it('should not show assign button for identified persons', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, showAssignButton: true }
			});

			expect(screen.queryByText('Assign Name')).not.toBeInTheDocument();
		});

		it('should not show assign button when showAssignButton is false', () => {
			render(UnifiedPersonCard, {
				props: { person: unidentifiedPerson, showAssignButton: false }
			});

			expect(screen.queryByText('Assign Name')).not.toBeInTheDocument();
		});

		it('should call onAssign when assign button is clicked', async () => {
			const onAssign = vi.fn();
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: {
					person: unidentifiedPerson,
					showAssignButton: true,
					onAssign,
					onClick
				}
			});

			const assignBtn = screen.getByText('Assign Name');
			await fireEvent.click(assignBtn);

			expect(onAssign).toHaveBeenCalledTimes(1);
			expect(onAssign).toHaveBeenCalledWith(unidentifiedPerson);
			// Should not propagate to onClick
			expect(onClick).not.toHaveBeenCalled();
		});

		it('should have correct aria-label for assign button', () => {
			render(UnifiedPersonCard, {
				props: { person: unidentifiedPerson, showAssignButton: true }
			});

			const assignBtn = screen.getByLabelText('Assign name to Unidentified Person 1');
			expect(assignBtn).toBeInTheDocument();
		});
	});

	describe('Selection State', () => {
		it('should apply selected class when selected is true', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, selected: true }
			});

			const card = screen.getByRole('article');
			expect(card.className).toContain('selected');
		});

		it('should not apply selected class when selected is false', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, selected: false }
			});

			const card = screen.getByRole('article');
			expect(card.className).not.toContain('selected');
		});
	});

	describe('Accessibility', () => {
		it('should have correct aria-label for card', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson }
			});

			const card = screen.getByLabelText('Person: John Doe, 45 faces');
			expect(card).toBeInTheDocument();
		});

		it('should be focusable when clickable', () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, onClick }
			});

			const card = screen.getByRole('button');
			expect(card).toHaveAttribute('tabindex', '0');
		});

		it('should not be focusable when not clickable', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson }
			});

			const card = screen.getByRole('article');
			expect(card).not.toHaveAttribute('tabindex');
		});
	});

	describe('CSS Classes', () => {
		it('should apply clickable class when onClick is provided for non-noise', () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson, onClick }
			});

			const card = screen.getByRole('button');
			expect(card.className).toContain('clickable');
		});

		it('should not apply clickable class when onClick is not provided', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson }
			});

			const card = screen.getByRole('article');
			expect(card.className).not.toContain('clickable');
		});

		it('should apply noise class for noise faces', () => {
			render(UnifiedPersonCard, {
				props: { person: noisePerson }
			});

			const card = screen.getByRole('article');
			expect(card.className).toContain('noise');
		});

		it('should NOT apply clickable class for noise faces even with onClick', () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: noisePerson, onClick }
			});

			const card = screen.getByRole('article');
			expect(card.className).not.toContain('clickable');
			expect(card.className).toContain('noise');
		});
	});

	describe('Noise Faces', () => {
		it('should display hint message for noise faces', () => {
			render(UnifiedPersonCard, {
				props: { person: noisePerson }
			});

			expect(
				screen.getByText('These faces need individual review and manual grouping.')
			).toBeInTheDocument();
		});

		it('should not display hint message for non-noise faces', () => {
			render(UnifiedPersonCard, {
				props: { person: identifiedPerson }
			});

			expect(
				screen.queryByText('These faces need individual review and manual grouping.')
			).not.toBeInTheDocument();
		});

		it('should not be focusable for noise faces', () => {
			const onClick = vi.fn();
			render(UnifiedPersonCard, {
				props: { person: noisePerson, onClick }
			});

			const card = screen.getByRole('article');
			expect(card).not.toHaveAttribute('tabindex');
		});
	});
});
