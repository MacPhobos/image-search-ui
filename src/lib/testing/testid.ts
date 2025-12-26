/**
 * Test ID helper utilities for consistent data-testid attributes.
 *
 * Convention:
 * - Base IDs use kebab-case (feature/component name)
 * - Sub-elements use double underscore separator (__)
 * - Element types use common suffixes (-btn, -input, -list, etc.)
 *
 * Examples:
 *   tid('search-bar') -> 'search-bar'
 *   tid('search-bar', 'input') -> 'search-bar__input'
 *   tid('search-bar', 'btn-submit') -> 'search-bar__btn-submit'
 *   tid('modal', 'category-create') -> 'modal__category-create'
 */

/**
 * Normalize a string to be safe for use as a test ID.
 * - Converts to lowercase
 * - Replaces spaces and underscores with hyphens
 * - Removes invalid characters
 * - Collapses multiple hyphens
 */
function normalize(str: string): string {
	return str
		.toLowerCase()
		.replace(/[\s_]+/g, '-') // spaces and underscores to hyphens
		.replace(/[^a-z0-9-]/g, '') // remove invalid chars
		.replace(/-+/g, '-') // collapse multiple hyphens
		.replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}

/**
 * Generate a normalized test ID from base and optional suffix segments.
 *
 * @param base - The base identifier (component/feature name)
 * @param segments - Optional suffix segments to append with '__' separator
 * @returns Normalized test ID string
 *
 * @example
 * tid('search-bar') // 'search-bar'
 * tid('search-bar', 'input') // 'search-bar__input'
 * tid('search-bar', 'btn', 'submit') // 'search-bar__btn__submit'
 * tid('Photo Detail', 'header') // 'photo-detail__header'
 */
export function tid(base: string, ...segments: string[]): string {
	const normalizedBase = normalize(base);

	if (segments.length === 0) {
		return normalizedBase;
	}

	const normalizedSegments = segments.map(normalize).filter((s) => s.length > 0);

	if (normalizedSegments.length === 0) {
		return normalizedBase;
	}

	return `${normalizedBase}__${normalizedSegments.join('__')}`;
}

/**
 * Common test ID suffixes for consistent naming.
 */
export const TID_SUFFIXES = {
	// Buttons
	BTN_SUBMIT: 'btn-submit',
	BTN_CANCEL: 'btn-cancel',
	BTN_CLOSE: 'btn-close',
	BTN_DELETE: 'btn-delete',
	BTN_EDIT: 'btn-edit',
	BTN_ADD: 'btn-add',
	BTN_SEARCH: 'btn-search',
	BTN_CLEAR: 'btn-clear',

	// Inputs
	INPUT: 'input',
	INPUT_QUERY: 'input-query',
	INPUT_NAME: 'input-name',
	INPUT_EMAIL: 'input-email',

	// Containers
	LIST: 'list',
	GRID: 'grid',
	ITEM: 'item',
	CARD: 'card',
	HEADER: 'header',
	BODY: 'body',
	FOOTER: 'footer',

	// States
	LOADING: 'loading',
	EMPTY: 'empty',
	ERROR: 'error',

	// Modal/Dialog
	DIALOG: 'dialog',
	OVERLAY: 'overlay'
} as const;

/**
 * Type for common suffixes to enable autocomplete.
 */
export type TidSuffix = (typeof TID_SUFFIXES)[keyof typeof TID_SUFFIXES];

/**
 * Helper to create an object with data-testid attribute.
 * Useful when spreading attributes.
 *
 * @param base - The base identifier
 * @param segments - Optional suffix segments
 * @returns Object with data-testid property
 *
 * @example
 * <div {...testIdAttr('search-bar')}>
 * // Results in: <div data-testid="search-bar">
 */
export function testIdAttr(base: string, ...segments: string[]): { 'data-testid': string } {
	return { 'data-testid': tid(base, ...segments) };
}

/**
 * Merge test ID with other attributes for spreading.
 *
 * @param testId - Test ID object from testIdAttr() or raw string
 * @param attrs - Additional attributes to merge
 * @returns Merged attributes object
 *
 * @example
 * <input {...mergeAttrs(testIdAttr('search', 'input'), { class: 'foo', disabled: true })}>
 */
export function mergeAttrs(
	testId: { 'data-testid': string } | string,
	attrs: Record<string, unknown> = {}
): Record<string, unknown> {
	const testIdObj = typeof testId === 'string' ? { 'data-testid': testId } : testId;
	return { ...testIdObj, ...attrs };
}

/**
 * Create a scoped test ID generator for a component.
 * Returns a function that auto-prefixes all IDs with the component name.
 *
 * @param componentBase - Base name for the component
 * @returns Scoped tid function
 *
 * @example
 * const tid = scopedTid('search-bar');
 * tid() // 'search-bar'
 * tid('input') // 'search-bar__input'
 * tid('btn', 'submit') // 'search-bar__btn__submit'
 */
export function scopedTid(componentBase: string): (...segments: string[]) => string {
	const normalizedBase = normalize(componentBase);
	return (...segments: string[]) => {
		if (segments.length === 0) {
			return normalizedBase;
		}
		return tid(normalizedBase, ...segments);
	};
}
