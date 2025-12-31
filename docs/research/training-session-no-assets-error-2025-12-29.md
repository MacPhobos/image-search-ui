# Training Session "No Assets Found" Error Investigation

**Date**: 2025-12-29
**Investigator**: Research Agent
**Affected Component**: Training Session Start Functionality
**Error**: `{"detail":"No assets found for session 19"}`

## Executive Summary

The "No assets found for session 19" error is **expected behavior**, not a bug. It occurs when a training session is started without any selected subdirectories containing image files. This is a validation safeguard preventing empty training runs.

**Root Cause**: Session 19 either has:
1. No subdirectories added to the session, OR
2. All subdirectories are marked as `selected=false`, OR
3. The selected subdirectories contain no image files matching allowed extensions

**Recommendation**: This is correct validation logic. The UI should prevent users from starting sessions without selected subdirectories and warn when selected directories contain no images.

---

## System Architecture

### Training Session Workflow

```
1. Create Session (POST /api/v1/training/sessions)
   └─> TrainingSession record created with status=PENDING
   └─> TrainingSubdirectory records created (optional)

2. Scan/Select Subdirectories
   └─> User scans directory tree
   └─> User marks subdirectories as selected=true

3. Start Training (POST /api/v1/training/sessions/{id}/start) ⚠️ ERROR OCCURS HERE
   └─> AssetDiscoveryService.discover_assets()
       ├─> Queries TrainingSubdirectory WHERE selected=true
       ├─> Scans filesystem for images in each selected subdirectory
       ├─> Creates/fetches ImageAsset records for each image file
       └─> Returns list of ImageAsset records
   └─> IF no assets: raise ValueError("No assets found for session {id}")
   └─> ELSE: Create TrainingJob records and enqueue background jobs

4. Training Execution
   └─> Background worker processes each TrainingJob
   └─> Generates embeddings and stores in Qdrant
```

### Data Model Relationships

```
TrainingSession (1) ──┬──> (N) TrainingSubdirectory
                      │     ├─ path: "/path/to/dir"
                      │     ├─ selected: true/false ⭐ KEY FIELD
                      │     ├─ image_count: 0 (updated after scan)
                      │     └─ trained_count: 0
                      │
                      └──> (N) TrainingJob
                            ├─ asset_id: FK to ImageAsset
                            ├─ status: pending/running/completed/failed
                            └─ progress: 0-100

ImageAsset (independent table)
├─ path: "/absolute/path/to/image.jpg" (unique)
├─ file_size: bytes
└─ file_modified_at: timestamp
```

---

## Error Analysis

### Error Location

**File**: `src/image_search_service/services/training_service.py`
**Method**: `TrainingService.enqueue_training()`
**Line**: 335

```python
async def enqueue_training(self, db: AsyncSession, session_id: int) -> str:
    """Enqueue training session for background processing."""
    session = await self.get_session(db, session_id)
    if not session:
        raise ValueError(f"Training session {session_id} not found")

    # Discover assets in selected subdirectories
    logger.info(f"Discovering assets for session {session_id}")
    discovery_service = AssetDiscoveryService()
    assets = await discovery_service.discover_assets(db, session_id)

    if not assets:  # ⚠️ ERROR RAISED HERE
        raise ValueError(f"No assets found for session {session_id}")

    # ... continue with job creation
```

### Asset Discovery Logic

**File**: `src/image_search_service/services/asset_discovery.py`
**Method**: `AssetDiscoveryService.discover_assets()`
**Lines**: 54-65

