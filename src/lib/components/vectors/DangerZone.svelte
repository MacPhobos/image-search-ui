<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('vectors/DangerZone', {
		filePath: 'src/lib/components/vectors/DangerZone.svelte'
	});
	onMount(() => cleanup);

	interface Props {
		onOrphanCleanup: () => void;
		onFullReset: () => void;
	}

	let { onOrphanCleanup, onFullReset }: Props = $props();
</script>

<div class="danger-zone">
	<div class="danger-header">
		<h3>Danger Zone</h3>
		<p class="warning">These actions are destructive and cannot be undone.</p>
	</div>

	<div class="action-group">
		<div class="action-item">
			<div class="action-info">
				<h4>Cleanup Orphan Vectors</h4>
				<p>Remove vectors that no longer have corresponding database records.</p>
				<ul class="details-list">
					<li>Identifies vectors without matching assets</li>
					<li>Helps maintain data consistency</li>
					<li>Safe operation - only removes orphaned data</li>
				</ul>
			</div>
			<button class="btn btn-warning" onclick={onOrphanCleanup}>Cleanup Orphans</button>
		</div>

		<div class="action-item">
			<div class="action-info">
				<h4>Reset All Vectors</h4>
				<p>Delete ALL vectors from the collection. This will require retraining all images.</p>
				<ul class="details-list">
					<li>Deletes entire vector collection</li>
					<li>Requires confirmation text input</li>
					<li>Use when rebuilding from scratch</li>
				</ul>
			</div>
			<button class="btn btn-danger" onclick={onFullReset}>Reset Collection</button>
		</div>
	</div>
</div>

<style>
	.danger-zone {
		border: 2px solid #ef4444;
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 2rem;
		background-color: #fef2f2;
	}

	.danger-header {
		margin-bottom: 1.5rem;
	}

	.danger-zone h3 {
		color: #dc2626;
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.danger-zone h3::before {
		content: '⚠️';
		font-size: 1.25rem;
	}

	.warning {
		color: #991b1b;
		font-size: 0.875rem;
		margin: 0;
		font-weight: 600;
	}

	.action-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.action-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		background: white;
		border-radius: 6px;
		border: 1px solid #fecaca;
		gap: 1.5rem;
	}

	.action-info {
		flex: 1;
	}

	.action-item h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.action-item p {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.5;
	}

	.details-list {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.8rem;
		color: #9ca3af;
		line-height: 1.6;
	}

	.details-list li {
		margin-bottom: 0.25rem;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
	}

	.btn-warning {
		background: #f59e0b;
		color: white;
	}

	.btn-warning:hover {
		background: #d97706;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background: #b91c1c;
	}

	@media (max-width: 768px) {
		.action-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.btn {
			width: 100%;
		}
	}
</style>
