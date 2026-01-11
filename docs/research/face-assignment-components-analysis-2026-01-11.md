# Face Assignment Components Analysis

**Date**: 2026-01-11
**Purpose**: Understand current implementation of face-related dialogs and PersonAssignmentPanel for refactoring
**Status**: Investigation Complete

---

## Executive Summary

This document analyzes the current implementation of face assignment functionality across multiple dialog components to inform a refactoring strategy that extracts PersonAssignmentPanel into a reusable modal component.

### Key Findings

1. **PersonAssignmentPanel** is currently a **panel component** (not a modal), used in two contexts
2. **Shared pattern**: Both SuggestionDetailModal and PhotoPreviewModal render PersonAssignmentPanel "below modal body"
3. **Undo functionality** is NOT in PersonAssignmentPanel - it's handled by parent modals for specific faces
4. **High code duplication**: Both modals duplicate assignment logic (~150 lines each)
5. **Both modals exceed complexity limits**: SuggestionDetailModal (1,140 lines), PhotoPreviewModal (767 lines)

---

## Component Inventory

### 1. FaceListSidebar.svelte
**Path**: `src/lib/components/faces/FaceListSidebar.svelte`
**Lines**: 442
**Role**: Displays list of faces detected in an image with assignment actions

#### Key Features

- **Face Display**: Shows all faces in image with color-coded indicators
- **Bidirectional Selection**: Click face card → highlights bounding box on image
- **Assignment Actions**:
  - "Assign" button for unknown faces (triggers `onAssignClick` callback)
  - "Unassign" (✕) button for assigned faces (triggers `onUnassignClick` callback)
  - "Pin as Prototype" button for assigned faces
  - Accept suggestion button for faces with AI suggestions

#### Props Interface

```typescript
interface Props {
  faces: FaceInstance[];
  highlightedFaceId?: string | null;
  primaryFaceId?: string | null;
  primaryFacePersonName?: string | null;
  currentPersonId?: string | null;
  faceSuggestions?: Map<string, FaceSuggestionsState>;
  showUnassignButton?: boolean;
  showPinButton?: boolean;
  showSuggestions?: boolean;
  onFaceClick: (faceId: string) => void;
  onAssignClick?: (faceId: string) => void;
  onUnassignClick?: (faceId: string) => void;
  onPinClick?: (faceId: string) => void;
  onSuggestionAccept?: (faceId: string, personId: string, personName: string) => void;
}
```

#### How "Assign" Button Works

**Line 184-196**:
```svelte
{#if !face.personName && onAssignClick}
  <Button
    size="sm"
    class="flex-shrink-0 mr-2 h-6 px-2 text-xs"
    onclick={(e) => {
      e.stopPropagation();
      onAssignClick(face.id);
    }}
    aria-label="Assign this face to a person"
  >
    Assign
  </Button>
{/if}
```

**Flow**:
1. User clicks "Assign" button on unknown face
2. Calls `onAssignClick(faceId)` callback passed from parent
3. Parent modal sets `assigningFaceId = faceId` state
4. Parent modal conditionally renders `PersonAssignmentPanel` when `assigningFaceId !== null`

---

### 2. PersonAssignmentPanel.svelte
**Path**: `src/lib/components/faces/PersonAssignmentPanel.svelte`
**Lines**: 355
**Role**: Panel component for assigning a face to a person (create or select existing)

#### Current Implementation Details

**Component Type**: **Panel** (NOT a modal)
- Rendered conditionally inline below modal content
- Uses `{#if open}` block for conditional rendering
- Background: `#f8f9fa` with border (not dialog overlay)
- Position: Inserted into parent's DOM flow (not fixed/absolute)

#### Props Interface

```typescript
interface Props {
  open: boolean;                 // Control visibility
  faceId: string;                // Face being assigned
  persons: Person[];             // Available persons list
  personsLoading: boolean;       // Loading state for persons
  submitting: boolean;           // Assignment in progress
  error: string | null;          // Error message display
  recentPersonIds?: string[];    // MRU person IDs for sorting
  onCancel: () => void;          // Close panel
  onAssignToExisting: (personId: string) => void;
  onCreateAndAssign: (name: string) => void;
}
```

#### Features

1. **Person Search**:
   - Input field with autocomplete filtering
   - Filters by name (case-insensitive)
   - No external search API - filters local `persons` array

2. **Person Sorting** (MRU):
   - Uses `recentPersonIds` prop for Most Recently Used ordering
   - Falls back to alphabetical for non-recent persons
   - Implemented in `$derived` (lines 44-62)

3. **Create New Person**:
   - Shows "Create 'Name'" option when query doesn't match existing person
   - Special styling (blue background)
   - Calls `onCreateAndAssign(name)` with trimmed query

4. **Person Options Display**:
   - Avatar circle with first initial
   - Person name and face count
   - Hover/focus states for accessibility

#### Current Layout in Parent Modals