```python
async def discover_assets(self, db: AsyncSession, session_id: int) -> list[ImageAsset]:
    """Discover all images in selected subdirectories for a session."""

    # Get selected subdirectories
    subdirs_query = (
        select(TrainingSubdirectory)
        .where(TrainingSubdirectory.session_id == session_id)
        .where(TrainingSubdirectory.selected == True)  # ⭐ CRITICAL FILTER
    )
    subdirs_result = await db.execute(subdirs_query)
    selected_subdirs = list(subdirs_result.scalars().all())

    if not selected_subdirs:
        logger.warning(f"No subdirectories selected for session {session_id}")
        return []  # ⚠️ RETURNS EMPTY LIST → TRIGGERS ERROR

    # Scan each selected subdirectory for image files
    all_assets = []
    for subdir in selected_subdirs:
        assets = await self._scan_directory(db, subdir.path, recursive=True)
        all_assets.extend(assets)

    return all_assets  # ⚠️ COULD BE EMPTY IF NO IMAGES FOUND
```

**Supported Image Extensions**: `.jpg`, `.jpeg`, `.png`, `.webp`

---

## Failure Scenarios

### Scenario 1: No Subdirectories Added to Session

**Steps to Reproduce**:
```bash
# Create session without subdirectories
POST /api/v1/training/sessions
{
  "name": "Test Session",
  "root_path": "/path/to/images",
  "category_id": 1
}
# Response: Session 19 created with 0 subdirectories

# Start training immediately
POST /api/v1/training/sessions/19/start
# Response: 400 {"detail": "No assets found for session 19"}
```

**Why**: `TrainingSubdirectory` table has no records for session_id=19, so `discover_assets()` returns empty list.

---

### Scenario 2: All Subdirectories Marked as Unselected

**Steps to Reproduce**:
```bash
# Create session with subdirectories
POST /api/v1/training/sessions
{
  "name": "Test Session",
  "root_path": "/path/to/images",
  "subdirectories": ["/path/to/images/dir1", "/path/to/images/dir2"]
}
# Response: Session 19 created with 2 subdirectories (selected=true by default)

# Unselect all subdirectories
PATCH /api/v1/training/sessions/19/subdirectories
[
  {"id": 1, "selected": false},
  {"id": 2, "selected": false}
]

# Start training
POST /api/v1/training/sessions/19/start
# Response: 400 {"detail": "No assets found for session 19"}
```

**Why**: Query filters `WHERE selected=true`, finds no matching subdirectories.

---

### Scenario 3: Selected Subdirectories Contain No Images

**Steps to Reproduce**:
```bash
# Create session pointing to empty directories
POST /api/v1/training/sessions
{
  "name": "Test Session",
  "root_path": "/empty/directory",
  "subdirectories": ["/empty/directory/subdir1"]
}

# Start training
POST /api/v1/training/sessions/19/start
# Response: 400 {"detail": "No assets found for session 19"}
```

**Why**: Filesystem scan finds no files matching image extensions, returns empty asset list.

---

### Scenario 4: Directory Contains Only Unsupported File Types

**Steps to Reproduce**:
```bash
# Directory contains: file1.txt, file2.pdf, file3.gif
POST /api/v1/training/sessions
{
  "name": "Test Session",
  "root_path": "/mixed/files",
  "subdirectories": ["/mixed/files"]
}

# Start training
POST /api/v1/training/sessions/19/start
# Response: 400 {"detail": "No assets found for session 19"}
```

**Why**: Only `.jpg`, `.jpeg`, `.png`, `.webp` are supported. `.gif`, `.txt`, `.pdf` are ignored.

---

## API Contract Analysis

### POST /api/v1/training/sessions/{session_id}/start

**Expected Behavior**:
- **Success (200)**: Returns `ControlResponse` with `status=running`
- **Not Found (404)**: Session ID doesn't exist
- **Bad Request (400)**: Invalid state transition OR **no assets found**

**Error Response**:
```json
{
  "detail": "No assets found for session 19"
}
```

**Valid State Transitions**:
- `pending → running` (initial start with asset discovery)
- `paused → running` (resume existing jobs)
- `failed → running` (retry existing jobs)

**Invalid State Transitions** (also return 400):
- `running → running` (already running)
- `completed → running` (use `/restart` endpoint)
- `cancelled → running` (use `/restart` endpoint)

---

## Is This a Bug?

### ❌ **NOT A BUG** - This is correct validation logic

