<script lang="ts">
	import type { FaceSuggestion, FaceInstance, Person, FaceSuggestionItem } from '$lib/api/faces';
	import type { AgeEraBucket } from '$lib/api/faces';
	import {
		getFacesForAsset,
		listPersons,
		assignFaceToPerson,
		createPerson,
		getFaceSuggestions,
		pinPrototype,
		unassignFace
	} from '$lib/api/faces';
	import { API_BASE_URL } from '$lib/api/client';
	import { localSettings } from '$lib/stores/localSettings.svelte';
	import ImageWithFaceBoundingBoxes, {
		type FaceBox
	} from '$lib/components/faces/ImageWithFaceBoundingBoxes.svelte';
	import FaceListSidebar from '$lib/components/faces/FaceListSidebar.svelte';
	import PersonAssignmentPanel from '$lib/components/faces/PersonAssignmentPanel.svelte';
	import PrototypePinningPanel from '$lib/components/faces/PrototypePinningPanel.svelte';
	import { getFaceColorByIndex } from '$lib/components/faces/face-colors';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';

	// Recent persons tracking for smart sorting
	const RECENT_PERSONS_KEY = 'suggestions.recentPersonIds';
	const MAX_RECENT_PERSONS = 20;

	/**
	 * Record a person ID as recently assigned.
	 * Moves existing entries to front (MRU list behavior).
	 */
	function recordRecentPerson(personId: string): void {
		const recent = localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
		const filtered = recent.filter((id) => id !== personId);
		const updated = [personId, ...filtered].slice(0, MAX_RECENT_PERSONS);
		localSettings.set(RECENT_PERSONS_KEY, updated);
	}

	/**
	 * Get recent person IDs for MRU sorting
	 */
	function getRecentPersonIds(): string[] {
		return localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
	}

	interface Props {
		suggestion: FaceSuggestion | null;
		onClose: () => void;
		onAccept: (suggestion: FaceSuggestion) => void;
		onReject: (suggestion: FaceSuggestion) => void;
		onFaceAssigned?: (assignment: {
			faceId: string;
			personId: string;
			personName: string;
			thumbnailUrl: string;
			photoFilename: string;
		}) => void;
		onPrototypePinned?: () => void;
		onFaceUnassigned?: (faceId: string) => void;
	}

	let {
		suggestion,
		onClose,
		onAccept,
		onReject,
		onFaceAssigned,
		onPrototypePinned,
		onFaceUnassigned
	}: Props = $props();

	// Derive open state from suggestion
	let open = $derived(suggestion !== null);

	let isActionLoading = $state(false);

	// All faces in the image
	let allFaces = $state<FaceInstance[]>([]);
	let facesLoading = $state(false);
	let facesError = $state<string | null>(null);

	// Face assignment state
	let assigningFaceId = $state<string | null>(null);
	let persons = $state<Person[]>([]);
	let personsLoading = $state(false);
	let assignmentSubmitting = $state(false);
	let assignmentError = $state<string | null>(null);

	// Face highlight state (for bidirectional selection between boxes and list)
	let highlightedFaceId = $state<string | null>(null);
	let pathCopied = $state(false);

	// Pin prototype state
	let pinningFaceId = $state<string | null>(null);
	let showPinOptions = $state(false);
	let pinningInProgress = $state(false);

	// Undo assignment state (for primary suggestion)
	let showUndoConfirm = $state(false);
	let undoInProgress = $state(false);
	let undoError = $state<string | null>(null);
	let undoSuccess = $state<string | null>(null);

	// Face suggestions state
	interface FaceSuggestionsState {
		suggestions: FaceSuggestionItem[];
		loading: boolean;
		error: string | null;
	}
	let faceSuggestions = $state.raw<Map<string, FaceSuggestionsState>>(new Map());

	const confidencePercent = $derived(suggestion ? Math.round(suggestion.confidence * 100) : 0);
	const confidenceColor = $derived(() => {
		if (!suggestion) return '#94a3b8';
		return suggestion.confidence >= 0.9
			? '#22c55e' // green-600
			: suggestion.confidence >= 0.8
				? '#eab308' // yellow-500
				: '#f97316'; // orange-500
	});

	// Get full image URL (backend now provides this directly)
	const fullImageUrl = $derived(() => {
		if (!suggestion?.fullImageUrl) return null;
		return getImageUrl(suggestion.fullImageUrl);
	});

	// Extract assetId from fullImageUrl (handles various URL formats)
	const assetId = $derived(() => {
		if (!suggestion?.fullImageUrl) return null;
		// Try multiple patterns to extract asset ID
		// Pattern 1: /api/v1/images/{id}/full
		// Pattern 2: /images/{id}/full
		// Pattern 3: Just extract any number before /full
		const patterns = [/\/api\/v1\/images\/(\d+)\/full/, /\/images\/(\d+)\/full/, /\/(\d+)\/full/];
		for (const pattern of patterns) {
			const match = suggestion.fullImageUrl.match(pattern);
			if (match) {
				return parseInt(match[1], 10);
			}
		}
		console.warn('Could not extract assetId from fullImageUrl:', suggestion.fullImageUrl);
		return null;
	});

	// Create FaceBox array for all faces in image
	const allFaceBoxes = $derived<FaceBox[]>(
		(() => {
			if (!suggestion) return [];

			return allFaces.map((face, index) => {
				const suggestionState = faceSuggestions.get(face.id);
				const topSuggestion = suggestionState?.suggestions?.[0];
				const isPrimaryFace = face.id === suggestion.faceInstanceId;

				let labelStyle: FaceBox['labelStyle'];
				let label: string;
				let suggestionConfidence: number | undefined;

				if (isPrimaryFace) {
					labelStyle = 'suggested';
					label = `Primary: ${suggestion.personName || 'Suggested'}`;
					suggestionConfidence = suggestion.confidence;
				} else if (face.personName) {
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
					id: face.id,
					bboxX: face.bbox.x,
					bboxY: face.bbox.y,
					bboxW: face.bbox.width,
					bboxH: face.bbox.height,
					label,
					labelStyle,
					color: getFaceColorByIndex(index),
					suggestionConfidence
				};
			});
		})()
	);

	// Helper to update faceSuggestions with proper reactivity
	function updateFaceSuggestion(faceId: string, state: FaceSuggestionsState) {
		const newMap = new Map(faceSuggestions);
		newMap.set(faceId, state);
		faceSuggestions = newMap;
	}

	// Track the current abort controller for cleanup
	let abortController: AbortController | null = null;

	// Load all faces for the asset and person suggestions when suggestion changes
	$effect(() => {
		const currentAssetId = assetId();
		const currentSuggestion = suggestion;

		// Reset state when suggestion changes
		if (!currentSuggestion || !currentAssetId) {
			allFaces = [];
			facesLoading = false;
			facesError = null;
			faceSuggestions = new Map();
			return;
		}

		// Abort any pending requests
		if (abortController) {
			abortController.abort();
		}
		abortController = new AbortController();
		const controller = abortController;

		// Load all faces for the asset
		facesLoading = true;
		facesError = null;

		getFacesForAsset(currentAssetId)
			.then((response) => {
				if (controller.signal.aborted) return;

				allFaces = response.items;
				facesLoading = false;

				// Fetch suggestions for unknown faces (excluding the primary suggestion face)
				const unknownFaces = response.items.filter(
					(f) => !f.personId && f.id !== currentSuggestion.faceInstanceId
				);

				unknownFaces.forEach((face) => {
					updateFaceSuggestion(face.id, { suggestions: [], loading: true, error: null });

					getFaceSuggestions(face.id, { signal: controller.signal })
						.then((suggestionsResponse) => {
							if (controller.signal.aborted) return;
							updateFaceSuggestion(face.id, {
								suggestions: suggestionsResponse.suggestions,
								loading: false,
								error: null
							});
						})
						.catch((err) => {
							if (err.name !== 'AbortError') {
								updateFaceSuggestion(face.id, {
									suggestions: [],
									loading: false,
									error: err instanceof Error ? err.message : 'Failed to load suggestions'
								});
							}
						});
				});
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				facesError = err instanceof Error ? err.message : 'Failed to load faces';
				facesLoading = false;
			});

		// Load persons list (fetch all pages)
		if (persons.length === 0 && !personsLoading) {
			personsLoading = true;
			const fetchAllPersons = async () => {
				let allPersons: Person[] = [];
				let page = 1;
				const pageSize = 100;
				let hasMore = true;

				while (hasMore) {
					const response = await listPersons(page, pageSize, 'active');
					allPersons = [...allPersons, ...response.items];
					hasMore = response.items.length === pageSize;
					page++;
				}

				return allPersons;
			};

			fetchAllPersons()
				.then((allPersons) => {
					persons = allPersons;
				})
				.catch((err) => {
					console.error('Failed to load persons:', err);
				})
				.finally(() => {
					personsLoading = false;
				});
		}

		// Cleanup: abort pending requests when effect re-runs or component unmounts
		return () => {
			controller.abort();
		};
	});

	async function handleAccept() {
		if (!suggestion || isActionLoading) return;
		isActionLoading = true;
		try {
			await onAccept(suggestion);
			onClose();
		} finally {
			isActionLoading = false;
		}
	}

	async function handleReject() {
		if (!suggestion || isActionLoading) return;
		isActionLoading = true;
		try {
			await onReject(suggestion);
			onClose();
		} finally {
			isActionLoading = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getImageUrl(url: string | null): string {
		if (!url) return '';
		// If already absolute, use as-is
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}
		// Prepend API base URL for relative paths
		return `${API_BASE_URL}${url}`;
	}

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			onClose();
		}
	}

	// Assignment handlers (delegated to PersonAssignmentPanel)
	async function handleAssignToExisting(personId: string) {
		if (!assigningFaceId || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		const faceId = assigningFaceId;
		const person = persons.find((p) => p.id === personId);
		if (!person) {
			assignmentError = 'Person not found';
			assignmentSubmitting = false;
			return;
		}

		try {
			await assignFaceToPerson(faceId, personId);

			// Record this person as recently assigned
			recordRecentPerson(personId);

			// Optimistically update local state
			const faceIndex = allFaces.findIndex((f) => f.id === faceId);
			if (faceIndex !== -1) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId: person.id,
					personName: person.name
				};
			}

			// Clear suggestions for this face
			const newMap = new Map(faceSuggestions);
			newMap.delete(faceId);
			faceSuggestions = newMap;

			// Notify parent with full assignment data
			if (onFaceAssigned && suggestion) {
				onFaceAssigned({
					faceId,
					personId: person.id,
					personName: person.name,
					thumbnailUrl: `/api/v1/faces/faces/${faceId}/thumbnail`,
					photoFilename:
						suggestion.path?.split('/').pop() ||
						suggestion.fullImageUrl?.split('/').pop() ||
						'Unknown'
				});
			}

			// Close assignment panel
			assigningFaceId = null;
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

			// Record this newly created person as recently assigned
			recordRecentPerson(newPerson.id);

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

			// Optimistically update local state
			const faceIndex = allFaces.findIndex((f) => f.id === faceId);
			if (faceIndex !== -1) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId: newPerson.id,
					personName: newPerson.name
				};
			}

			// Clear suggestions for this face
			const newMap = new Map(faceSuggestions);
			newMap.delete(faceId);
			faceSuggestions = newMap;

			// Notify parent with full assignment data
			if (onFaceAssigned && suggestion) {
				onFaceAssigned({
					faceId,
					personId: newPerson.id,
					personName: newPerson.name,
					thumbnailUrl: `/api/v1/faces/faces/${faceId}/thumbnail`,
					photoFilename:
						suggestion.path?.split('/').pop() ||
						suggestion.fullImageUrl?.split('/').pop() ||
						'Unknown'
				});
			}

			// Close assignment panel
			assigningFaceId = null;
		} catch (err) {
			console.error('Failed to create person and assign:', err);
			assignmentError = err instanceof Error ? err.message : 'Failed to create person.';
		} finally {
			assignmentSubmitting = false;
		}
	}

	// Accept suggestion from face list (for non-primary faces)
	async function handleSuggestionAccept(faceId: string, personId: string, personName: string) {
		try {
			await assignFaceToPerson(faceId, personId);

			// Record this person as recently assigned
			recordRecentPerson(personId);

			// Optimistically update local state
			const faceIndex = allFaces.findIndex((f) => f.id === faceId);
			if (faceIndex >= 0) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId,
					personName
				};
			}

			// Clear suggestions for this face
			const newMap = new Map(faceSuggestions);
			newMap.delete(faceId);
			faceSuggestions = newMap;

			// Notify parent with full assignment data
			if (onFaceAssigned && suggestion) {
				onFaceAssigned({
					faceId,
					personId,
					personName,
					thumbnailUrl: `/api/v1/faces/faces/${faceId}/thumbnail`,
					photoFilename:
						suggestion.path?.split('/').pop() ||
						suggestion.fullImageUrl?.split('/').pop() ||
						'Unknown'
				});
			}
		} catch (error) {
			console.error('Failed to assign face:', error);
			// Error handling could be improved here
		}
	}

	/**
	 * Handle face selection from the image (clicking a bounding box or label)
	 */
	function handleFaceClick(faceId: string) {
		// Toggle selection
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}

	// Pin prototype handlers (delegated to PrototypePinningPanel)
	async function handlePinConfirm(era: AgeEraBucket | null) {
		if (!pinningFaceId) return;

		const face = allFaces.find((f) => f.id === pinningFaceId);
		if (!face?.personId) {
			console.error('Cannot pin: face must be assigned to a person first');
			return;
		}

		pinningInProgress = true;
		try {
			await pinPrototype(face.personId, face.id, {
				ageEraBucket: era ?? undefined,
				role: 'temporal'
			});

			// Close pinning panel
			pinningFaceId = null;
			showPinOptions = false;

			// Notify parent
			onPrototypePinned?.();
		} catch (err) {
			console.error('Failed to pin prototype:', err);
		} finally {
			pinningInProgress = false;
		}
	}

	async function copyPath() {
		// Use the path field (original filesystem path) if available, fallback to fullImageUrl
		const pathToCopy = suggestion?.path || suggestion?.fullImageUrl;
		if (!pathToCopy) return;

		try {
			await navigator.clipboard.writeText(pathToCopy);
			pathCopied = true;
			setTimeout(() => {
				pathCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy path:', err);
		}
	}

	// Undo assignment handlers (for primary suggestion and face list)
	function startUndoAssignment() {
		showUndoConfirm = true;
		undoError = null;
		undoSuccess = null;
	}

	function cancelUndoAssignment() {
		showUndoConfirm = false;
		undoError = null;
	}

	async function confirmUndoAssignment() {
		if (!suggestion || undoInProgress) return;

		undoInProgress = true;
		undoError = null;
		undoSuccess = null;

		try {
			const response = await unassignFace(suggestion.faceInstanceId);

			// Update local state - reset face to unassigned
			const faceIndex = allFaces.findIndex((f) => f.id === suggestion.faceInstanceId);
			if (faceIndex >= 0) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId: null,
					personName: null
				};
			}

			// Show success message
			undoSuccess = `Assignment undone. Face removed from ${response.previousPersonName}.`;

			// Notify parent component
			onFaceUnassigned?.(suggestion.faceInstanceId);

			// Close confirmation dialog
			showUndoConfirm = false;

			// Auto-hide success message after 3 seconds
			setTimeout(() => {
				undoSuccess = null;
			}, 3000);
		} catch (err) {
			console.error('Failed to undo assignment:', err);
			undoError = err instanceof Error ? err.message : 'Failed to undo assignment';
		} finally {
			undoInProgress = false;
		}
	}

	// Undo assignment for individual faces in the face list (delegated from FaceListSidebar)
	async function handleUnassignClick(faceId: string) {
		try {
			await unassignFace(faceId);

			// Update local state - reset face to unassigned
			const faceIndex = allFaces.findIndex((f) => f.id === faceId);
			if (faceIndex >= 0) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId: null,
					personName: null
				};
			}

			// Notify parent component
			onFaceUnassigned?.(faceId);
		} catch (err) {
			console.error('Failed to undo face assignment:', err);
			// Error handling could be improved here
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="!max-w-[98vw] !max-h-[98vh] w-[98vw] h-[98vh] p-0 gap-0 flex flex-col">
		<Dialog.Header class="px-6 py-4 border-b flex-shrink-0">
			<div class="flex flex-col gap-1 flex-1">
				<Dialog.Title>Face Suggestion Details</Dialog.Title>
				{#if suggestion?.path}
					<div class="flex flex-wrap gap-3 text-sm text-muted-foreground">
						<!-- Display real filesystem path -->
						<span class="flex items-center gap-1" title={suggestion.path}>
							<span aria-hidden="true">📁</span>
							<span class="truncate max-w-[300px]">
								{suggestion.path.split('/').pop() || 'Path'}
							</span>
							<button
								type="button"
								onclick={copyPath}
								class="copy-path-btn"
								title="Copy filesystem path"
								aria-label="Copy filesystem path to clipboard"
							>
								{pathCopied ? '✓' : '📋'}
							</button>
						</span>
					</div>
				{:else if suggestion?.fullImageUrl}
					<div class="flex flex-wrap gap-3 text-sm text-muted-foreground">
						<!-- Fallback: Image URL Display -->
						<span class="flex items-center gap-1" title={suggestion.fullImageUrl}>
							<span aria-hidden="true">📁</span>
							<span class="truncate max-w-[300px]">
								{suggestion.fullImageUrl.split('/').pop() || 'Image URL'}
							</span>
							<button
								type="button"
								onclick={copyPath}
								class="copy-path-btn"
								title="Copy image URL"
								aria-label="Copy image URL to clipboard"
							>
								{pathCopied ? '✓' : '📋'}
							</button>
						</span>
					</div>
				{/if}
			</div>
		</Dialog.Header>

		{#if suggestion}
			<div class="modal-body">
				<!-- Image container -->
				<div class="image-container">
					{#if fullImageUrl()}
						<ImageWithFaceBoundingBoxes
							imageUrl={fullImageUrl() ?? ''}
							faces={allFaceBoxes}
							primaryFaceId={suggestion.faceInstanceId}
							{highlightedFaceId}
							onFaceClick={handleFaceClick}
							maxHeight="75vh"
						/>
					{:else}
						<div class="image-placeholder">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="8" r="4" />
								<path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
							</svg>
						</div>
					{/if}
				</div>

				<!-- Faces sidebar and details -->
				<aside class="face-sidebar-container" aria-label="Detected faces and primary suggestion">
					{#if facesLoading}
						<div class="sidebar-loading">Loading faces...</div>
					{:else if facesError}
						<div class="sidebar-error">{facesError}</div>
					{:else}
						<FaceListSidebar
							faces={allFaces}
							{highlightedFaceId}
							primaryFaceId={suggestion.faceInstanceId}
							primaryFacePersonName={suggestion.personName}
							{faceSuggestions}
							showUnassignButton={true}
							showPinButton={true}
							showSuggestions={true}
							onFaceClick={handleFaceClick}
							onAssignClick={(faceId) => {
								assigningFaceId = faceId;
							}}
							onUnassignClick={handleUnassignClick}
							onPinClick={(faceId) => {
								const face = allFaces.find((f) => f.id === faceId);
								if (face?.personId) {
									pinningFaceId = faceId;
									showPinOptions = true;
								}
							}}
							onSuggestionAccept={handleSuggestionAccept}
						/>
					{/if}

					<!-- Primary suggestion details -->
					<div class="primary-details">
						<h4>Primary Suggestion</h4>
						<div class="detail-row">
							<span class="detail-label">Person:</span>
							<span class="detail-value person-name">
								{suggestion.personName || 'Unknown'}
							</span>
						</div>

						<div class="detail-row">
							<span class="detail-label">Confidence:</span>
							<span class="detail-value confidence" style="color: {confidenceColor()}">
								{confidencePercent}%
							</span>
						</div>

						<div class="detail-row">
							<span class="detail-label">Status:</span>
							<Badge
								variant={suggestion.status === 'accepted'
									? 'default'
									: suggestion.status === 'rejected'
										? 'destructive'
										: 'secondary'}
								class={suggestion.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
							>
								{suggestion.status}
							</Badge>
						</div>

						<div class="detail-row">
							<span class="detail-label">Created:</span>
							<span class="detail-value">{formatDate(suggestion.createdAt)}</span>
						</div>

						<!-- Undo Assignment Button -->
						{#if suggestion.status === 'accepted' || allFaces.find((f) => f.id === suggestion.faceInstanceId)?.personId}
							<div class="undo-section">
								{#if undoSuccess}
									<Alert.Root class="mb-2 bg-green-50 border-green-200">
										<Alert.Description class="text-green-800">{undoSuccess}</Alert.Description>
									</Alert.Root>
								{/if}
								{#if undoError}
									<Alert.Root variant="destructive" class="mb-2">
										<Alert.Description>{undoError}</Alert.Description>
									</Alert.Root>
								{/if}
								<button
									type="button"
									class="undo-assignment-btn"
									onclick={startUndoAssignment}
									disabled={undoInProgress}
									title="Remove this face from the assigned person"
								>
									{undoInProgress ? 'Undoing...' : 'Undo Assignment'}
								</button>
							</div>
						{/if}
					</div>
				</aside>
			</div>

			<!-- Person Assignment Panel (shown when a face is being assigned) -->
			{#if assigningFaceId}
				<PersonAssignmentPanel
					open={true}
					faceId={assigningFaceId}
					{persons}
					{personsLoading}
					submitting={assignmentSubmitting}
					error={assignmentError}
					recentPersonIds={getRecentPersonIds()}
					onCancel={() => {
						assigningFaceId = null;
					}}
					onAssignToExisting={handleAssignToExisting}
					onCreateAndAssign={handleCreateAndAssign}
				/>
			{/if}

			<!-- Prototype Pinning Panel (shown when pinning a face) -->
			{#if pinningFaceId && showPinOptions}
				{@const pinningFace = allFaces.find((f) => f.id === pinningFaceId)}
				{#if pinningFace?.personId}
					<PrototypePinningPanel
						open={true}
						faceId={pinningFaceId}
						personId={pinningFace.personId}
						personName={pinningFace.personName ?? 'Unknown'}
						submitting={pinningInProgress}
						onCancel={() => {
							pinningFaceId = null;
							showPinOptions = false;
						}}
						onConfirm={handlePinConfirm}
					/>
				{/if}
			{/if}

			{#if suggestion.status === 'pending'}
				<Dialog.Footer class="px-6 py-4 border-t flex-shrink-0 justify-end gap-3">
					<Button
						variant="default"
						class="bg-green-600 hover:bg-green-700"
						onclick={handleAccept}
						disabled={isActionLoading}
					>
						{isActionLoading ? 'Processing...' : '✓ Accept Primary'}
					</Button>
					<Button variant="destructive" onclick={handleReject} disabled={isActionLoading}>
						{isActionLoading ? 'Processing...' : '✗ Reject Primary'}
					</Button>
				</Dialog.Footer>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Undo Confirmation Dialog -->
<Dialog.Root open={showUndoConfirm} onOpenChange={(open) => !open && cancelUndoAssignment()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Undo Assignment</Dialog.Title>
		</Dialog.Header>

		<div class="py-4">
			<p class="text-sm text-gray-700 mb-4">
				{#if suggestion}
					Remove this face from <strong>{suggestion.personName}</strong>? The face will return to
					unassigned state and can be reassigned later.
				{:else}
					Remove this face assignment?
				{/if}
			</p>

			{#if undoError}
				<Alert.Root variant="destructive" class="mb-2">
					<Alert.Description>{undoError}</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={cancelUndoAssignment} disabled={undoInProgress}>
				Cancel
			</Button>
			<Button
				variant="destructive"
				onclick={confirmUndoAssignment}
				disabled={undoInProgress}
				class="bg-orange-600 hover:bg-orange-700"
			>
				{undoInProgress ? 'Undoing...' : 'Confirm Undo'}
			</Button>
		</Dialog.Footer>
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

	.image-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		min-height: 0;
	}

	.image-placeholder {
		width: 400px;
		height: 400px;
		border-radius: 12px;
		background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.image-placeholder svg {
		width: 80px;
		height: 80px;
		opacity: 0.8;
	}

	.face-sidebar-container {
		width: 320px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-left: 1px solid #e5e7eb;
		padding-left: 1rem;
	}

	.sidebar-loading,
	.sidebar-error {
		padding: 1rem;
		text-align: center;
		color: #666;
		font-size: 0.875rem;
	}

	.sidebar-error {
		color: #dc2626;
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

	/* Primary suggestion details */
	.primary-details {
		flex-shrink: 0;
		border-top: 2px solid #e5e7eb;
		padding-top: 1rem;
		margin-top: auto;
	}

	.primary-details h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0;
		border-bottom: 1px solid #f0f0f0;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #666;
	}

	.detail-value {
		font-size: 0.75rem;
		color: #333;
	}

	.person-name {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.confidence {
		font-weight: 700;
		font-size: 0.875rem;
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.modal-body {
			flex-direction: column;
		}

		.face-sidebar-container {
			width: 100%;
			border-left: none;
			border-top: 1px solid #e5e7eb;
			padding-left: 0;
			padding-top: 1rem;
		}
	}

	@media (max-width: 640px) {
		.image-placeholder {
			width: 320px;
			height: 320px;
		}
	}

	/* Undo assignment styles */
	.undo-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.undo-assignment-btn {
		width: 100%;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		background-color: #f97316;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition:
			background-color 0.2s,
			opacity 0.2s;
	}

	.undo-assignment-btn:hover:not(:disabled) {
		background-color: #ea580c;
	}

	.undo-assignment-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
