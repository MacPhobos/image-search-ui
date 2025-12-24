<script lang="ts">
	import type { Category } from '$lib/api/categories';
	import { listCategories, deleteCategory } from '$lib/api/categories';
	import CategoryBadge from '$lib/components/CategoryBadge.svelte';
	import CategoryCreateModal from '$lib/components/CategoryCreateModal.svelte';
	import CategoryEditModal from '$lib/components/CategoryEditModal.svelte';
	import { onMount } from 'svelte';

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
		<div class="loading">Loading categories...</div>
	{:else if categories.length === 0}
		<div class="empty-state">
			<p>No categories found.</p>
			<p>Create a new category to organize your training sessions.</p>
		</div>
	{:else}
		<div class="categories-table-container">
			<table class="categories-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Description</th>
						<th>Sessions</th>
						<th>Created</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each categories as category}
						<tr>
							<td>
								<CategoryBadge {category} size="medium" />
							</td>
							<td class="description">
								{category.description || '—'}
							</td>
							<td class="session-count">
								{getSessionCountLabel(category.sessionCount)}
							</td>
							<td class="date">{formatDate(category.createdAt)}</td>
							<td class="actions">
								<button class="btn-edit" onclick={() => handleEditClick(category)}> Edit </button>
								{#if category.isDefault}
									<button class="btn-delete" disabled title="Cannot delete default category">
										Delete
									</button>
								{:else}
									<button
										class="btn-delete"
										onclick={() => handleDeleteClick(category)}
										disabled={deletingId === category.id}
									>
										{deletingId === category.id ? 'Deleting...' : 'Delete'}
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
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
				<button class="btn btn-danger" onclick={() => handleDelete(deleteConfirm)}> Delete </button>
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

	.categories-table {
		width: 100%;
		border-collapse: collapse;
	}

	.categories-table thead {
		background-color: #f9fafb;
		border-bottom: 2px solid #e5e7eb;
	}

	.categories-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.categories-table td {
		padding: 1rem;
		border-bottom: 1px solid #f3f4f6;
		color: #1f2937;
		font-size: 0.875rem;
	}

	.categories-table tbody tr:last-child td {
		border-bottom: none;
	}

	.categories-table tbody tr:hover {
		background-color: #f9fafb;
	}

	.description {
		color: #6b7280;
		max-width: 400px;
	}

	.session-count {
		color: #374151;
		font-weight: 500;
	}

	.date {
		color: #6b7280;
		white-space: nowrap;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-edit,
	.btn-delete {
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-edit {
		background-color: #3b82f6;
		color: white;
	}

	.btn-edit:hover {
		background-color: #2563eb;
	}

	.btn-delete {
		background-color: #dc2626;
		color: white;
	}

	.btn-delete:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.btn-delete:disabled {
		background-color: #d1d5db;
		cursor: not-allowed;
		color: #9ca3af;
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
