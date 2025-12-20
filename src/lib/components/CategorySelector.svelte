<script lang="ts">
	import type { Category } from '$lib/api/categories';
	import { listCategories } from '$lib/api/categories';
	import { onMount } from 'svelte';

	interface Props {
		selectedId: number | null;
		onSelect: (categoryId: number | null) => void;
		onCreateNew?: () => void;
		disabled?: boolean;
		showCreateOption?: boolean;
		label?: string;
	}

	let {
		selectedId,
		onSelect,
		onCreateNew,
		disabled = false,
		showCreateOption = true,
		label = 'Category'
	}: Props = $props();

	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await listCategories(1, 100);
			categories = response.items;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load categories';
		} finally {
			loading = false;
		}
	});

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;

		if (value === '__create__') {
			// Reset selection and trigger create
			target.value = selectedId?.toString() ?? '';
			onCreateNew?.();
			return;
		}

		const categoryId = value ? parseInt(value, 10) : null;
		onSelect(categoryId);
	}
</script>

<div class="category-selector">
	<label for="category-select">{label}</label>
	{#if loading}
		<select id="category-select" disabled class="disabled-select">
			<option value="">Loading categories...</option>
		</select>
	{:else if error}
		<div class="error-message" role="alert">
			{error}
		</div>
	{:else}
		<select
			id="category-select"
			value={selectedId?.toString() ?? ''}
			onchange={handleChange}
			{disabled}
			class:disabled-select={disabled}
		>
			<option value="">No category</option>
			{#each categories as category (category.id)}
				<option value={category.id.toString()}>
					{category.name}
					{#if category.isDefault}(Default){/if}
				</option>
			{/each}
			{#if showCreateOption && onCreateNew}
				<option value="__create__">+ Create New Category...</option>
			{/if}
		</select>
	{/if}
</div>

<style>
	.category-selector {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: #555;
	}

	select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		font-size: 0.95rem;
		cursor: pointer;
	}

	select:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.disabled-select {
		background-color: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	.error-message {
		padding: 0.5rem;
		background-color: #fee;
		border: 1px solid #fcc;
		border-radius: 4px;
		color: #c33;
		font-size: 0.875rem;
	}
</style>
