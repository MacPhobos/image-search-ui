<script lang="ts">
	import type { PersonPhotoGroup, FaceInPhoto } from '$lib/api/faces';
	import { listPersons, assignFaceToPerson, createPerson } from '$lib/api/faces';
	import type { Person } from '$lib/api/faces';

	interface Props {
		/** The photo to display */
		photo: PersonPhotoGroup;
		/** The person being reviewed (for highlighting their faces) - optional for search results */
		currentPersonId?: string | null;
		/** Name of current person - optional for search results */
		currentPersonName?: string | null;
		/** Called when modal should close */
		onClose: () => void;
		/** Optional: navigate to previous photo */
		onPrevious?: () => void;
		/** Optional: navigate to next photo */
		onNext?: () => void;
	}

	let { photo, currentPersonId = null, currentPersonName = null, onClose, onPrevious, onNext }: Props = $props();

	// State
	let imgElement: HTMLImageElement | undefined = $state();
	let imageLoaded = $state(false);
	let imgWidth = $state(0);
	let imgHeight = $state(0);
	let highlightedFaceId = $state<string | null>(null);

	// Face assignment state
	let assigningFaceId = $state<string | null>(null);
	let personSearchQuery = $state('');
	let persons = $state<Person[]>([]);
	let personsLoading = $state(false);
	let personsError = $state<string | null>(null);
	let assignmentSubmitting = $state(false);
	let assignmentError = $state<string | null>(null);

	// Derived states
	let filteredPersons = $derived(() => {
		const query = personSearchQuery.toLowerCase().trim();
		if (!query) return persons;
		return persons.filter((p) => p.name.toLowerCase().includes(query));
	});

	let showCreateOption = $derived(() => personSearchQuery.trim().length > 0);

	function handleImageLoad() {
		if (imgElement) {
			imgWidth = imgElement.naturalWidth;
			imgHeight = imgElement.naturalHeight;
			imageLoaded = true;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
		if (event.key === 'ArrowLeft' && onPrevious) {
			onPrevious();
		}
		if (event.key === 'ArrowRight' && onNext) {
			onNext();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleHighlightFace(faceId: string) {
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}

	function getFaceColor(face: FaceInPhoto): string {
		// If no current person is set (search results context), all labeled faces use blue
		if (!currentPersonId) {
			if (face.personId) return '#3b82f6'; // Blue - any labeled person
			return '#6b7280'; // Gray - unlabeled
		}
		// Person details context: differentiate current vs other persons
		if (face.personId === currentPersonId) return '#22c55e'; // Green - current person
		if (face.personId) return '#eab308'; // Yellow - other person
		return '#6b7280'; // Gray - unlabeled
	}

	function getFaceLabel(face: FaceInPhoto): string {
		if (face.personName) return face.personName;
		return 'Unknown';
	}

	async function loadPersons() {
		personsLoading = true;
		personsError = null;
		try {
			const response = await listPersons(1, 100, 'active');
			persons = response.items;
		} catch (err) {
			console.error('Failed to load persons:', err);
			personsError = 'Failed to load persons.';
		} finally {
			personsLoading = false;
		}
	}

	function startAssignment(faceId: string) {
		const face = photo.faces.find((f) => f.faceInstanceId === faceId);
		if (face?.personId !== null) return;

		assigningFaceId = faceId;
		highlightedFaceId = faceId;
		personSearchQuery = '';
		assignmentError = null;

		if (persons.length === 0) {
			loadPersons();
		}
	}

	function cancelAssignment() {
		assigningFaceId = null;
		personSearchQuery = '';
		assignmentError = null;
	}

	async function handleAssignToExisting(person: Person) {
		if (!assigningFaceId || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		try {
			await assignFaceToPerson(assigningFaceId, person.id);

			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === assigningFaceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: person.id,
					personName: person.name
				};
			}

			assigningFaceId = null;
			personSearchQuery = '';
		} catch (err) {
			console.error('Failed to assign face:', err);
			assignmentError = err instanceof Error ? err.message : 'Failed to assign face.';
		} finally {
			assignmentSubmitting = false;
		}
	}

	async function handleCreateAndAssign() {
		if (!assigningFaceId || !personSearchQuery.trim() || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		const newName = personSearchQuery.trim();

		try {
			const newPerson = await createPerson(newName);
			await assignFaceToPerson(assigningFaceId, newPerson.id);

			persons = [
				...persons,
				{
					id: newPerson.id,
					name: newPerson.name,
					status: newPerson.status as 'active' | 'merged' | 'hidden',
					faceCount: 1,
					prototypeCount: 0,
					createdAt: newPerson.createdAt,
					updatedAt: newPerson.createdAt
				}
			];

			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === assigningFaceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: newPerson.id,
					personName: newPerson.name
				};
			}

			assigningFaceId = null;
			personSearchQuery = '';
		} catch (err) {
			console.error('Failed to create person and assign:', err);
			assignmentError = err instanceof Error ? err.message : 'Failed to create person.';
		} finally {
			assignmentSubmitting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div
		class="modal photo-preview-modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<header class="modal-header">
			<h2 id="modal-title">
				{#if currentPersonName}
					Photo Preview - {currentPersonName}
				{:else}
					Photo Preview
				{/if}
			</h2>
			<button type="button" class="close-button" onclick={onClose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</header>

		<div class="modal-body">
			<!-- Photo container with navigation -->
			<div class="photo-container">
				{#if onPrevious}
					<button
						type="button"
						class="nav-btn prev"
						onclick={onPrevious}
						aria-label="Previous photo"
					>
						‹
					</button>
				{/if}

				<div class="photo-wrapper">
					<img
						src={photo.fullUrl}
						alt="Photo with {photo.faceCount} detected faces"
						bind:this={imgElement}
						onload={handleImageLoad}
					/>

					<!-- SVG overlay for face bounding boxes -->
					{#if imageLoaded && imgWidth > 0 && imgHeight > 0}
						<svg class="face-overlay" viewBox="0 0 {imgWidth} {imgHeight}" aria-hidden="true">
							{#each photo.faces as face (face.faceInstanceId)}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<rect
									x={face.bboxX}
									y={face.bboxY}
									width={face.bboxW}
									height={face.bboxH}
									class="face-box"
									class:current-person={currentPersonId && face.personId === currentPersonId}
									class:other-person={face.personId && (!currentPersonId || face.personId !== currentPersonId)}
									class:unknown={!face.personId}
									class:highlighted={highlightedFaceId === face.faceInstanceId}
									style="stroke: {getFaceColor(face)};"
									onclick={() => handleHighlightFace(face.faceInstanceId)}
								/>
							{/each}
						</svg>
					{/if}
				</div>

				{#if onNext}
					<button type="button" class="nav-btn next" onclick={onNext} aria-label="Next photo">
						›
					</button>
				{/if}
			</div>

			<!-- Face info sidebar -->
			<aside class="face-sidebar" aria-label="Detected faces">
				<h3>Faces ({photo.faceCount})</h3>
				<ul class="face-list">
					{#each photo.faces as face (face.faceInstanceId)}
						<li class="face-item" class:highlighted={highlightedFaceId === face.faceInstanceId}>
							<div class="face-item-content">
								<button
									type="button"
									class="face-item-button"
									onclick={() => handleHighlightFace(face.faceInstanceId)}
									aria-label="Highlight face of {getFaceLabel(face)}"
								>
									<span
										class="face-indicator"
										class:current-person={currentPersonId && face.personId === currentPersonId}
										class:other-person={face.personId && (!currentPersonId || face.personId !== currentPersonId)}
										style="background-color: {getFaceColor(face)};"
									></span>
									<div class="face-info">
										<span class="face-name">
											{getFaceLabel(face)}
											{#if currentPersonId && face.personId === currentPersonId}
												<span class="current-badge">(current)</span>
											{/if}
										</span>
										<span class="face-meta">
											Conf: {(face.detectionConfidence * 100).toFixed(0)}%
											{#if face.qualityScore !== null}
												| Q: {face.qualityScore.toFixed(1)}
											{/if}
										</span>
									</div>
								</button>

								<!-- Assign button for unknown faces -->
								{#if face.personId === null && assigningFaceId !== face.faceInstanceId}
									<button
										type="button"
										class="assign-btn"
										onclick={(e) => {
											e.stopPropagation();
											startAssignment(face.faceInstanceId);
										}}
										aria-label="Assign this face to a person"
									>
										Assign
									</button>
								{/if}
							</div>

							<!-- Assignment panel (shown when this face is being assigned) -->
							{#if assigningFaceId === face.faceInstanceId}
								<div class="assignment-panel">
									<div class="assignment-header">
										<h4>Assign Face</h4>
										<button
											type="button"
											class="close-assignment"
											onclick={cancelAssignment}
											aria-label="Cancel assignment"
										>
											×
										</button>
									</div>

									{#if assignmentError}
										<div class="assignment-error" role="alert">
											{assignmentError}
										</div>
									{/if}

									<input
										type="text"
										placeholder="Search or create person..."
										bind:value={personSearchQuery}
										class="person-search-input"
										aria-label="Search persons or enter new name"
									/>

									<div class="person-options">
										{#if personsLoading}
											<div class="loading-option">Loading...</div>
										{:else if personsError}
											<div class="no-results">{personsError}</div>
										{:else}
											<!-- Create new option -->
											{#if showCreateOption()}
												<button
													type="button"
													class="person-option create-new"
													onclick={handleCreateAndAssign}
													disabled={assignmentSubmitting}
												>
													<span class="person-avatar create-avatar">+</span>
													<span>Create "{personSearchQuery.trim()}"</span>
												</button>
											{/if}

											<!-- Existing persons -->
											{#each filteredPersons() as person (person.id)}
												<button
													type="button"
													class="person-option"
													onclick={() => handleAssignToExisting(person)}
													disabled={assignmentSubmitting}
												>
													<span class="person-avatar">
														{person.name.charAt(0).toUpperCase()}
													</span>
													<div class="person-option-info">
														<span class="person-option-name">{person.name}</span>
														<span class="person-option-meta">{person.faceCount} faces</span>
													</div>
												</button>
											{/each}

											{#if filteredPersons().length === 0 && !showCreateOption()}
												<div class="no-results">No persons found</div>
											{/if}
										{/if}
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</aside>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.photo-preview-modal {
		background: white;
		border-radius: 12px;
		max-width: 95vw;
		max-height: 95vh;
		width: auto;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e0e0e0;
		flex-shrink: 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
	}

	.close-button {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.close-button:hover {
		background-color: #f0f0f0;
		color: #333;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.modal-body {
		display: flex;
		gap: 1rem;
		overflow: hidden;
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}

	.photo-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-width: 0;
		min-height: 0;
	}

	.photo-wrapper {
		position: relative;
		max-width: 100%;
		max-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.photo-wrapper img {
		max-width: 100%;
		max-height: 80vh;
		width: auto;
		height: auto;
		object-fit: contain;
		display: block;
	}

	.face-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.face-box {
		fill: none;
		stroke-width: 3;
		cursor: pointer;
		pointer-events: auto;
		transition: stroke-width 0.2s;
	}

	.face-box:hover {
		stroke-width: 4;
	}

	.face-box.highlighted {
		stroke-width: 5;
	}

	.face-sidebar {
		width: 280px;
		flex-shrink: 0;
		overflow-y: auto;
		border-left: 1px solid #e5e7eb;
		padding-left: 1rem;
	}

	.face-sidebar h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.face-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.face-item {
		border-radius: 6px;
		transition: background-color 0.2s;
	}

	.face-item:hover,
	.face-item.highlighted {
		background-color: #f3f4f6;
	}

	.face-item-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.face-item-button {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex: 1;
		padding: 0.625rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
	}

	.assign-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
		flex-shrink: 0;
		margin-right: 0.5rem;
	}

	.assign-btn:hover {
		background-color: #3a7bc8;
	}

	.face-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.face-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.face-name {
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.current-badge {
		color: #22c55e;
		font-weight: 600;
		font-size: 0.75rem;
	}

	.face-meta {
		font-size: 0.75rem;
		color: #999;
	}

	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		font-size: 2.5rem;
		background-color: rgba(0, 0, 0, 0.5);
		color: white;
		border: none;
		padding: 1.25rem 0.75rem;
		cursor: pointer;
		z-index: 10;
		line-height: 1;
		transition: background-color 0.2s;
		border-radius: 4px;
	}

	.nav-btn:hover {
		background-color: rgba(0, 0, 0, 0.7);
	}

	.nav-btn.prev {
		left: 0.5rem;
	}

	.nav-btn.next {
		right: 0.5rem;
	}

	/* Assignment panel styles */
	.assignment-panel {
		background-color: #f8f9fa;
		border-radius: 8px;
		padding: 0.75rem;
		margin: 0.5rem 0.625rem;
		border: 1px solid #e0e0e0;
	}

	.assignment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.625rem;
	}

	.assignment-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}

	.close-assignment {
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
		color: #666;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-assignment:hover {
		background-color: #e0e0e0;
	}

	.assignment-error {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.5rem;
		border-radius: 4px;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
	}

	.person-search-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		transition: border-color 0.2s;
	}

	.person-search-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.person-options {
		max-height: 150px;
		overflow-y: auto;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		background-color: white;
	}

	.loading-option,
	.no-results {
		padding: 0.75rem;
		text-align: center;
		color: #666;
		font-size: 0.75rem;
	}

	.person-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.person-option:hover:not(:disabled) {
		background-color: #f5f5f5;
	}

	.person-option:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.person-option:not(:last-child) {
		border-bottom: 1px solid #f0f0f0;
	}

	.person-option.create-new {
		background-color: #f0f7ff;
		color: #4a90e2;
		font-weight: 500;
		font-size: 0.8125rem;
	}

	.person-option.create-new:hover:not(:disabled) {
		background-color: #e0efff;
	}

	.person-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.person-avatar.create-avatar {
		background: #4a90e2;
		font-size: 1rem;
	}

	.person-option-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.person-option-name {
		font-weight: 500;
		color: #333;
		font-size: 0.8125rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.person-option-meta {
		font-size: 0.6875rem;
		color: #999;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.modal-body {
			flex-direction: column;
		}

		.face-sidebar {
			width: 100%;
			max-height: 200px;
			border-left: none;
			border-top: 1px solid #e5e7eb;
			padding-left: 0;
			padding-top: 1rem;
		}

		.photo-wrapper {
			max-height: 60vh;
		}

		.photo-wrapper img {
			max-height: 60vh;
		}
	}
</style>
