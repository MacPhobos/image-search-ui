import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';
import tailwindcss from '@tailwindcss/vite';
// Component tracking disabled - Vite plugin approach incompatible with Svelte 5 compiler
// import { vitePluginComponentTracking } from './src/lib/dev/autoTrack';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		svelteTesting()
		// Component tracking plugin disabled - causes SSR parsing errors
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
