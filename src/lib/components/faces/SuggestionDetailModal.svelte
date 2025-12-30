<script lang="ts">
	import type { FaceSuggestion, FaceInstance, Person, FaceSuggestionItem } from '$lib/api/faces';
	import {
		getFacesForAsset,
		listPersons,
		assignFaceToPerson,
		createPerson,
		getFaceSuggestions
	} from '$lib/api/faces';
	import { API_BASE_URL } from '$lib/api/client';
	import ImageWithFaceBoundingBoxes, {
		type FaceBox
	} from '$lib/components/faces/ImageWithFaceBoundingBoxes.svelte';

	interface Props {
		suggestion: FaceSuggestion | null;
		onClose: () => void;
		onAccept: (suggestion: FaceSuggestion) => void;
		onReject: (suggestion: FaceSuggestion) => void;
		onFaceAssigned?: (faceId: string, personId: string, personName: string) => void;
	}

	let { suggestion, onClose, onAccept, onReject, onFaceAssigned }: Props = $props();

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

	// Face highlight state
	let highlightedFaceId = $state<string | null>(null);

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
		const patterns = [
			/\/api\/v1\/images\/(\d+)\/full/,
			/\/images\/(\d+)\/full/,
			/\/(\d+)\/full/
		];
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
	const allFaceBoxes = $derived<FaceBox[]>((() => {
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
	})());

	// Derived states for assignment panel
	let filteredPersons = $derived(() => {
		const query = personSearchQuery.toLowerCase().trim();
		if (!query) return persons.slice(0, 10);
		return persons.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 10);
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

		// Load persons list (only once)
		if (persons.length === 0) {
			listPersons(1, 100, 'active')
				.then((response) => {
					persons = response.items;
				})
				.catch((err) => {
					console.error('Failed to load persons:', err);
				});
		}

		// Cleanup: abort pending requests when effect re-runs or component unmounts
		return () => {
			controller.abort();
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

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
		if (face.personName) return face.personName;
		return 'Unknown';
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

			// Notify parent
			onFaceAssigned?.(faceId, personId, personName);
		} catch (error) {
			console.error('Failed to assign face:', error);
			assignmentError =
				error instanceof Error ? error.message : 'Failed to assign face to person.';
		}
	}

	async function handleAssignToExisting(person: Person) {
		if (!assigningFaceId || assignmentSubmitting) return;

		assignmentSubmitting = true;
		assignmentError = null;

		const faceId = assigningFaceId;

		try {
			await assignFaceToPerson(faceId, person.id);

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

			// Notify parent
			onFaceAssigned?.(faceId, newPerson.id, newPerson.name);
		} catch (err) {
			console.error('Failed to create person and assign:', err);
			assignmentError = err instanceof Error ? err.message : 'Failed to create person.';
		} finally {
			assignmentSubmitting = false;
		}
	}

	function handleHighlightFace(faceId: string) {
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}

	function handleFaceClick(faceId: string) {
		highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if suggestion}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<header class="modal-header">
				<h2 id="modal-title">Face Suggestion Details</h2>
				<button type="button" class="close-button" onclick={onClose} aria-label="Close modal">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</header>

			<div class="modal-body">
				<!-- Image container -->
				<div class="image-container">
					{#if fullImageUrl()}
						<ImageWithFaceBoundingBoxes
							imageUrl={fullImageUrl() ?? ''}
							faces={allFaceBoxes}
							primaryFaceId={suggestion.faceInstanceId}
							highlightedFaceId={highlightedFaceId}
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
													Conf: {(face.detectionConfidence * 100).toFixed(0)}%
													{#if face.qualityScore !== null}
														| Q: {face.qualityScore.toFixed(1)}
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
													handleAssignFace(face.id, topSuggestion.personId, topSuggestion.personName)}
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
							<span
								class="status-badge {suggestion.status === 'accepted'
									? 'accepted'
									: suggestion.status === 'rejected'
										? 'rejected'
										: suggestion.status === 'expired'
											? 'expired'
											: 'pending'}"
							>
								{suggestion.status}
							</span>
						</div>

						<div class="detail-row">
							<span class="detail-label">Created:</span>
							<span class="detail-value">{formatDate(suggestion.createdAt)}</span>
						</div>
					</div>
				</aside>
			</div>

			{#if suggestion.status === 'pending'}
				<footer class="modal-footer">
					<button
						type="button"
						class="btn btn-accept"
						onclick={handleAccept}
						disabled={isActionLoading}
					>
						{isActionLoading ? 'Processing...' : '✓ Accept Primary'}
					</button>
					<button
						type="button"
						class="btn btn-reject"
						onclick={handleReject}
						disabled={isActionLoading}
					>
						{isActionLoading ? 'Processing...' : '✗ Reject Primary'}
					</button>
				</footer>
			{/if}
		</div>
	</div>
{/if}

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

	.modal {
		background: white;
		border-radius: 12px;
		max-width: 95vw;
		width: auto;
		max-height: 95vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		overflow: hidden;
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
		padding: 0.75rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	.face-item-button:hover {
		background-color: #f1f5f9;
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
		max-height: 200px;
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

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.status-badge.pending {
		background-color: #fef3c7;
		color: #92400e;
	}

	.status-badge.accepted {
		background-color: #d1fae5;
		color: #065f46;
	}

	.status-badge.rejected {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.status-badge.expired {
		background-color: #f1f5f9;
		color: #475569;
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e0e0e0;
		flex-shrink: 0;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.1s;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-accept {
		background-color: #22c55e;
		color: white;
	}

	.btn-accept:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.btn-reject {
		background-color: #ef4444;
		color: white;
	}

	.btn-reject:hover:not(:disabled) {
		background-color: #dc2626;
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
			max-height: 150px;
		}
	}

	@media (max-width: 640px) {
		.modal {
			max-width: 100%;
		}

		.image-placeholder {
			width: 320px;
			height: 320px;
		}

		.modal-footer {
			flex-direction: column;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}

		.face-sidebar {
			max-height: 300px;
		}
	}
</style>
