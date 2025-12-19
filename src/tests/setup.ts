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
