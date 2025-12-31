# Face-Bounding Box Association Analysis

**Date:** 2025-12-29
**Researcher:** Claude Code Research Agent
**Objective:** Understand how Photo Preview dialog associates faces with bounding boxes and determine what's needed to add this to Face Suggestion Details dialog

---

## Executive Summary

The Photo Preview dialog has a fully functional face-to-bounding-box visual association system using color-coded indicators and hover interactions. The Face Suggestion Details dialog has the same infrastructure but is **missing the interactive hover mechanism** that links the sidebar face list to the on-image bounding boxes.

**Key Finding:** The difference is in how `highlightedFaceId` state is managed and propagated between components.

---

## 1. Component File Locations

### Photo Preview Dialog
**File:** `/export/workspace/image-search/image-search-ui/src/lib/components/faces/PhotoPreviewModal.svelte`

### Face Suggestion Details Dialog
**File:** `/export/workspace/image-search/image-search-ui/src/lib/components/faces/SuggestionDetailModal.svelte`

### Shared Component
**File:** `/export/workspace/image-search/image-search-ui/src/lib/components/faces/ImageWithFaceBoundingBoxes.svelte`

---

## 2. Photo Preview Dialog: How Face Association Works

### 2.1 Color System

Both dialogs use the same color palette for visual distinction:

```typescript
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
  '#84cc16'  // Lime
];
```

Each face gets a unique color based on its index in the face array:

```typescript
// PhotoPreviewModal.svelte (lines 98-105)
function getFaceColorByIndex(index: number): string {
  return FACE_COLORS[index % FACE_COLORS.length];
}

function getFaceColor(face: FaceInPhoto): string {
  const index = photo.faces.findIndex((f) => f.faceInstanceId === face.faceInstanceId);
  return getFaceColorByIndex(index >= 0 ? index : 0);
}
```

### 2.2 State Management

**Key State Variable:**
```typescript
// PhotoPreviewModal.svelte (line 46)
let highlightedFaceId = $state<string | null>(null);
```

This reactive state variable tracks which face is currently highlighted.

### 2.3 Interactive Hover System

**Face List Item (Lines 526-560):**

```svelte
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
        style="background-color: {getFaceColor(face)};"
      ></span>
      <!-- Face name and metadata -->
    </button>
  </div>
</li>
```

**Handler Function (Lines 215-217):**

```typescript
function handleHighlightFace(faceId: string) {
  highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
}
```

**Toggle Behavior:** Clicking the same face again deselects it.

### 2.4 Visual Feedback

**CSS Highlighting (Lines 913-916):**

```css
.face-item.highlighted {
  background-color: #e0f2fe;
  box-shadow: inset 3px 0 0 0 var(--highlight-color, #3b82f6);
}
```

**Features:**
- Light blue background (`#e0f2fe`)
- Colored left border using the face's unique color
- CSS custom property `--highlight-color` for dynamic color

### 2.5 Bounding Box Integration

**FaceBox Array (Lines 108-145):**

```typescript
let faceBoxes = $derived<FaceBox[]>(
  photo.faces.map((face) => {
    const index = photo.faces.findIndex((f) => f.faceInstanceId === face.faceInstanceId);

    return {
      id: face.faceInstanceId,
      bboxX: face.bboxX,
      bboxY: face.bboxY,
      bboxW: face.bboxW,
      bboxH: face.bboxH,
      label: /* computed label */,
      labelStyle: /* computed style */,
      color: getFaceColorByIndex(index),
      suggestionConfidence: /* optional */
    };
  })
);
```

**Component Usage (Lines 508-513):**

```svelte
<ImageWithFaceBoundingBoxes
  imageUrl={photo.fullUrl}
  faces={faceBoxes}
  highlightedFaceId={highlightedFaceId}
  onFaceClick={handleFaceClick}
/>
```

**Bidirectional Interaction:**
- `highlightedFaceId` prop tells the image component which face to highlight
- `onFaceClick` callback allows clicking on bounding boxes to update `highlightedFaceId`

---

## 3. ImageWithFaceBoundingBoxes Component

### 3.1 Props Interface

```typescript
interface Props {
  imageUrl: string;
  faces: FaceBox[];
  highlightedFaceId?: string | null;
  primaryFaceId?: string | null;
  onFaceClick?: (faceId: string) => void;
  maxHeight?: string;
}
```

### 3.2 Visual Highlighting Mechanism

**Stroke Width (Lines 91-95):**

```typescript
function getStrokeWidth(face: FaceBox): number {
  if (face.id === primaryFaceId) return 4;
  if (face.id === highlightedFaceId) return 3;
  return 2;
}
```

**SVG Rendering (Lines 124-135):**

