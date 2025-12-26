<script lang="ts">
	import type { Category } from '$lib/api/categories';
	import { createCategory } from '$lib/api/categories';
	import { tid } from '$lib/testing/testid';

	interface Props {
		open: boolean;
		onClose: () => void;
		onCreated: (category: Category) => void;
		testId?: string;
	}

	let { open, onClose, onCreated, testId = 'modal__category-create' }: Props = $props();

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
			onClose();
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

{#if open}
	<div class="modal-overlay" onclick={handleClose} role="presentation" data-testid={t('overlay')}>
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			data-testid={t()}
		>
			<div class="modal-header" data-testid={t('header')}>
				<h2>Create Category</h2>
				<button class="close-btn" onclick={handleClose} data-testid={t('btn-close')}>
					&times;
				</button>
			</div>

			<div class="modal-body" data-testid={t('body')}>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<div class="form-group">
						<label for="category-name">
							Name <span class="required">*</span>
						</label>
						<input
							id="category-name"
							type="text"
							bind:value={name}
							placeholder="e.g., Personal Photos"
							class="form-input"
							disabled={loading}
							required
							data-testid={t('input-name')}
						/>
					</div>

					<div class="form-group">
						<label for="category-description">Description</label>
						<textarea
							id="category-description"
							bind:value={description}
							placeholder="Optional description for this category"
							class="form-textarea"
							disabled={loading}
							rows="3"
							data-testid={t('input-description')}
						/>
					</div>

					<div class="form-group">
						<label for="category-color">Color</label>
						<div class="color-picker">
							<div class="color-presets">
								{#each colorPresets as presetColor}
									<button
										type="button"
										class="color-preset"
										class:selected={color === presetColor}
										style="background-color: {presetColor}"
										onclick={() => (color = presetColor)}
										disabled={loading}
										aria-label="Select color {presetColor}"
									/>
								{/each}
							</div>
							<input
								id="category-color"
								type="color"
								bind:value={color}
								class="color-input"
								disabled={loading}
							/>
						</div>
					</div>

					{#if error}
						<div class="error-message" role="alert" data-testid={t('error')}>
							{error}
						</div>
					{/if}
				</form>
			</div>

			<div class="modal-footer" data-testid={t('footer')}>
				<button
					class="btn btn-secondary"
					onclick={handleClose}
					disabled={loading}
					data-testid={t('btn-cancel')}
				>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={handleSubmit}
					disabled={loading}
					data-testid={t('btn-submit')}
				>
					{loading ? 'Creating...' : 'Create Category'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
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
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-btn:hover {
		background-color: #f3f4f6;
	}

	.modal-body {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.required {
		color: #ef4444;
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #1f2937;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-textarea {
		resize: vertical;
		min-height: 4rem;
	}

	.color-picker {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.color-presets {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-preset {
		width: 2rem;
		height: 2rem;
		border: 2px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}

	.color-preset:hover:not(:disabled) {
		transform: scale(1.1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.color-preset.selected {
		border-color: #1f2937;
		box-shadow:
			0 0 0 2px white,
			0 0 0 4px #1f2937;
	}

	.color-preset:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.color-input {
		width: 3rem;
		height: 2rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		cursor: pointer;
	}

	.error-message {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background-color: #fee2e2;
		color: #991b1b;
		border-radius: 6px;
		font-size: 0.875rem;
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

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #4b5563;
	}
</style>
