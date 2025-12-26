<script lang="ts">
	import type { PersonPhotoGroup, FaceInPhoto, FaceSuggestionItem } from '$lib/api/faces';
	import {
		listPersons,
		assignFaceToPerson,
		createPerson,
		unassignFace,
		getFaceSuggestions
	} from '$lib/api/faces';
	import type { Person } from '$lib/api/faces';
	import PersonDropdown from './PersonDropdown.svelte';

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

	let {
		photo,
		currentPersonId = null,
		currentPersonName = null,
		onClose,
		onPrevious,
		onNext
	}: Props = $props();

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

	// Face unassignment state
	let unassigningFaceId = $state<string | null>(null);
	let unassignmentError = $state<string | null>(null);

	// Face suggestions state
	interface FaceSuggestionsState {
		suggestions: FaceSuggestionItem[];
		loading: boolean;
		error: string | null;
	}
	let faceSuggestions = $state<Map<string, FaceSuggestionsState>>(new Map());

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

	// Load persons list when modal opens
	$effect(() => {
		if (persons.length === 0) {
			loadPersons();
		}
	});

	// Fetch suggestions for unknown faces (non-blocking with cleanup)
	$effect(() => {
		// Get all faces without a personId
		const unknownFaces = photo.faces.filter((f) => !f.personId);

		// Create abort controller for cleanup
		const controller = new AbortController();

		// Fetch suggestions for each unknown face (non-blocking)
		unknownFaces.forEach((face) => {
			// Set loading state
			faceSuggestions.set(face.faceInstanceId, { suggestions: [], loading: true, error: null });

			getFaceSuggestions(face.faceInstanceId, { signal: controller.signal })
				.then((response) => {
					faceSuggestions.set(face.faceInstanceId, {
						suggestions: response.suggestions,
						loading: false,
						error: null
					});
				})
				.catch((err) => {
					if (err.name !== 'AbortError') {
						faceSuggestions.set(face.faceInstanceId, {
							suggestions: [],
							loading: false,
							error: err instanceof Error ? err.message : 'Failed to load suggestions'
						});
					}
				});
		});

		// Cleanup: abort pending requests when modal closes
		return () => controller.abort();
	});

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

	// Color palette for distinct face colors
	const FACE_COLORS = [
		'#3b82f6', // Blue
		'#22c55e', // Green
		'#f59e0b', // Amber
		'#ef4444', // Red
		'#8b5cf6', // Purple
		'#ec4899', // Pink
		'#14b8a6', // Teal
		'#f97316', // Orange
		'#06b6d4', // Cyan
		'#84cc16' // Lime
	];

	function getFaceColorByIndex(index: number): string {
		return FACE_COLORS[index % FACE_COLORS.length];
	}

	function getFaceColor(face: FaceInPhoto): string {
		// Find the face index in the photo.faces array
		const index = photo.faces.findIndex((f) => f.faceInstanceId === face.faceInstanceId);
		return getFaceColorByIndex(index >= 0 ? index : 0);
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
		if (face?.personName) return;

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

	async function handleAssignFace(faceId: string, personId: string, personName: string) {
		try {
			await assignFaceToPerson(faceId, personId);

			// Optimistically update local photo state
			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex >= 0) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId,
					personName
				};
			}

			// Clear suggestions for this face
			faceSuggestions.delete(faceId);
		} catch (error) {
			console.error('Failed to assign face:', error);
			unassignmentError =
				error instanceof Error ? error.message : 'Failed to assign face to person.';
		}
	}

	async function handleCreateAndAssignFace(faceId: string, name: string) {
		try {
			const newPerson = await createPerson(name);

			// Add to local persons list
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

			// Assign face to new person
			await handleAssignFace(faceId, newPerson.id, newPerson.name);
		} catch (error) {
			console.error('Failed to create person and assign:', error);
			unassignmentError =
				error instanceof Error ? error.message : 'Failed to create person and assign face.';
		}
	}

	// Legacy handlers for old assignment panel (kept for compatibility)
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

	async function handleUnassignFace(faceId: string) {
		const face = photo.faces.find((f) => f.faceInstanceId === faceId);
		if (!face?.personName) return;

		if (!confirm(`Unassign "${face.personName}" from this face?`)) {
			return;
		}

		unassigningFaceId = faceId;
		unassignmentError = null;

		try {
			await unassignFace(faceId);

			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: null,
					personName: null
				};
			}
		} catch (err) {
			console.error('Failed to unassign face:', err);
			unassignmentError = err instanceof Error ? err.message : 'Failed to unassign face.';
		} finally {
			unassigningFaceId = null;
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

		<!-- Unassignment error display -->
		{#if unassignmentError}
			<div class="error-banner" role="alert">
				{unassignmentError}
				<button
					type="button"
					class="error-close"
					onclick={() => (unassignmentError = null)}
					aria-label="Dismiss error"
				>
					✕
				</button>
			</div>
		{/if}

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
								{@const faceColor = getFaceColor(face)}
								{@const isHighlighted = highlightedFaceId === face.faceInstanceId}
								{@const suggestionState = faceSuggestions.get(face.faceInstanceId)}
								{@const suggestions = suggestionState?.suggestions ?? []}
								{@const topSuggestion = suggestions[0]}

								<!-- Face bounding box -->
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<rect
									x={face.bboxX}
									y={face.bboxY}
									width={face.bboxW}
									height={face.bboxH}
									class="face-box"
									class:current-person={currentPersonId && face.personId === currentPersonId}
									class:other-person={face.personId &&
										(!currentPersonId || face.personId !== currentPersonId)}
									class:unknown={!face.personId}
									class:highlighted={isHighlighted}
									style="stroke: {faceColor};"
									onclick={() => handleHighlightFace(face.faceInstanceId)}
								/>

								<!-- Label below bounding box -->
								{#if face.personName}
									<!-- Assigned person label -->
									<g class="face-label">
										<rect
											x={face.bboxX}
											y={face.bboxY + face.bboxH + 4}
											width={Math.max(face.bboxW, 100)}
											height={24}
											rx={4}
											fill="rgba(0, 0, 0, 0.75)"
										/>
										<text
											x={face.bboxX + 8}
											y={face.bboxY + face.bboxH + 20}
											fill="white"
											font-size="14"
											font-weight="500"
										>
											{face.personName}
										</text>
									</g>
								{:else if suggestionState?.loading}
									<!-- Loading state -->
									<g class="face-label loading-label">
										<rect
											x={face.bboxX}
											y={face.bboxY + face.bboxH + 4}
											width={80}
											height={24}
											rx={4}
											fill="rgba(100, 116, 139, 0.6)"
										/>
										<text
											x={face.bboxX + 8}
											y={face.bboxY + face.bboxH + 20}
											fill="white"
											font-size="13"
										>
											Loading...
										</text>
									</g>
								{:else if topSuggestion}
									<!-- Suggested person label -->
									{@const labelText = `Suggested: ${topSuggestion.personName} (${Math.round(topSuggestion.confidence * 100)}%)`}
									{@const labelWidth = Math.max(face.bboxW, labelText.length * 7.5)}
									<g class="face-label suggestion-label">
										<rect
											x={face.bboxX}
											y={face.bboxY + face.bboxH + 4}
											width={labelWidth}
											height={24}
											rx={4}
											fill="rgba(234, 179, 8, 0.9)"
										/>
										<text
											x={face.bboxX + 8}
											y={face.bboxY + face.bboxH + 20}
											fill="#422006"
											font-size="13"
											font-weight="500"
										>
											Suggested: {topSuggestion.personName} ({Math.round(topSuggestion.confidence *
												100)}%)
										</text>
									</g>
								{:else}
									<!-- Unknown label -->
									<g class="face-label unknown-label">
										<rect
											x={face.bboxX}
											y={face.bboxY + face.bboxH + 4}
											width={Math.max(face.bboxW, 80)}
											height={24}
											rx={4}
											fill="rgba(100, 116, 139, 0.85)"
										/>
										<text
											x={face.bboxX + 8}
											y={face.bboxY + face.bboxH + 20}
											fill="white"
											font-size="13"
											font-style="italic"
										>
											Unknown
										</text>
									</g>
								{/if}
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
						<li
							class="face-item"
							class:highlighted={highlightedFaceId === face.faceInstanceId}
							style="--highlight-color: {getFaceColor(face)};"
						>
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
										class:other-person={face.personId &&
											(!currentPersonId || face.personId !== currentPersonId)}
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

								<!-- Unassign button for faces with a person name -->
								{#if face.personName}
									<button
										type="button"
										class="unassign-btn"
										onclick={(e) => {
											e.stopPropagation();
											handleUnassignFace(face.faceInstanceId);
										}}
										disabled={unassigningFaceId === face.faceInstanceId}
										aria-label="Unassign this face from {face.personName}"
										title="Remove label"
									>
										{#if unassigningFaceId === face.faceInstanceId}
											...
										{:else}
											✕
										{/if}
									</button>
								{/if}
							</div>

							<!-- Show PersonDropdown for unknown faces -->
							{#if !face.personId}
								<div class="person-dropdown-container">
									<PersonDropdown
										selectedPersonId={null}
										persons={persons}
										suggestions={faceSuggestions.get(face.faceInstanceId)?.suggestions ?? []}
										loading={faceSuggestions.get(face.faceInstanceId)?.loading ?? false}
										placeholder="Assign person..."
										onSelect={(personId, personName) =>
											handleAssignFace(face.faceInstanceId, personId, personName)}
										onCreate={(name) => handleCreateAndAssignFace(face.faceInstanceId, name)}
									/>

									<!-- Quick accept button for first suggestion -->
									{#if (faceSuggestions.get(face.faceInstanceId)?.suggestions?.length ?? 0) > 0}
										{@const firstSuggestion = faceSuggestions.get(face.faceInstanceId)!.suggestions[0]}
										<button
											type="button"
											class="quick-accept-btn"
											onclick={() =>
												handleAssignFace(
													face.faceInstanceId,
													firstSuggestion.personId,
													firstSuggestion.personName
												)}
											title="Accept suggestion: {firstSuggestion.personName}"
										>
											✓ {firstSuggestion.personName} ({Math.round(
												firstSuggestion.confidence * 100
											)}%)
										</button>
									{/if}
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

	.error-banner {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.75rem 1rem;
		margin: 0 1rem;
		margin-top: 1rem;
		border-radius: 6px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.error-close {
		width: 20px;
		height: 20px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1rem;
		color: #dc2626;
		opacity: 0.7;
		transition: opacity 0.2s;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.error-close:hover {
		opacity: 1;
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
		transition:
			stroke-width 0.2s,
			opacity 0.2s;
		opacity: 0.7;
	}

	.face-box:hover {
		stroke-width: 4;
		opacity: 1;
	}

	.face-box.highlighted {
		stroke-width: 6;
		opacity: 1;
		animation: pulse-box 1.5s ease-in-out infinite;
	}

	@keyframes pulse-box {
		0%,
		100% {
			stroke-width: 6;
		}
		50% {
			stroke-width: 8;
		}
	}

	.face-label {
		pointer-events: none;
		transition: opacity 0.2s ease;
	}

	.face-label text {
		font-family: system-ui, -apple-system, sans-serif;
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
		transition:
			background-color 0.2s,
			box-shadow 0.2s;
	}

	.face-item:hover {
		background-color: #f3f4f6;
	}

	.face-item.highlighted {
		background-color: #e0f2fe;
		box-shadow: inset 3px 0 0 0 var(--highlight-color, #3b82f6);
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

	.unassign-btn {
		width: 24px;
		height: 24px;
		padding: 0;
		font-size: 0.875rem;
		font-weight: 600;
		background-color: #fee;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 50%;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s,
			border-color 0.2s;
		flex-shrink: 0;
		margin-right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.unassign-btn:hover:not(:disabled) {
		background-color: #dc2626;
		color: white;
		border-color: #dc2626;
	}

	.unassign-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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

	/* PersonDropdown container */
	.person-dropdown-container {
		padding: 0.625rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Quick accept button */
	.quick-accept-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		background: #22c55e;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
		width: 100%;
	}

	.quick-accept-btn:hover {
		background: #16a34a;
	}

	.quick-accept-btn:active {
		background: #15803d;
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
