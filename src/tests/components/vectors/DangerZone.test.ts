import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DangerZone from '$lib/components/vectors/DangerZone.svelte';

describe('DangerZone', () => {
	it('renders danger zone header with warning', () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
		expect(
			screen.getByText(/these actions are destructive and cannot be undone/i)
		).toBeInTheDocument();
	});

	it('renders cleanup orphans section', () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		expect(screen.getByText(/cleanup orphan vectors/i)).toBeInTheDocument();
		expect(
			screen.getByText(/remove vectors that no longer have corresponding database records/i)
		).toBeInTheDocument();
	});

	it('renders reset collection section', () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		expect(screen.getByText(/reset all vectors/i)).toBeInTheDocument();
		expect(
			screen.getByText(/delete all vectors from the collection/i)
		).toBeInTheDocument();
	});

	it('shows orphan cleanup details list', () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		expect(screen.getByText(/identifies vectors without matching assets/i)).toBeInTheDocument();
		expect(screen.getByText(/helps maintain data consistency/i)).toBeInTheDocument();
		expect(screen.getByText(/safe operation - only removes orphaned data/i)).toBeInTheDocument();
	});

	it('shows reset collection details list', () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		expect(screen.getByText(/deletes entire vector collection/i)).toBeInTheDocument();
		expect(screen.getByText(/requires confirmation text input/i)).toBeInTheDocument();
		expect(screen.getByText(/use when rebuilding from scratch/i)).toBeInTheDocument();
	});

	it('renders cleanup orphans button', () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		const button = screen.getByRole('button', { name: /cleanup orphans/i });
		expect(button).toBeInTheDocument();
	});

	it('renders reset collection button', () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		const button = screen.getByRole('button', { name: /reset collection/i });
		expect(button).toBeInTheDocument();
	});

	it('calls onOrphanCleanup callback when cleanup button clicked', async () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		const button = screen.getByRole('button', { name: /cleanup orphans/i });
		await fireEvent.click(button);

		expect(onOrphanCleanup).toHaveBeenCalledTimes(1);
		expect(onFullReset).not.toHaveBeenCalled();
	});

	it('calls onFullReset callback when reset button clicked', async () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		const button = screen.getByRole('button', { name: /reset collection/i });
		await fireEvent.click(button);

		expect(onFullReset).toHaveBeenCalledTimes(1);
		expect(onOrphanCleanup).not.toHaveBeenCalled();
	});

	it('renders both buttons independently clickable', async () => {
		const onOrphanCleanup = vi.fn();
		const onFullReset = vi.fn();
		render(DangerZone, { props: { onOrphanCleanup, onFullReset } });

		const cleanupButton = screen.getByRole('button', { name: /cleanup orphans/i });
		const resetButton = screen.getByRole('button', { name: /reset collection/i });

		await fireEvent.click(cleanupButton);
		expect(onOrphanCleanup).toHaveBeenCalledTimes(1);

		await fireEvent.click(resetButton);
		expect(onFullReset).toHaveBeenCalledTimes(1);

		expect(onOrphanCleanup).toHaveBeenCalledTimes(1);
		expect(onFullReset).toHaveBeenCalledTimes(1);
	});
});