**Rendering Location** (lines 858-873 in SuggestionDetailModal):
```svelte
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
    onCancel={() => { assigningFaceId = null; }}
    onAssignToExisting={handleAssignToExisting}
    onCreateAndAssign={handleCreateAndAssign}
  />
{/if}
```

**Visual Position**: Panel appears **below** the modal's main content area:
- After `<div class="modal-body">` (image + face list)
- Before `<Dialog.Footer>` (Accept/Reject buttons)
- Margin: `0.5rem 0.625rem` (creates separation from modal body)
- Max-height: `500px` with internal scrolling

#### State Management

**Local State**:
- `personSearchQuery` - Search input value
- `filteredPersons` - Derived filtered/sorted list
- `showCreateOption` - Derived boolean for "Create" option visibility

**State Reset**:
- Clears `personSearchQuery` when `open` becomes false ($effect on line 70)

---

### 3. SuggestionDetailModal.svelte
**Path**: `src/lib/components/faces/SuggestionDetailModal.svelte`
**Lines**: 1,140
**Role**: Full-screen modal for reviewing face suggestions with assignment capabilities

#### Component Structure

```
<Dialog.Root>
  <Dialog.Header>
    <!-- Title + filesystem path -->
  </Dialog.Header>

  <div class="modal-body">
    <ImageWithFaceBoundingBoxes />
    <FaceListSidebar />
    <div class="primary-details">
      <!-- Primary suggestion info -->
      <!-- Undo Assignment section -->
    </div>
  </div>

  {#if assigningFaceId}
    <PersonAssignmentPanel />  <!-- Below modal body -->
  {/if}

  {#if pinningFaceId && showPinOptions}
    <PrototypePinningPanel />  <!-- Below modal body -->
  {/if}

  <Dialog.Footer>
    <!-- Accept/Reject Primary buttons -->
  </Dialog.Footer>
</Dialog.Root>

<!-- Separate undo confirmation dialog -->
<Dialog.Root open={showUndoConfirm}>
  <!-- Confirmation UI -->
</Dialog.Root>
```

#### Assignment Flow

**1. User initiates assignment** (line 778):
```svelte
onAssignClick={(faceId) => {
  assigningFaceId = faceId;
}}
```

**2. PersonAssignmentPanel renders** with props:
- `faceId={assigningFaceId}`
- `persons` - Pre-loaded list of all persons
- `personsLoading` - Loading state
- `assignmentSubmitting` - Prevents double-submit
- `assignmentError` - Displays inline error
- `recentPersonIds={getRecentPersonIds()}` - From localStorage

**3. User selects existing person** → calls `handleAssignToExisting(personId)` (lines 391-448):
```typescript
async function handleAssignToExisting(personId: string) {
  assignmentSubmitting = true;
  assignmentError = null;

  const person = persons.find((p) => p.id === personId);

  // API call
  await assignFaceToPerson(faceId, personId);

  // Record to MRU list (localStorage)
  recordRecentPerson(personId);

  // Optimistic update: Update local allFaces array
  allFaces[faceIndex] = { ...allFaces[faceIndex], personId, personName };

  // Clear suggestions for this face
  faceSuggestions.delete(faceId);

  // Notify parent component
  onFaceAssigned?.({ faceId, personId, personName, thumbnailUrl, photoFilename });

  // Close panel
  assigningFaceId = null;
}
```

**4. User creates new person** → calls `handleCreateAndAssign(name)` (lines 450-516):
- Creates person via API
- Assigns face to new person
- Adds to local `persons` array
- Records to MRU list
- Same optimistic updates as existing assignment

#### Recent Persons Tracking (MRU)

**Key Functions** (lines 34-54):
```typescript
const RECENT_PERSONS_KEY = 'suggestions.recentPersonIds';
const MAX_RECENT_PERSONS = 20;

function recordRecentPerson(personId: string): void {
  const recent = localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
  const filtered = recent.filter((id) => id !== personId);
  const updated = [personId, ...filtered].slice(0, MAX_RECENT_PERSONS);
  localSettings.set(RECENT_PERSONS_KEY, updated);
}

function getRecentPersonIds(): string[] {
  return localSettings.get<string[]>(RECENT_PERSONS_KEY, []);
}
```

**Usage**:
- Records person ID after successful assignment
- Passes to PersonAssignmentPanel for sorting priority
- Stored in localStorage (persists across sessions)

#### Undo Assignment Functionality

**NOT in PersonAssignmentPanel** - Separate feature in parent modal

**Location**: Lines 615-688 + 913-951

**UI Placement**: Inside "Primary Details" section of FaceListSidebar area

**Trigger** (lines 829-852):
```svelte
{#if suggestion.status === 'accepted' || allFaces.find((f) => f.id === suggestion.faceInstanceId)?.personId}
  <div class="undo-section">
    {#if undoSuccess}
      <Alert.Root class="mb-2 bg-green-50 border-green-200">
        <Alert.Description>{undoSuccess}</Alert.Description>
      </Alert.Root>
    {/if}
    <button
      type="button"
      class="undo-assignment-btn"
      onclick={startUndoAssignment}
      disabled={undoInProgress}
    >
      {undoInProgress ? 'Undoing...' : 'Undo Assignment'}
    </button>
  </div>
{/if}
```