```svelte
<rect
  x={face.bboxX}
  y={face.bboxY}
  width={face.bboxW}
  height={face.bboxH}
  class="face-box"
  class:primary
  class:highlighted
  style="stroke: {faceColor}; stroke-width: {strokeWidth};"
  onclick={() => handleFaceClick(face.id)}
/>
```

**CSS Animations (Lines 269-297):**

```css
.face-box.highlighted {
  opacity: 1;
  animation: pulse-box 1.5s ease-in-out infinite;
}

@keyframes pulse-box {
  0%, 100% { stroke-width: 3; }
  50% { stroke-width: 5; }
}
```

**Effect:** Highlighted bounding boxes pulse with varying stroke width (3-5px).

---

## 4. Face Suggestion Details Dialog: Current State

### 4.1 What It Has

✅ **Same color system** (lines 87-102)
✅ **Same `ImageWithFaceBoundingBoxes` component** (lines 458-463)
✅ **FaceBox array construction** (lines 105-148)
✅ **Face list rendering** (lines 484-618)

### 4.2 What It's Missing

❌ **No `highlightedFaceId` state variable**
❌ **No hover/click handlers in face list**
❌ **No `highlightedFaceId` prop passed to `ImageWithFaceBoundingBoxes`**
❌ **No visual highlighting CSS for face list items**

### 4.3 Current Face List Implementation

```svelte
<!-- Lines 484-522 -->
<li class="face-item">
  <div class="face-item-content">
    <div class="face-info">
      <span class="face-name">
        {#if isPrimary}
          <span class="primary-badge">Primary</span>
        {/if}
        {getFaceLabel(face)}
      </span>
      <span class="face-meta">
        Conf: {(face.detectionConfidence * 100).toFixed(0)}%
      </span>
    </div>

    {#if !isPrimary && !face.personName}
      <button class="assign-btn" onclick={() => startAssignment(face.id)}>
        Assign
      </button>
    {/if}
  </div>
</li>
```

**Notable Absence:** No interactive button wrapper like PhotoPreviewModal has.

---

## 5. Implementation Requirements

To add face-to-bounding-box association to SuggestionDetailModal, the following changes are needed:

### 5.1 Add State Management

```typescript
// Add after line 38 (after other state declarations)
let highlightedFaceId = $state<string | null>(null);
```

### 5.2 Add Handler Functions

```typescript
// Add after existing handler functions (around line 435)
function handleHighlightFace(faceId: string) {
  highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
}

function handleFaceClick(faceId: string) {
  highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
}
```

### 5.3 Update ImageWithFaceBoundingBoxes Usage

```svelte
<!-- Update lines 458-463 -->
<ImageWithFaceBoundingBoxes
  imageUrl={fullImageUrl() ?? ''}
  faces={allFaceBoxes()}
  primaryFaceId={suggestion.faceInstanceId}
  highlightedFaceId={highlightedFaceId}  <!-- ADD THIS -->
  onFaceClick={handleFaceClick}          <!-- ADD THIS -->
  maxHeight="75vh"
/>
```

### 5.4 Make Face List Interactive

**Wrap face content in clickable button:**

```svelte
<!-- Update face-item structure (lines 489-522) -->
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
        <!-- Existing face name and metadata -->
      </div>
    </button>

    <!-- Keep assign button outside main button -->
    {#if !isPrimary && !face.personName}
      <button class="assign-btn" onclick={() => startAssignment(face.id)}>
        Assign
      </button>
    {/if}
  </div>
</li>
```

### 5.5 Add CSS Styles

**Copy from PhotoPreviewModal.svelte:**

```css
/* Add after .face-item styles (around line 840) */
.face-item.highlighted {
  background-color: #e0f2fe;
  box-shadow: inset 3px 0 0 0 var(--highlight-color, #3b82f6);
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
```

### 5.6 Add Color Utility Function

```typescript
// Add after FACE_COLORS definition (around line 102)
function getFaceColorByIndex(index: number): string {
  return FACE_COLORS[index % FACE_COLORS.length];
}
```

---

## 6. Code Patterns to Reuse

### 6.1 From PhotoPreviewModal

**State Pattern:**
```typescript
let highlightedFaceId = $state<string | null>(null);
```

**Toggle Handler:**
```typescript
function handleHighlightFace(faceId: string) {
  highlightedFaceId = highlightedFaceId === faceId ? null : faceId;
}
```

**CSS Custom Property:**
```svelte
style="--highlight-color: {getFaceColor(face)};"
```

**Face Indicator:**
```svelte
<span
  class="face-indicator"
  style="background-color: {getFaceColor(face)};"
></span>
```

### 6.2 From ImageWithFaceBoundingBoxes

Already being used correctly - just needs `highlightedFaceId` and `onFaceClick` props added.

---

## 7. Testing Considerations

### 7.1 User Interactions to Test

