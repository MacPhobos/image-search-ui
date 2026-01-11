/**
 * Component Registry for DevOverlay
 *
 * Tracks active Svelte components in development mode.
 * Used to display component hierarchy in the DevOverlay.
 *
 * All code is wrapped in DEV guards - zero production overhead.
 */

import { getContext, setContext } from 'svelte';

/**
 * Information about a registered component
 */
export interface ComponentInfo {
	/** Component name (e.g., "SearchPage", "+page", "routes/search/+page") */
	name: string;
	/** Unique instance ID */
	id: string;
	/** Timestamp when component was mounted */
	mountedAt: number;
	/** Optional: component props (for debugging) */
	props?: Record<string, unknown>;
	/** Optional: source file path */
	filePath?: string;
}

/**
 * Stack of currently mounted components
 */
export interface ComponentStack {
	components: ComponentInfo[];
	lastUpdate: number;
}

/**
 * Options for registering a component
 */
export interface RegisterOptions {
	/** Source file path */
	filePath?: string;
	/** Component props (for debugging) */
	props?: Record<string, unknown>;
	/** Custom metadata */
	customData?: Record<string, unknown>;
}

const CONTEXT_KEY = 'dev:component-stack';
let idCounter = 0;

/**
 * Create and initialize the component stack
 * Should be called once in root +layout.svelte
 */
export function createComponentStack(): ComponentStack | null {
	if (!import.meta.env.DEV) return null;

	const stack: ComponentStack = $state({
		components: [],
		lastUpdate: Date.now()
	});

	setContext(CONTEXT_KEY, stack);
	return stack;
}

/**
 * Register a component with the tracking system
 * Automatically called by Vite plugin in dev mode
 *
 * @param name Component name or identifier
 * @param options Additional component metadata
 * @returns Cleanup function to call on unmount
 */
export function registerComponent(
	name: string,
	options: RegisterOptions = {}
): () => void {
	if (!import.meta.env.DEV) return () => {};

	const stack = getContext<ComponentStack>(CONTEXT_KEY);
	if (!stack) {
		console.warn('[ComponentRegistry] No component stack found. Did you call createComponentStack() in root layout?');
		return () => {};
	}

	const component: ComponentInfo = {
		name,
		id: `${name}-${++idCounter}`,
		mountedAt: Date.now(),
		filePath: options.filePath,
		props: options.props
	};

	// Add to stack
	stack.components.push(component);
	stack.lastUpdate = Date.now();

	// Return cleanup function
	return () => {
		if (!import.meta.env.DEV) return;

		const index = stack.components.findIndex((c) => c.id === component.id);
		if (index !== -1) {
			stack.components.splice(index, 1);
			stack.lastUpdate = Date.now();
		}
	};
}

/**
 * Get the current component stack (reactive)
 *
 * @returns Component stack or null if not initialized
 */
export function getComponentStack(): ComponentStack | null {
	if (!import.meta.env.DEV) return null;

	try {
		return getContext<ComponentStack>(CONTEXT_KEY);
	} catch {
		return null;
	}
}

/**
 * Get unique component counts
 */
export function getComponentCounts(stack: ComponentStack): Map<string, number> {
	const counts = new Map<string, number>();
	stack.components.forEach((c) => {
		counts.set(c.name, (counts.get(c.name) || 0) + 1);
	});
	return counts;
}

/**
 * Format component stack as breadcrumb path
 */
export function formatComponentPath(stack: ComponentStack): string {
	return stack.components.map((c) => c.name).join(' → ');
}

/**
 * Get component type from name
 */
export function getComponentType(name: string): 'route' | 'layout' | 'component' {
	if (name.includes('+page')) return 'route';
	if (name.includes('+layout')) return 'layout';
	return 'component';
}
