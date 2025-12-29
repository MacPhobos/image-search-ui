<script lang="ts">
	import type { Prototype, AgeEraBucket, TemporalCoverage } from '$lib/types';

	interface Props {
		/** Array of prototypes for the person */
		prototypes: Prototype[];
		/** Coverage statistics */
		coverage: TemporalCoverage;
		/** Callback when pin button is clicked for an era */
		onPinClick?: (era: AgeEraBucket) => void;
		/** Callback when unpin button is clicked for a prototype */
		onUnpinClick?: (prototype: Prototype) => void;
	}

	let { prototypes, coverage, onPinClick, onUnpinClick }: Props = $props();

	const eras: { key: AgeEraBucket; label: string; range: string }[] = [
		{ key: 'infant', label: 'Infant', range: '0-3' },
		{ key: 'child', label: 'Child', range: '4-12' },
		{ key: 'teen', label: 'Teen', range: '13-19' },
		{ key: 'young_adult', label: 'Young Adult', range: '20-35' },
		{ key: 'adult', label: 'Adult', range: '36-55' },
		{ key: 'senior', label: 'Senior', range: '56+' }
	];

	const getPrototypeForEra = (era: AgeEraBucket): Prototype | undefined => {
		return prototypes.find((p) => p.ageEraBucket === era);
	};

	function handlePinClick(era: AgeEraBucket) {
		onPinClick?.(era);
	}

	function handleUnpinClick(prototype: Prototype) {
		onUnpinClick?.(prototype);
	}
</script>

<div class="temporal-timeline">
	<div class="timeline-header">
		<h3>Age Timeline</h3>
		<span class="coverage-badge">{coverage.coveragePercentage.toFixed(0)}% Coverage</span>
	</div>

	<div class="era-slots">
		{#each eras as era}
			{@const proto = getPrototypeForEra(era.key)}
			<div class="era-slot" class:covered={proto} class:pinned={proto?.isPinned}>
				<div class="era-label">
					<span class="era-name">{era.label}</span>
					<span class="era-range">{era.range} yrs</span>
				</div>

				{#if proto}
					<div class="prototype-indicator">
						<span class="role-badge">{proto.role}</span>
						{#if proto.isPinned}
							<button
								class="unpin-btn"
								onclick={() => handleUnpinClick(proto)}
								aria-label="Unpin prototype"
								type="button"
							>
								📌
							</button>
						{/if}
					</div>
				{:else}
					<div class="empty-slot">
						<span class="empty-label">No photos</span>
						{#if onPinClick}
							<button
								class="pin-btn"
								onclick={() => handlePinClick(era.key)}
								aria-label="Pin photo for {era.label}"
								type="button"
							>
								+ Pin
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.temporal-timeline {
		padding: 1rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background: white;
	}

	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.timeline-header h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #333;
	}

	.coverage-badge {
		background: #4caf50;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.era-slots {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
	}

	@media (max-width: 768px) {
		.era-slots {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 480px) {
		.era-slots {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.era-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		background: #f9f9f9;
		min-height: 80px;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.era-slot.covered {
		border-color: #4caf50;
		background: #e8f5e9;
	}

	.era-slot.pinned {
		border-color: #4a90e2;
		background: #e3f2fd;
	}

	.era-label {
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.era-name {
		display: block;
		font-weight: 600;
		font-size: 0.9rem;
		color: #333;
	}

	.era-range {
		display: block;
		font-size: 0.75rem;
		color: #666;
	}

	.prototype-indicator {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.role-badge {
		font-size: 0.7rem;
		padding: 0.15rem 0.3rem;
		border-radius: 3px;
		background: #e0e0e0;
		text-transform: uppercase;
		color: #666;
		font-weight: 600;
	}

	.unpin-btn,
	.pin-btn {
		padding: 0.25rem 0.5rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition:
			background-color 0.2s,
			transform 0.2s;
	}

	.unpin-btn {
		background: transparent;
	}

	.unpin-btn:hover {
		transform: scale(1.1);
	}

	.pin-btn {
		background: #4a90e2;
		color: white;
		font-weight: 600;
	}

	.pin-btn:hover {
		background: #357abd;
	}

	.pin-btn:focus,
	.unpin-btn:focus {
		outline: 2px solid #4a90e2;
		outline-offset: 2px;
	}

	.empty-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.empty-label {
		font-size: 0.75rem;
		color: #999;
	}
</style>
