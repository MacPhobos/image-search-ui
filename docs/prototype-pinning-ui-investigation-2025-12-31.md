# Prototype Pinning UI Investigation

**Date**: 2025-12-31
**Research Goal**: Investigate how to add image-to-age pinning functionality to the "Prototype" view in image-search-ui
**Status**: Complete

---

## Executive Summary

This research documents the existing pinning functionality implementation in the image-search-ui SvelteKit frontend and provides specific recommendations for adding pinning to the Prototype view. The pinning feature currently exists in two locations:

1. **Photo Preview Modal** (`PhotoPreviewModal.svelte`) - Used when reviewing person photos
2. **Face Suggestions Modal** (`SuggestionDetailModal.svelte`) - Used when reviewing face suggestions

The Prototype view already has **unpinning** functionality but lacks the ability to **pin** new images. This research provides the exact pattern to follow for adding pinning to the Prototype view.

---

## Key Findings

### 1. Prototype View Location

**File**: `/export/workspace/image-search/image-search-ui/src/routes/people/[personId]/+page.svelte`

**Structure**:

- Three-tab interface: Faces, Photos, Prototypes
- Prototypes tab (lines 458-541) shows:
  - **TemporalTimeline component** - Age era timeline with coverage indicators
  - **Prototype grid** - Cards showing all prototypes with thumbnails

**Current Capabilities**:

- ✅ Display prototypes in grid with thumbnails
- ✅ Show pinned status (📌 indicator)
- ✅ Unpin prototypes via `handleUnpinPrototype()` function
- ✅ Recompute prototypes with `handleRecomputePrototypes()`
- ✅ Click prototype cards to open photo in lightbox
- ❌ **Missing**: Pin new images as prototypes

### 2. Existing Pinning Implementation

#### 2.1 Photo Preview Modal Pattern

**File**: `/export/workspace/image-search/image-search-ui/src/lib/components/faces/PhotoPreviewModal.svelte`

**Lines 61-66**: State management

```svelte
// Pin prototype state
let pinningFaceId = $state<string | null>(null);
let showPinOptions = $state(false);
let pinningInProgress = $state(false);
let selectedEra = $state<AgeEraBucket | null>(null);
```

**Lines 402-409**: Age era options

```svelte
const ageEras: { value: AgeEraBucket; label: string }[] = [
	{ value: 'infant', label: 'Infant (0-3)' },
	{ value: 'child', label: 'Child (4-12)' },
	{ value: 'teen', label: 'Teen (13-19)' },
	{ value: 'young_adult', label: 'Young Adult (20-35)' },
	{ value: 'adult', label: 'Adult (36-55)' },
	{ value: 'senior', label: 'Senior (56+)' }
];
```

**Lines 411-450**: Pin handlers

```svelte
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
```

**Lines 702-741**: UI rendering

```svelte
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
					<button
						type="button"
						class="pin-confirm-btn"
						onclick={handlePinAsPrototype}
						disabled={pinningInProgress}
					>
						{pinningInProgress ? 'Pinning...' : 'Confirm Pin'}
					</button>
					<button type="button" class="pin-cancel-btn" onclick={cancelPinning}> Cancel </button>
				</div>
			</div>
		{:else}
			<button
				type="button"
				class="pin-prototype-btn"
				onclick={() => startPinning(face.faceInstanceId)}
				title="Pin this face as a prototype for the person"
			>
				Pin as Prototype
			</button>
		{/if}
	</div>
{/if}
```

#### 2.2 API Integration

**File**: `/export/workspace/image-search/image-search-ui/src/lib/api/faces.ts`

**Lines 1132-1153**: Pin endpoint