**Reasons**:
1. **Prevents Wasteful Operations**: Starting a training session with no images would create an empty RQ job that does nothing.
2. **Clear Error Message**: User receives immediate feedback rather than a session that starts and immediately completes with 0 images processed.
3. **Data Integrity**: Ensures `total_images` count is always > 0 for running sessions.
4. **Resource Protection**: Prevents background workers from processing empty job queues.

### ✅ **EXPECTED BEHAVIOR**

This is a **validation safeguard** that should be enforced. The error correctly prevents:
- Accidentally starting sessions without data
- Wasting background worker resources
- Confusing UI states (0/0 images processed)

---

## Recommended Fixes

### UI Prevention (Recommended)

**Implement client-side validation to prevent API call:**

```typescript
// src/lib/components/TrainingSessionControls.svelte

// Disable "Start Training" button when:
const canStartTraining = computed(() => {
  return (
    session.status === 'pending' &&
    session.subdirectories.some(s => s.selected) && // At least 1 selected
    session.subdirectories.filter(s => s.selected).every(s => s.image_count > 0) // All selected have images
  );
});

<button disabled={!canStartTraining} onclick={startTraining}>
  Start Training
</button>

// Show warning message when disabled:
{#if session.subdirectories.filter(s => s.selected).length === 0}
  <p class="warning">⚠️ Please select at least one subdirectory with images</p>
{:else if session.subdirectories.filter(s => s.selected).some(s => s.image_count === 0)}
  <p class="warning">⚠️ Selected subdirectories contain no images</p>
{/if}
```

### API Improvement (Optional)

**Return 422 Unprocessable Entity instead of 400 Bad Request:**

```python
# src/image_search_service/services/training_service.py

if not assets:
    # More specific error message
    selected_count = len([s for s in session.subdirectories if s.selected])
    if selected_count == 0:
        raise ValueError("No subdirectories selected for training. Please select at least one subdirectory.")
    else:
        raise ValueError(
            f"Selected subdirectories contain no image files. "
            f"Supported formats: .jpg, .jpeg, .png, .webp"
        )
```

**Update route to return 422:**

```python
# src/image_search_service/api/routes/training.py

@router.post("/sessions/{session_id}/start", response_model=ControlResponse)
async def start_training(session_id: int, db: AsyncSession = Depends(get_db)):
    try:
        session = await service.start_training(db, session_id)
        return ControlResponse(...)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=error_msg)
        elif "No assets" in error_msg or "No subdirectories selected" in error_msg:
            # More specific status code for validation errors
            raise HTTPException(status_code=422, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)
```

---

## Testing Verification

To verify the correct behavior, check:

1. **Database State**:
```sql
-- Check if session exists
SELECT * FROM training_sessions WHERE id = 19;

-- Check subdirectories for session
SELECT * FROM training_subdirectories WHERE session_id = 19;

-- Check how many are selected
SELECT COUNT(*) FROM training_subdirectories
WHERE session_id = 19 AND selected = true;

-- Check if any assets exist in those paths
SELECT * FROM image_assets
WHERE path LIKE '/path/from/subdirectory/%';
```

2. **API Call**:
```bash
# Get session details
curl http://localhost:8000/api/v1/training/sessions/19

# Get subdirectories
curl http://localhost:8000/api/v1/training/sessions/19/subdirectories

# Check progress (shows total_images count)
curl http://localhost:8000/api/v1/training/sessions/19/progress
```

3. **Expected Results**:
   - If `total_images = 0` in session: Expected error
   - If no subdirectories in response: Expected error
   - If all subdirectories have `selected=false`: Expected error
   - If all subdirectories have `image_count=0`: Expected error

---

## Workaround for Current Issue

If session 19 legitimately should have images:

### Option 1: Add Subdirectories

```bash
# Scan directory to find subdirectories
POST /api/v1/training/directories/scan
{
  "root_path": "/path/to/images",
  "recursive": true,
  "extensions": ["jpg", "jpeg", "png", "webp"]
}

# Response will include subdirectories with image counts
# Then update session to include them
PATCH /api/v1/training/sessions/19/subdirectories
[
  {"id": 1, "selected": true},
  {"id": 2, "selected": true}
]
```

