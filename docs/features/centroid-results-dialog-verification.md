# Centroid Results Dialog - Verification Guide

## How to Test

### 1. Start the Application

```bash
# Terminal 1: Backend
cd image-search-service && make dev

# Terminal 2: Worker
cd image-search-service && make worker

# Terminal 3: Frontend
cd image-search-ui && npm run dev
```

### 2. Navigate to a Person

1. Go to http://localhost:5173/people
2. Click on any person with existing faces (labeled faces > 0)

### 3. Trigger Centroid Computation

1. On the person detail page, look for the "Actions" section
2. Click the "Compute Centroids" button
3. The `ComputeCentroidsDialog` opens

### 4. Find Suggestions

1. In the dialog, configure options (or use defaults):
   - Min Similarity: 0.70 (default)
   - Max Results: 50 (default)
   - Unassigned Only: checked (recommended)
   - Exclude Prototypes: checked (recommended)
2. Click "Find Suggestions"
3. Wait for the computation to complete

### 5. View Results

**If suggestions are found:**

- The `ComputeCentroidsDialog` closes
- The `CentroidResultsDialog` opens automatically
- You should see:
  - Dialog title: "Centroid Suggestions for [Person Name]"
  - Grid of face thumbnails (2-6 columns depending on screen size)
  - Similarity scores as percentages (e.g., "95.0%")
  - Checkboxes for selection
  - "Accept All" and "Accept Selected" buttons

**If no suggestions are found:**

- A toast notification: "No centroid suggestions found"
- Both dialogs close

### 6. Interact with Suggestions

**Selection:**

- Click individual checkboxes to select specific faces
- Click the "Select All" checkbox at the top to select/deselect all
- Click on a thumbnail to toggle selection (alternative to checkbox)
- Selected thumbnails have a blue border

**View Details:**

- Hover over a thumbnail to see the matched centroid ID in a tooltip
- Each thumbnail shows the similarity score in the bottom-right corner

**Accept Suggestions:**

1. Select one or more faces (or use "Accept All")
2. Click "Accept Selected (N)" or "Accept All"
3. Watch for:
   - Loading spinners on processing faces
   - Toast notification with success/failure count
   - Selected faces removed from grid after assignment
   - Dialog closes if all suggestions accepted

### 7. Verify Person Update

After accepting suggestions:

1. The person detail page should refresh automatically
2. The face count should increase by the number of accepted suggestions
3. New faces appear in the "Photos" tab

## Expected Behavior

### Grid Layout

| Screen Size         | Columns |
| ------------------- | ------- |
| Mobile (< 640px)    | 2       |
| Small (640-768px)   | 3       |
| Medium (768-1024px) | 4       |
| Large (≥1024px)     | 6       |

### Similarity Score Display

- Displayed as percentage: `score * 100` (e.g., 0.87 → "87.0%")
- Higher scores at the top (sorted descending)
- Badge positioned at bottom-right of thumbnail

### Selection Behavior

- Individual selection: Click checkbox or thumbnail
- Bulk selection: "Select All" checkbox
- Visual feedback: Blue border on selected items
- Counter shows: "N selected"

### Accept Actions

**Accept Selected:**

- Only appears when 1+ faces selected
- Shows count: "Accept Selected (N)"
- Processes only selected faces
- Removes from grid after success

**Accept All:**

- Always visible
- Processes all suggestions in grid
- Closes dialog after all processed

### Error Handling

**API Failures:**

- Toast notification with partial success count
- Example: "Accepted 2, failed 1 suggestion"
- Failed items remain in grid for retry

**Empty State:**

- Message: "No centroid suggestions found for [Person Name]"
- "Done" button to close dialog

## Visual Inspection Checklist

- [ ] Dialog opens with proper title
- [ ] Grid layout responsive (adjusts to screen size)
- [ ] Thumbnails display correctly (no broken images)
- [ ] Similarity scores visible and formatted correctly
- [ ] Checkboxes functional (select/deselect)
- [ ] "Select All" works correctly
- [ ] Hover tooltip shows centroid ID
- [ ] Loading spinners appear during processing
- [ ] Toast notifications show success/failure
- [ ] Dialog closes after accepting all
- [ ] Person data refreshes (face count increases)

## Debugging

**If suggestions don't appear:**

- Check browser console for errors
- Verify backend logs for centroid computation
- Ensure person has labeled faces (required for centroids)
- Try lowering min_similarity threshold

**If API calls fail:**

- Check network tab in browser DevTools
- Verify backend `/api/v1/faces/faces/{id}/assign` endpoint
- Check backend logs for errors
- Ensure worker is running (processes face assignments)

**If dialog doesn't open:**

- Check browser console for component errors
- Verify `onSuggestionsReady` callback in page code
- Ensure `showCentroidResultsDialog` state is set to `true`

## Component Hierarchy

```
PersonDetailPage (+page.svelte)
  └── ComputeCentroidsDialog
        ├── [User clicks "Find Suggestions"]
        └── onSuggestionsReady(suggestions) callback
              └── Opens CentroidResultsDialog
                    ├── Grid of thumbnails
                    ├── Selection checkboxes
                    ├── Accept actions
                    └── onComplete() → refreshes person data
```

## State Flow

```
1. User clicks "Compute Centroids"
   → showCentroidsDialog = true

2. ComputeCentroidsDialog finds suggestions
   → onSuggestionsReady(suggestions) called
   → centroidSuggestions = suggestions
   → showCentroidsDialog = false
   → showCentroidResultsDialog = true

3. User accepts suggestions
   → API calls to assign faces
   → onComplete() called
   → loadPerson() refreshes person data

4. User clicks "Done" or all accepted
   → showCentroidResultsDialog = false
```

## Performance Notes

- Suggestions are processed **sequentially** (one API call at a time)
- For large result sets (50+ suggestions), "Accept All" may take 10-30 seconds
- Each face assignment triggers a backend worker job
- UI shows loading spinner during processing
- Consider "Accept Selected" for faster workflows

## Accessibility

- All buttons have accessible labels
- Checkboxes have ARIA labels
- Dialog has proper ARIA roles
- Keyboard navigation works (Tab, Enter, Space)
- Screen reader announces selection count

## Browser Compatibility

Tested on:

- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

Should work on all modern browsers supporting ES2020+.
