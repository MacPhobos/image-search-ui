import type { ComponentProps } from 'svelte';
import Badge from './badge.svelte';

export { default as Badge } from './badge.svelte';
export { badgeVariants, type BadgeVariant } from './badge.svelte';
export type BadgeProps = ComponentProps<typeof Badge>;
