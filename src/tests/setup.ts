import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock SvelteKit environment modules
vi.mock('$env/dynamic/public', () => ({
	env: {
		VITE_API_BASE_URL: 'http://localhost:8000'
	}
}));
