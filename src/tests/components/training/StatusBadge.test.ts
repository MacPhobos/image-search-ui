import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatusBadge from '$lib/components/training/StatusBadge.svelte';

describe('StatusBadge', () => {
	it('renders pending status correctly', () => {
		render(StatusBadge, { props: { status: 'pending' } });
		expect(screen.getByText('Pending')).toBeInTheDocument();
	});

	it('renders running status correctly', () => {
		render(StatusBadge, { props: { status: 'running' } });
		expect(screen.getByText('Running')).toBeInTheDocument();
	});

	it('renders completed status correctly', () => {
		render(StatusBadge, { props: { status: 'completed' } });
		expect(screen.getByText('Completed')).toBeInTheDocument();
	});

	it('renders failed status correctly', () => {
		render(StatusBadge, { props: { status: 'failed' } });
		expect(screen.getByText('Failed')).toBeInTheDocument();
	});

	it('renders skipped status correctly', () => {
		render(StatusBadge, { props: { status: 'skipped' } });
		expect(screen.getByText('Skipped')).toBeInTheDocument();
	});

	it('renders paused status correctly', () => {
		render(StatusBadge, { props: { status: 'paused' } });
		expect(screen.getByText('Paused')).toBeInTheDocument();
	});

	it('renders cancelled status correctly', () => {
		render(StatusBadge, { props: { status: 'cancelled' } });
		expect(screen.getByText('Cancelled')).toBeInTheDocument();
	});

	it('falls back to status value for unknown statuses', () => {
		render(StatusBadge, { props: { status: 'unknown' } });
		expect(screen.getByText('unknown')).toBeInTheDocument();
	});

	it('applies small size when specified', () => {
		const { container } = render(StatusBadge, { props: { status: 'pending', size: 'sm' } });
		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveClass('text-xs');
	});

	it('applies large size when specified', () => {
		const { container } = render(StatusBadge, { props: { status: 'pending', size: 'lg' } });
		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveClass('text-base');
	});
});
