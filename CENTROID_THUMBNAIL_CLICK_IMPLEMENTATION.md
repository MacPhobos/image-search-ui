# CentroidResultsDialog Thumbnail Click Implementation

## Summary

Enhanced the `CentroidResultsDialog` component to make face thumbnails clickable, opening the `SuggestionDetailModal` which displays the full image with face bounding boxes and allows users to assign faces to persons.

## Changes Made

### File Modified

- `src/lib/components/faces/CentroidResultsDialog.svelte`

### Key Features

1. **Clickable Thumbnails**: Clicking a face thumbnail now opens the detail modal instead of toggling selection
2. **Selection via Checkbox**: Face selection is now only done via the checkbox (more intuitive UX)
3. **Detail Modal Integration**: Reuses the existing `SuggestionDetailModal` component for consistency
4. **Type Adapter**: Created `adaptCentroidToFaceSuggestion()` to convert `CentroidSuggestion` to `FaceSuggestion` format

### Implementation Details

#### 1. Imports Added

```typescript
import SuggestionDetailModal from './SuggestionDetailModal.svelte';
import { type FaceSuggestion } from '$lib/api/faces';
```

#### 2. State Added

```typescript
let selectedSuggestionForDetail = $state<FaceSuggestion | null>(null);
```

#### 3. Adapter Function

```typescript
function adaptCentroidToFaceSuggestion(centroid: CentroidSuggestion): FaceSuggestion {
	return {
		id: 0, // Not relevant for display-only modal
		faceInstanceId: centroid.faceInstanceId,
		suggestedPersonId: personId,
		confidence: centroid.score,
		sourceFaceId: centroid.faceInstanceId,
		status: 'pending',
		createdAt: new Date().toISOString(),
		reviewedAt: null,
		faceThumbnailUrl: centroid.thumbnailUrl,
		personName: personName,
		fullImageUrl: `/api/v1/images/${centroid.assetId}/full`,
		path: '', // Not available in CentroidSuggestion
		bboxX: null,
		bboxY: null,
		bboxW: null,
		bboxH: null,
		detectionConfidence: null,
		qualityScore: null
	};
}
```

#### 4. Event Handlers

- `handleThumbnailClick()` - Opens detail modal with adapted suggestion
- `handleDetailAccept()` - Accepts face assignment from detail modal
- `handleDetailReject()` - Dismisses the detail modal
- `handleDetailClose()` - Closes the detail modal

#### 5. UI Changes

- Thumbnail button now has `onclick={() => handleThumbnailClick(suggestion)}`
- Added `aria-label="View face details"` for accessibility
- Checkbox still controls selection (unchanged behavior)

#### 6. Modal Integration

Added `SuggestionDetailModal` component at the bottom of the template:

```svelte
<SuggestionDetailModal
  suggestion={selectedSuggestionForDetail}
  onClose={handleDetailClose}
  onAccept={handleDetailAccept}
  onReject={handleDetailReject}
  onFaceAssigned={...}
  onPrototypePinned={...}
  onFaceUnassigned={...}
/>
```

### Behavior

**Before**:

- Clicking thumbnail → Toggles face selection
- Clicking checkbox → Toggles face selection

**After**:

- Clicking thumbnail → Opens detail modal showing full image with bounding boxes
- Clicking checkbox → Toggles face selection
- From detail modal:
  - User can accept/reject the primary suggestion
  - User can assign other faces in the same image
  - User can pin faces as prototypes
  - User can unassign faces

### Integration Points

The detail modal callbacks trigger `onComplete()` which refreshes the person data:

- After accepting a face assignment
- After pinning a prototype
- After unassigning a face

This ensures the centroid suggestions list stays in sync with the latest data.

### Testing Recommendations

1. **Click Thumbnail**: Verify detail modal opens with full image
2. **Bounding Boxes**: Check that face bounding boxes are displayed
3. **Assignment**: Test assigning the face to the suggested person
4. **Multi-Face Images**: Test images with multiple detected faces
5. **Refresh**: Verify suggestions refresh after assignment
6. **Checkbox Selection**: Ensure checkbox still works for bulk operations

### Future Enhancements

1. **Enhanced Adapter**: Could fetch real `path` from backend if needed
2. **Batch Modal**: Could support opening modal in batch mode with prev/next navigation
3. **Keyboard Navigation**: Add keyboard shortcuts for modal navigation
4. **Preload**: Could preload full images on hover for faster modal opening

## Code Quality

- ✅ No lint errors
- ✅ TypeScript types properly handled
- ✅ Unused parameters prefixed with `_`
- ✅ Consistent with existing patterns (e.g., `SuggestionDetailModal` usage in other components)
- ✅ Accessibility attributes added
- ✅ Proper state management with Svelte 5 runes

## Related Files

- `src/lib/components/faces/SuggestionDetailModal.svelte` - Detail modal component
- `src/lib/components/faces/ImageWithFaceBoundingBoxes.svelte` - Bounding box visualization
- `src/lib/api/faces.ts` - Type definitions for `CentroidSuggestion` and `FaceSuggestion`
