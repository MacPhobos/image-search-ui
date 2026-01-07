<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { Category } from '$lib/api/categories';

	interface Props {
		category: Category;
		size?: 'small' | 'medium';
	}

	let { category, size = 'small' }: Props = $props();

	/**
	 * Calculate text color based on background for contrast.
	 * Uses relative luminance formula (WCAG 2.0).
	 */
	function getContrastColor(hexColor: string | null | undefined): string {
		if (!hexColor) return '#374151'; // Default gray

		// Remove # if present
		const hex = hexColor.replace('#', '');

		// Parse RGB
		const r = parseInt(hex.substring(0, 2), 16) / 255;
		const g = parseInt(hex.substring(2, 4), 16) / 255;
		const b = parseInt(hex.substring(4, 6), 16) / 255;

		// Calculate relative luminance
		const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

		// Return white for dark backgrounds, dark gray for light backgrounds
		return luminance > 0.5 ? '#374151' : '#ffffff';
	}

	// Derived values that react to category changes
	const sizeClass = $derived(size === 'small' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1');
	const bgColor = $derived(category.color ?? '#E5E7EB');
	const textColor = $derived.by(() => getContrastColor(category.color));
	const styleString = $derived(
		`background-color: ${bgColor}; color: ${textColor}; border-color: ${bgColor};`
	);
</script>

<Badge variant="outline" class={sizeClass} style={styleString}>
	{category.name}
	{#if category.isDefault}
		<span style="opacity: 0.7; font-weight: 400;">(Default)</span>
	{/if}
</Badge>
