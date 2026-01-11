import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { installMockFetch, resetMocks } from './helpers/mockFetch';

// Install mock fetch before each test
beforeEach(() => {
	installMockFetch();
});

// Cleanup after each test
afterEach(() => {
	cleanup();
	resetMocks();
});

// Mock SvelteKit environment modules
vi.mock('$env/dynamic/public', () => ({
	env: {
		VITE_API_BASE_URL: 'http://localhost:8000'
	}
}));

// Mock DevOverlay component registry to eliminate console warnings
vi.mock('$lib/dev/componentRegistry.svelte', () => ({
	createComponentStack: () => {},
	registerComponent: () => () => {},
	getComponentStack: () => null,
	getComponentCounts: (stack: { components: Array<{ name: string }> }) => {
		const counts = new Map<string, number>();
		stack.components.forEach((c) => {
			counts.set(c.name, (counts.get(c.name) || 0) + 1);
		});
		return counts;
	},
	formatComponentPath: (stack: { components: Array<{ name: string }> }) => {
		return stack.components.map((c) => c.name).join(' → ');
	},
	getComponentType: (name: string) => {
		if (name.includes('+page')) return 'route';
		if (name.includes('+layout')) return 'layout';
		return 'component';
	},
	trackMountTime: () => {}
}));
