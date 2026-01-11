/**
 * Vite Plugin for Automatic Component Tracking
 *
 * Automatically injects component registration code into .svelte files during development.
 * Provides zero-boilerplate tracking for all components.
 *
 * DEV-ONLY: This plugin only runs in development mode.
 */

import type { Plugin } from 'vite';
import MagicString from 'magic-string';
import micromatch from 'micromatch';

/**
 * Configuration options for component tracking plugin
 */
export interface ComponentTrackingOptions {
	/** File patterns to include (default: all .svelte files) */
	include?: string[];
	/** File patterns to exclude (default: node_modules, DevOverlay, ComponentTree) */
	exclude?: string[];
	/** Function to extract component name from file path */
	nameExtractor?: (filePath: string) => string;
	/** Enable/disable the plugin (default: true in dev, false in prod) */
	enabled?: boolean;
}

/**
 * Default name extractor: converts file path to component name
 * Examples:
 *   src/routes/search/+page.svelte → routes/search/+page
 *   src/lib/components/SearchBox.svelte → components/SearchBox
 */
function defaultNameExtractor(filePath: string): string {
	return filePath
		.replace(/^.*\/src\//, '') // Remove everything before src/
		.replace(/\.svelte$/, ''); // Remove .svelte extension
}

/**
 * Check if file should be excluded from tracking
 */
function shouldExclude(
	filePath: string,
	include: string[],
	exclude: string[]
): boolean {
	// Normalize path for matching
	const normalizedPath = filePath.replace(/\\/g, '/');

	// Check exclude patterns first
	if (exclude.length > 0 && micromatch.isMatch(normalizedPath, exclude)) {
		return true;
	}

	// Check include patterns if specified
	if (include.length > 0 && !micromatch.isMatch(normalizedPath, include)) {
		return true;
	}

	return false;
}

/**
 * Generate tracking code to inject into component
 */
function getTrackingCode(componentName: string, filePath: string): string {
	// Escape quotes in component name and file path
	const safeName = componentName.replace(/'/g, "\\'");
	const safePath = filePath.replace(/'/g, "\\'");

	// IMPORTANT: getContext must be called synchronously during component initialization,
	// NOT inside onMount. So we get the stack first, then register in onMount.
	return `// Auto-generated component tracking (dev only)
import { onMount } from 'svelte';
import { getComponentStack, type ComponentStack } from '$lib/dev/componentRegistry.svelte';

if (import.meta.env.DEV) {
	// Get context synchronously during component init
	const __devStack = getComponentStack();
	if (__devStack) {
		const __devId = '${safeName}-' + Date.now();
		const __devComponent = {
			name: '${safeName}',
			id: __devId,
			mountedAt: Date.now(),
			filePath: '${safePath}'
		};
		__devStack.components.push(__devComponent);
		__devStack.lastUpdate = Date.now();

		onMount(() => {
			// Cleanup on unmount
			return () => {
				const idx = __devStack.components.findIndex(c => c.id === __devId);
				if (idx !== -1) {
					__devStack.components.splice(idx, 1);
					__devStack.lastUpdate = Date.now();
				}
			};
		});
	}
}`;
}

/**
 * Inject tracking code into .svelte file
 */
function injectTrackingCode(
	s: MagicString,
	code: string,
	componentName: string,
	filePath: string
): void {
	const trackingCode = getTrackingCode(componentName, filePath);

	// Check if already has tracking code (avoid double injection)
	if (code.includes('getComponentStack')) {
		return;
	}

	// Find script blocks
	const moduleScriptMatch = code.match(/<script\s+context="module"[^>]*>/);
	const instanceScriptMatch = code.match(/<script(?:\s+lang="ts")?(?:\s+lang="typescript")?\s*>/);

	if (instanceScriptMatch) {
		// Instance script exists - inject at the beginning
		const scriptStart = instanceScriptMatch.index! + instanceScriptMatch[0].length;
		s.appendLeft(scriptStart, '\n' + trackingCode + '\n');
	} else if (moduleScriptMatch) {
		// Only module script exists - add instance script after it
		const moduleEndMatch = code.match(/<\/script>/);
		if (moduleEndMatch) {
			const insertPos = moduleEndMatch.index! + moduleEndMatch[0].length;
			s.appendLeft(insertPos, `\n\n<script>\n${trackingCode}\n</script>`);
		}
	} else {
		// No script block - create one at the beginning
		s.prepend(`<script>\n${trackingCode}\n</script>\n\n`);
	}
}

/**
 * Vite plugin for automatic component tracking
 *
 * Usage in vite.config.ts:
 * Import and add to plugins array with exclude patterns
 */
export function vitePluginComponentTracking(
	options: ComponentTrackingOptions = {}
): Plugin {
	const {
		include = ['src/**/*.svelte'],
		exclude = [
			'**/node_modules/**',
			'**/*.test.svelte',
			'**/*.spec.svelte',
			'**/DevOverlay.svelte',
			'**/ComponentTree.svelte'
		],
		nameExtractor = defaultNameExtractor,
		enabled = true
	} = options;

	return {
		name: 'vite-plugin-component-tracking',
		enforce: 'pre', // Run before other transformations

		transform(code: string, id: string) {
			// Only in dev mode
			if (!enabled || process.env.NODE_ENV === 'production') {
				return null;
			}

			// Only for .svelte files
			if (!id.endsWith('.svelte')) {
				return null;
			}

			// Check include/exclude patterns
			if (shouldExclude(id, include, exclude)) {
				return null;
			}

			try {
				// Extract component name
				const componentName = nameExtractor(id);

				// Create MagicString for efficient transformation
				const s = new MagicString(code);

				// Inject tracking code
				injectTrackingCode(s, code, componentName, id);

				// Return transformed code with source map
				return {
					code: s.toString(),
					map: s.generateMap({ hires: true })
				};
			} catch (error) {
				// Log error but don't break build
				console.error(`[ComponentTracking] Error processing ${id}:`, error);
				return null;
			}
		}
	};
}
