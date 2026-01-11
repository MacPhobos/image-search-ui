<script lang="ts">
	import type { Category } from '$lib/api/categories';
	import { createCategory } from '$lib/api/categories';
	import { tid } from '$lib/testing/testid';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	interface Props {
		open: boolean;
		onClose: () => void;
		onCreated: (category: Category) => void;
		testId?: string;
	}

	let {
		open = $bindable(false),
		onClose,
		onCreated,
		testId = 'modal__category-create'
	}: Props = $props();

	// Derived scoped test ID generator (reactive to testId changes)
	const t = $derived((...segments: string[]) =>
		segments.length === 0 ? testId : tid(testId, ...segments)
	);

	let name = $state('');
	let description = $state('');
	let color = $state('#3B82F6'); // Default blue
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Color presets
	const colorPresets = [
		'#3B82F6', // Blue
		'#10B981', // Green
		'#F59E0B', // Yellow
		'#EF4444', // Red
		'#8B5CF6', // Purple
		'#EC4899', // Pink
		'#6B7280' // Gray
	];

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Category name is required';
			return;
		}

		loading = true;
		error = null;

		try {
			const category = await createCategory({
				name: name.trim(),
				description: description.trim() || null,
				color: color || null
			});
			onCreated(category);
			resetForm();
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create category';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		name = '';
		description = '';
		color = '#3B82F6';
		error = null;
	}

	function handleClose() {
		resetForm();
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<Dialog.Content data-testid={t()}>
		<Dialog.Header data-testid={t('header')}>
			<Dialog.Title>Create Category</Dialog.Title>
			<Dialog.Description>Create a new category to organize your images.</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<div style="display: grid; gap: 1rem; padding: 0.5rem 0;" data-testid={t('body')}>
				<div>
					<Label for="category-name">
						Name <span style="color: rgb(239, 68, 68);">*</span>
					</Label>
					<Input
						id="category-name"
						bind:value={name}
						placeholder="e.g., Personal Photos"
						disabled={loading}
						required
						data-testid={t('input-name')}
					/>
				</div>

				<div>
					<Label for="category-description">Description</Label>
					<textarea
						id="category-description"
						bind:value={description}
						placeholder="Optional description for this category"
						disabled={loading}
						rows="3"
						data-testid={t('input-description')}
						class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					></textarea>
				</div>

				<div>
					<Label for="category-color">Color</Label>
					<div style="display: flex; align-items: center; gap: 1rem;">
						<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
							{#each colorPresets as presetColor}
								<button
									type="button"
									style="width: 2rem; height: 2rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; padding: 0; background-color: {presetColor}; border: 2px solid {color ===
									presetColor
										? '#1f2937'
										: 'transparent'}; box-shadow: {color === presetColor
										? '0 0 0 2px white, 0 0 0 4px #1f2937'
										: 'none'};"
									onclick={() => (color = presetColor)}
									disabled={loading}
									aria-label="Select color {presetColor}"
								></button>
							{/each}
						</div>
						<input
							id="category-color"
							type="color"
							bind:value={color}
							disabled={loading}
							style="width: 3rem; height: 2rem; border: 1px solid rgb(209, 213, 219); border-radius: 6px; cursor: pointer;"
						/>
					</div>
				</div>

				{#if error}
					<Alert variant="destructive" data-testid={t('error')}>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}
			</div>

			<Dialog.Footer data-testid={t('footer')}>
				<Button
					variant="outline"
					onclick={handleClose}
					disabled={loading}
					data-testid={t('btn-cancel')}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={loading} data-testid={t('btn-submit')}>
					{loading ? 'Creating...' : 'Create Category'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
