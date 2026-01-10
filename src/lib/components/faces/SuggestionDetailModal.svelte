<script lang="ts">
	import type { FaceSuggestion, FaceInstance, Person, FaceSuggestionItem } from '$lib/api/faces';
	import {
		getFacesForAsset,
		listPersons,
		assignFaceToPerson,
		createPerson,
		getFaceSuggestions,
		pinPrototype,
		unassignFace
	} from '$lib/api/faces';
	import type { AgeEraBucket } from '$lib/api/faces';
	import { API_BASE_URL } from '$lib/api/client';
	import { localSettings } from '$lib/stores/localSettings.svelte';

	// Recent persons tracking for smart sorting
	const RECENT_PERSONS_KEY = 'suggestions.recentPersonIds';
	const MAX_RECENT_PERSONS = 20;

	/**
	 * Record a person ID as recently assigned.
	 * Moves existing entries to front (MRU list behavior).
	 */
	function recordRecentPerson(personId: string): void {
		const recent = localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
		// Remove if already exists (will be moved to front)
		const filtered = recent.filter((id) => id !== personId);
		// Add to front, limit size
		const updated = [personId, ...filtered].slice(0, MAX_RECENT_PERSONS);
		localSettings.set(RECENT_PERSONS_KEY, updated);
	}

	/**
	 * Get the recency rank for a person (0 = most recent, higher = older).
	 * Returns Infinity if person has never been assigned.
	 */
	function getPersonRecencyRank(personId: string): number {
		const recent = localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
		const index = recent.indexOf(personId);
		return index === -1 ? Infinity : index;
	}
	import ImageWithFaceBoundingBoxes, {
		type FaceBox
	} from '$lib/components/faces/ImageWithFaceBoundingBoxes.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';

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
	let personSearchQuery = $state('');
	let persons = $state<Person[]>([]);
	let personsLoading = $state(false);
	let assignmentSubmitting = $state(false);
	let assignmentError = $state<string | null>(null);

	// Face highlight state (for bidirectional selection between boxes and list)
	let highlightedFaceId = $state<string | null>(null);
	let faceListItems = $state<Map<string, HTMLLIElement>>(new Map());
	let pathCopied = $state(false);

	// Pin prototype state
	let pinningFaceId = $state<string | null>(null);
	let showPinOptions = $state(false);
	let pinningInProgress = $state(false);
	let selectedEra = $state<AgeEraBucket | null>(null);

	// Undo assignment state
	let showUndoConfirm = $state(false);
	let undoInProgress = $state(false);
	let undoError = $state<string | null>(null);
	let undoSuccess = $state<string | null>(null);

	// Per-face undo state (for All Faces list)
	let undoingFaceId = $state<string | null>(null);
	let faceUndoError = $state<string | null>(null);
	let faceUndoSuccess = $state<string | null>(null);

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

	// Age era options for prototype pinning
	const ageEras: { value: AgeEraBucket; label: string }[] = [
		{ value: 'infant', label: 'Infant (0-3)' },
		{ value: 'child', label: 'Child (4-12)' },
		{ value: 'teen', label: 'Teen (13-19)' },
		{ value: 'young_adult', label: 'Young Adult (20-35)' },
		{ value: 'adult', label: 'Adult (36-55)' },
		{ value: 'senior', label: 'Senior (56+)' }
	];

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

	// Derived states for assignment panel
	let filteredPersons = $derived(() => {
		const query = personSearchQuery.toLowerCase().trim();
		let results = query
			? persons.filter((p) => p.name.toLowerCase().includes(query))
			: persons;

		// Sort by recency (most recently assigned first), then alphabetically
		return [...results].sort((a, b) => {
			const rankA = getPersonRecencyRank(a.id);
			const rankB = getPersonRecencyRank(b.id);

			// If both have same recency (or both never used), sort alphabetically
			if (rankA === rankB) {
				return a.name.localeCompare(b.name);
			}
			// Lower rank (more recent) comes first
			return rankA - rankB;
		});
	});

	let showCreateOption = $derived(
		personSearchQuery.trim().length > 0 &&
			!persons.some((p) => p.name.toLowerCase() === personSearchQuery.trim().toLowerCase())
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

	function getFaceLabel(face: FaceInstance): string {
		// For primary face, use suggestion's person name (more reliable)
		if (suggestion && face.id === suggestion.faceInstanceId && suggestion.personName) {
			return suggestion.personName;
		}
		if (face.personName) return face.personName;
		return 'Unknown';
	}

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			onClose();
		}
	}

	// Assignment handlers
	function startAssignment(faceId: string) {
		assigningFaceId = faceId;
		personSearchQuery = '';
		assignmentError = null;
	}

	function cancelAssignment() {
		assigningFaceId = null;
		personSearchQuery = '';
		assignmentError = null;
	}

	async function handleAssignFace(faceId: string, personId: string, personName: string) {
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
					photoFilename: suggestion.path?.split('/').pop() || suggestion.fullImageUrl?.split('/').pop() || 'Unknown'
				});
			}
		} catch (error) {
			console.error('Failed to assign face:', error);
			assignmentError = error instanceof Error ? error.message : 'Failed to assign face to person.';
		}
	}

	async function handleAssignToExisting(person: Person) {
		if (!assigningFaceId || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		const faceId = assigningFaceId;

		try {
			await assignFaceToPerson(faceId, person.id);

			// Record this person as recently assigned
			recordRecentPerson(person.id);

			const faceIndex = allFaces.findIndex((f) => f.id === faceId);
			if (faceIndex !== -1) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId: person.id,
					personName: person.name
				};
			}

			assigningFaceId = null;
			personSearchQuery = '';

			// Notify parent with full assignment data
			if (onFaceAssigned && suggestion) {
				onFaceAssigned({
					faceId,
					personId: person.id,
					personName: person.name,
					thumbnailUrl: `/api/v1/faces/faces/${faceId}/thumbnail`,
					photoFilename: suggestion.path?.split('/').pop() || suggestion.fullImageUrl?.split('/').pop() || 'Unknown'
				});
			}
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

			// Record this newly created person as recently assigned
			recordRecentPerson(newPerson.id);

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

			const faceIndex = allFaces.findIndex((f) => f.id === faceId);
			if (faceIndex !== -1) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId: newPerson.id,
					personName: newPerson.name
				};
			}

			assigningFaceId = null;
			personSearchQuery = '';

			// Notify parent with full assignment data
			if (onFaceAssigned && suggestion) {
				onFaceAssigned({
					faceId,
					personId: newPerson.id,
					personName: newPerson.name,
					thumbnailUrl: `/api/v1/faces/faces/${faceId}/thumbnail`,
					photoFilename: suggestion.path?.split('/').pop() || suggestion.fullImageUrl?.split('/').pop() || 'Unknown'
				});
			}
		} catch (err) {
			console.error('Failed to create person and assign:', err);
			assignmentError = err instanceof Error ? err.message : 'Failed to create person.';
		} finally {
			assignmentSubmitting = false;
		}
	}

	/**
	 * Scroll a face card into view with smooth animation
	 */
	function scrollFaceCardIntoView(faceId: string) {
		const element = faceListItems.get(faceId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

	/**
	 * Handle face selection from the face list (clicking a face card)
	 * Highlights the corresponding bounding box on the image
	 */
	function handleHighlightFace(faceId: string) {
		// Toggle selection: if already selected, deselect; otherwise select
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
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
		if (!wasSelected) {
			scrollFaceCardIntoView(faceId);
		}
	}

	/**
	 * Register a face list item element for scroll-into-view functionality
	 */
	function registerFaceListItem(node: HTMLLIElement, faceId: string) {
		faceListItems.set(faceId, node);
		return {
			destroy() {
				faceListItems.delete(faceId);
			}
		};
	}

	// Pin prototype handlers
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

		const face = allFaces.find((f) => f.id === pinningFaceId);
		if (!face?.personId) {
			console.error('Cannot pin: face must be assigned to a person first');
			return;
		}

		pinningInProgress = true;
		try {
			await pinPrototype(face.personId, face.id, {
				ageEraBucket: selectedEra ?? undefined,
				role: 'temporal'
			});

			cancelPinning();
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

	// Undo assignment handlers
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

	// Undo assignment for individual faces in the All Faces list
	async function handleUndoFaceAssignment(faceId: string) {
		if (undoingFaceId) return; // Prevent concurrent undo operations

		undoingFaceId = faceId;
		faceUndoError = null;
		faceUndoSuccess = null;

		try {
			const response = await unassignFace(faceId);

			// Update local state - reset face to unassigned
			const faceIndex = allFaces.findIndex((f) => f.id === faceId);
			if (faceIndex >= 0) {
				allFaces[faceIndex] = {
					...allFaces[faceIndex],
					personId: null,
					personName: null
				};
			}

			// Show success message
			faceUndoSuccess = `Face removed from ${response.previousPersonName}`;

			// Notify parent component
			onFaceUnassigned?.(faceId);

			// Auto-hide success message after 2 seconds
			setTimeout(() => {
				faceUndoSuccess = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to undo face assignment:', err);
			faceUndoError = err instanceof Error ? err.message : 'Failed to undo assignment';

			// Auto-hide error message after 4 seconds
			setTimeout(() => {
				faceUndoError = null;
			}, 4000);
		} finally {
			undoingFaceId = null;
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

				<!-- Faces sidebar -->
				<aside class="face-sidebar" aria-label="Detected faces">
					<h3>All Faces ({allFaces.length})</h3>

					<!-- Feedback for face undo operations -->
					{#if faceUndoSuccess}
						<Alert.Root class="mb-2 bg-green-50 border-green-200">
							<Alert.Description class="text-green-800 text-sm">{faceUndoSuccess}</Alert.Description>
						</Alert.Root>
					{/if}
					{#if faceUndoError}
						<Alert.Root variant="destructive" class="mb-2">
							<Alert.Description class="text-sm">{faceUndoError}</Alert.Description>
						</Alert.Root>
					{/if}

					{#if facesLoading}
						<div class="loading-state">Loading faces...</div>
					{:else if facesError}
						<div class="error-state">{facesError}</div>
					{:else}
						<ul class="face-list">
							{#each allFaces as face (face.id)}
								{@const isPrimary = face.id === suggestion.faceInstanceId}
								{@const suggestionState = faceSuggestions.get(face.id)}
								{@const topSuggestion = suggestionState?.suggestions?.[0]}

								<li
									use:registerFaceListItem={face.id}
									class="face-item"
									class:highlighted={highlightedFaceId === face.id}
									style="--highlight-color: {getFaceColorByIndex(allFaces.indexOf(face))};"
								>
									<div class="face-item-content">
										<button
											type="button"
											class="face-item-button"
											onclick={() => handleHighlightFace(face.id)}
											aria-label="Highlight face of {getFaceLabel(face)}"
										>
											<span
												class="face-indicator"
												style="background-color: {getFaceColorByIndex(allFaces.indexOf(face))};"
											></span>
											<div class="face-info">
												<span class="face-name">
													{#if isPrimary}
														<span class="primary-badge">Primary</span>
													{/if}
													{getFaceLabel(face)}
													{#if isPrimary}
														<span class="confidence-text">
															({confidencePercent}%)
														</span>
													{/if}
												</span>
												<span class="face-meta">
													<span
														title="How confident the AI is that this region contains a face (not person matching)"
													>
														IsFace: {(face.detectionConfidence * 100).toFixed(0)}%
													</span>
													{#if face.qualityScore !== null}
														<span title="Face quality based on clarity, lighting, and pose">
															| Quality: {face.qualityScore.toFixed(1)}
														</span>
													{/if}
												</span>
											</div>
										</button>

										<!-- Assign button for non-primary unknown faces -->
										{#if !isPrimary && !face.personName && assigningFaceId !== face.id}
											<button
												type="button"
												class="assign-btn"
												onclick={() => startAssignment(face.id)}
												aria-label="Assign this face to a person"
											>
												Assign
											</button>
										{/if}

										<!-- Undo button for assigned faces (non-primary) -->
										{#if !isPrimary && face.personId && assigningFaceId !== face.id}
											<button
												type="button"
												class="undo-btn-compact"
												onclick={() => handleUndoFaceAssignment(face.id)}
												disabled={undoingFaceId === face.id}
												aria-label="Undo assignment for {face.personName}"
												title="Remove this face from {face.personName}"
											>
												{undoingFaceId === face.id ? 'Undoing...' : 'Undo'}
											</button>
										{/if}
									</div>

									<!-- Suggestion hint for non-primary unknown faces -->
									{#if !isPrimary && !face.personName && assigningFaceId !== face.id && topSuggestion}
										<div class="suggestion-hint">
											<span class="suggestion-icon">💡</span>
											<span class="suggestion-text">
												Suggested: {topSuggestion.personName} ({Math.round(
													topSuggestion.confidence * 100
												)}%)
											</span>
											<button
												type="button"
												class="accept-suggestion-btn"
												onclick={() =>
													handleAssignFace(
														face.id,
														topSuggestion.personId,
														topSuggestion.personName
													)}
												title="Accept suggestion"
											>
												✓ Accept
											</button>
										</div>
									{/if}

									<!-- Assignment panel -->
									{#if assigningFaceId === face.id}
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
												<Alert.Root variant="destructive" class="mb-2">
													<Alert.Description>{assignmentError}</Alert.Description>
												</Alert.Root>
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
												{:else}
													<!-- Create new option -->
													{#if showCreateOption}
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

													{#if filteredPersons().length === 0 && !showCreateOption}
														<div class="no-results">No persons found</div>
													{/if}
												{/if}
											</div>
										</div>
									{/if}

									<!-- Pin as Prototype Section -->
									{#if face.personId && assigningFaceId !== face.id}
										<div class="pin-prototype-section">
											{#if pinningFaceId === face.id && showPinOptions}
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
														<button
															type="button"
															class="confirm-pin-btn"
															onclick={handlePinAsPrototype}
															disabled={pinningInProgress}
														>
															{pinningInProgress ? 'Pinning...' : 'Confirm Pin'}
														</button>
														<button type="button" class="cancel-pin-btn" onclick={cancelPinning}>
															Cancel
														</button>
													</div>
												</div>
											{:else}
												<button
													type="button"
													class="pin-prototype-btn"
													onclick={() => startPinning(face.id)}
													title="Pin this face as a prototype for the person"
												>
													Pin as Prototype
												</button>
											{/if}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
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

	.face-sidebar {
		width: 320px;
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

	.loading-state,
	.error-state {
		padding: 1rem;
		text-align: center;
		color: #666;
		font-size: 0.875rem;
	}

	.error-state {
		color: #dc2626;
	}

	.face-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		margin-bottom: 1rem;
	}

	.face-item {
		border-radius: 6px;
		border: 1px solid #e5e7eb;
		background: #fafafa;
		transition:
			background-color 0.25s ease,
			box-shadow 0.25s ease,
			transform 0.15s ease;
	}

	.face-item:hover {
		background-color: #f3f4f6;
	}

	.face-item.highlighted {
		background-color: #e0f2fe;
		box-shadow: inset 4px 0 0 0 var(--highlight-color, #3b82f6);
		outline: 2px solid var(--highlight-color, #3b82f6);
		outline-offset: -2px;
		animation: highlight-pulse 1s ease-out;
	}

	@keyframes highlight-pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.95;
		}
		100% {
			opacity: 1;
		}
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
		padding: 0.75rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
		transition: background-color 0.2s ease;
	}

	.face-item-button:hover {
		background-color: #f1f5f9;
	}

	.face-item-button:focus {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
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

	.face-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.face-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.face-name {
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.primary-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		font-size: 0.6875rem;
		font-weight: 600;
		background-color: #fef3c7;
		color: #92400e;
	}

	.confidence-text {
		font-size: 0.75rem;
		color: #666;
	}

	.face-meta {
		font-size: 0.75rem;
		color: #999;
	}

	.assign-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
		flex-shrink: 0;
	}

	.assign-btn:hover {
		background-color: #3a7bc8;
	}

	.undo-btn-compact {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background-color: #f97316;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition:
			background-color 0.2s,
			opacity 0.2s;
		flex-shrink: 0;
	}

	.undo-btn-compact:hover:not(:disabled) {
		background-color: #ea580c;
	}

	.undo-btn-compact:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Suggestion hint styles */
	.suggestion-hint {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: #fffbeb;
		border: 1px solid #fef3c7;
		border-top: none;
		margin: 0;
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

	.accept-suggestion-btn {
		padding: 0.25rem 0.5rem;
		background-color: #22c55e;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.accept-suggestion-btn:hover {
		background-color: #16a34a;
	}

	/* Assignment panel styles */
	.assignment-panel {
		background-color: #f8f9fa;
		border-top: 1px solid #e0e0e0;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.assignment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
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
		margin: 0.5rem 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.pin-prototype-btn {
		width: 100%;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.pin-prototype-btn:hover {
		background-color: #3a7bc8;
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
	}

	.pin-options select:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.pin-actions {
		display: flex;
		gap: 0.5rem;
	}

	.confirm-pin-btn {
		flex: 1;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background-color: #22c55e;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.confirm-pin-btn:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.confirm-pin-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-pin-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
	}

	.cancel-pin-btn:hover {
		background-color: #f5f5f5;
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

		.face-sidebar {
			width: 100%;
			max-height: 350px;
			border-left: none;
			border-top: 1px solid #e5e7eb;
			padding-left: 0;
			padding-top: 1rem;
		}

		.person-options {
			max-height: min(200px, 30vh);
		}
	}

	@media (max-width: 640px) {
		.image-placeholder {
			width: 320px;
			height: 320px;
		}

		.face-sidebar {
			max-height: 300px;
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
