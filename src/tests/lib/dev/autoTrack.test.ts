import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vitePluginComponentTracking } from '$lib/dev/autoTrack';

// Save original NODE_ENV
const originalEnv = process.env.NODE_ENV;

describe('vitePluginComponentTracking', () => {
	beforeEach(() => {
		// Reset to development mode
		process.env.NODE_ENV = 'development';
	});

	afterEach(() => {
		// Restore original NODE_ENV
		process.env.NODE_ENV = originalEnv;
	});

	describe('plugin configuration', () => {
		it('should create plugin with default options', () => {
			const plugin = vitePluginComponentTracking();
			expect(plugin.name).toBe('vite-plugin-component-tracking');
			expect(plugin.enforce).toBe('pre');
		});

		it('should accept custom options', () => {
			const plugin = vitePluginComponentTracking({
				exclude: ['**/custom.svelte'],
				nameExtractor: (path) => 'custom-name'
			});
			expect(plugin).toBeDefined();
		});
	});

	describe('transform', () => {
		it('should inject tracking code into component with script block', () => {
			const input = `<script lang="ts">
  let count = 0;
</script>

<button>Click</button>`;

			const plugin = vitePluginComponentTracking();
			const result = plugin.transform?.(input, '/project/src/routes/test.svelte');

			expect(result).toBeDefined();
			if (result && typeof result === 'object') {
				expect(result.code).toContain('__devGetStack');
				expect(result.code).toContain('__devOnMount');
				expect(result.code).toContain('import.meta.env.DEV');
			}
		});

		it('should create script block if none exists', () => {
			const input = `<button>Click</button>`;

			const plugin = vitePluginComponentTracking();
			const result = plugin.transform?.(input, '/project/src/routes/test.svelte');

			expect(result).toBeDefined();
			if (result && typeof result === 'object') {
				expect(result.code).toContain('<script>');
				expect(result.code).toContain('__devGetStack');
			}
		});

		it('should handle module context script', () => {
			const input = `<script context="module">
  export const prerender = true;
</script>

<button>Click</button>`;

			const plugin = vitePluginComponentTracking();
			const result = plugin.transform?.(input, '/project/src/routes/test.svelte');

			expect(result).toBeDefined();
			if (result && typeof result === 'object') {
				// Should add instance script after module script
				expect(result.code).toMatch(/<script>\s*\/\/ Auto-generated/);
			}
		});

		it('should respect exclude patterns', () => {
			const plugin = vitePluginComponentTracking({
				exclude: ['**/DevOverlay.svelte']
			});

			const result = plugin.transform?.(
				'<button>Click</button>',
				'/project/src/lib/dev/DevOverlay.svelte'
			);

			expect(result).toBeNull();
		});

		it('should skip non-svelte files', () => {
			const plugin = vitePluginComponentTracking();
			const result = plugin.transform?.('const x = 1;', '/project/src/lib/utils.ts');
			expect(result).toBeNull();
		});

		it('should skip in production mode', () => {
			process.env.NODE_ENV = 'production';

			const plugin = vitePluginComponentTracking();
			const result = plugin.transform?.(
				'<button>Click</button>',
				'/project/src/routes/test.svelte'
			);

			expect(result).toBeNull();
		});

		it('should extract component name from file path', () => {
			const plugin = vitePluginComponentTracking({
				nameExtractor: (path) => path.replace(/^.*\//, '').replace(/\.svelte$/, '')
			});

			const result = plugin.transform?.(
				'<button>Click</button>',
				'/project/src/routes/search/+page.svelte'
			);

			expect(result).toBeDefined();
			if (result && typeof result === 'object') {
				expect(result.code).toContain("'+page'");
			}
		});

		it('should not double-inject if tracking code already exists', () => {
			const input = `<script>
import { getComponentStack } from '$lib/dev/componentRegistry.svelte';
</script>

<button>Click</button>`;

			const plugin = vitePluginComponentTracking();
			const result = plugin.transform?.(input, '/project/src/routes/test.svelte');

			// Should return null (not inject again because componentRegistry is already imported)
			expect(result).toBeNull();
		});

		it('should return null for source map (simplified implementation)', () => {
			const input = `<script lang="ts">
  let count = 0;
</script>

<button>Click</button>`;

			const plugin = vitePluginComponentTracking();
			const result = plugin.transform?.(input, '/project/src/routes/test.svelte');

			expect(result).toBeDefined();
			if (result && typeof result === 'object') {
				// Simplified implementation returns null for map
				expect(result.map).toBeNull();
			}
		});
	});

	describe('error handling', () => {
		it('should handle malformed svelte files gracefully', () => {
			const input = `<script>
  broken syntax {{{
</script>`;

			const plugin = vitePluginComponentTracking();

			// Should not throw, just return null or handle gracefully
			expect(() => {
				plugin.transform?.(input, '/project/src/routes/broken.svelte');
			}).not.toThrow();
		});
	});
});
