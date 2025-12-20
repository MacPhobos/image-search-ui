<script lang="ts">
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
</script>

<span
	class="category-badge {size}"
	style:background-color={category.color ?? '#E5E7EB'}
	style:color={getContrastColor(category.color)}
>
	{category.name}
	{#if category.isDefault}
		<span class="default-indicator">(Default)</span>
	{/if}
</span>

<style>
	.category-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.category-badge.small {
		font-size: 0.75rem;
	}

	.category-badge.medium {
		font-size: 0.875rem;
		padding: 0.375rem 0.75rem;
	}

	.default-indicator {
		opacity: 0.7;
		font-weight: 400;
	}
</style>
