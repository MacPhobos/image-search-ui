<script lang="ts">
	import { onMount } from 'svelte';
	import type { PersonPhotoGroup, FaceInPhoto, FaceSuggestionItem } from '$lib/api/faces';
	import {
		fetchAllPersons,
		assignFaceToPerson,
		createPerson,
		unassignFace,
		getFaceSuggestions,
		pinPrototype
	} from '$lib/api/faces';
	import type { Person, AgeEraBucket } from '$lib/api/faces';
	import ImageWithFaceBoundingBoxes, { type FaceBox } from './ImageWithFaceBoundingBoxes.svelte';
	import FaceListSidebar from './FaceListSidebar.svelte';
	import PersonAssignmentPanel from './PersonAssignmentPanel.svelte';
	import PrototypePinningPanel from './PrototypePinningPanel.svelte';
	import { getFaceColorByIndex } from './face-colors';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { toast } from 'svelte-sonner';

	// Extended interface for FaceListSidebar that includes personAgeAtPhoto
	interface FaceInstanceWithAge {
		id: string;
		assetId: number;
		bboxX: number;
		bboxY: number;
		bboxW: number;
		bboxH: number;
		detectionConfidence: number;
		qualityScore: number | null;
		personId: string | null;
		personName: string | null;
		personAgeAtPhoto?: number | null;
	}

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
	let pathCopied = $state(false);
	let sidebarRef = $state<FaceListSidebar>();

	// Face assignment state
	let assigningFaceId = $state<string | null>(null);
	let persons = $state<Person[]>([]);
	let personsLoading = $state(false);
	let assignmentSubmitting = $state(false);
	let assignmentError = $state<string | null>(null);

	// Face unassignment state
	let unassigningFaceId = $state<string | null>(null);
	let unassignmentError = $state<string | null>(null);

	// Pin prototype state
	let pinningFaceId = $state<string | null>(null);
	let showPinOptions = $state(false);
	let pinningInProgress = $state(false);

	// Face suggestions state
	interface FaceSuggestionsState {
		suggestions: FaceSuggestionItem[];
		loading: boolean;
		error: string | null;
	}
	let faceSuggestions = $state.raw<Map<string, FaceSuggestionsState>>(new Map());

	// Convert PersonPhotoGroup faces to FaceInstanceWithAge[] for shared components
	let faceInstances = $derived<FaceInstanceWithAge[]>(
		photo.faces.map((face) => ({
			id: face.faceInstanceId,
			assetId: photo.photoId,
			bboxX: face.bboxX,
			bboxY: face.bboxY,
			bboxW: face.bboxW,
			bboxH: face.bboxH,
			detectionConfidence: face.detectionConfidence,
			qualityScore: face.qualityScore,
			personId: face.personId,
			personName: face.personName,
			personAgeAtPhoto: face.personAgeAtPhoto
		}))
	);

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

	/**
	 * Handle face selection from the image (clicking a bounding box or label)
	 * Scrolls the face list to show the corresponding face card
	 */
	function handleFaceClick(faceId: string) {
		// Toggle selection
		const wasSelected = highlightedFaceId === faceId;
		highlightedFaceId = wasSelected ? null : faceId;

		// Scroll to the face card in the list (unless deselecting)
		if (!wasSelected && sidebarRef) {
			sidebarRef.scrollToFace(faceId);
		}
	}

	/**
	 * Handle face selection from the face list (clicking a face card)
	 * Highlights the corresponding bounding box on the image
	 */
	function handleSidebarFaceClick(faceId: string) {
		// Toggle selection: if already selected, deselect; otherwise select
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}

	async function loadPersons() {
		personsLoading = true;
		try {
			persons = await fetchAllPersons('active');
		} catch (err) {
			console.error('Failed to load persons:', err);
		} finally {
			personsLoading = false;
		}
	}

	// Face assignment handlers
	function handleAssignClick(faceId: string) {
		const face = photo.faces.find((f) => f.faceInstanceId === faceId);
		if (face?.personName) return;

		assigningFaceId = faceId;
		highlightedFaceId = faceId;
		assignmentError = null;

		if (persons.length === 0) {
			loadPersons();
		}
	}

	async function handleAssignToExisting(personId: string) {
		if (!assigningFaceId || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		const faceId = assigningFaceId;
		const person = persons.find((p) => p.id === personId);
		if (!person) return;

		try {
			await assignFaceToPerson(faceId, person.id);

			// Update local state
			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: person.id,
					personName: person.name
				};
			}

			// Clear suggestions for this face
			const newMap = new Map(faceSuggestions);
			newMap.delete(faceId);
			faceSuggestions = newMap;

			assigningFaceId = null;
			onFaceAssigned?.(faceId, person.id, person.name);
		} catch (err) {
			console.error('Failed to assign face:', err);
			assignmentError = err instanceof Error ? err.message : 'Failed to assign face.';
		} finally {
			assignmentSubmitting = false;
		}
	}

	async function handleCreateAndAssign(newName: string) {
		if (!assigningFaceId || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		const faceId = assigningFaceId;

		try {
			const newPerson = await createPerson(newName);
			await assignFaceToPerson(faceId, newPerson.id);

			// Add to persons list
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

			// Update local state
			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: newPerson.id,
					personName: newPerson.name
				};
			}

			// Clear suggestions for this face
			const newMap = new Map(faceSuggestions);
			newMap.delete(faceId);
			faceSuggestions = newMap;

			assigningFaceId = null;
			onFaceAssigned?.(faceId, newPerson.id, newPerson.name);
		} catch (err) {
			console.error('Failed to create person and assign:', err);
			assignmentError = err instanceof Error ? err.message : 'Failed to create person.';
		} finally {
			assignmentSubmitting = false;
		}
	}

	async function handleUnassignClick(faceId: string) {
		const face = photo.faces.find((f) => f.faceInstanceId === faceId);
		if (!face?.personName) return;

		if (!confirm(`Unassign "${face.personName}" from this face?`)) {
			return;
		}

		unassigningFaceId = faceId;
		unassignmentError = null;

		try {
			await unassignFace(faceId);

			// Update local state
			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex !== -1) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId: null,
					personName: null
				};
			}

			onFaceAssigned?.(faceId, null, null);
		} catch (err) {
			console.error('Failed to unassign face:', err);
			unassignmentError = err instanceof Error ? err.message : 'Failed to unassign face.';
		} finally {
			unassigningFaceId = null;
		}
	}

	async function handleSuggestionAccept(faceId: string, personId: string, personName: string) {
		try {
			await assignFaceToPerson(faceId, personId);

			// Update local state
			const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
			if (faceIndex >= 0) {
				photo.faces[faceIndex] = {
					...photo.faces[faceIndex],
					personId,
					personName
				};
			}

			// Clear suggestions for this face
			const newMap = new Map(faceSuggestions);
			newMap.delete(faceId);
			faceSuggestions = newMap;

			onFaceAssigned?.(faceId, personId, personName);
		} catch (error) {
			console.error('Failed to assign face:', error);
			unassignmentError =
				error instanceof Error ? error.message : 'Failed to assign face to person.';
		}
	}

	// Pin prototype handlers
	function handlePinClick(faceId: string) {
		pinningFaceId = faceId;
		showPinOptions = true;
	}

	async function handlePinConfirm(era: AgeEraBucket | null) {
		if (!pinningFaceId) return;

		const face = photo.faces.find((f) => f.faceInstanceId === pinningFaceId);
		if (!face?.personId) {
			toast.error('Cannot pin: face must be assigned to a person first');
			return;
		}

		pinningInProgress = true;
		try {
			await pinPrototype(face.personId, face.faceInstanceId, {
				ageEraBucket: era ?? undefined,
				role: 'temporal'
			});

			pinningFaceId = null;
			showPinOptions = false;

			onPrototypePinned?.();
			toast.success('Prototype pinned successfully');
		} catch (err) {
			console.error('Failed to pin prototype:', err);
			toast.error('Failed to pin as prototype', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			pinningInProgress = false;
		}
	}

	async function copyPath() {
		if (!photo.path) return;

		try {
			await navigator.clipboard.writeText(photo.path);
			pathCopied = true;
			setTimeout(() => {
				pathCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy path:', err);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="!max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 gap-0 flex flex-col" showCloseButton={false}>
		<Dialog.Header class="border-b px-6 py-4 flex-row justify-between items-center flex-shrink-0">
			<div class="flex flex-col gap-1 flex-1">
				<Dialog.Title class="text-lg font-semibold">
					{#if currentPersonName}
						Photo Preview - {currentPersonName}
					{:else}
						Photo Preview
					{/if}
				</Dialog.Title>
				{#if photo.takenAt || photo.camera || photo.location || photo.path}
					<div class="flex flex-wrap gap-3 text-sm text-muted-foreground">
						{#if photo.takenAt}
							<span class="flex items-center gap-1">
								<span aria-hidden="true">📅</span>
								<span>
									{new Date(photo.takenAt).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
								</span>
							</span>
						{/if}
						{#if photo.camera && (photo.camera.make || photo.camera.model)}
							<span class="flex items-center gap-1">
								<span aria-hidden="true">📷</span>
								<span>
									{[photo.camera.make, photo.camera.model].filter(Boolean).join(' ')}
								</span>
							</span>
						{/if}
						{#if photo.location}
							<span class="flex items-center gap-1">
								<span aria-hidden="true">📍</span>
								<span>
									{photo.location.lat.toFixed(4)}°, {photo.location.lng.toFixed(4)}°
								</span>
							</span>
						{/if}
						{#if photo.path}
							<span class="flex items-center gap-1" title={photo.path}>
								<span aria-hidden="true">📁</span>
								<span class="truncate max-w-[300px]">
									{photo.path.split('/').pop() || photo.path}
								</span>
								<button
									type="button"
									onclick={copyPath}
									class="copy-path-btn"
									title="Copy full path"
									aria-label="Copy full path to clipboard"
								>
									{pathCopied ? '✓' : '📋'}
								</button>
							</span>
						{/if}
					</div>
				{/if}
			</div>
			<Dialog.Close class="relative opacity-70 hover:opacity-100 ml-4">
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

			<!-- Face list sidebar (shared component) -->
			<FaceListSidebar
				bind:this={sidebarRef}
				faces={faceInstances}
				{highlightedFaceId}
				{currentPersonId}
				{faceSuggestions}
				showUnassignButton={true}
				showPinButton={true}
				showSuggestions={true}
				onFaceClick={handleSidebarFaceClick}
				onAssignClick={handleAssignClick}
				onUnassignClick={handleUnassignClick}
				onPinClick={handlePinClick}
				onSuggestionAccept={handleSuggestionAccept}
			/>
		</div>

		<!-- Assignment panel (shown when a face is being assigned) -->
		{#if assigningFaceId}
			<PersonAssignmentPanel
				open={true}
				faceId={assigningFaceId}
				{persons}
				{personsLoading}
				submitting={assignmentSubmitting}
				error={assignmentError}
				onCancel={() => { assigningFaceId = null; }}
				onAssignToExisting={handleAssignToExisting}
				onCreateAndAssign={handleCreateAndAssign}
			/>
		{/if}

		<!-- Pin prototype panel (shown when pinning a face) -->
		{#if pinningFaceId && showPinOptions}
			{@const face = photo.faces.find((f) => f.faceInstanceId === pinningFaceId)}
			{#if face?.personId && face?.personName}
				<PrototypePinningPanel
					open={true}
					faceId={pinningFaceId}
					personId={face.personId}
					personName={face.personName}
					submitting={pinningInProgress}
					onCancel={() => { pinningFaceId = null; showPinOptions = false; }}
					onConfirm={handlePinConfirm}
				/>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.modal-body {
		display: flex;
		gap: 1rem;
		overflow: hidden;
		flex: 1;
		min-height: 0;
		padding: 1.5rem;
		height: 100%;
	}

	.photo-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-width: 0;
		min-height: 0;
		max-height: 100%;
		overflow: hidden;
		background: #000;
		border-radius: 8px;
	}

	/* Make the image component fill more space */
	.photo-container :global(img) {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
	}

	/* Copy path button */
	.copy-path-btn {
		border: none;
		background: none;
		cursor: pointer;
		padding: 0;
		margin: 0;
		font-size: 0.875rem;
		line-height: 1;
		opacity: 0.6;
		transition: opacity 0.2s ease;
		flex-shrink: 0;
	}

	.copy-path-btn:hover {
		opacity: 1;
	}

	.copy-path-btn:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		border-radius: 2px;
	}

	.copy-path-btn:active {
		transform: scale(0.95);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.modal-body {
			flex-direction: column;
		}
	}
</style>