**Flow**:
1. **Check condition**: Only show if face is assigned (has `personId`)
2. **Start undo**: Opens confirmation dialog (`showUndoConfirm = true`)
3. **Confirmation dialog**: Separate `<Dialog.Root>` with warning message
4. **Execute undo**: Calls `unassignFace(faceId)` API
5. **Local update**: Resets face's `personId` and `personName` to null
6. **Notify parent**: Calls `onFaceUnassigned?.(faceId)` callback
7. **Show success**: Displays green alert for 3 seconds

**For Non-Primary Faces**: Different flow via FaceListSidebar's unassign button

**handleUnassignClick** (lines 668-688):
- Simpler flow (no confirmation dialog)
- Calls `unassignFace(faceId)` directly
- Updates local state
- Notifies parent

#### Face Suggestions State

**Complex Map State** (lines 139-144):
```typescript
interface FaceSuggestionsState {
  suggestions: FaceSuggestionItem[];
  loading: boolean;
  error: string | null;
}
let faceSuggestions = $state.raw<Map<string, FaceSuggestionsState>>(new Map());
```

**Why $state.raw**: Maps require manual reassignment for reactivity
- Cannot use `faceSuggestions.set(key, value)` - won't trigger reactivity
- Must use `faceSuggestions = new Map(faceSuggestions)` pattern
- Helper function `updateFaceSuggestion()` encapsulates this (lines 229-233)

**Loading Flow** ($effect on lines 239-339):
1. Detects `suggestion` and `assetId` changes
2. Fetches all faces for asset via `getFacesForAsset()`
3. For each unknown face (excluding primary suggestion):
   - Sets loading state: `{ loading: true, suggestions: [], error: null }`
   - Calls `getFaceSuggestions(faceId)` API
   - Updates with results or error
4. Aborts pending requests on cleanup

---

### 4. PhotoPreviewModal.svelte
**Path**: `src/lib/components/faces/PhotoPreviewModal.svelte`
**Lines**: 767
**Role**: Modal for viewing photos with face assignment and navigation

#### Differences from SuggestionDetailModal

**Similarities**:
- Uses same `PersonAssignmentPanel` component
- Same assignment flow (assign to existing, create new)
- Same panel positioning (below modal body)
- Uses `FaceListSidebar` for face list
- Implements pin prototype functionality

**Key Differences**:

1. **Data Source**:
   - SuggestionDetailModal: Loads faces via `getFacesForAsset()` API
   - PhotoPreviewModal: Receives `PersonPhotoGroup` prop with faces pre-loaded

2. **Face Data Transformation**:
   - Converts `PersonPhotoGroup.faces` to `FaceInstanceWithAge[]` for FaceListSidebar
   - Maps to `FaceBox[]` for ImageWithFaceBoundingBoxes

3. **Navigation**:
   - Includes Previous/Next buttons (`onPrevious`, `onNext` callbacks)
   - Keyboard shortcuts: Arrow Left/Right
   - Large navigation buttons overlaid on image

4. **No Primary Suggestion**:
   - No primary face concept
   - No Accept/Reject footer buttons
   - No separate undo confirmation dialog (uses browser confirm)

5. **Simpler Undo** (line 384-415):
```typescript
async function handleUnassignClick(faceId: string) {
  if (!confirm(`Unassign "${face.personName}" from this face?`)) return;

  await unassignFace(faceId);
  // Update local state
  // Notify parent
}
```

#### Assignment Implementation

**Almost identical to SuggestionDetailModal** (lines 282-442):
- Same `handleAssignToExisting()` logic
- Same `handleCreateAndAssign()` logic
- Same local state updates
- Same `onFaceAssigned` callback pattern

**Code Duplication**: ~150 lines of duplicated assignment logic between the two modals

#### Person Loading Strategy

**Difference**: No person preloading in modal initialization

```typescript
onMount(() => {
  if (persons.length === 0) {
    loadPersons();  // Fetches all pages of persons
  }
  // Fetch suggestions for unknown faces
});

async function loadPersons() {
  persons = await fetchAllPersons('active');
}
```

**SuggestionDetailModal approach**: Loads persons in $effect when modal opens

---

### 5. PrototypePinningPanel.svelte
**Path**: `src/lib/components/faces/PrototypePinningPanel.svelte`
**Lines**: 227
**Role**: Panel for pinning a face as a prototype with age era selection

#### Similar Pattern to PersonAssignmentPanel

- Also a **panel component** (not modal)
- Conditionally rendered when `pinningFaceId !== null`
- Positioned below modal body
- Similar styling and layout

#### Props Interface

```typescript
interface Props {
  open: boolean;
  faceId: string;
  personId: string;
  personName: string;
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (era: AgeEraBucket | null) => void;
}
```

#### Features

- **Age Era Selection**: Dropdown with 6 age ranges (infant → senior)
- **Auto-detect Option**: Default selection (null value)
- **Confirmation**: Calls `onConfirm(selectedEra)` to parent
- **State Reset**: Clears `selectedEra` when panel opens

