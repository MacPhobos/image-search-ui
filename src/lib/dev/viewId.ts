/**
 * DEV-ONLY: View ID tracking for DevOverlay.
 *
 * Provides a lightweight mechanism to track the current "view" (layout/page)
 * through the component tree. Useful for debugging and development.
 *
 * Usage in layouts/pages:
 *   import { setViewId } from '$lib/dev/viewId';
 *   setViewId('layout:/');
 *   setViewId('page:/photos/[id]');
 *
 * In DevOverlay:
 *   import { viewIdBreadcrumb } from '$lib/dev/viewId';
 *   $viewIdBreadcrumb // ['layout:/', 'page:/photos/[id]']
 */

import { writable, derived } from 'svelte/store';

/**
 * Internal store tracking all view IDs in the current stack.
 */
const viewIdStack = writable<string[]>([]);

/**
 * Readable store of the current view ID breadcrumb.
 */
export const viewIdBreadcrumb = derived(viewIdStack, ($stack) => $stack);

/**
 * Get the current top-level view ID.
 */
export const currentViewId = derived(viewIdStack, ($stack) =>
	$stack.length > 0 ? $stack[$stack.length - 1] : null
);

/**
 * Set a view ID, adding it to the breadcrumb stack.
 * Call this from layouts and pages during initialization.
 *
 * Returns an unsubscribe function to remove the ID when the component unmounts.
 *
 * @param id - View identifier (e.g., 'layout:/', 'page:/photos/[id]')
 * @returns Cleanup function to remove the view ID
 *
 * @example
 * // In +layout.svelte or +page.svelte
 * import { onMount } from 'svelte';
 * import { setViewId } from '$lib/dev/viewId';
 *
 * onMount(() => {
 *   if (import.meta.env.DEV) {
 *     return setViewId('page:/photos/[id]');
 *   }
 * });
 */
export function setViewId(id: string): () => void {
	viewIdStack.update((stack) => [...stack, id]);

	return () => {
		viewIdStack.update((stack) => {
			const index = stack.lastIndexOf(id);
			if (index !== -1) {
				return [...stack.slice(0, index), ...stack.slice(index + 1)];
			}
			return stack;
		});
	};
}

/**
 * Clear all view IDs. Useful for testing or route transitions.
 */
export function clearViewIds(): void {
	viewIdStack.set([]);
}

/**
 * Get a formatted breadcrumb string.
 */
export const viewIdString = derived(viewIdStack, ($stack) => $stack.join(' > '));