```typescript
export async function pinPrototype(
	personId: string,
	faceInstanceId: string,
	options?: { ageEraBucket?: AgeEraBucket; role?: 'primary' | 'temporal' }
): Promise<Prototype> {
	const requestBody: PinPrototypeRequest = {
		faceInstanceId,
		ageEraBucket: options?.ageEraBucket,
		role: options?.role ?? 'temporal'
	};

	return apiRequest<Prototype>(
		`/api/v1/faces/persons/${encodeURIComponent(personId)}/prototypes/pin`,
		{
			method: 'POST',
			body: JSON.stringify(requestBody)
		}
	);
}
```

**Lines 1157-1164**: Unpin endpoint

```typescript
export async function unpinPrototype(personId: string, prototypeId: string): Promise<undefined> {
	return apiRequest<undefined>(
		`/api/v1/faces/persons/${encodeURIComponent(personId)}/prototypes/${encodeURIComponent(prototypeId)}/pin`,
		{
			method: 'DELETE'
		}
	);
}
```

**Data Structures**:

```typescript
export interface Prototype {
	id: string;
	faceInstanceId: string | null;
	role: 'primary' | 'temporal' | 'exemplar' | 'fallback';
	ageEraBucket: AgeEraBucket | null;
	decadeBucket: string | null;
	isPinned: boolean;
	qualityScore: number | null;
	createdAt: string;
	thumbnailUrl: string | null;
}

export interface PinPrototypeRequest {
	faceInstanceId: string;
	ageEraBucket?: AgeEraBucket;
	role?: 'primary' | 'temporal';
}

export type AgeEraBucket = 'infant' | 'child' | 'teen' | 'young_adult' | 'adult' | 'senior';
```

### 3. Temporal Timeline Component

**File**: `/export/workspace/image-search/image-search-ui/src/lib/components/faces/TemporalTimeline.svelte`

**Current Features**:

- Displays 6 age era slots (infant → senior)
- Shows coverage percentage
- Indicates which eras have prototypes (green border)
- Shows pinned prototypes (blue border + pin emoji)
- Provides **unpin button** for pinned prototypes (lines 58-65)
- Shows **"+ Pin" button** for empty slots (lines 72-79)

**Key Props**:

```typescript
interface Props {
	prototypes: Prototype[];
	coverage: TemporalCoverage;
	onPinClick?: (era: AgeEraBucket) => void; // Callback for empty slot pins
	onUnpinClick?: (prototype: Prototype) => void; // Callback for unpins
}
```

**Important Discovery**: The timeline already has a `onPinClick` callback prop defined, but it's **not currently wired up** in the parent component (`/routes/people/[personId]/+page.svelte`).

**Lines 484**: Timeline component usage

```svelte
<TemporalTimeline
	{prototypes}
	{coverage}
	onUnpinClick={handleUnpinPrototype}
	<!-- onPinClick is missing! -->
/>
```

---

## Implementation Recommendations

### Option 1: Pin from Empty Timeline Slots (Simplest)

**Approach**: Enable the existing `onPinClick` callback in TemporalTimeline to allow users to pin images to specific age eras directly from empty slots.

**Changes Required**:

1. **Add handler in `/routes/people/[personId]/+page.svelte`** (after line 267):

```svelte
async function handlePinFromTimeline(era: AgeEraBucket) {
	// Open lightbox in pin mode for this era
	// This would require enhancing PhotoPreviewModal to support pre-selected era
	// For now, we can show an alert to select photo from Photos tab
	alert(`To pin a photo for ${era} era, please:\n1. Go to Photos tab\n2. Click a photo\n3. Use "Pin as Prototype" and select ${era}`);
}
```

2. **Wire up callback in timeline component** (line 484):

```svelte
<TemporalTimeline
	{prototypes}
	{coverage}
	onUnpinClick={handleUnpinPrototype}
	onPinClick={handlePinFromTimeline}
/>
```

**Pros**:

- Minimal code changes
- Uses existing UI pattern
- Clear user flow

**Cons**:

- Still requires navigating to Photos tab for actual pinning
- Two-step process (select era → select photo)

---

### Option 2: Add Pin Button to Prototype Grid Cards (Recommended)

