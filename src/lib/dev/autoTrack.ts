/**
 * Vite Plugin for Automatic Component Tracking
 *
 * Automatically injects component registration code into .svelte files during development.
 * Provides zero-boilerplate tracking for all components.
 *
 * DEV-ONLY: This plugin only runs in development mode.
 */

import type { Plugin } from 'vite';
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
	// Normalize path for matching (convert backslashes on Windows)
	const normalizedPath = filePath.replace(/\\/g, '/');

	// Check exclude patterns - these use ** so they work with absolute paths
	if (exclude.length > 0 && micromatch.isMatch(normalizedPath, exclude)) {
		return true;
	}

	// For include patterns, we need to match the relative part of the path
	// Vite passes absolute paths like /project/src/routes/page.svelte
	// but include patterns are relative like src/**/*.svelte
	if (include.length > 0) {
		// Try both absolute match and matching against the path suffix
		const isIncluded = include.some((pattern) => {
			// First try direct match (for absolute patterns)
			if (micromatch.isMatch(normalizedPath, pattern)) {
				return true;
			}
			// Then try matching with ** prefix (to handle absolute paths with relative patterns)
			if (micromatch.isMatch(normalizedPath, '**/' + pattern)) {
				return true;
			}
			return false;
		});

		if (!isIncluded) {
			return true;
		}
	}

	return false;
}

/**
 * Generate tracking code to inject into component
 */
function getTrackingCode(componentName: string, filePath: string): string {
	// Escape quotes in component name and file path
	const safeName = componentName.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
	const safePath = filePath.replace(/'/g, "\\'").replace(/\\/g, '\\\\');

	// IMPORTANT: getContext must be called synchronously during component initialization,
	// NOT inside onMount. So we get the stack first, then use onMount for cleanup.
	return `
	// Auto-generated component tracking (dev only)
	import { onMount as __devOnMount } from 'svelte';
	import { getComponentStack as __devGetStack } from '$lib/dev/componentRegistry.svelte';

	if (import.meta.env.DEV) {
		const __devStack = __devGetStack();
		if (__devStack) {
			const __devId = '${safeName}-' + Date.now();
			__devStack.components.push({
				name: '${safeName}',
				id: __devId,
				mountedAt: Date.now(),
				filePath: '${safePath}'
			});
			__devStack.lastUpdate = Date.now();
			__devOnMount(() => () => {
				const idx = __devStack.components.findIndex(c => c.id === __devId);
				if (idx !== -1) {
					__devStack.components.splice(idx, 1);
					__devStack.lastUpdate = Date.now();
				}
			});
		}
	}
`;
}

/**
 * Inject tracking code into .svelte file using simple string manipulation
 */
function injectTrackingCode(code: string, componentName: string, filePath: string): string | null {
	// Check if already has tracking code or componentRegistry import (avoid double injection)
	if (code.includes('componentRegistry') || code.includes('__devGetStack')) {
		return null;
	}

	const trackingCode = getTrackingCode(componentName, filePath);

	// Find instance script tag (not module script)
	// Match <script>, <script lang="ts">, <script lang="typescript">
	const instanceScriptRegex = /<script(?:\s+lang=["'](?:ts|typescript)["'])?\s*>/;
	const moduleScriptRegex = /<script\s+context=["']module["'][^>]*>/;

	const instanceMatch = code.match(instanceScriptRegex);
	const moduleMatch = code.match(moduleScriptRegex);

	// Make sure we're not matching the module script
	if (instanceMatch) {
		// Check if this match is actually the module script
		if (moduleMatch && moduleMatch.index !== undefined && instanceMatch.index !== undefined) {
			if (moduleMatch.index === instanceMatch.index) {
				// The instance regex matched the module script, need to find the real instance script
				// Look for another script tag after the module script
				const afterModule = code.substring(moduleMatch.index + moduleMatch[0].length);
				const secondScriptMatch = afterModule.match(instanceScriptRegex);

				if (secondScriptMatch && secondScriptMatch.index !== undefined) {
					// Found instance script after module script
					const insertPos = moduleMatch.index + moduleMatch[0].length + secondScriptMatch.index + secondScriptMatch[0].length;
					return code.substring(0, insertPos) + trackingCode + code.substring(insertPos);
				} else {
					// Only module script, need to add instance script
					const moduleEndMatch = afterModule.match(/<\/script>/);
					if (moduleEndMatch && moduleEndMatch.index !== undefined) {
						const insertPos = moduleMatch.index + moduleMatch[0].length + moduleEndMatch.index + moduleEndMatch[0].length;
						return code.substring(0, insertPos) + `\n\n<script>${trackingCode}</script>` + code.substring(insertPos);
					}
				}
				return null;
			}
		}

		// Normal case: instance script found
		const insertPos = instanceMatch.index! + instanceMatch[0].length;
		return code.substring(0, insertPos) + trackingCode + code.substring(insertPos);
	} else if (moduleMatch) {
		// Only module script exists - add instance script after it
		const afterModule = code.substring(moduleMatch.index! + moduleMatch[0].length);
		const moduleEndMatch = afterModule.match(/<\/script>/);
		if (moduleEndMatch && moduleEndMatch.index !== undefined) {
			const insertPos = moduleMatch.index! + moduleMatch[0].length + moduleEndMatch.index + moduleEndMatch[0].length;
			return code.substring(0, insertPos) + `\n\n<script>${trackingCode}</script>` + code.substring(insertPos);
		}
	} else {
		// No script block - create one at the beginning
		return `<script>${trackingCode}</script>\n\n` + code;
	}

	return null;
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

				// Inject tracking code using simple string manipulation
				const transformedCode = injectTrackingCode(code, componentName, id);

				if (transformedCode) {
					return {
						code: transformedCode,
						map: null // No source map for simplicity
					};
				}

				return null;
			} catch (error) {
				// Log error but don't break build
				console.error(`[ComponentTracking] Error processing ${id}:`, error);
				return null;
			}
		}
	};
}
