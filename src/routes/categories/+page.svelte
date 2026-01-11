<script lang="ts">
	import type { Category } from '$lib/api/categories';
	import { listCategories, deleteCategory } from '$lib/api/categories';
	import CategoryBadge from '$lib/components/CategoryBadge.svelte';
	import CategoryCreateModal from '$lib/components/CategoryCreateModal.svelte';
	import CategoryEditModal from '$lib/components/CategoryEditModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { onMount } from 'svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/categories/+page', {
		filePath: 'src/routes/categories/+page.svelte'
	});

	let categories = $state<Category[]>([]);
	let total = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateModal = $state(false);
	let editingCategory = $state<Category | null>(null);
	let deleteConfirm = $state<Category | null>(null);
	let deletingId = $state<number | null>(null);

	async function loadCategories() {
		loading = true;
		error = null;
		try {
			const response = await listCategories(1, 100);
			categories = response.items;
			total = response.total;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load categories';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadCategories();
		return cleanup;
	});

	async function handleDelete(category: Category) {
		if (category.isDefault) return;

		deletingId = category.id;
		try {
			await deleteCategory(category.id);
			await loadCategories();
			deleteConfirm = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete category';
		} finally {
			deletingId = null;
		}
	}

	function handleCreated() {
		showCreateModal = false;
		loadCategories();
	}

	function handleUpdated() {
		editingCategory = null;
		loadCategories();
	}

	function handleCreateClick() {
		showCreateModal = true;
	}

	function handleEditClick(category: Category) {
		editingCategory = category;
	}

	function handleDeleteClick(category: Category) {
		deleteConfirm = category;
	}

	function handleCancelDelete() {
		deleteConfirm = null;
	}

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	}

	function getSessionCountLabel(count?: number): string {
		if (count === undefined || count === 0) return 'No sessions';
		return count === 1 ? '1 session' : `${count} sessions`;
	}
</script>

<div class="categories-page">
	<div class="header">
		<h2>Categories</h2>
		<button class="btn-create" onclick={handleCreateClick}>Create Category</button>
	</div>

	{#if error}
		<div class="error-banner" role="alert">
			{error}
			<button class="error-close" onclick={() => (error = null)}>&times;</button>
		</div>
	{/if}

	{#if loading}
		<div class="categories-table-container">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head>Sessions</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head>Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<Table.Row>
							<Table.Cell>
								<Skeleton class="h-6 w-24" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-64" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-20" />
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="h-4 w-24" />
							</Table.Cell>
							<Table.Cell>
								<div class="flex gap-2">
									<Skeleton class="h-8 w-16" />
									<Skeleton class="h-8 w-16" />
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else if categories.length === 0}
		<div class="empty-state">
			<p>No categories found.</p>
			<p>Create a new category to organize your training sessions.</p>
		</div>
	{:else}
		<div class="categories-table-container">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head>Sessions</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head>Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each categories as category}
						<Table.Row>
							<Table.Cell>
								<CategoryBadge {category} size="medium" />
							</Table.Cell>
							<Table.Cell class="text-gray-600 max-w-[400px]">
								{category.description || '—'}
							</Table.Cell>
							<Table.Cell class="text-gray-700 font-medium">
								{getSessionCountLabel(category.sessionCount)}
							</Table.Cell>
							<Table.Cell class="text-gray-600 whitespace-nowrap">
								{formatDate(category.createdAt)}
							</Table.Cell>
							<Table.Cell>
								<div class="actions">
									<Button size="sm" onclick={() => handleEditClick(category)}>Edit</Button>
									{#if category.isDefault}
										<Button
											size="sm"
											variant="destructive"
											disabled
											title="Cannot delete default category"
										>
											Delete
										</Button>
									{:else}
										<Button
											size="sm"
											variant="destructive"
											onclick={() => handleDeleteClick(category)}
											disabled={deletingId === category.id}
										>
											{deletingId === category.id ? 'Deleting...' : 'Delete'}
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<div class="summary">
			<p>Total: {total} {total === 1 ? 'category' : 'categories'}</p>
		</div>
	{/if}
</div>

{#if showCreateModal}
	<CategoryCreateModal
		open={showCreateModal}
		onClose={() => (showCreateModal = false)}
		onCreated={handleCreated}
	/>
{/if}

{#if editingCategory}
	<CategoryEditModal
		category={editingCategory}
		open={!!editingCategory}
		onClose={() => (editingCategory = null)}
		onUpdated={handleUpdated}
	/>
{/if}

{#if deleteConfirm}
	<div class="modal-overlay" onclick={handleCancelDelete} role="presentation">
		<div
			class="modal-content confirm-dialog"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<h3>Delete Category</h3>
			</div>
			<div class="modal-body">
				<p>
					Are you sure you want to delete the category <strong>{deleteConfirm.name}</strong>?
				</p>
				{#if deleteConfirm.sessionCount && deleteConfirm.sessionCount > 0}
					<p class="warning-text">
						This category is used by {deleteConfirm.sessionCount}
						{deleteConfirm.sessionCount === 1 ? 'session' : 'sessions'}. Those sessions will be
						moved to the default category.
					</p>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={handleCancelDelete}>Cancel</button>
				<button class="btn btn-danger" onclick={() => deleteConfirm && handleDelete(deleteConfirm)}>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.categories-page {
		width: 100%;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.btn-create {
		padding: 0.625rem 1.25rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-create:hover {
		background-color: #2563eb;
	}

	.error-banner {
		padding: 1rem 1.25rem;
		background-color: #fee2e2;
		border: 1px solid #fecaca;
		color: #991b1b;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #991b1b;
		cursor: pointer;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
	}

	.loading,
	.empty-state {
		padding: 3rem;
		text-align: center;
		color: #6b7280;
		background-color: white;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.categories-table-container {
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow-x: auto;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.summary {
		margin-top: 1.5rem;
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 6px;
		text-align: center;
	}

	.summary p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
		border-radius: 8px;
		max-width: 500px;
		width: 90%;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.modal-body p {
		margin: 0 0 1rem 0;
		color: #374151;
	}

	.modal-body p:last-child {
		margin-bottom: 0;
	}

	.warning-text {
		color: #dc2626;
		font-weight: 500;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover {
		background-color: #4b5563;
	}

	.btn-danger {
		background-color: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background-color: #b91c1c;
	}
</style>
