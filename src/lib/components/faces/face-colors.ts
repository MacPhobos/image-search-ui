/**
 * Shared face color palette and utilities.
 * Used by components that display face bounding boxes and face lists.
 */

/** 10-color palette for distinguishing faces in images */
export const FACE_COLORS = [
	'#3b82f6', // Blue
	'#22c55e', // Green
	'#f59e0b', // Amber
	'#ef4444', // Red
	'#8b5cf6', // Purple
	'#ec4899', // Pink
	'#14b8a6', // Teal
	'#f97316', // Orange
	'#06b6d4', // Cyan
	'#84cc16' // Lime
] as const;

export type FaceColor = (typeof FACE_COLORS)[number];

/**
 * Get a consistent color for a face based on its index in the face list.
 * Colors cycle through the palette for images with more than 10 faces.
 */
export function getFaceColorByIndex(index: number): FaceColor {
	return FACE_COLORS[index % FACE_COLORS.length];
}
