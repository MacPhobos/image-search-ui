import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DriveStatusBadge from '$lib/components/gdrive/DriveStatusBadge.svelte';
import { createDriveHealth, createDriveHealthDisconnected } from '../../helpers/fixtures';

describe('DriveStatusBadge', () => {
	it('shows Connected when Drive health is connected', () => {
		const status = createDriveHealth();
		render(DriveStatusBadge, { props: { status } });

		expect(screen.getByText('Connected')).toBeInTheDocument();
	});

	it('shows Not Configured when Drive health is disconnected', () => {
		const status = createDriveHealthDisconnected();
		render(DriveStatusBadge, { props: { status } });

		expect(screen.getByText('Not Configured')).toBeInTheDocument();
	});

	it('shows Not Configured when status is null', () => {
		render(DriveStatusBadge, { props: { status: null } });

		expect(screen.getByText('Not Configured')).toBeInTheDocument();
	});

	it('hides label in compact mode', () => {
		const status = createDriveHealth();
		render(DriveStatusBadge, { props: { status, compact: true } });

		expect(screen.queryByText('Connected')).not.toBeInTheDocument();
	});

	it('renders green dot for connected status', () => {
		const status = createDriveHealth();
		const { container } = render(DriveStatusBadge, { props: { status } });

		const dot = container.querySelector('.bg-green-500');
		expect(dot).toBeInTheDocument();
	});

	it('renders gray dot for disconnected status', () => {
		const status = createDriveHealthDisconnected();
		const { container } = render(DriveStatusBadge, { props: { status } });

		const dot = container.querySelector('.bg-gray-400');
		expect(dot).toBeInTheDocument();
	});
});
