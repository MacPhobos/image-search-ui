# Centroid Job Progress Tracking Fix

## Issue

The `find_more_centroid_suggestions_job` was missing progress tracking, causing a 404 error when the frontend polled for job progress using the `progress_key` returned by the endpoint.

## Root Cause

1. The job function was missing the `progress_key` parameter
2. No progress tracking code existed in the job
3. The endpoint generated a `progress_key` but didn't pass it to the job

## Changes Made

### File 1: `image-search-service/src/image_search_service/queue/face_jobs.py`

#### 1. Added `progress_key` parameter to function signature (line 1780):

```python
def find_more_centroid_suggestions_job(
    person_id: str,
    min_similarity: float = 0.65,
    max_results: int = 200,
    unassigned_only: bool = True,
    progress_key: str | None = None,  # ADDED
) -> dict[str, Any]:
```

#### 2. Added progress tracking helper function (lines 1819-1841):

```python
def update_progress(phase: str, current: int, total: int, message: str) -> None:
    if not progress_key:
        return
    try:
        from redis import Redis
        from image_search_service.core.config import get_settings

        settings = get_settings()
        redis_client = Redis.from_url(settings.redis_url)

        progress_data = {
            "phase": phase,
            "current": current,
            "total": total,
            "message": message,
            "person_id": person_id,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        redis_client.set(progress_key, json.dumps(progress_data), ex=3600)
    except Exception as e:
        logger.warning(f"[{job_id}] Failed to update progress: {e}")
```

#### 3. Added progress updates at key workflow points:

**Phase 1: Starting (line 1845)**

```python
update_progress("starting", 0, 4, "Initializing centroid search")
```

**Phase 2: Retrieved centroid (line 1976)**

```python
update_progress("retrieving", 1, 4, "Retrieved centroid embedding")
```

**Phase 3: Searching (lines 1988-1990)**

```python
update_progress(
    "searching", 2, 4, f"Searching for similar faces (threshold={min_similarity})"
)
```

**Phase 4: Creating suggestions (lines 2003-2005)**

```python
update_progress(
    "creating", 3, 4, f"Creating suggestions from {len(search_results)} matches"
)
```

**Phase 5: Completed (lines 2067-2072)**

```python
update_progress(
    "completed",
    4,
    4,
    f"Created {suggestions_created} new suggestions",
)
```

**Error handling (line 2084)**

```python
update_progress("failed", 0, 0, str(e))
```

### File 2: `image-search-service/src/image_search_service/api/routes/face_suggestions.py`

#### 1. Generate progress_key before enqueuing (line 862):

```python
progress_key = f"find_more_centroid:progress:{person_id}:{job_uuid}"
```

#### 2. Pass progress_key to job function (line 876):

```python
job = queue.enqueue(
    find_more_centroid_suggestions_job,
    str(person_id),
    request.min_similarity,
    request.max_results,
    request.unassigned_only,
    progress_key,  # ADDED as 5th argument
    job_id=job_uuid,
)
```

#### 3. Use progress_key variable in response (line 892):

```python
return FindMoreJobResponse(
    ...
    progress_key=progress_key,  # Use variable instead of hardcoded string
)
```

## Progress Tracking Flow

The job now tracks progress through 4 phases:

1. **starting** (0/4): Initializing centroid search
2. **retrieving** (1/4): Retrieved centroid embedding
3. **searching** (2/4): Searching for similar faces
4. **creating** (3/4): Creating suggestions from matches
5. **completed** (4/4): Created N new suggestions

Error state: **failed** (0/0) with error message

## Verification

### Linter

```bash
cd image-search-service
uv run ruff check src/image_search_service/queue/face_jobs.py \
    src/image_search_service/api/routes/face_suggestions.py
# ✅ All checks passed!
```

### Type Checker

Function signature verified:

```python
find_more_centroid_suggestions_job(
    person_id: str,
    min_similarity: float = 0.65,
    max_results: int = 200,
    unassigned_only: bool = True,
    progress_key: str | None = None,
) -> dict[str, Any]
```

## Pattern Reference

This implementation follows the same pattern as `find_more_suggestions_job` (the working dynamic prototype job) which has complete progress tracking around lines 1224-1523 in `face_jobs.py`.

## Testing

To verify the fix works:

1. Start the backend: `make dev`
2. Start the worker: `make worker`
3. Trigger a centroid find-more job via the API
4. Poll the progress endpoint with the returned `progress_key`
5. Verify progress updates are returned (no 404 error)

Example progress response:

```json
{
	"phase": "searching",
	"current": 2,
	"total": 4,
	"message": "Searching for similar faces (threshold=0.65)",
	"person_id": "uuid-here",
	"timestamp": "2026-01-16T12:34:56.789Z"
}
```

## Summary

**Files Modified**: 2

- `image-search-service/src/image_search_service/queue/face_jobs.py`
- `image-search-service/src/image_search_service/api/routes/face_suggestions.py`

**Lines Added**: ~50 (progress helper + 6 progress update calls)
**Lines Changed**: 3 (function signature, enqueue call, response)

**Result**: The centroid job now has complete progress tracking matching the pattern of the working dynamic prototype job.
