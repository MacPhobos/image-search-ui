import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn() - Utility function for merging Tailwind CSS classes
 *
 * Combines clsx (conditional classes) with tailwind-merge (deduplication)
 * to provide an optimal class merging solution for shadcn-svelte components.
 *
 * @param inputs - Class values to merge
 * @returns Merged and deduplicated class string
 *
 * @example
 * cn('px-2 py-1', condition && 'bg-blue-500')
 * cn('px-2', 'px-4') // Returns 'px-4' (rightmost wins)
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * WithElementRef - Type helper for components that expose element refs
 *
 * Used by shadcn-svelte components to type-safely expose DOM element references
 */
export type WithElementRef<T> = T & {
	ref?: HTMLElement | null;
};