### Option 2: Recreate Session

```bash
# Delete broken session
DELETE /api/v1/training/sessions/19

# Create new session with subdirectories
POST /api/v1/training/sessions
{
  "name": "New Training Session",
  "root_path": "/path/to/images",
  "subdirectories": [
    "/path/to/images/category1",
    "/path/to/images/category2"
  ]
}

# Start the new session
POST /api/v1/training/sessions/20/start
```

### Option 3: Run Incremental Scan First

```bash
# Ensure ImageAsset records exist
POST /api/v1/training/scan/incremental?directory=/path/to/images&auto_train=false

# Then retry starting session 19
POST /api/v1/training/sessions/19/start
```

---

## Future Enhancements

1. **Prevalidation Endpoint**: Add `POST /api/v1/training/sessions/{id}/validate` to check if session can be started without actually starting it.

2. **Auto-Discovery**: When creating session, automatically discover subdirectories and create `TrainingSubdirectory` records.

3. **Image Count Update**: Add background job to update `image_count` field when subdirectories are added.

4. **Better Error Messages**: Include diagnostic info in error response:
   ```json
   {
     "detail": "No assets found for session 19",
     "diagnostics": {
       "total_subdirectories": 2,
       "selected_subdirectories": 0,
       "suggestion": "Select at least one subdirectory before starting training"
     }
   }
   ```

---

## Summary

### What are "assets" in the context of training sessions?

**Assets** are `ImageAsset` database records representing individual image files on the filesystem. Each asset stores:
- Absolute file path (unique)
- File metadata (size, modification time)
- Optional thumbnail path and dimensions
- Indexing timestamp

Assets are discovered by scanning selected subdirectories for files matching allowed extensions (`.jpg`, `.jpeg`, `.png`, `.webp`).

### How are assets supposed to be added to a training session?

Assets are **not directly added** to sessions. Instead:

1. **Subdirectories are added** to the `TrainingSession` via `TrainingSubdirectory` records
2. User **marks subdirectories as selected** (`selected=true`)
3. When **starting the session**, `AssetDiscoveryService` scans the filesystem in selected subdirectories
4. For each image file found, an `ImageAsset` record is **created or fetched**
5. `TrainingJob` records link assets to the session for processing

**Assets are discovered dynamically at training start time, not stored in session.**

### Is the validation correct (sessions need assets before starting)?

**✅ YES** - This is correct and necessary validation because:
- Training requires at least one image to process
- Empty sessions waste resources and create confusing UI states
- Clear immediate feedback is better than a session that starts and fails

### Should the UI prevent starting sessions with no assets?

**✅ ABSOLUTELY** - Recommended UI improvements:

1. **Disable "Start" button** when:
   - No subdirectories added
   - No subdirectories selected
   - All selected subdirectories have `image_count=0`

2. **Show warning messages**:
   - "Select at least one subdirectory to begin training"
   - "Selected directories contain no images"
   - "Scanning directory for images..." (during scan)

3. **Visual indicators**:
   - Gray out subdirectories with 0 images
   - Show image count badges on subdirectory cards
   - Require directory scan before enabling "Start"

4. **Workflow guidance**:
   ```
   Create Session → Scan Directory → Select Subdirectories → Start Training
   (currently optional)    ↑ MAKE THIS REQUIRED ↑
   ```

---

## Related Files

- `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/training.py` (line 381-421)
- `/export/workspace/image-search/image-search-service/src/image_search_service/services/training_service.py` (line 305-365)
- `/export/workspace/image-search/image-search-service/src/image_search_service/services/asset_discovery.py` (line 28-78)
- `/export/workspace/image-search/image-search-service/src/image_search_service/db/models.py` (lines 137-157, 187-217, 241-266)

---

**Investigation Status**: ✅ Complete
**Classification**: Expected Behavior (Not a Bug)
**Action Required**: UI improvements to prevent invalid start attempts
