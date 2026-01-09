<script lang="ts">
	import type { Person } from '$lib/types';

	interface Props {
		/** Person data */
		person: Person;
		/** Click handler */
		onClick?: () => void;
		/** Whether the card is selected */
		selected?: boolean;
	}

	let { person, onClick, selected = false }: Props = $props();

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	}

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	}

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'active':
				return 'status-active';
			case 'merged':
				return 'status-merged';
			case 'hidden':
				return 'status-hidden';
			default:
				return '';
		}
	}

	function handleClick() {
		onClick?.();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick?.();
		}
	}
</script>

<article
	class="person-card"
	class:selected
	class:clickable={!!onClick}
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role={onClick ? 'button' : 'article'}
	tabindex={onClick ? 0 : -1}
	aria-label="Person: {person.name}"
>
	<div class="person-avatar">
		{getInitials(person.name)}
	</div>

	<div class="person-content">
		<div class="person-header">
			<h3 class="person-name">{person.name}</h3>
			<span class="status-badge {getStatusBadgeClass(person.status)}">
				{person.status}
			</span>
		</div>

		<div class="person-stats">
			<span class="stat">
				<strong>{person.faceCount}</strong> faces
			</span>
			<span class="stat">
				<strong>{person.prototypeCount}</strong> prototypes
			</span>
		</div>

		<div class="person-meta">
			<span class="created">Created: {formatDate(person.createdAt)}</span>
		</div>
	</div>
</article>

<style>
	.person-card {
		display: flex;
		gap: 1rem;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 1rem;
		transition:
			box-shadow 0.2s,
			border-color 0.2s,
			transform 0.2s;
	}

	.person-card.clickable {
		cursor: pointer;
	}

	.person-card.clickable:hover {
		border-color: #4a90e2;
		box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
		transform: translateY(-2px);
	}

	.person-card.selected {
		border-color: #4a90e2;
		background-color: #f0f7ff;
	}

	.person-card:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.person-avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.person-content {
		flex: 1;
		min-width: 0;
	}

	.person-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.person-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: #333;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-badge {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		flex-shrink: 0;
	}

	.status-active {
		background-color: #e8f5e9;
		color: #2e7d32;
	}

	.status-merged {
		background-color: #e3f2fd;
		color: #1565c0;
	}

	.status-hidden {
		background-color: #f5f5f5;
		color: #666;
	}

	.person-stats {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.stat {
		font-size: 0.875rem;
		color: #666;
	}

	.stat strong {
		color: #333;
	}

	.person-meta {
		font-size: 0.75rem;
		color: #999;
	}
</style>