---

## Current Layout Analysis

### Where PersonAssignmentPanel Appears

**Visual Position in Modal**:

```
┌─────────────────────────────────────────┐
│ Dialog Header                           │
│ (Title, path, metadata)                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────┬──────────────────┐ │
│  │                │                  │ │
│  │  Image with    │  FaceListSidebar │ │
│  │  Face Boxes    │  + Primary       │ │
│  │                │    Details       │ │
│  │                │                  │ │
│  └────────────────┴──────────────────┘ │
│                                         │
├─────────────────────────────────────────┤ ← ASSIGNMENT PANEL APPEARS HERE
│ ┌─────────────────────────────────────┐ │
│ │ PersonAssignmentPanel               │ │
│ │ (Search input, person list,         │ │
│ │  create option, cancel button)      │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Dialog Footer                           │
│ (Accept/Reject buttons)                 │
└─────────────────────────────────────────┘
```

**DOM Structure** (from SuggestionDetailModal):
```svelte
<Dialog.Content class="!max-w-[98vw] !max-h-[98vh] ...">
  <Dialog.Header>...</Dialog.Header>

  <div class="modal-body">
    <!-- Image + FaceListSidebar -->
  </div>

  <!-- PersonAssignmentPanel renders here when assigningFaceId !== null -->
  {#if assigningFaceId}
    <PersonAssignmentPanel ... />
  {/if}

  <Dialog.Footer>...</Dialog.Footer>
</Dialog.Content>
```

**CSS Impact**:
- Dialog.Content uses `flex flex-col` layout
- PersonAssignmentPanel has margin: `0.5rem 0.625rem`
- Creates visual separation from modal body above
- Panel scrolls independently (max-height: 500px)

---

## Data Flow Analysis

### Assignment Flow (Step-by-Step)

**1. User clicks "Assign" on unknown face**:
```
FaceListSidebar (line 190)
  → onclick calls onAssignClick(faceId)
    → Parent modal sets assigningFaceId = faceId
```

**2. Parent modal renders PersonAssignmentPanel**:
```svelte
{#if assigningFaceId}
  <PersonAssignmentPanel
    open={true}
    faceId={assigningFaceId}
    persons={preloadedPersons}
    personsLoading={loadingState}
    submitting={submittingState}
    error={errorState}
    recentPersonIds={getRecentPersonIds()}
    onCancel={() => assigningFaceId = null}
    onAssignToExisting={handleAssignToExisting}
    onCreateAndAssign={handleCreateAndAssign}
  />
{/if}
```

**3. User searches and selects person**:
```
PersonAssignmentPanel (line 141)
  → button onclick calls onAssignToExisting(personId)
    → Parent modal's handleAssignToExisting(personId)
```

**4. Parent modal handles assignment**:
```typescript
// API call
await assignFaceToPerson(faceId, personId);

// Record to MRU list
recordRecentPerson(personId);

// Optimistic UI update
allFaces[index] = { ...face, personId, personName };
faceSuggestions.delete(faceId);

// Notify grandparent (page component)
onFaceAssigned?.({ faceId, personId, personName, ... });

// Close panel
assigningFaceId = null;
```

**5. Panel closes automatically** (due to `assigningFaceId = null`)

### State Management Layers

**Layer 1: PersonAssignmentPanel** (Component-local):
- `personSearchQuery` - Search input
- `filteredPersons` - Derived filtered list
- `showCreateOption` - Derived boolean

**Layer 2: Parent Modal** (Modal-local):
- `assigningFaceId` - Controls panel visibility
- `persons` - Full persons list (pre-loaded)
- `personsLoading` - Loading state
- `assignmentSubmitting` - Prevents double-submit
- `assignmentError` - Error message
- `allFaces` - All faces in image (optimistically updated)
- `faceSuggestions` - Map of suggestions per face

**Layer 3: Page Component** (Page-local):
- Receives `onFaceAssigned` notification
- Updates page-level state (e.g., suggestion list, photo thumbnails)
- May trigger refetch or optimistic update

### Person Data Loading

**SuggestionDetailModal Strategy**:
```typescript
$effect(() => {
  if (!suggestion || !assetId) return;

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
      .then(allPersons => persons = allPersons)
      .finally(() => personsLoading = false);
  }
});
```

**PhotoPreviewModal Strategy**:
```typescript
onMount(() => {
  if (persons.length === 0) {
    loadPersons();
  }
});

async function loadPersons() {
  personsLoading = true;
  try {
    persons = await fetchAllPersons('active');
  } finally {
    personsLoading = false;
  }
}
```

**Key Difference**: SuggestionDetailModal uses $effect (reactive), PhotoPreviewModal uses onMount (once)

---

## Undo Functionality

### Undo is NOT in PersonAssignmentPanel

Undo is a **separate feature** handled by parent modals for **already-assigned faces**.

### SuggestionDetailModal Undo Implementation

**Location**: Lines 615-688 (handlers) + 913-951 (confirmation dialog)

