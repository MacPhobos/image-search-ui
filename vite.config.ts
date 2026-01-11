import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';
import tailwindcss from '@tailwindcss/vite';
import { vitePluginComponentTracking } from './src/lib/dev/autoTrack';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		svelteTesting(),
		// Component tracking plugin (dev only)
		vitePluginComponentTracking({
			exclude: [
				'**/node_modules/**',
				'**/*.test.svelte',
				'**/*.spec.svelte',
				'**/DevOverlay.svelte',
				'**/ComponentTree.svelte'
			]
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['src/tests/setup.ts']
	},
	server: {
		allowedHosts: ['hyperion']
	}
});
