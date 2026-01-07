import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CategoryBadge from '$lib/components/CategoryBadge.svelte';
import { createCategory, createDefaultCategory } from '../helpers/fixtures';

describe('CategoryBadge', () => {
	it('renders category name', () => {
		const category = createCategory({ name: 'Vacation Photos' });
		render(CategoryBadge, { props: { category } });

		expect(screen.getByText('Vacation Photos')).toBeInTheDocument();
	});

	it('displays default indicator for default categories', () => {
		const category = createDefaultCategory();
		render(CategoryBadge, { props: { category } });

		expect(screen.getByText('Uncategorized')).toBeInTheDocument();
		expect(screen.getByText('(Default)')).toBeInTheDocument();
	});

	it('does not show default indicator for non-default categories', () => {
		const category = createCategory({ name: 'Work', isDefault: false });
		render(CategoryBadge, { props: { category } });

		expect(screen.getByText('Work')).toBeInTheDocument();
		expect(screen.queryByText('(Default)')).not.toBeInTheDocument();
	});

	it('applies custom background color', () => {
		const category = createCategory({ name: 'Travel', color: '#3B82F6' });
		const { container } = render(CategoryBadge, { props: { category } });

		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveStyle({ backgroundColor: '#3B82F6' });
	});

	it('uses default gray background when no color specified', () => {
		const category = createCategory({ name: 'Misc', color: null });
		const { container } = render(CategoryBadge, { props: { category } });

		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveStyle({ backgroundColor: '#E5E7EB' });
	});

	it('applies small size by default', () => {
		const category = createCategory({ name: 'Small' });
		const { container } = render(CategoryBadge, { props: { category } });

		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveClass('text-xs');
		expect(badge).toHaveClass('px-2');
	});

	it('applies medium size when specified', () => {
		const category = createCategory({ name: 'Medium' });
		const { container } = render(CategoryBadge, { props: { category, size: 'medium' } });

		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveClass('text-sm');
		expect(badge).toHaveClass('px-3');
	});

	it('uses white text on dark backgrounds', () => {
		const category = createCategory({ name: 'Dark', color: '#1F2937' });
		const { container } = render(CategoryBadge, { props: { category } });

		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveStyle({ color: '#ffffff' });
	});

	it('uses dark text on light backgrounds', () => {
		const category = createCategory({ name: 'Light', color: '#F3F4F6' });
		const { container } = render(CategoryBadge, { props: { category } });

		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveStyle({ color: '#374151' });
	});

	it('uses dark text on medium brightness backgrounds', () => {
		const category = createCategory({ name: 'Blue', color: '#60A5FA' });
		const { container } = render(CategoryBadge, { props: { category } });

		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveStyle({ color: '#374151' });
	});

	it('handles colors without # prefix', () => {
		const category = createCategory({ name: 'Red', color: 'EF4444' });
		const { container } = render(CategoryBadge, { props: { category } });

		const badge = container.querySelector('[data-slot="badge"]');
		// Should still apply background color
		expect(badge).toHaveStyle({ backgroundColor: 'EF4444' });
	});
});