**Trigger Conditions**:
1. Face must be assigned (`personId !== null`)
2. Either:
   - Primary suggestion is accepted (`suggestion.status === 'accepted'`)
   - OR face in `allFaces` has `personId`

**UI Flow**:
```
User clicks "Undo Assignment" button (line 849)
  ↓
startUndoAssignment() → showUndoConfirm = true
  ↓
Confirmation dialog appears (separate Dialog.Root)
  ↓
User clicks "Confirm Undo"
  ↓
confirmUndoAssignment() calls unassignFace(faceId) API
  ↓
Local state update: face.personId = null, face.personName = null
  ↓
Parent callback: onFaceUnassigned?.(faceId)
  ↓
Success message shows for 3 seconds
```

**State Variables**:
- `showUndoConfirm` - Controls confirmation dialog
- `undoInProgress` - Disables buttons during API call
- `undoError` - Error message display
- `undoSuccess` - Success message display

**Separate Dialog**: Confirmation uses a second `<Dialog.Root>` instance (line 914)

### PhotoPreviewModal Undo Implementation

**Simpler approach** - No confirmation dialog component

**Line 384-415**:
```typescript
async function handleUnassignClick(faceId: string) {
  const face = photo.faces.find(f => f.faceInstanceId === faceId);
  if (!face?.personName) return;

  // Browser native confirm dialog
  if (!confirm(`Unassign "${face.personName}" from this face?`)) {
    return;
  }

  unassigningFaceId = faceId;
  unassignmentError = null;

  try {
    await unassignFace(faceId);

    // Update local state
    photo.faces[faceIndex] = { ...face, personId: null, personName: null };

    // Notify parent
    onFaceAssigned?.(faceId, null, null);
  } catch (err) {
    console.error('Failed to unassign face:', err);
    unassignmentError = err.message;
  } finally {
    unassigningFaceId = null;
  }
}
```

**Key Difference**: Uses browser `confirm()` instead of custom dialog

---

## Code Duplication Analysis

### Duplicated Assignment Logic

**Between SuggestionDetailModal and PhotoPreviewModal**:

**Identical Functions** (~150 lines each):
1. `handleAssignToExisting(personId)`
2. `handleCreateAndAssign(name)`
3. Person loading logic
4. Local state management (assigningFaceId, persons, etc.)

**Example Comparison**:

**SuggestionDetailModal (lines 391-448)**:
```typescript
async function handleAssignToExisting(personId: string) {
  if (!assigningFaceId || assignmentSubmitting) return;

  assignmentSubmitting = true;
  assignmentError = null;
  const faceId = assigningFaceId;
  const person = persons.find((p) => p.id === personId);

  try {
    await assignFaceToPerson(faceId, personId);
    recordRecentPerson(personId);

    // Optimistic update
    const faceIndex = allFaces.findIndex((f) => f.id === faceId);
    allFaces[faceIndex] = { ...allFaces[faceIndex], personId, personName };

    faceSuggestions.delete(faceId);

    onFaceAssigned?.({ faceId, personId, personName, thumbnailUrl, photoFilename });
    assigningFaceId = null;
  } catch (err) {
    assignmentError = err.message;
  } finally {
    assignmentSubmitting = false;
  }
}
```

**PhotoPreviewModal (lines 295-331)**:
```typescript
async function handleAssignToExisting(personId: string) {
  if (!assigningFaceId || assignmentSubmitting) return;

  assignmentSubmitting = true;
  assignmentError = null;
  const faceId = assigningFaceId;
  const person = persons.find((p) => p.id === personId);

  try {
    await assignFaceToPerson(faceId, person.id);

    // Update local state (different data structure)
    const faceIndex = photo.faces.findIndex((f) => f.faceInstanceId === faceId);
    photo.faces[faceIndex] = { ...photo.faces[faceIndex], personId, personName };

    const newMap = new Map(faceSuggestions);
    newMap.delete(faceId);
    faceSuggestions = newMap;

    assigningFaceId = null;
    onFaceAssigned?.(faceId, person.id, person.name);
  } catch (err) {
    assignmentError = err.message;
  } finally {
    assignmentSubmitting = false;
  }
}
```

**Subtle Differences**:
1. Data structure: `allFaces[].id` vs `photo.faces[].faceInstanceId`
2. MRU recording: SuggestionDetailModal calls `recordRecentPerson()`, PhotoPreviewModal doesn't
3. Callback signature: Different payload structure

**Refactoring Opportunity**: Extract to shared assignment hook/utility

---

## Recommendations for Refactoring

### Goal: Make PersonAssignmentPanel a Reusable Modal

**Current State**: Panel component (inline, conditional rendering)
**Target State**: Standalone modal component with Dialog wrapper

### Design Options

#### Option 1: Convert PersonAssignmentPanel to Modal (Minimal Change)

**Approach**: Wrap existing component in `<Dialog.Root>`