**Approach**: Add a "Pin to Era" button on each prototype card in the grid, similar to the unpin button pattern.

**Changes Required**:

1. **Add state management** (after line 35):

```svelte
// Pin state for prototype grid
let pinningPrototypeId = $state<string | null>(null);
let selectedPinEra = $state<AgeEraBucket | null>(null);
```

2. **Add pin handler** (after line 267):

```svelte
async function handlePinPrototypeFromGrid(prototype: Prototype, era: AgeEraBucket) {
	if (!prototype.faceInstanceId) {
		alert('Cannot pin: prototype has no associated face instance');
		return;
	}

	try {
		await pinPrototype(personId, prototype.faceInstanceId, {
			ageEraBucket: era,
			role: 'temporal'
		});
		await loadPrototypes(); // Refresh the list
	} catch (err) {
		console.error('Failed to pin prototype:', err);
		alert('Failed to pin prototype');
	}
}

function startGridPinning(prototypeId: string) {
	pinningPrototypeId = prototypeId;
	selectedPinEra = null;
}

function cancelGridPinning() {
	pinningPrototypeId = null;
	selectedPinEra = null;
}
```

3. **Update prototype card UI** (replace lines 494-532):

```svelte
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
		Quality: {proto.qualityScore ? (proto.qualityScore * 100).toFixed(0) + '%' : 'N/A'}
	</div>
	{#if proto.decadeBucket}
		<div class="proto-decade">{proto.decadeBucket}</div>
	{/if}
</button>

<!-- Pin/Unpin controls (outside clickable card) -->
<div class="proto-actions" onclick={(e) => e.stopPropagation()}>
	{#if pinningPrototypeId === proto.id}
		<!-- Pin options panel -->
		<div class="pin-era-selector">
			<label>
				Pin to Era:
				<select bind:value={selectedPinEra}>
					<option value={null}>Select era...</option>
					<option value="infant">Infant (0-3)</option>
					<option value="child">Child (4-12)</option>
					<option value="teen">Teen (13-19)</option>
					<option value="young_adult">Young Adult (20-35)</option>
					<option value="adult">Adult (36-55)</option>
					<option value="senior">Senior (56+)</option>
				</select>
			</label>
			<div class="pin-actions-btns">
				<button
					type="button"
					class="pin-confirm-small"
					onclick={() => selectedPinEra && handlePinPrototypeFromGrid(proto, selectedPinEra)}
					disabled={!selectedPinEra}
				>
					Pin
				</button>
				<button type="button" class="pin-cancel-small" onclick={cancelGridPinning}> Cancel </button>
			</div>
		</div>
	{:else if proto.isPinned}
		<!-- Unpin button for pinned prototypes -->
		<button
			type="button"
			class="unpin-grid-btn"
			onclick={() => handleUnpinPrototype(proto)}
			title="Unpin this prototype"
		>
			Unpin 📌
		</button>
	{:else}
		<!-- Pin button for unpinned prototypes -->
		<button
			type="button"
			class="pin-grid-btn"
			onclick={() => startGridPinning(proto.id)}
			title="Pin this as prototype for an age era"
		>
			📌 Pin to Era
		</button>
	{/if}
</div>
```

4. **Add CSS styles** (append to existing styles):

