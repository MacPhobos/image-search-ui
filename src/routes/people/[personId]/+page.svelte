<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getPersonById,
		fetchAllPersons,
		mergePersons,
		getPersonPhotos,
		getPrototypes,
		unpinPrototype,
		recomputePrototypes,
		pinPrototype,
		deletePrototype,
		regenerateSuggestions,
		updatePerson,
		toAbsoluteUrl
	} from '$lib/api/faces';
	import { ApiError } from '$lib/api/client';
	import PersonPhotosTab from '$lib/components/faces/PersonPhotosTab.svelte';
	import PhotoPreviewModal from '$lib/components/faces/PhotoPreviewModal.svelte';
	import TemporalTimeline from '$lib/components/faces/TemporalTimeline.svelte';
	import CoverageIndicator from '$lib/components/faces/CoverageIndicator.svelte';
	import FindMoreDialog from '$lib/components/faces/FindMoreDialog.svelte';
	import type { Person, Prototype, TemporalCoverage, AgeEraBucket } from '$lib/types';
	import type { PersonPhotoGroup } from '$lib/api/faces';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// Get person ID from route params
	let personId = $derived($page.params.personId);

	// Initialize tab from URL (redirect 'faces' to 'photos')
	const urlTab = $page.url.searchParams.get('tab');
	const initialTab = urlTab === 'faces' ? 'photos' : urlTab;
	let activeTab = $state<'photos' | 'prototypes'>(
		(initialTab as 'photos' | 'prototypes') || 'photos'
	);

	// State
	let person = $state<Person | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	// Photos used by lightbox functionality for prototypes
	let photos = $state<PersonPhotoGroup[]>([]);

	// Prototype state
	let prototypes = $state<Prototype[]>([]);
	let coverage = $state<TemporalCoverage | null>(null);
	let prototypesLoading = $state(true);
	let prototypesError = $state<string | null>(null);
	let imageErrors = $state<Set<string>>(new Set());

	// Pin prototype state
	let pinningPrototypeId = $state<string | null>(null);
	let selectedPinEra = $state<AgeEraBucket | null>(null);
	let pinningInProgress = $state(false);

	// Regenerate suggestions state
	let isRegenerating = $state(false);

	// Recompute prototypes state
	let isRecomputing = $state(false);
	let triggerRescanOnRecompute = $state(false);

	// Birth date editing state
	let editingBirthDate = $state(false);
	let birthDateInput = $state<string>('');
	let savingBirthDate = $state(false);
	let birthDateError = $state<string | null>(null);

	// Merge modal state
	let showMergeModal = $state(false);
	let mergeTargetPersons = $state<Person[]>([]);
	let selectedMergeTarget = $state<Person | null>(null);
	let merging = $state(false);
	let mergeError = $state<string | null>(null);

	// Find More dialog state
	let showFindMoreDialog = $state(false);

	// Lightbox state
	let showLightbox = $state(false);
	let lightboxPhoto = $state<PersonPhotoGroup | null>(null);
	let lightboxPhotos = $state<PersonPhotoGroup[]>([]);
	let lightboxIndex = $state(0);

	onMount(() => {
		loadPerson();
	});

	// Reload when personId changes
	$effect(() => {
		const id = personId;
		if (id) {
			loadPerson();
			loadPrototypes();
		}
	});

	async function loadPerson() {
		loading = true;
		error = null;

		try {
			// Use the new single-person endpoint
			const personData = await getPersonById(personId);

			// Map PersonDetailResponse to Person type
			person = {
				id: personData.id,
				name: personData.name,
				status: personData.status as 'active' | 'merged' | 'hidden',
				faceCount: personData.faceCount,
				prototypeCount: 0, // PersonDetailResponse doesn't have prototypeCount, will show 0
				photoCount: personData.photoCount,
				createdAt: personData.createdAt,
				updatedAt: personData.createdAt // PersonDetailResponse doesn't have updatedAt, use createdAt
			};

			// Load other persons for merge target selection
			loadMergeTargets();
		} catch (err) {
			console.error('Failed to load person:', err);
			if (err instanceof ApiError && err.status === 404) {
				error = 'Person not found.';
			} else if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Failed to load person. Please try again.';
			}
		} finally {
			loading = false;
		}
	}


	async function loadPrototypes() {
		if (!personId) return;
		prototypesLoading = true;
		prototypesError = null;
		try {
			const response = await getPrototypes(personId);
			prototypes = response.items;
			coverage = response.coverage;
		} catch (err) {
			console.error('Failed to load prototypes:', err);
			prototypesError = err instanceof Error ? err.message : 'Failed to load prototypes';
		} finally {
			prototypesLoading = false;
		}
	}

	async function loadMergeTargets() {
		try {
			const allPersons = await fetchAllPersons('active');
			// Exclude current person
			mergeTargetPersons = allPersons.filter((p) => p.id !== personId);
		} catch (err) {
			console.error('Failed to load merge targets:', err);
		}
	}

	function handleBack() {
		goto('/people');
	}

	function handleOpenMergeModal() {
		showMergeModal = true;
		selectedMergeTarget = null;
		mergeError = null;
	}

	function handleCloseMergeModal() {
		showMergeModal = false;
	}

	async function handleMerge() {
		if (!selectedMergeTarget || !person || merging) return;

		merging = true;
		mergeError = null;

		try {
			await mergePersons(person.id, selectedMergeTarget.id);
			// Navigate to target person
			goto(`/people/${selectedMergeTarget.id}`);
		} catch (err) {
			console.error('Failed to merge:', err);
			if (err instanceof ApiError) {
				mergeError = err.message;
			} else {
				mergeError = 'Failed to merge. Please try again.';
			}
		} finally {
			merging = false;
		}
	}

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

	// Update URL when tab changes
	function setTab(tab: 'photos' | 'prototypes') {
		activeTab = tab;
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	async function handlePhotoClick(photoId: number) {
		if (!person) return;

		// Load photos if not already loaded
		if (lightboxPhotos.length === 0) {
			try {
				const response = await getPersonPhotos(person.id, 1, 100);
				lightboxPhotos = response.items;
			} catch (err) {
				console.error('Failed to load photos for lightbox:', err);
				return;
			}
		}

		// Find the clicked photo
		const index = lightboxPhotos.findIndex((p) => p.photoId === photoId);
		if (index >= 0) {
			lightboxIndex = index;
			lightboxPhoto = lightboxPhotos[index];
			showLightbox = true;
		}
	}

	function handleLightboxNext() {
		if (lightboxIndex < lightboxPhotos.length - 1) {
			lightboxIndex++;
			lightboxPhoto = lightboxPhotos[lightboxIndex];
		}
	}

	function handleLightboxPrev() {
		if (lightboxIndex > 0) {
			lightboxIndex--;
			lightboxPhoto = lightboxPhotos[lightboxIndex];
		}
	}

	function closeLightbox() {
		showLightbox = false;
		lightboxPhoto = null;
	}

	async function handleUnpinPrototype(prototype: Prototype) {
		if (!confirm('Remove this pinned prototype? The slot may be filled automatically.')) return;
		try {
			await unpinPrototype(personId, prototype.id);
			await loadPrototypes(); // Refresh the list
			toast.success('Prototype unpinned successfully');
		} catch (err) {
			console.error('Failed to unpin prototype:', err);
			toast.error('Failed to unpin prototype', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	}

	async function handleDeletePrototype(prototype: Prototype) {
		if (!confirm('Delete this prototype? This will remove the prototype assignment entirely.'))
			return;
		try {
			await deletePrototype(personId, prototype.id);
			await loadPrototypes(); // Refresh the list
			toast.success('Prototype deleted successfully');
		} catch (err) {
			console.error('Failed to delete prototype:', err);
			toast.error('Failed to delete prototype', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	}

	async function handleRecomputePrototypes() {
		if (!personId) return;

		isRecomputing = true;
		try {
			const result = await recomputePrototypes(personId, {
				preservePins: true,
				triggerRescan: triggerRescanOnRecompute
			});

			await loadPrototypes(); // Refresh the list

			let message = `Prototypes recomputed: ${result.prototypesCreated} created, ${result.prototypesRemoved} removed.`;

			if (result.rescanTriggered && result.rescanMessage) {
				message += ` ${result.rescanMessage}`;
			}

			toast.success(message);
		} catch (err) {
			console.error('Failed to recompute prototypes:', err);
			toast.error(
				err instanceof Error ? err.message : 'Failed to recompute prototypes'
			);
		} finally {
			isRecomputing = false;
		}
	}

	async function handleRegenerateSuggestions() {
		if (!personId) return;

		isRegenerating = true;
		try {
			const result = await regenerateSuggestions(personId);
			toast.success(
				`Re-scan queued! ${result.expiredCount ?? 0} old suggestions expired. Check the Suggestions page in a moment.`
			);
		} catch (err) {
			console.error('Failed to regenerate suggestions:', err);
			toast.error(
				err instanceof Error ? err.message : 'Failed to regenerate suggestions'
			);
		} finally {
			isRegenerating = false;
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

	function startGridPinning(prototypeId: string) {
		pinningPrototypeId = prototypeId;
		selectedPinEra = null;
	}

	function cancelGridPinning() {
		pinningPrototypeId = null;
		selectedPinEra = null;
	}

	async function handlePinPrototypeFromGrid() {
		if (!pinningPrototypeId || !selectedPinEra) return;

		const prototype = prototypes.find((p) => p.id === pinningPrototypeId);
		if (!prototype?.faceInstanceId) {
			toast.error('Cannot pin: prototype has no face instance');
			return;
		}

		pinningInProgress = true;
		try {
			await pinPrototype(personId, prototype.faceInstanceId, {
				ageEraBucket: selectedPinEra,
				role: 'temporal'
			});

			// Reset state
			cancelGridPinning();

			// Refresh prototypes
			await loadPrototypes();

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

	function handleImageError(prototypeId: string) {
		const newErrors = new Set(imageErrors);
		newErrors.add(prototypeId);
		imageErrors = newErrors;
	}

	function startEditingBirthDate() {
		editingBirthDate = true;
		birthDateInput = person?.birthDate || '';
		birthDateError = null;
	}

	function cancelEditingBirthDate() {
		editingBirthDate = false;
		birthDateInput = '';
		birthDateError = null;
	}

	async function saveBirthDate() {
		if (!person || savingBirthDate) return;

		savingBirthDate = true;
		birthDateError = null;

		try {
			const updatedPerson = await updatePerson(person.id, {
				birthDate: birthDateInput.trim() || null
			});

			// Update local person state
			person = {
				...person,
				birthDate: updatedPerson.birthDate,
				updatedAt: updatedPerson.updatedAt
			};

			editingBirthDate = false;
			birthDateInput = '';
			toast.success('Birth date updated successfully');
		} catch (err) {
			console.error('Failed to update birth date:', err);
			birthDateError = err instanceof ApiError ? err.message : 'Failed to update birth date';
		} finally {
			savingBirthDate = false;
		}
	}

	function calculateAge(birthDate: string): number | null {
		try {
			const birth = new Date(birthDate);
			const today = new Date();
			let age = today.getFullYear() - birth.getFullYear();
			const monthDiff = today.getMonth() - birth.getMonth();
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
				age--;
			}
			return age;
		} catch {
			return null;
		}
	}

	async function handlePrototypeClick(proto: Prototype) {
		if (!proto.faceInstanceId || !person) return;

		// Ensure photos are loaded
		if (photos.length === 0) {
			try {
				const response = await getPersonPhotos(person.id, 1, 100);
				photos = response.items;
			} catch (err) {
				console.error('Failed to load photos for lightbox:', err);
				return;
			}
		}

		// Find the photo containing this face
		// Handle both camelCase and snake_case field names (API inconsistency)
		const photo = photos.find((p) =>
			p.faces?.some((f) => {
				const faceId = f.faceInstanceId || (f as Record<string, unknown>).face_instance_id;
				return faceId === proto.faceInstanceId;
			})
		);

		if (photo) {
			// Set up lightbox
			lightboxPhotos = photos;
			lightboxIndex = photos.findIndex((p) => p.photoId === photo.photoId);
			lightboxPhoto = photo;
			showLightbox = true;
		} else {
			console.warn('Photo not found for prototype face:', proto.faceInstanceId);
		}
	}

	/**
	 * Handle completion of "Find More" job.
	 * Shows toast notification with result.
	 */
	function handleFindMoreComplete() {
		showFindMoreDialog = false;
		// Success toast already shown by FindMoreDialog
		// Could optionally refresh data or navigate to suggestions page
	}
</script>

<svelte:head>
	<title>{person?.name || 'Person'} | Image Search</title>
</svelte:head>

<main class="person-detail-page">
	<!-- Navigation -->
	<nav class="breadcrumb">
		<button type="button" class="back-link" onclick={handleBack}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
			Back to People
		</button>
	</nav>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading person...</p>
		</div>
	{:else if error}
		<div class="error-state" role="alert">
			<svg
				class="error-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<p>{error}</p>
			<button type="button" class="retry-button" onclick={loadPerson}>Try Again</button>
		</div>
	{:else if person}
		<!-- Header -->
		<header class="person-header">
			<div class="person-avatar-large">
				{getInitials(person.name)}
			</div>

			<div class="person-info">
				<h1>{person.name}</h1>
				<div class="person-meta">
					<span class="stat"><strong>{person.faceCount}</strong> detected faces</span>
					<span class="stat"><strong>{person.prototypeCount}</strong> prototypes</span>
					<span class="stat">Created {formatDate(person.createdAt)}</span>
				</div>

				<!-- Birth date section -->
				<div class="birth-date-section">
					{#if editingBirthDate}
						<div class="birth-date-editor">
							<input
								type="date"
								bind:value={birthDateInput}
								class="birth-date-input"
								placeholder="YYYY-MM-DD"
								aria-label="Birth date"
							/>
							<button
								type="button"
								class="save-button"
								onclick={saveBirthDate}
								disabled={savingBirthDate}
							>
								{savingBirthDate ? 'Saving...' : 'Save'}
							</button>
							<button
								type="button"
								class="cancel-button-inline"
								onclick={cancelEditingBirthDate}
								disabled={savingBirthDate}
							>
								Cancel
							</button>
						</div>
						{#if birthDateError}
							<div class="birth-date-error" role="alert">{birthDateError}</div>
						{/if}
					{:else}
						<div class="birth-date-display">
							<span class="birth-date-label">Birth Date:</span>
							{#if person.birthDate}
								{@const age = calculateAge(person.birthDate)}
								<span class="birth-date-value">
									{new Date(person.birthDate).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
									{#if age !== null}
										<span class="age-display">(Age {age})</span>
									{/if}
								</span>
							{:else}
								<span class="birth-date-value not-set">Not set</span>
							{/if}
							<button
								type="button"
								class="edit-birth-date-button"
								onclick={startEditingBirthDate}
								aria-label="Edit birth date"
							>
								Edit
							</button>
						</div>
					{/if}
				</div>

				<div class="person-status">
					<span class="status-badge status-{person.status}">{person.status}</span>
				</div>
			</div>

			<div class="person-actions">
				{#if person.faceCount >= 10}
					<button
						type="button"
						class="secondary-button"
						onclick={() => (showFindMoreDialog = true)}
						title="Find more face suggestions using additional prototypes"
					>
						<svg
							class="action-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="M21 21l-4.35-4.35" />
						</svg>
						Find More Suggestions
					</button>
				{/if}
				<a href="/faces/persons/{person.id}/history" class="secondary-button">
					View Assignment History
				</a>
				{#if person.status === 'active'}
					<button type="button" class="secondary-button" onclick={handleOpenMergeModal}>
						Merge into Another Person
					</button>
				{/if}
			</div>
		</header>

		<!-- Tab Navigation -->
		<div class="tabs">
			<button
				type="button"
				class="tab"
				class:active={activeTab === 'photos'}
				onclick={() => setTab('photos')}
			>
				Photos
			</button>
			<button
				type="button"
				class="tab"
				class:active={activeTab === 'prototypes'}
				onclick={() => setTab('prototypes')}
			>
				Prototypes
			</button>
		</div>

		<!-- Tab Content -->
		{#if activeTab === 'photos'}
			<!-- Photos Tab (New Person Photos Review) -->
			<PersonPhotosTab
				personId={person.id}
				personName={person.name}
				onPhotoClick={handlePhotoClick}
			/>
		{:else if activeTab === 'prototypes'}
			<!-- Prototypes Tab -->
			<div class="prototypes-tab">
				{#if prototypesLoading}
					<div class="prototype-loading">Loading prototype coverage...</div>
				{:else if prototypesError}
					<div class="prototype-error">{prototypesError}</div>
				{:else if coverage}
					<div class="prototype-content">
						<div class="prototype-header">
							<h3>Temporal Coverage</h3>
							<div class="prototype-actions">
								<CoverageIndicator {coverage} />
							</div>
						</div>

						<!-- Prototype action controls -->
						<div class="prototype-controls">
							<div class="recompute-options">
								<label class="checkbox-label">
									<input type="checkbox" bind:checked={triggerRescanOnRecompute} />
									<span>Also re-scan for suggestions</span>
								</label>
							</div>

							<div class="action-buttons">
								<button
									class="recompute-btn"
									onclick={handleRecomputePrototypes}
									disabled={isRecomputing}
									title="Recompute prototypes for optimal temporal coverage"
									type="button"
								>
									{isRecomputing ? 'Recomputing...' : '↻ Recompute Prototypes'}
								</button>

								<button
									class="rescan-btn secondary-action"
									onclick={handleRegenerateSuggestions}
									disabled={isRegenerating || prototypes.length === 0}
									title="Re-scan for face suggestions using current prototypes"
									type="button"
								>
									{isRegenerating ? 'Scanning...' : '🔄 Re-scan for Suggestions'}
								</button>
							</div>
						</div>
						<TemporalTimeline {prototypes} {coverage} onUnpinClick={handleUnpinPrototype} />

						<!-- Prototype list -->
						<div class="prototype-list">
							<h4>All Prototypes ({prototypes.length})</h4>
							{#if prototypes.length === 0}
								<p class="no-prototypes">
									No prototypes yet. Assign faces to this person to create prototypes.
								</p>
							{:else}
								<div class="prototype-grid">
									{#each prototypes as proto}
										<div class="prototype-card-wrapper" class:pinned={proto.isPinned}>
											<button
												type="button"
												class="prototype-card"
												class:pinned={proto.isPinned}
												onclick={() => handlePrototypeClick(proto)}
												onkeydown={(e) => e.key === 'Enter' && handlePrototypeClick(proto)}
												aria-label="View photo for {proto.ageEraBucket || 'unknown'} era prototype"
											>
												<!-- Face thumbnail -->
												<div class="proto-thumbnail">
													{#if proto.thumbnailUrl}
														<img
															src={toAbsoluteUrl(proto.thumbnailUrl)}
															alt="Prototype face for {proto.ageEraBucket || 'unknown'} era"
															loading="lazy"
															onerror={() => handleImageError(proto.id)}
														/>
													{:else}
														<div class="no-thumbnail">No image</div>
													{/if}
												</div>

												<!-- Metadata -->
												<div class="proto-info">
													<span class="proto-role">{proto.role}</span>
													{#if proto.ageEraBucket}
														<span class="proto-era">{proto.ageEraBucket.replace('_', ' ')}</span>
													{/if}
													{#if proto.isPinned}
														<span class="proto-pinned">📌</span>
													{/if}
												</div>
												<div class="proto-quality">
													Quality: {proto.qualityScore
														? (proto.qualityScore * 100).toFixed(0) + '%'
														: 'N/A'}
												</div>
												{#if proto.decadeBucket}
													<div class="proto-decade">{proto.decadeBucket}</div>
												{/if}
											</button>

											<!-- Delete button for all prototypes -->
											<button
												type="button"
												class="delete-prototype-btn"
												onclick={(e) => {
													e.stopPropagation();
													handleDeletePrototype(proto);
												}}
												title="Delete prototype"
											>
												🗑️
											</button>

											<!-- Pin functionality for unpinned prototypes -->
											{#if !proto.isPinned}
												<div class="pin-prototype-section">
													{#if pinningPrototypeId === proto.id}
														<div class="pin-options">
															<label>
																Age Era:
																<select bind:value={selectedPinEra}>
																	<option value={null} disabled selected>Select age era...</option>
																	{#each ageEras as era}
																		<option value={era.value}>{era.label}</option>
																	{/each}
																</select>
															</label>
															<div class="pin-actions">
																<button
																	type="button"
																	class="pin-confirm-btn"
																	onclick={handlePinPrototypeFromGrid}
																	disabled={pinningInProgress || !selectedPinEra}
																>
																	{pinningInProgress ? 'Pinning...' : 'Confirm'}
																</button>
																<button
																	type="button"
																	class="pin-cancel-btn"
																	onclick={cancelGridPinning}
																	disabled={pinningInProgress}
																>
																	Cancel
																</button>
															</div>
														</div>
													{:else}
														<button
															type="button"
															class="pin-prototype-btn"
															onclick={() => startGridPinning(proto.id)}
															title="Pin this prototype to a specific age era"
														>
															📌 Pin
														</button>
													{/if}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="no-coverage">No prototype data available.</div>
				{/if}
			</div>
		{/if}
	{/if}
</main>

<!-- Lightbox modal -->
{#if showLightbox && lightboxPhoto && person}
	<PhotoPreviewModal
		photo={lightboxPhoto}
		currentPersonId={person.id}
		currentPersonName={person.name}
		onClose={closeLightbox}
		onNext={lightboxIndex < lightboxPhotos.length - 1 ? handleLightboxNext : undefined}
		onPrevious={lightboxIndex > 0 ? handleLightboxPrev : undefined}
		onPrototypePinned={loadPrototypes}
	/>
{/if}

<!-- Find More Dialog -->
{#if showFindMoreDialog && person}
	<FindMoreDialog
		open={showFindMoreDialog}
		personId={person.id}
		personName={person.name}
		labeledFaceCount={person.faceCount}
		onClose={() => (showFindMoreDialog = false)}
		onComplete={handleFindMoreComplete}
	/>
{/if}

<!-- Merge Modal -->
{#if showMergeModal && person}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleCloseMergeModal}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<header class="modal-header">
				<h2>Merge Person</h2>
				<button
					type="button"
					class="close-button"
					onclick={handleCloseMergeModal}
					aria-label="Close modal"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</header>

			<div class="modal-body">
				{#if mergeError}
					<div class="merge-error" role="alert">{mergeError}</div>
				{/if}

				<p>
					Select a person to merge <strong>{person.name}</strong> into. All faces will be moved to the
					target person.
				</p>

				<div class="merge-targets">
					{#if mergeTargetPersons.length === 0}
						<p class="no-targets">No other persons available to merge into.</p>
					{:else}
						{#each mergeTargetPersons as target (target.id)}
							<button
								type="button"
								class="target-option"
								class:selected={selectedMergeTarget?.id === target.id}
								onclick={() => (selectedMergeTarget = target)}
							>
								<div class="target-avatar">{getInitials(target.name)}</div>
								<div class="target-info">
									<span class="target-name">{target.name}</span>
									<span class="target-meta">{target.faceCount} faces</span>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</div>

			<footer class="modal-footer">
				<button
					type="button"
					class="cancel-button"
					onclick={handleCloseMergeModal}
					disabled={merging}
				>
					Cancel
				</button>
				<button
					type="button"
					class="merge-button"
					onclick={handleMerge}
					disabled={!selectedMergeTarget || merging}
				>
					{#if merging}
						Merging...
					{:else}
						Merge Person
					{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.person-detail-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.breadcrumb {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		border: none;
		background: none;
		color: #4a90e2;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.back-link:hover {
		color: #3a7bc8;
	}

	.back-link svg {
		width: 20px;
		height: 20px;
	}

	/* Loading & Error States */
	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: #666;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #f0f0f0;
		border-top-color: #4a90e2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.spinner-small {
		width: 20px;
		height: 20px;
		border: 2px solid #f0f0f0;
		border-top-color: #4a90e2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-icon {
		width: 48px;
		height: 48px;
		color: #e53e3e;
		margin-bottom: 1rem;
	}

	.retry-button {
		margin-top: 0.5rem;
		padding: 0.5rem 1.5rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.tab {
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: #6b7280;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.95rem;
	}

	.tab:hover {
		color: #374151;
	}

	.tab.active {
		color: #4a90e2;
		border-bottom-color: #4a90e2;
	}

	/* Header */
	.person-header {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		align-items: flex-start;
	}

	.person-avatar-large {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 2rem;
		flex-shrink: 0;
	}

	.person-info {
		flex: 1;
		min-width: 200px;
	}

	.person-info h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.5rem 0;
	}

	.person-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.stat {
		font-size: 0.95rem;
		color: #666;
	}

	.stat strong {
		color: #333;
	}

	.status-badge {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.25rem 0.75rem;
		border-radius: 16px;
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

	.person-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.secondary-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background-color: white;
		color: #666;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		text-decoration: none;
	}

	.secondary-button:hover {
		background-color: #f5f5f5;
	}

	.action-icon {
		width: 1rem;
		height: 1rem;
	}


	.face-count-badge {
		position: absolute;
		bottom: 8px;
		right: 8px;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		backdrop-filter: blur(4px);
	}

	.photo-info {
		padding: 0.75rem;
	}

	.photo-path {
		display: block;
		font-size: 0.875rem;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.photo-date {
		display: block;
		font-size: 0.75rem;
		color: #999;
		margin-top: 0.25rem;
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.close-button {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		color: #666;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
	}

	.merge-error {
		background-color: #fef2f2;
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.merge-targets {
		margin-top: 1rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		max-height: 300px;
		overflow-y: auto;
	}

	.no-targets {
		padding: 1rem;
		text-align: center;
		color: #666;
	}

	.target-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s;
	}

	.target-option:hover {
		background-color: #f5f5f5;
	}

	.target-option.selected {
		background-color: #e8f4fd;
	}

	.target-option:not(:last-child) {
		border-bottom: 1px solid #f0f0f0;
	}

	.target-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.target-info {
		display: flex;
		flex-direction: column;
	}

	.target-name {
		font-weight: 500;
		color: #333;
	}

	.target-meta {
		font-size: 0.75rem;
		color: #999;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.cancel-button,
	.merge-button {
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
	}

	.cancel-button {
		background: none;
		border: 1px solid #ddd;
		color: #666;
	}

	.merge-button {
		background-color: #4a90e2;
		border: none;
		color: white;
	}

	.merge-button:disabled,
	.cancel-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.person-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.person-meta {
			justify-content: center;
		}

		.person-actions {
			width: 100%;
			justify-content: center;
		}
	}

	/* Prototypes Tab */
	.prototypes-tab {
		padding: 1rem 0;
	}

	.prototype-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.prototype-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.prototype-header h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.prototype-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.prototype-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: #f9f9f9;
		border-radius: 6px;
		border: 1px solid #e0e0e0;
	}

	.recompute-options {
		display: flex;
		align-items: center;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #666;
		cursor: pointer;
		user-select: none;
	}

	.checkbox-label input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.prototype-list {
		margin-top: 1rem;
	}

	.prototype-list h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #333;
	}

	.no-prototypes {
		color: #666;
		font-style: italic;
	}

	.prototype-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.prototype-card {
		padding: 0;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background: #f9f9f9;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
		text-align: left;
		width: 100%;
	}

	.prototype-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.prototype-card:focus {
		outline: 2px solid #2196f3;
		outline-offset: 2px;
	}

	.prototype-card.pinned {
		border-color: #2196f3;
		background: #e3f2fd;
	}

	.proto-thumbnail {
		width: 100%;
		aspect-ratio: 1;
		background: #e0e0e0;
		overflow: hidden;
		position: relative;
		flex-shrink: 0;
	}

	.proto-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.no-thumbnail {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
		font-size: 0.8rem;
		background: #f0f0f0;
	}

	.proto-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
		padding: 0.75rem 0.75rem 0;
	}

	.proto-role {
		font-size: 0.75rem;
		padding: 0.15rem 0.4rem;
		background: #e0e0e0;
		border-radius: 3px;
		text-transform: uppercase;
		font-weight: 600;
	}

	.proto-era {
		font-size: 0.85rem;
		color: #666;
		text-transform: capitalize;
	}

	.proto-pinned {
		font-size: 0.9rem;
	}

	.proto-quality,
	.proto-decade {
		font-size: 0.8rem;
		color: #888;
		padding: 0 0.75rem;
	}

	.proto-decade {
		padding-bottom: 0.75rem;
	}

	.no-coverage {
		padding: 2rem;
		text-align: center;
		color: #666;
	}

	.recompute-btn,
	.rescan-btn {
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
		font-weight: 500;
	}

	.recompute-btn {
		background: #4a90e2;
	}

	.recompute-btn:hover:not(:disabled) {
		background: #3a7bc8;
	}

	.recompute-btn:disabled {
		background: #94b8d8;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.rescan-btn {
		background: #6c757d;
	}

	.rescan-btn:hover:not(:disabled) {
		background: #5a6268;
	}

	.rescan-btn:disabled {
		background: #a0a6ab;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.prototype-loading,
	.prototype-error {
		padding: 1rem;
		text-align: center;
		color: #666;
		font-size: 0.9rem;
	}

	.prototype-error {
		color: #dc3545;
	}

	/* Pin prototype styles */
	.prototype-card-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		position: relative;
	}

	.pin-prototype-section {
		margin-top: 0.5rem;
	}

	.pin-prototype-btn {
		width: 100%;
		padding: 0.35rem 0.5rem;
		font-size: 0.85rem;
		background: #2196f3;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.pin-prototype-btn:hover {
		background: #1976d2;
	}

	.pin-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #f5f5f5;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.pin-options label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
		color: #333;
	}

	.pin-options select {
		padding: 0.35rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.85rem;
		background: white;
	}

	.pin-actions {
		display: flex;
		gap: 0.5rem;
	}

	.pin-confirm-btn {
		flex: 1;
		padding: 0.35rem 0.5rem;
		font-size: 0.85rem;
		background: #28a745;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.pin-confirm-btn:hover:not(:disabled) {
		background: #218838;
	}

	.pin-confirm-btn:disabled {
		background: #6c757d;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.pin-cancel-btn {
		flex: 1;
		padding: 0.35rem 0.5rem;
		font-size: 0.85rem;
		background: #6c757d;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.pin-cancel-btn:hover:not(:disabled) {
		background: #5a6268;
	}

	.pin-cancel-btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.delete-prototype-btn {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		background: rgba(220, 53, 69, 0.9);
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.75rem;
		opacity: 0;
		transition: opacity 0.2s;
		z-index: 10;
	}

	.prototype-card-wrapper:hover .delete-prototype-btn {
		opacity: 1;
	}

	.delete-prototype-btn:hover {
		background: rgb(200, 35, 51);
	}

	/* Birth date editing styles */
	.birth-date-section {
		margin-bottom: 0.75rem;
	}

	.birth-date-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
	}

	.birth-date-label {
		color: #666;
		font-weight: 500;
	}

	.birth-date-value {
		color: #333;
	}

	.birth-date-value.not-set {
		color: #999;
		font-style: italic;
	}

	.age-display {
		color: #4a90e2;
		font-weight: 600;
		margin-left: 0.25rem;
	}

	.edit-birth-date-button {
		padding: 0.25rem 0.75rem;
		background-color: transparent;
		color: #4a90e2;
		border: 1px solid #4a90e2;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.edit-birth-date-button:hover {
		background-color: #4a90e2;
		color: white;
	}

	.birth-date-editor {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.birth-date-input {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.95rem;
		transition: border-color 0.2s;
	}

	.birth-date-input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.save-button {
		padding: 0.5rem 1rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-button:hover:not(:disabled) {
		background-color: #3a7bc8;
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-button-inline {
		padding: 0.5rem 1rem;
		background-color: transparent;
		color: #666;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button-inline:hover:not(:disabled) {
		background-color: #f5f5f5;
	}

	.cancel-button-inline:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.birth-date-error {
		color: #dc2626;
		font-size: 0.875rem;
		margin-top: 0.5rem;
		padding: 0.5rem;
		background-color: #fef2f2;
		border-radius: 4px;
	}
</style>
