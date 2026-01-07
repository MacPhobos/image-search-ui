<script lang="ts">
	import { onMount } from 'svelte';
	import type { PersonPhotoGroup, FaceInPhoto, FaceSuggestionItem } from '$lib/api/faces';
	import {
		listPersons,
		assignFaceToPerson,
		createPerson,
		unassignFace,
		getFaceSuggestions,
		pinPrototype
	} from '$lib/api/faces';
	import type { Person, AgeEraBucket } from '$lib/api/faces';
	import ImageWithFaceBoundingBoxes, { type FaceBox } from './ImageWithFaceBoundingBoxes.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	interface Props {
		/** Controls dialog open state */
		open?: boolean;
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
		/** Optional: called when a face is assigned/unassigned */
		onFaceAssigned?: (faceId: string, personId: string | null, personName: string | null) => void;
		/** Optional: called when a prototype is pinned */
		onPrototypePinned?: () => void;
	}

	let {
		open = $bindable(true),
		photo,
		currentPersonId = null,
		currentPersonName = null,
		onClose,
		onPrevious,
		onNext,
		onFaceAssigned,
		onPrototypePinned
	}: Props = $props();

	// State
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

	// Pin prototype state
	let pinningFaceId = $state<string | null>(null);
	let showPinOptions = $state(false);
	let pinningInProgress = $state(false);
	let selectedEra = $state<AgeEraBucket | null>(null);

	// Face suggestions state
	interface FaceSuggestionsState {
		suggestions: FaceSuggestionItem[];
		loading: boolean;
		error: string | null;
	}
	let faceSuggestions = $state.raw<Map<string, FaceSuggestionsState>>(new Map());

	// Derived states
	let filteredPersons = $derived(() => {
		const query = personSearchQuery.toLowerCase().trim();
		if (!query) return persons;
		return persons.filter((p) => p.name.toLowerCase().includes(query));
	});

	let showCreateOption = $derived(() => personSearchQuery.trim().length > 0);

	// Color palette for distinct face colors (matches ImageWithFaceBoundingBoxes)
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
		const index = photo.faces.findIndex((f) => f.faceInstanceId === face.faceInstanceId);
		return getFaceColorByIndex(index >= 0 ? index : 0);
	}

	// Map photo.faces to FaceBox[] for ImageWithFaceBoundingBoxes
	let faceBoxes = $derived<FaceBox[]>(
		photo.faces.map((face) => {
			const suggestionState = faceSuggestions.get(face.faceInstanceId);
			const topSuggestion = suggestionState?.suggestions?.[0];
			const index = photo.faces.findIndex((f) => f.faceInstanceId === face.faceInstanceId);

			let labelStyle: FaceBox['labelStyle'];
			let label: string;
			let suggestionConfidence: number | undefined;

			if (face.personName) {
				labelStyle = 'assigned';
				label = face.personName;
			} else if (suggestionState?.loading) {
				labelStyle = 'loading';
				label = 'Loading...';
			} else if (topSuggestion) {
				labelStyle = 'suggested';
				label = `Suggested: ${topSuggestion.personName}`;
				suggestionConfidence = topSuggestion.confidence;
			} else {
				labelStyle = 'unknown';
				label = 'Unknown';
			}

			return {
				id: face.faceInstanceId,
				bboxX: face.bboxX,
				bboxY: face.bboxY,
				bboxW: face.bboxW,
				bboxH: face.bboxH,
				label,
				labelStyle,
				color: getFaceColorByIndex(index),
				suggestionConfidence
			};
		})
	);

	// Helper to update faceSuggestions with proper reactivity
	// $state.raw requires reassignment to trigger reactivity (Map.set() mutations aren't tracked)
	function updateFaceSuggestion(faceId: string, state: FaceSuggestionsState) {
		const newMap = new Map(faceSuggestions);
		newMap.set(faceId, state);
		faceSuggestions = newMap;
	}

	// Load persons list and fetch suggestions when modal opens
	onMount(() => {
		// Load persons if not already loaded
		if (persons.length === 0) {
			loadPersons();
		}

		// Fetch suggestions for unknown faces
		const unknownFaces = photo.faces.filter((f) => !f.personId);
		const controller = new AbortController();

		unknownFaces.forEach((face) => {
			// Set loading state - use helper to ensure reactivity
			updateFaceSuggestion(face.faceInstanceId, { suggestions: [], loading: true, error: null });

			getFaceSuggestions(face.faceInstanceId, { signal: controller.signal })
				.then((response) => {
					updateFaceSuggestion(face.faceInstanceId, {
						suggestions: response.suggestions,
						loading: false,
						error: null
					});
				})
				.catch((err) => {
					if (err.name !== 'AbortError') {
						updateFaceSuggestion(face.faceInstanceId, {
							suggestions: [],
							loading: false,
							error: err instanceof Error ? err.message : 'Failed to load suggestions'
						});
					}
				});
		});

		// Cleanup: abort pending requests when modal unmounts
		return () => controller.abort();
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft' && onPrevious) {
			onPrevious();
		}
		if (event.key === 'ArrowRight' && onNext) {
			onNext();
		}
	}

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			onClose();
		}
	}

	function handleFaceClick(faceId: string) {
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}

	function handleHighlightFace(faceId: string) {
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
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

			// Clear suggestions for this face - create new Map to trigger reactivity
			const newMap = new Map(faceSuggestions);
			newMap.delete(faceId);
			faceSuggestions = newMap;

			// Notify parent
			onFaceAssigned?.(faceId, personId, personName);
		} catch (error) {
			console.error('Failed to assign face:', error);
			unassignmentError =
				error instanceof Error ? error.message : 'Failed to assign face to person.';
		}
	}

	// Assignment panel handlers
	async function handleAssignToExisting(person: Person) {
		if (!assigningFaceId || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		const faceId = assigningFaceId;

		try {
			await assignFaceToPerson(faceId, person.id);

			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: person.id,
					personName: person.name
				};
			}

			assigningFaceId = null;
			personSearchQuery = '';

			// Notify parent
			onFaceAssigned?.(faceId, person.id, person.name);
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
		const faceId = assigningFaceId;

		try {
			const newPerson = await createPerson(newName);
			await assignFaceToPerson(faceId, newPerson.id);

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

			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: newPerson.id,
					personName: newPerson.name
				};
			}

			assigningFaceId = null;
			personSearchQuery = '';

			// Notify parent
			onFaceAssigned?.(faceId, newPerson.id, newPerson.name);
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

			// Notify parent about unassignment
			onFaceAssigned?.(faceId, null, null);
		} catch (err) {
			console.error('Failed to unassign face:', err);
			unassignmentError = err instanceof Error ? err.message : 'Failed to unassign face.';
		} finally {
			unassigningFaceId = null;
		}
	}

	// Pin prototype handlers
	const ageEras: { value: AgeEraBucket; label: string }[] = [
		{ value: 'infant', label: 'Infant (0-3)' },
		{ value: 'child', label: 'Child (4-12)' },
		{ value: 'teen', label: 'Teen (13-19)' },
		{ value: 'young_adult', label: 'Young Adult (20-35)' },
		{ value: 'adult', label: 'Adult (36-55)' },
		{ value: 'senior', label: 'Senior (56+)' }
	];

	function startPinning(faceId: string) {
		pinningFaceId = faceId;
		showPinOptions = true;
		selectedEra = null;
	}

	function cancelPinning() {
		pinningFaceId = null;
		showPinOptions = false;
		selectedEra = null;
	}

	async function handlePinAsPrototype() {
		if (!pinningFaceId) return;

		const face = photo.faces.find((f) => f.faceInstanceId === pinningFaceId);
		if (!face?.personId) {
			alert('Cannot pin: face must be assigned to a person first');
			return;
		}

		pinningInProgress = true;
		try {
			await pinPrototype(face.personId, face.faceInstanceId, {
				ageEraBucket: selectedEra ?? undefined,
				role: 'temporal'
			});

			// Reset state
			cancelPinning();

			// Notify parent to refresh prototypes
			onPrototypePinned?.();
		} catch (err) {
			console.error('Failed to pin prototype:', err);
			alert('Failed to pin as prototype');
		} finally {
			pinningInProgress = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-[95vw] max-h-[95vh] w-auto p-0 gap-0" showCloseButton={false}>
		<Dialog.Header class="border-b px-6 py-4 flex-row justify-between items-center">
			<Dialog.Title class="text-lg font-semibold">
				{#if currentPersonName}
					Photo Preview - {currentPersonName}
				{:else}
					Photo Preview
				{/if}
			</Dialog.Title>
			<Dialog.Close class="relative opacity-70 hover:opacity-100">
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
				<span class="sr-only">Close</span>
			</Dialog.Close>
		</Dialog.Header>

		<!-- Unassignment error display -->
		{#if unassignmentError}
			<Alert variant="destructive" class="m-4 mb-0">
				<AlertDescription class="flex justify-between items-center gap-4">
					{unassignmentError}
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={() => (unassignmentError = null)}
						aria-label="Dismiss error"
					>
						✕
					</Button>
				</AlertDescription>
			</Alert>
		{/if}

		<div class="modal-body">
			<!-- Photo container with navigation -->
			<div class="photo-container">
				{#if onPrevious}
					<Button
						variant="ghost"
						size="icon-lg"
						class="nav-btn prev absolute top-1/2 left-2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white text-4xl h-auto px-3 py-5 rounded"
						onclick={onPrevious}
						aria-label="Previous photo"
					>
						‹
					</Button>
				{/if}

				<ImageWithFaceBoundingBoxes
					imageUrl={photo.fullUrl}
					faces={faceBoxes}
					{highlightedFaceId}
					onFaceClick={handleFaceClick}
				/>

				{#if onNext}
					<Button
						variant="ghost"
						size="icon-lg"
						class="nav-btn next absolute top-1/2 right-2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white text-4xl h-auto px-3 py-5 rounded"
						onclick={onNext}
						aria-label="Next photo"
					>
						›
					</Button>
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
											<span
												title="How confident the AI is that this region contains a face (not person matching)"
											>
												Detection: {(face.detectionConfidence * 100).toFixed(0)}%
											</span>
											{#if face.qualityScore !== null}
												<span title="Face quality based on clarity, lighting, and pose">
													| Quality: {face.qualityScore.toFixed(1)}
												</span>
											{/if}
										</span>
									</div>
								</button>

								<!-- Assign button for faces without a person name -->
								{#if !face.personName && assigningFaceId !== face.faceInstanceId}
									<Button
										size="sm"
										class="flex-shrink-0 mr-2 h-6 px-2 text-xs"
										onclick={(e) => {
											e.stopPropagation();
											startAssignment(face.faceInstanceId);
										}}
										aria-label="Assign this face to a person"
									>
										Assign
									</Button>
								{/if}

								<!-- Unassign button for faces with a person name -->
								{#if face.personName && assigningFaceId !== face.faceInstanceId}
									<Button
										variant="destructive"
										size="icon-sm"
										class="flex-shrink-0 mr-2 h-6 w-6 rounded-full"
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
									</Button>
								{/if}
							</div>

							<!-- Suggestion indicator for unknown faces (when not assigning) -->
							{#if !face.personName && assigningFaceId !== face.faceInstanceId}
								{@const suggestionState = faceSuggestions.get(face.faceInstanceId)}
								{@const topSuggestion = suggestionState?.suggestions?.[0]}
								{#if topSuggestion}
									<div class="suggestion-hint">
										<span class="suggestion-icon">💡</span>
										<span class="suggestion-text">
											Suggested: {topSuggestion.personName} ({Math.round(
												topSuggestion.confidence * 100
											)}%)
										</span>
										<Button
											size="sm"
											class="flex-shrink-0 h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
											onclick={() =>
												handleAssignFace(
													face.faceInstanceId,
													topSuggestion.personId,
													topSuggestion.personName
												)}
											title="Accept suggestion"
										>
											✓ Accept
										</Button>
									</div>
								{/if}
							{/if}

							<!-- Assignment panel (shown when this face is being assigned) -->
							{#if assigningFaceId === face.faceInstanceId}
								<div class="assignment-panel">
									<div class="assignment-header">
										<h4>Assign Face</h4>
										<Button
											variant="ghost"
											size="icon-sm"
											onclick={cancelAssignment}
											aria-label="Cancel assignment"
										>
											×
										</Button>
									</div>

									{#if assignmentError}
										<Alert variant="destructive" class="mb-2">
											<AlertDescription class="text-xs">{assignmentError}</AlertDescription>
										</Alert>
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

							<!-- Pin as Prototype Section -->
							{#if face.personId && assigningFaceId !== face.faceInstanceId}
								<div class="pin-prototype-section">
									{#if pinningFaceId === face.faceInstanceId && showPinOptions}
										<div class="pin-options">
											<label>
												Age Era (optional):
												<select bind:value={selectedEra}>
													<option value={null}>Auto-detect</option>
													{#each ageEras as era}
														<option value={era.value}>{era.label}</option>
													{/each}
												</select>
											</label>
											<div class="pin-actions">
												<Button
													size="sm"
													class="flex-1 bg-green-600 hover:bg-green-700"
													onclick={handlePinAsPrototype}
													disabled={pinningInProgress}
												>
													{pinningInProgress ? 'Pinning...' : 'Confirm Pin'}
												</Button>
												<Button variant="outline" size="sm" onclick={cancelPinning}>
													Cancel
												</Button>
											</div>
										</div>
									{:else}
										<Button
											size="sm"
											class="w-full"
											onclick={() => startPinning(face.faceInstanceId)}
											title="Pin this face as a prototype for the person"
										>
											Pin as Prototype
										</Button>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</aside>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>

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

	.face-sidebar {
		width: 280px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-left: 1px solid #e5e7eb;
		padding-left: 1rem;
	}

	.face-sidebar h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		flex-shrink: 0;
	}

	.face-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
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


	/* Suggestion hint styles */
	.suggestion-hint {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		background-color: #fffbeb;
		border: 1px solid #fef3c7;
		border-radius: 6px;
		margin: 0.25rem 0.625rem 0.5rem;
		font-size: 0.75rem;
	}

	.suggestion-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.suggestion-text {
		flex: 1;
		color: #92400e;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}


	/* Assignment panel styles */
	.assignment-panel {
		background-color: #f8f9fa;
		border-radius: 8px;
		padding: 0.75rem;
		margin: 0.5rem 0.625rem;
		border: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.assignment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.625rem;
		flex-shrink: 0;
	}

	.assignment-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}


	.person-search-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		transition: border-color 0.2s;
		flex-shrink: 0;
	}

	.person-search-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.person-options {
		flex: 1;
		min-height: 100px;
		max-height: min(400px, 50vh);
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

	/* Pin prototype styles */
	.pin-prototype-section {
		margin: 0.5rem 0.625rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.pin-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pin-options label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: #333;
		font-weight: 500;
	}

	.pin-options select {
		padding: 0.4rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.8125rem;
		background: white;
		transition: border-color 0.2s;
	}

	.pin-options select:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.pin-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.modal-body {
			flex-direction: column;
		}

		.face-sidebar {
			width: 100%;
			max-height: 250px;
			border-left: none;
			border-top: 1px solid #e5e7eb;
			padding-left: 0;
			padding-top: 1rem;
		}

		.person-options {
			max-height: min(200px, 30vh);
		}
	}
</style>