```css
.proto-actions {
	padding: 0.5rem 0.75rem;
	border-top: 1px solid #e0e0e0;
	background: #fafafa;
}

.pin-era-selector {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.pin-era-selector label {
	font-size: 0.8rem;
	color: #333;
}

.pin-era-selector select {
	padding: 0.35rem;
	border: 1px solid #ddd;
	border-radius: 4px;
	font-size: 0.8rem;
}

.pin-actions-btns {
	display: flex;
	gap: 0.5rem;
}

.pin-confirm-small,
.pin-cancel-small,
.pin-grid-btn,
.unpin-grid-btn {
	padding: 0.35rem 0.65rem;
	font-size: 0.75rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-weight: 500;
	transition: background-color 0.2s;
}

.pin-confirm-small {
	background: #22c55e;
	color: white;
	flex: 1;
}

.pin-confirm-small:hover:not(:disabled) {
	background: #16a34a;
}

.pin-confirm-small:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.pin-cancel-small {
	background: #e0e0e0;
	color: #333;
}

.pin-cancel-small:hover {
	background: #d0d0d0;
}

.pin-grid-btn {
	background: #4a90e2;
	color: white;
	width: 100%;
}

.pin-grid-btn:hover {
	background: #3a7bc8;
}

.unpin-grid-btn {
	background: #fee;
	color: #dc2626;
	border: 1px solid #fecaca;
	width: 100%;
}

.unpin-grid-btn:hover {
	background: #dc2626;
	color: white;
}
```

**Pros**:

- Direct action from Prototype view (no navigation needed)
- Consistent with unpin button pattern
- Clear visual feedback
- Users can see all prototypes and choose which to pin

**Cons**:

- Adds UI complexity to prototype cards
- Requires more CSS for responsive layout

---

### Option 3: Enhanced Lightbox with Pre-selected Era (Most Flexible)

**Approach**: When clicking a prototype card, open the PhotoPreviewModal with the ability to re-pin it to a different era.

**Changes Required**:

1. **Enhance PhotoPreviewModal props** to accept initial era:

```typescript
interface Props {
	photo: PersonPhotoGroup;
	currentPersonId?: string | null;
	currentPersonName?: string | null;
	onClose: () => void;
	onPrevious?: () => void;
	onNext?: () => void;
	onFaceAssigned?: (faceId: string, personId: string | null, personName: string | null) => void;
	onPrototypePinned?: () => void;
	initialPinEra?: AgeEraBucket; // NEW: Pre-select era when opening for pin
}
```

2. **Modify prototype click handler** in `/routes/people/[personId]/+page.svelte`:

```svelte
async function handlePrototypeClick(proto: Prototype, pinMode: boolean = false) {
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
	const photo = photos.find((p) =>
		p.faces?.some((f) => {
			const faceId =
				f.faceInstanceId || (f as Record<string, unknown>).face_instance_id;
			return faceId === proto.faceInstanceId;
		})
	);

	if (photo) {
		lightboxPhotos = photos;
		lightboxIndex = photos.findIndex((p) => p.photoId === photo.photoId);
		lightboxPhoto = photo;

		// NEW: Set initial pin era if in pin mode
		if (pinMode) {
			lightboxInitialPinEra = proto.ageEraBucket ?? null;
		}

		showLightbox = true;
	} else {
		console.warn('Photo not found for prototype face:', proto.faceInstanceId);
	}
}
```

**Pros**:

- Leverages existing PhotoPreviewModal functionality
- Maintains consistency with photo review workflow
- Allows seeing full context (all faces in photo)

**Cons**:

- Requires modal enhancement
- Indirect (click prototype → see photo → pin)

---

## Recommended Implementation Path

**Best Approach**: **Option 2** (Pin button in Prototype Grid)

**Rationale**:

1. **Minimal navigation**: Users stay in Prototypes tab
2. **Visual clarity**: All prototypes visible with direct pin actions
3. **Consistency**: Matches existing unpin button pattern
4. **Flexibility**: Can pin any prototype to any era
5. **No modal complexity**: Keeps PhotoPreviewModal focused on photo review

**Implementation Steps**:

1. **Phase 1** (Quick Win - 15 minutes):
   - Add state variables for pinning
   - Add pin handlers (startGridPinning, cancelGridPinning, handlePinPrototypeFromGrid)
   - Test with console.log before API integration

2. **Phase 2** (UI Integration - 30 minutes):
   - Update prototype card rendering
   - Add pin/unpin action buttons
   - Add CSS styles for new buttons and era selector