```svelte
<!-- PersonAssignmentModal.svelte (new name) -->
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import PersonAssignmentPanel from './PersonAssignmentPanel.svelte';

  let { open = $bindable(false), faceId, ...rest }: Props = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md">
    <PersonAssignmentPanel {faceId} {...rest} />
  </Dialog.Content>
</Dialog.Root>
```

**Pros**:
- Minimal code changes
- Keeps existing PersonAssignmentPanel logic intact
- Easy migration path

**Cons**:
- Still requires parent to manage `persons` loading
- Still requires parent to handle assignment logic
- Duplication remains between modals

#### Option 2: Self-Contained Modal (Recommended)

**Approach**: Move assignment logic INTO the modal component

```svelte
<!-- PersonAssignmentModal.svelte -->
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { assignFaceToPerson, createPerson, fetchAllPersons } from '$lib/api/faces';
  import { localSettings } from '$lib/stores/localSettings.svelte';

  interface Props {
    open?: boolean;
    faceId: string;
    onSuccess?: (result: AssignmentResult) => void;
    onCancel?: () => void;
  }

  let { open = $bindable(false), faceId, onSuccess, onCancel }: Props = $props();

  // Internal state (no parent coordination needed)
  let persons = $state<Person[]>([]);
  let personsLoading = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let searchQuery = $state('');

  // Load persons when modal opens
  $effect(() => {
    if (open && persons.length === 0) {
      loadPersons();
    }
  });

  async function handleAssignToExisting(personId: string) {
    submitting = true;
    error = null;

    try {
      await assignFaceToPerson(faceId, personId);
      const person = persons.find(p => p.id === personId);

      recordRecentPerson(personId);

      onSuccess?.({ faceId, personId, personName: person.name });
      open = false;  // Close modal
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }

  // Similar for handleCreateAndAssign
</script>

<Dialog.Root bind:open onOpenChange={(newOpen) => !newOpen && onCancel?.()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Assign to Person</Dialog.Title>
    </Dialog.Header>

    <!-- PersonAssignmentPanel UI inline -->
    <input bind:value={searchQuery} placeholder="Search or create person..." />
    <!-- Person list, create option, etc. -->

    <Dialog.Footer>
      <Button variant="outline" onclick={() => open = false}>Cancel</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

**Pros**:
- **Single responsibility**: Modal owns entire assignment flow
- **No duplication**: One implementation for all use cases
- **Simple API**: Parent only provides `faceId` and `onSuccess` callback
- **Self-contained**: Handles loading, errors, submission internally

**Cons**:
- Larger component (but still under 300 line limit)
- Less flexible (harder to customize UI)

#### Option 3: Composable Modal with Extracted Hook (Best Long-Term)

**Approach**: Extract logic to reusable Svelte 5 runes pattern

```typescript
// src/lib/hooks/useFaceAssignment.svelte.ts
import { createPerson, assignFaceToPerson, fetchAllPersons } from '$lib/api/faces';