1. **Click face in sidebar** → Bounding box highlights on image
2. **Click same face again** → Unhighlights (toggle off)
3. **Click different face** → Previous unhighlights, new face highlights
4. **Click bounding box on image** → Corresponding face highlights in sidebar
5. **Hover over face** → Visual feedback (existing CSS will handle this)

### 7.2 Visual States to Verify

- **Primary face** (suggestion face) - Should have `primaryFaceId` styling (thicker border, pulse animation)
- **Highlighted face** - Should have pulsing border and sidebar highlight
- **Normal faces** - Standard border thickness
- **Color consistency** - Same color used for indicator dot and bounding box border

### 7.3 Edge Cases

- **Single face in image** - Should still be clickable/highlightable
- **Many faces (>10)** - Colors should cycle through palette
- **Assigning face while highlighted** - Highlight state should persist during assignment
- **Closing assignment panel** - Should maintain highlight state

---

## 8. Recommended Implementation Approach

### Phase 1: Add Core Functionality (Minimal Changes)
1. Add `highlightedFaceId` state
2. Add handler functions
3. Pass props to `ImageWithFaceBoundingBoxes`
4. Test bidirectional click interaction

### Phase 2: Add Visual Feedback
1. Wrap face content in button
2. Add face indicator dot
3. Add highlighted class binding
4. Add CSS styles

### Phase 3: Polish
1. Test keyboard navigation
2. Verify aria labels
3. Test color consistency
4. Mobile responsiveness check

### Phase 4: Regression Testing
1. Ensure assignment panel still works
2. Verify suggestion acceptance works
3. Check primary/non-primary face distinction
4. Test with multiple faces

---

## 9. Accessibility Considerations

### Current Implementation (Photo Preview)

✅ **Proper ARIA labels:**
```svelte
aria-label="Highlight face of {getFaceLabel(face)}"
```

✅ **Button for interaction:**
```svelte
<button type="button" class="face-item-button">
```

✅ **Visual AND programmatic state:**
```svelte
class:highlighted={highlightedFaceId === face.faceInstanceId}
```

### Required for Face Suggestion Details

- Add same ARIA labels to clickable face items
- Ensure keyboard navigation works (tab through faces)
- Consider adding `aria-pressed` state for highlighted faces
- Test with screen readers to ensure face selection is announced

---

## 10. Potential Improvements (Future Enhancements)

### 10.1 For Both Dialogs

1. **Keyboard shortcuts:**
   - Arrow keys to navigate between faces
   - Enter/Space to toggle highlight
   - Numbers (1-9) to select specific faces

2. **Visual enhancements:**
   - Show face number badges on image
   - Add tooltips with confidence scores on hover
   - Dimming non-highlighted faces when one is selected

3. **Mobile optimizations:**
   - Swipe gestures to navigate faces
   - Larger touch targets for face indicators
   - Bottom sheet UI for face list on small screens

### 10.2 Face Suggestion Specific

1. **Smart highlighting:**
   - Auto-highlight primary suggestion on open
   - Highlight unknown faces with low confidence differently

2. **Comparison mode:**
   - Side-by-side view of suggested person's prototype faces
   - Visual similarity indicators

---

## 11. Summary

### What Works in Photo Preview
- ✅ Color-coded face indicators (dots)
- ✅ Interactive hover/click on sidebar faces
- ✅ Bidirectional highlighting (sidebar ↔ image)
- ✅ Visual feedback (background color, border, pulsing)
- ✅ Accessibility (ARIA labels, keyboard support)

### What's Missing in Face Suggestion Details
- ❌ State management for highlight
- ❌ Click handlers for faces
- ❌ Props to image component
- ❌ Visual indicators (colored dots)
- ❌ CSS for highlighting

### Implementation Complexity
**Low to Medium** - Most code can be directly copied from PhotoPreviewModal with minor adaptations for different data structures.

### Estimated Effort
- Core functionality: **30 minutes**
- Visual polish: **15 minutes**
- Testing: **30 minutes**
- **Total: ~75 minutes**

---

## 12. References

### Code Files Analyzed
1. `/export/workspace/image-search/image-search-ui/src/lib/components/faces/PhotoPreviewModal.svelte` (1381 lines)
2. `/export/workspace/image-search/image-search-ui/src/lib/components/faces/SuggestionDetailModal.svelte` (1283 lines)
3. `/export/workspace/image-search/image-search-ui/src/lib/components/faces/ImageWithFaceBoundingBoxes.svelte` (325 lines)

### Key Line References
- **PhotoPreview State:** Line 46
- **PhotoPreview Handlers:** Lines 211-217
- **PhotoPreview Face List:** Lines 526-560
- **PhotoPreview CSS:** Lines 913-916
- **ImageBoundingBox Props:** Lines 23-30
- **ImageBoundingBox Highlighting:** Lines 91-103, 269-297
- **Suggestion Face List:** Lines 484-522
- **Suggestion Image Component:** Lines 458-463

---

**End of Research Report**