3. **Phase 3** (Testing - 15 minutes):
   - Test pin flow: click "Pin to Era" → select era → confirm
   - Test unpin flow: click "Unpin" → confirm dialog → refresh
   - Test edge cases: prototypes without faceInstanceId
   - Verify prototype list refreshes after pin/unpin

**Total Estimated Time**: ~1 hour

---

## API Contract Considerations

**No changes required** to API contract. The existing endpoints are sufficient:

✅ `POST /api/v1/faces/persons/{personId}/prototypes/pin` - Pin prototype
✅ `DELETE /api/v1/faces/persons/{personId}/prototypes/{prototypeId}/pin` - Unpin prototype
✅ `GET /api/v1/faces/persons/{personId}/prototypes` - List prototypes

**Request/Response Types**:

```typescript
// Pin request
{
	faceInstanceId: string;      // Required
	ageEraBucket?: AgeEraBucket; // Optional: 'infant' | 'child' | 'teen' | 'young_adult' | 'adult' | 'senior'
	role?: 'primary' | 'temporal' // Optional: defaults to 'temporal'
}

// Pin response: Prototype object with isPinned=true

// Unpin response: 204 No Content
```

---

## File Reference Summary

### Components to Modify

- `/export/workspace/image-search/image-search-ui/src/routes/people/[personId]/+page.svelte` - Main person detail page

### Reference Components (Pinning Patterns)

- `/export/workspace/image-search/image-search-ui/src/lib/components/faces/PhotoPreviewModal.svelte` - Lines 61-66, 402-450, 702-741
- `/export/workspace/image-search/image-search-ui/src/lib/components/faces/TemporalTimeline.svelte` - Lines 72-79 (empty slot pins)

### API Integration

- `/export/workspace/image-search/image-search-ui/src/lib/api/faces.ts` - Lines 1132-1164 (pin/unpin functions)

### Type Definitions

- `/export/workspace/image-search/image-search-ui/src/lib/api/faces.ts` - Lines 992-1028 (Prototype, PinPrototypeRequest types)

---

## Testing Checklist

- [ ] **Pin flow**:
  - [ ] Click "Pin to Era" on unpinned prototype
  - [ ] Select age era from dropdown
  - [ ] Click "Pin" button
  - [ ] Verify prototype appears in TemporalTimeline for selected era
  - [ ] Verify prototype card shows pinned indicator

- [ ] **Unpin flow**:
  - [ ] Click "Unpin" on pinned prototype
  - [ ] Confirm dialog appears
  - [ ] Prototype removed from pinned status
  - [ ] TemporalTimeline updates to show era uncovered

- [ ] **Edge cases**:
  - [ ] Prototype without faceInstanceId shows error
  - [ ] Cannot pin to era that already has pinned prototype (verify API behavior)
  - [ ] Cancel pin action works correctly
  - [ ] Prototype grid refreshes after pin/unpin

- [ ] **UI/UX**:
  - [ ] Pin selector doesn't interfere with card click
  - [ ] Mobile responsive (grid layout adapts)
  - [ ] Loading states during API calls
  - [ ] Error messages displayed clearly

---

## Related Research

- **Previous Prototype Analysis**: `/export/workspace/image-search/docs/research/face-person-labeling-prototype-analysis-2025-12-28.md`
- **Prototype Control Suggestions**: `/export/workspace/image-search/docs/research/prototype-image-control-suggestions.md`

---

## Conclusion

The Prototype view currently supports **viewing** and **unpinning** prototypes but lacks the ability to **pin** new images to age eras. The recommended implementation (Option 2) adds pin buttons directly to the prototype grid, following the existing unpin pattern for consistency.

**Key Implementation Points**:

1. Reuse existing `pinPrototype()` API function
2. Add era selector dropdown when user clicks "Pin to Era"
3. Refresh prototype list after successful pin
4. Show visual feedback (pinned indicator, border color)
5. Maintain consistency with PhotoPreviewModal pinning pattern

**Time Estimate**: ~1 hour for complete implementation and testing

**Risk Level**: Low - Well-established API contract and UI patterns