export function useFaceAssignment() {
  let persons = $state<Person[]>([]);
  let personsLoading = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  async function loadPersons() { ... }

  async function assignToExisting(faceId: string, personId: string) { ... }

  async function createAndAssign(faceId: string, name: string) { ... }

  return {
    get persons() { return persons; },
    get personsLoading() { return personsLoading; },
    get submitting() { return submitting; },
    get error() { return error; },
    loadPersons,
    assignToExisting,
    createAndAssign
  };
}
```

```svelte
<!-- PersonAssignmentModal.svelte -->
<script lang="ts">
  import { useFaceAssignment } from '$lib/hooks/useFaceAssignment.svelte';

  let { open = $bindable(false), faceId, onSuccess }: Props = $props();

  const assignment = useFaceAssignment();

  $effect(() => {
    if (open) assignment.loadPersons();
  });

  async function handleAssign(personId: string) {
    await assignment.assignToExisting(faceId, personId);
    onSuccess?.({ ... });
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <!-- UI uses assignment.persons, assignment.submitting, etc. -->
</Dialog.Root>
```

**Pros**:
- **Testable logic**: Hook can be tested independently
- **Reusable**: Can use assignment logic in other contexts
- **Composable**: Easy to extend with additional features
- **Clean separation**: UI vs business logic

**Cons**:
- More files to maintain
- Requires understanding Svelte 5 runes pattern

---

## Complexity Analysis

### Current Violations (Code Quality Guardrails)

**From [docs/code-quality-guardrails.md](../code-quality-guardrails.md)**:

| Component | Lines | Limit | Status | Action Required |
|-----------|-------|-------|--------|-----------------|
| `SuggestionDetailModal.svelte` | 1,140 | 300 | 🔴 CRITICAL | Split into 4+ sub-components |
| `PhotoPreviewModal.svelte` | 767 | 300 | 🔴 CRITICAL | Extract assignment panel |
| `PersonAssignmentPanel.svelte` | 355 | 300 | 🟡 WARNING | Minor cleanup |
| `FaceListSidebar.svelte` | 442 | 300 | 🔴 CRITICAL | Extract assignment buttons |

### Responsibilities Analysis

**SuggestionDetailModal** currently handles 4+ responsibilities:
1. Image display with bounding boxes
2. Face list sidebar with selection
3. Face assignment UI and logic
4. Prototype pinning UI and logic
5. Suggestion acceptance/rejection
6. Undo assignment with confirmation

**PhotoPreviewModal** currently handles 4 responsibilities:
1. Image display with navigation (prev/next)
2. Face list sidebar with selection
3. Face assignment UI and logic
4. Prototype pinning UI and logic

**PersonAssignmentPanel** handles 2 responsibilities:
1. Person search/filtering
2. Create new person option

---

## Integration Points

### Where PersonAssignmentPanel is Used

**Direct usages**:
1. `SuggestionDetailModal.svelte` (line 859)
2. `PhotoPreviewModal.svelte` (line 648)

### Parent → Panel Data Flow

**Required Props from Parent**:
- `open: boolean` - Visibility control
- `faceId: string` - Face being assigned
- `persons: Person[]` - Full list (pre-loaded by parent)
- `personsLoading: boolean` - Loading state
- `submitting: boolean` - Prevent double-submit
- `error: string | null` - Error display
- `recentPersonIds?: string[]` - MRU sorting

**Callbacks to Parent**:
- `onCancel: () => void` - User cancels
- `onAssignToExisting: (personId: string) => void` - User selects existing
- `onCreateAndAssign: (name: string) => void` - User creates new

### Panel → Parent Callback Payloads

**onAssignToExisting**:
- Input: `personId: string`
- Parent must: Look up full person, call API, update UI

**onCreateAndAssign**:
- Input: `name: string` (trimmed)
- Parent must: Create person via API, assign, update UI

### Parent → Grandparent Notifications

**onFaceAssigned callback signature** (varies by modal):

**SuggestionDetailModal** (line 428):
```typescript
onFaceAssigned?.({
  faceId: string;
  personId: string;
  personName: string;
  thumbnailUrl: string;
  photoFilename: string;
});
```

**PhotoPreviewModal** (line 324):
```typescript
onFaceAssigned?.(
  faceId: string,
  personId: string | null,
  personName: string | null
);
```

**Inconsistency**: Different callback signatures for same conceptual event

---

## Testing Considerations

### Current Test Coverage

**PersonAssignmentPanel test** (`src/tests/components/faces/PersonAssignmentPanel.test.ts`):
- Exists and covers basic functionality
- Tests search filtering, create option, person selection
- Uses mock data and callbacks

### Testing Requirements for Modal Version

**New tests needed**:
1. **Modal open/close behavior**
   - Opens when `open` prop is true
   - Closes on cancel
   - Closes on successful assignment
   - Keyboard shortcuts (Escape)

2. **API integration**
   - Loads persons when modal opens
   - Handles loading state
   - Handles API errors
   - Retry logic

3. **Assignment flow**
   - Assigns to existing person
   - Creates and assigns new person
   - Calls `onSuccess` with correct payload
   - Updates MRU list

4. **Error handling**
   - Displays API errors inline
   - Prevents double-submit
   - Recovers from errors

---

## Migration Strategy

### Phase 1: Extract Assignment Logic (No UI Changes)

**Goal**: Eliminate duplication between modals

**Actions**:
1. Create `src/lib/hooks/useFaceAssignment.svelte.ts`
2. Extract common logic:
   - `loadPersons()`
   - `assignToExisting(faceId, personId)`
   - `createAndAssign(faceId, name)`
   - MRU tracking
3. Refactor SuggestionDetailModal to use hook
4. Refactor PhotoPreviewModal to use hook
5. Run tests, verify no regression

**Files Changed**: 2 modals + 1 new file
**Risk**: Low (no UI changes)
**Benefit**: -150 lines of duplication

### Phase 2: Convert PersonAssignmentPanel to Modal

**Goal**: Make panel a standalone modal

**Actions**:
1. Create `PersonAssignmentModal.svelte` (wraps hook + UI)
2. Update SuggestionDetailModal to use modal (remove inline panel)
3. Update PhotoPreviewModal to use modal (remove inline panel)
4. Update tests for new modal API
5. Verify accessibility (keyboard nav, focus management)

**Files Changed**: 3 files (2 modals + new modal)
**Risk**: Medium (layout changes)
**Benefit**: -200 lines per modal, better separation of concerns

### Phase 3: Simplify Parent Modals

**Goal**: Reduce modal complexity below 400 lines

**Actions for SuggestionDetailModal**:
1. Extract `ImageViewerSection.svelte` (image + bounding boxes)
2. Extract `PrimarySuggestionDetails.svelte` (right sidebar details)
3. Extract `UndoAssignmentDialog.svelte` (confirmation dialog)
4. Keep modal as thin coordinator

**Actions for PhotoPreviewModal**:
1. Extract navigation logic to composable
2. Reuse `ImageViewerSection.svelte` from above
3. Keep modal as thin coordinator

**Files Changed**: 6 files (2 modals + 4 extracted)
**Risk**: High (major refactor)
**Benefit**: Both modals under 300 lines, maintainable

---

## Open Questions

### 1. Should PersonAssignmentModal support batch assignment?

**Current**: One face at a time
**Future**: Select multiple faces → assign all to same person?

**Considerations**:
- UI complexity increases
- API supports batch (`assignMultipleFaces` in some systems)
- User workflow benefit unclear

**Recommendation**: No - keep focused on single-face use case

### 2. Should we unify onFaceAssigned callback signatures?

**Current**: Two different signatures
- SuggestionDetailModal: Object with 5 fields
- PhotoPreviewModal: 3 separate arguments

**Options**:
- **A**: Standardize on object (more extensible)
- **B**: Simplify to `(faceId, personId, personName)` (most common)
- **C**: Keep inconsistent (avoid breaking changes)

**Recommendation**: Option A - use object for future-proof API

### 3. Should MRU tracking be automatic or opt-in?

**Current**: Parent modals call `recordRecentPerson()` explicitly

**Options**:
- **A**: Modal always records (opinionated)
- **B**: Parent passes `trackRecent?: boolean` prop
- **C**: Keep manual (most flexible)

**Recommendation**: Option A - always record (99% use case)

### 4. Should modal support "quick assign" from keyboard?

**Enhancement**: Type person name, press Enter → create/assign in one step

**Example**:
- User types "John"
- John exists → Enter assigns to John
- John doesn't exist → Enter creates + assigns

**Considerations**:
- Improves keyboard-only workflow
- Risk: Accidental creation if typo
- Needs confirmation step?

**Recommendation**: Future enhancement - not for v1

---

## Summary

### Key Findings

1. **PersonAssignmentPanel is currently a panel** (not modal)
2. **Two modals use it** with ~150 lines of duplicated logic each
3. **Undo is separate** from assignment (not in panel)
4. **MRU tracking** is implemented via localStorage
5. **Both modals exceed complexity limits** (1,140 and 767 lines)

### Recommended Approach

**Short-term** (1-2 weeks):
- Extract `useFaceAssignment` hook
- Eliminate duplication between modals

**Medium-term** (2-4 weeks):
- Convert PersonAssignmentPanel to standalone modal
- Update both parent modals to use new modal
- Write comprehensive tests

**Long-term** (1-2 months):
- Break down SuggestionDetailModal into 4+ sub-components
- Break down PhotoPreviewModal into 3+ sub-components
- Both modals under 300 lines

### Files to Create

1. `src/lib/hooks/useFaceAssignment.svelte.ts` (hook)
2. `src/lib/components/faces/PersonAssignmentModal.svelte` (modal)
3. `src/tests/components/faces/PersonAssignmentModal.test.ts` (tests)

### Files to Refactor

1. `SuggestionDetailModal.svelte` (remove inline panel, use modal)
2. `PhotoPreviewModal.svelte` (remove inline panel, use modal)
3. `PersonAssignmentPanel.svelte` (mark as deprecated or repurpose)

### Lines of Code Impact

**Before**:
- SuggestionDetailModal: 1,140 lines
- PhotoPreviewModal: 767 lines
- PersonAssignmentPanel: 355 lines
- **Total**: 2,262 lines

**After Phase 2**:
- SuggestionDetailModal: ~900 lines (-240)
- PhotoPreviewModal: ~600 lines (-167)
- PersonAssignmentModal: ~250 lines (new)
- useFaceAssignment hook: ~150 lines (new)
- **Total**: 1,900 lines (-362, -16%)

**After Phase 3**:
- SuggestionDetailModal: <300 lines (target)
- PhotoPreviewModal: <300 lines (target)
- PersonAssignmentModal: ~250 lines
- useFaceAssignment hook: ~150 lines
- 4-6 extracted sub-components: ~600 lines
- **Total**: ~1,600 lines (-662, -29%)

---

## Appendix: Related Components

### Components NOT Analyzed (Out of Scope)

- `LabelClusterModal.svelte` - For labeling unknown clusters
- `PersonPickerModal.svelte` - For selecting persons in other contexts
- `FindMoreDialog.svelte` - For finding similar faces
- `ImportPersonDataModal.svelte` - For importing person data

**Note**: These may also use similar assignment patterns but were not reviewed in detail.

### Shared Components Used

- `ImageWithFaceBoundingBoxes.svelte` - Image viewer with face overlays
- `FaceListSidebar.svelte` - Face list with selection
- `Dialog` (shadcn-svelte) - Base modal component
- `Button` (shadcn-svelte) - Button component
- `Alert` (shadcn-svelte) - Alert/error display

---

## Document Metadata

**Research Conducted By**: Claude Code (Research Agent)
**Date**: 2026-01-11
**Project**: image-search-ui
**Version**: Based on codebase at commit `775c9fe`
**Tools Used**: Read, Glob, Grep
**Lines Analyzed**: ~3,000 lines across 5 components

**Next Steps**:
1. Review this document with team
2. Prioritize Phase 1 (hook extraction)
3. Create GitHub issue for tracking
4. Assign implementation to engineer

---
