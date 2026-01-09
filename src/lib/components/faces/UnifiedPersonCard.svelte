<script lang="ts">
	import type { UnifiedPersonResponse } from '$lib/api/faces';
	import { thumbnailCache } from '$lib/stores/thumbnailCache.svelte';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface Props {
		/** Person data (identified, unidentified, or noise) */
		person: UnifiedPersonResponse;
		/** Show assign button for unidentified/noise persons */
		showAssignButton?: boolean;
		/** Click handler */
		onClick?: (person: UnifiedPersonResponse) => void;
		/** Assign handler */
		onAssign?: (person: UnifiedPersonResponse) => void;
		/** Whether the card is selected */
		selected?: boolean;
	}

	let { person, showAssignButton = false, onClick, onAssign, selected = false }: Props = $props();

	// Noise faces are not clickable (no cluster detail page)
	let isClickable = $derived(person.type !== 'noise' && !!onClick);

	// Only add tabindex for clickable elements
	let tabIndexAttr = $derived(isClickable ? { tabindex: 0 } : {});

	// Extract asset ID from thumbnailUrl
	const assetId = $derived.by(() => {
		if (!person.thumbnailUrl) return null;
		const match = person.thumbnailUrl.match(/\/images\/(\d+)\/thumbnail/);
		return match ? parseInt(match[1], 10) : null;
	});

	// Get cached thumbnail
	const cachedThumbnail = $derived(assetId ? thumbnailCache.get(assetId) : undefined);
	const isLoading = $derived(assetId ? thumbnailCache.isPending(assetId) : false);

	function handleClick() {
		// Only trigger onClick if not a noise face
		if (isClickable) {
			onClick?.(person);
		}
	}

	function handleAssign(event: Event) {
		event.stopPropagation();
		// Noise faces can't be assigned (no cluster page)
		if (person.type !== 'noise') {
			onAssign?.(person);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (isClickable) {
				onClick?.(person);
			}
		}
	}

	function getBadgeVariant(type: string): BadgeVariant {
		switch (type) {
			case 'identified':
				return 'success';
			case 'unidentified':
				return 'warning';
			case 'noise':
				return 'destructive';
			default:
				return 'secondary';
		}
	}

	function getBadgeLabel(type: string): string {
		switch (type) {
			case 'identified':
				return 'Identified';
			case 'unidentified':
				return 'Needs Name';
			case 'noise':
				return 'Review';
			default:
				return type;
		}
	}

	function getBadgeTooltip(type: string): string {
		switch (type) {
			case 'identified':
				return 'This person has been assigned a name';
			case 'unidentified':
				return 'This face cluster needs to be identified with a name';
			case 'noise':
				return 'Low-confidence faces that need individual review';
			default:
				return type;
		}
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	}
</script>

<Card.Root
	class="flex flex-row gap-4 p-4 transition-all {isClickable
		? 'cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-0.5'
		: ''} {selected ? 'border-primary bg-primary/5' : ''} {person.type === 'noise' ? 'opacity-85' : ''}"
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role={isClickable ? 'button' : 'article'}
	{...tabIndexAttr}
	aria-label="Person: {person.name}, {person.faceCount} faces"
>
	<!-- Avatar -->
	<Avatar.Root class="size-16 shrink-0">
		{#if cachedThumbnail || person.thumbnailUrl}
			<Avatar.Image
				src={cachedThumbnail || person.thumbnailUrl}
				alt={person.name}
				class={isLoading ? 'opacity-50' : ''}
			/>
		{/if}
		<Avatar.Fallback
			class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-semibold"
		>
			{getInitials(person.name)}
		</Avatar.Fallback>
	</Avatar.Root>

	<!-- Content -->
	<div class="flex-1 min-w-0 flex flex-col gap-2">
		<Card.Header class="p-0 gap-3">
			<div class="flex items-center gap-3 flex-wrap">
				<Card.Title class="text-lg font-semibold truncate flex-1 min-w-0">
					{person.name}
				</Card.Title>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Badge variant={getBadgeVariant(person.type)} class="uppercase shrink-0 cursor-help">
							{getBadgeLabel(person.type)}
						</Badge>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>{getBadgeTooltip(person.type)}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</Card.Header>

		<Card.Content class="p-0 space-y-2">
			<div class="flex gap-4 flex-wrap text-sm text-muted-foreground">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<span class="cursor-help">
							<strong class="text-foreground">{person.faceCount}</strong>
							{person.faceCount === 1 ? 'face' : 'faces'}
						</span>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Number of detected faces in this {person.type === 'identified' ? 'person' : 'cluster'}</p>
					</Tooltip.Content>
				</Tooltip.Root>
				{#if person.type === 'unidentified' && person.confidence}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<span class="cursor-help">
								<strong class="text-foreground">{Math.round(person.confidence * 100)}%</strong>
								confidence
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Average similarity score for faces in this cluster</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			</div>

			{#if person.type === 'noise'}
				<p class="text-xs text-muted-foreground italic">
					These faces need individual review and manual grouping.
				</p>
			{/if}

			{#if showAssignButton && person.type !== 'identified' && person.type !== 'noise'}
				<Button
					variant="default"
					size="sm"
					onclick={handleAssign}
					class="mt-1 self-start"
					aria-label="Assign name to {person.name}"
				>
					Assign Name
				</Button>
			{/if}
		</Card.Content>
	</div>
</Card.Root>
