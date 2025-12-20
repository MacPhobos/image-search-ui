# Qdrant Vector Management Implementation Plan

**Created**: 2024-12-19
**Status**: Approved - Pending Implementation
**Scope**: image-search-service (backend) + image-search-ui (frontend)

## Overview

Add comprehensive vector management capabilities to the image search system, enabling deletion and retraining of vectors stored in Qdrant. Primary focus is directory-based operations for managing vectors by file path prefixes, with additional support for deletion by asset ID, training session, category, and orphan cleanup.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary Operation** | Directory-based deletion | Users organize images in directories; need to retrain/delete by path prefix |
| **Path Matching** | Prefix matching | Qdrant supports efficient prefix filtering on path field |
| **Retrain Strategy** | Delete + Reset Session + Queue Job | Three-step atomic operation ensures clean state |
| **Orphan Detection** | Qdrant → Database lookup | Scroll Qdrant vectors, check if asset_id exists in PostgreSQL |
| **Soft vs Hard Delete** | Hard delete from Qdrant | Vectors are derived data; can be regenerated from source images |
| **Audit Logging** | Log all deletions | Track who deleted what, when, and why (via deletion_reason field) |
| **Safety Confirmations** | Required for bulk operations | Directory deletion, orphan cleanup, full reset require confirmation |
| **Rate Limiting** | Batch processing with delays | Large deletions processed in batches to avoid Qdrant overload |

---

## Phase 1: Backend Database Changes

### 1.1 Create Deletion Audit Log Table

**File**: `image-search-service/src/image_search_service/db/models.py`

```python
class VectorDeletionLog(Base):
    __tablename__ = "vector_deletion_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    deletion_type: Mapped[str] = mapped_column(String(50), nullable=False)  # DIRECTORY, ASSET, SESSION, CATEGORY, ORPHAN, FULL_RESET
    deletion_target: Mapped[str] = mapped_column(Text, nullable=False)  # Path prefix, asset_id, session_id, etc.
    vector_count: Mapped[int] = mapped_column(Integer, nullable=False)  # Number of vectors deleted
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)  # Optional user-provided reason
    metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Additional context
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

### 1.2 Add Session Reset Tracking

**File**: `image-search-service/src/image_search_service/db/models.py`

Update TrainingSession model:
```python
class TrainingSession(Base):
    # ... existing fields ...
    reset_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reset_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
```

### 1.3 Create Migration

**File**: `image-search-service/src/image_search_service/db/migrations/versions/008_add_vector_management.py`

- Create `vector_deletion_logs` table
- Add `reset_at` and `reset_reason` columns to `training_sessions`

---

## Phase 2: Backend Vector Service Layer

### 2.1 Qdrant Client Extensions

**File**: `image-search-service/src/image_search_service/vector/qdrant.py`

Add new methods to QdrantClient class:

```python
class QdrantClient:
    async def delete_vectors_by_directory(
        self,
        path_prefix: str,
        batch_size: int = 100
    ) -> int:
        """Delete all vectors where path starts with path_prefix.

        Uses scroll API to paginate through matching vectors,
        then deletes by point IDs in batches.

        Returns: Total number of vectors deleted
        """
        pass

    async def delete_vectors_by_asset(self, asset_id: str) -> int:
        """Delete vectors for a specific asset_id.

        Returns: Number of vectors deleted (should be 1)
        """
        pass

    async def delete_vectors_by_session(self, session_id: str) -> int:
        """Delete all vectors from a training session.

        Uses session_id in payload filter.

        Returns: Number of vectors deleted
        """
        pass

    async def delete_vectors_by_category(self, category_id: int) -> int:
        """Delete all vectors in a category.

        Uses category_id in payload filter.

        Returns: Number of vectors deleted
        """
        pass

    async def find_orphaned_vectors(
        self,
        valid_asset_ids: set[str],
        batch_size: int = 1000
    ) -> list[str]:
        """Find point IDs where asset_id not in valid_asset_ids.

        Scrolls all vectors, checks asset_id against provided set.

        Returns: List of orphaned point IDs
        """
        pass

    async def delete_vectors_by_ids(self, point_ids: list[str]) -> int:
        """Delete vectors by point IDs.

        Returns: Number of vectors deleted
        """
        pass

    async def reset_collection(self) -> int:
        """Delete entire collection and recreate.

        WARNING: Deletes all vectors permanently.

        Returns: Number of vectors deleted
        """
        pass

    async def get_directory_stats(self) -> dict[str, int]:
        """Get vector count by directory path prefix.

        Scrolls all vectors, extracts directory from path field,
        aggregates counts.

        Returns: Dict mapping directory path -> count
        Example: {"/photos/2024": 150, "/photos/2023": 230}
        """
        pass
```

### 2.2 Vector Management Service

**New File**: `image-search-service/src/image_search_service/services/vector_management_service.py`

```python
class VectorManagementService:
    def __init__(
        self,
        qdrant_client: QdrantClient,
        db_session: AsyncSession,
        rq_queue: Queue
    ):
        self.qdrant = qdrant_client
        self.db = db_session
        self.queue = rq_queue

    async def delete_by_directory(
        self,
        path_prefix: str,
        deletion_reason: str | None = None
    ) -> dict:
        """Delete vectors matching directory path prefix.

        Returns: {
            "deleted_count": int,
            "path_prefix": str,
            "log_id": int
        }
        """
        # 1. Delete from Qdrant
        count = await self.qdrant.delete_vectors_by_directory(path_prefix)

        # 2. Log deletion
        log = VectorDeletionLog(
            deletion_type="DIRECTORY",
            deletion_target=path_prefix,
            vector_count=count,
            deletion_reason=deletion_reason
        )
        self.db.add(log)
        await self.db.commit()

        return {"deleted_count": count, "path_prefix": path_prefix, "log_id": log.id}

    async def retrain_directory(
        self,
        path_prefix: str,
        category_id: int,
        deletion_reason: str | None = None
    ) -> dict:
        """Delete existing vectors + reset session + create new training job.

        Three-step atomic operation:
        1. Delete vectors from Qdrant
        2. Reset training session status (if exists)
        3. Queue new training job

        Returns: {
            "deleted_count": int,
            "job_id": str,
            "session_id": int
        }
        """
        # 1. Delete vectors
        delete_result = await self.delete_by_directory(path_prefix, deletion_reason)

        # 2. Find and reset existing session(s) for this directory
        sessions = await self.db.execute(
            select(TrainingSession)
            .where(TrainingSession.directory_path == path_prefix)
        )
        for session in sessions.scalars():
            session.status = "RESET"
            session.reset_at = datetime.utcnow()
            session.reset_reason = deletion_reason

        await self.db.commit()

        # 3. Create new training job
        job = self.queue.enqueue(
            "train_directory",
            path_prefix=path_prefix,
            category_id=category_id
        )

        return {
            "deleted_count": delete_result["deleted_count"],
            "job_id": job.id,
            "sessions_reset": len(sessions.scalars().all())
        }

    async def cleanup_orphans(self) -> dict:
        """Remove vectors without corresponding database records.

        Returns: {
            "deleted_count": int,
            "orphan_asset_ids": list[str]
        }
        """
        # 1. Get all valid asset IDs from database
        result = await self.db.execute(select(Asset.id))
        valid_ids = set(result.scalars().all())

        # 2. Find orphaned vectors in Qdrant
        orphan_ids = await self.qdrant.find_orphaned_vectors(valid_ids)

        # 3. Delete orphans
        count = await self.qdrant.delete_vectors_by_ids(orphan_ids)

        # 4. Log deletion
        log = VectorDeletionLog(
            deletion_type="ORPHAN",
            deletion_target="orphaned_vectors",
            vector_count=count,
            metadata={"orphan_ids": orphan_ids}
        )
        self.db.add(log)
        await self.db.commit()

        return {"deleted_count": count, "orphan_asset_ids": orphan_ids}

    async def get_directory_status(self) -> list[dict]:
        """Get vector counts by directory path.

        Returns: [
            {
                "path": str,
                "vector_count": int,
                "session_count": int,
                "last_trained_at": str | None
            }
        ]
        """
        # 1. Get counts from Qdrant
        qdrant_stats = await self.qdrant.get_directory_stats()

        # 2. Get session info from database
        sessions = await self.db.execute(
            select(
                TrainingSession.directory_path,
                func.count(TrainingSession.id).label("session_count"),
                func.max(TrainingSession.completed_at).label("last_trained")
            )
            .group_by(TrainingSession.directory_path)
        )

        session_map = {
            row.directory_path: {
                "session_count": row.session_count,
                "last_trained_at": row.last_trained
            }
            for row in sessions
        }

        # 3. Combine data
        return [
            {
                "path": path,
                "vector_count": count,
                **session_map.get(path, {"session_count": 0, "last_trained_at": None})
            }
            for path, count in qdrant_stats.items()
        ]
```

---

## Phase 3: Backend API Endpoints

### 3.1 Vector Management Schemas

**New File**: `image-search-service/src/image_search_service/api/vector_schemas.py`

```python
from pydantic import BaseModel, Field

class DeleteByDirectoryRequest(BaseModel):
    path_prefix: str = Field(
        ...,
        description="Directory path prefix to match (e.g., /photos/2024/)",
        min_length=1
    )
    deletion_reason: str | None = Field(
        None,
        description="Optional reason for deletion"
    )
    confirm: bool = Field(
        ...,
        description="Must be true to confirm deletion"
    )

class DeleteByDirectoryResponse(BaseModel):
    deleted_count: int = Field(alias="deletedCount")
    path_prefix: str = Field(alias="pathPrefix")
    log_id: int = Field(alias="logId")

class RetrainDirectoryRequest(BaseModel):
    path_prefix: str = Field(alias="pathPrefix", min_length=1)
    category_id: int = Field(alias="categoryId")
    deletion_reason: str | None = Field(None, alias="deletionReason")
    confirm: bool = Field(..., description="Must be true to confirm")

class RetrainDirectoryResponse(BaseModel):
    deleted_count: int = Field(alias="deletedCount")
    job_id: str = Field(alias="jobId")
    sessions_reset: int = Field(alias="sessionsReset")

class DirectoryStatusResponse(BaseModel):
    path: str
    vector_count: int = Field(alias="vectorCount")
    session_count: int = Field(alias="sessionCount")
    last_trained_at: str | None = Field(None, alias="lastTrainedAt")

class CleanupOrphansRequest(BaseModel):
    confirm: bool = Field(..., description="Must be true to confirm")
    deletion_reason: str | None = Field(None, alias="deletionReason")

class CleanupOrphansResponse(BaseModel):
    deleted_count: int = Field(alias="deletedCount")
    orphan_asset_ids: list[str] = Field(alias="orphanAssetIds")

class ResetCollectionRequest(BaseModel):
    confirm: bool = Field(..., description="Must be true to confirm")
    confirmation_text: str = Field(
        alias="confirmationText",
        description="Must exactly match 'DELETE ALL VECTORS'"
    )
    deletion_reason: str | None = Field(None, alias="deletionReason")

class ResetCollectionResponse(BaseModel):
    deleted_count: int = Field(alias="deletedCount")
    message: str
```

### 3.2 Vector Management Routes

**New File**: `image-search-service/src/image_search_service/api/routes/vectors.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_db
from ...services.vector_management_service import VectorManagementService
from ..vector_schemas import *

router = APIRouter(prefix="/vectors", tags=["Vector Management"])

@router.delete("/by-directory", response_model=DeleteByDirectoryResponse)
async def delete_by_directory(
    request: DeleteByDirectoryRequest,
    db: AsyncSession = Depends(get_db)
):
    """Delete vectors matching directory path prefix.

    **Safety**: Requires confirm=true

    Example: path_prefix="/photos/2024/vacation/" deletes all vectors
    with paths starting with that prefix.
    """
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm deletion by setting confirm=true"
        )

    service = VectorManagementService(qdrant, db, rq_queue)
    result = await service.delete_by_directory(
        request.path_prefix,
        request.deletion_reason
    )

    return result

@router.post("/retrain", response_model=RetrainDirectoryResponse)
async def retrain_directory(
    request: RetrainDirectoryRequest,
    db: AsyncSession = Depends(get_db)
):
    """Delete existing vectors + reset session + create new training job.

    **Safety**: Requires confirm=true

    Three-step operation:
    1. Delete all vectors for directory
    2. Mark existing training sessions as RESET
    3. Queue new training job
    """
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm retraining by setting confirm=true"
        )

    service = VectorManagementService(qdrant, db, rq_queue)
    result = await service.retrain_directory(
        request.path_prefix,
        request.category_id,
        request.deletion_reason
    )

    return result

@router.get("/directories/status", response_model=list[DirectoryStatusResponse])
async def get_directory_status(db: AsyncSession = Depends(get_db)):
    """List all directories with vector counts and training status.

    Returns aggregated view of:
    - Directory path
    - Number of vectors in Qdrant
    - Number of training sessions
    - Last training timestamp
    """
    service = VectorManagementService(qdrant, db, rq_queue)
    return await service.get_directory_status()

@router.delete("/by-asset/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_by_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    """Delete vector for a single asset.

    No confirmation required for single asset deletion.
    """
    service = VectorManagementService(qdrant, db, rq_queue)
    count = await service.qdrant.delete_vectors_by_asset(asset_id)

    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No vectors found for asset {asset_id}"
        )

    # Log deletion
    log = VectorDeletionLog(
        deletion_type="ASSET",
        deletion_target=asset_id,
        vector_count=count
    )
    db.add(log)
    await db.commit()

@router.delete("/by-session/{session_id}", response_model=DeleteByDirectoryResponse)
async def delete_by_session(
    session_id: int,
    confirm: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Delete all vectors from a training session.

    **Safety**: Requires confirm=true query parameter
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm deletion with ?confirm=true"
        )

    service = VectorManagementService(qdrant, db, rq_queue)
    count = await service.qdrant.delete_vectors_by_session(str(session_id))

    log = VectorDeletionLog(
        deletion_type="SESSION",
        deletion_target=str(session_id),
        vector_count=count
    )
    db.add(log)
    await db.commit()

    return {"deletedCount": count, "pathPrefix": f"session_{session_id}", "logId": log.id}

@router.delete("/by-category/{category_id}", response_model=DeleteByDirectoryResponse)
async def delete_by_category(
    category_id: int,
    confirm: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Delete all vectors in a category.

    **Safety**: Requires confirm=true query parameter
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm deletion with ?confirm=true"
        )

    service = VectorManagementService(qdrant, db, rq_queue)
    count = await service.qdrant.delete_vectors_by_category(category_id)

    log = VectorDeletionLog(
        deletion_type="CATEGORY",
        deletion_target=str(category_id),
        vector_count=count
    )
    db.add(log)
    await db.commit()

    return {"deletedCount": count, "pathPrefix": f"category_{category_id}", "logId": log.id}

@router.post("/cleanup-orphans", response_model=CleanupOrphansResponse)
async def cleanup_orphans(
    request: CleanupOrphansRequest,
    db: AsyncSession = Depends(get_db)
):
    """Remove vectors without corresponding database records.

    **Safety**: Requires confirm=true

    Identifies vectors in Qdrant where asset_id no longer exists
    in PostgreSQL and deletes them.
    """
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm cleanup by setting confirm=true"
        )

    service = VectorManagementService(qdrant, db, rq_queue)
    result = await service.cleanup_orphans()

    return result

@router.post("/reset", response_model=ResetCollectionResponse)
async def reset_collection(
    request: ResetCollectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Delete ALL vectors and recreate collection.

    **DANGER**: This is irreversible and deletes all vector data.

    **Safety**: Requires confirm=true AND confirmationText="DELETE ALL VECTORS"
    """
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm reset by setting confirm=true"
        )

    if request.confirmation_text != "DELETE ALL VECTORS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="confirmationText must exactly match 'DELETE ALL VECTORS'"
        )

    service = VectorManagementService(qdrant, db, rq_queue)
    count = await service.qdrant.reset_collection()

    log = VectorDeletionLog(
        deletion_type="FULL_RESET",
        deletion_target="all_vectors",
        vector_count=count,
        deletion_reason=request.deletion_reason
    )
    db.add(log)
    await db.commit()

    return {
        "deletedCount": count,
        "message": f"Successfully deleted {count} vectors and reset collection"
    }
```

### 3.3 Register Routes

**File**: `image-search-service/src/image_search_service/api/routes/__init__.py`

```python
from .vectors import router as vectors_router
api_v1_router.include_router(vectors_router)
```

---

## Phase 4: API Contract Update

**Files**:
- `image-search-service/docs/api-contract.md`
- `image-search-ui/docs/api-contract.md`

Add Vector Management section:

```markdown
### Vector Management

Manage vector data stored in Qdrant, including deletion and retraining operations.

#### `DELETE /api/v1/vectors/by-directory`

Delete vectors matching directory path prefix.

**Request Body**
```json
{
  "pathPrefix": "/photos/2024/vacation/",
  "deletionReason": "Removing duplicates",
  "confirm": true
}
```

**Response** `200 OK`
```json
{
  "deletedCount": 150,
  "pathPrefix": "/photos/2024/vacation/",
  "logId": 42
}
```

#### `POST /api/v1/vectors/retrain`

Delete existing vectors + reset session + create new training job.

**Request Body**
```json
{
  "pathPrefix": "/photos/2024/",
  "categoryId": 2,
  "deletionReason": "Re-training with updated model",
  "confirm": true
}
```

**Response** `200 OK`
```json
{
  "deletedCount": 500,
  "jobId": "job-uuid-123",
  "sessionsReset": 2
}
```

#### `GET /api/v1/vectors/directories/status`

List directories with vector counts and training status.

**Response** `200 OK`
```json
[
  {
    "path": "/photos/2024/vacation/",
    "vectorCount": 150,
    "sessionCount": 1,
    "lastTrainedAt": "2024-12-19T10:00:00Z"
  },
  {
    "path": "/photos/2023/",
    "vectorCount": 430,
    "sessionCount": 3,
    "lastTrainedAt": "2024-12-18T15:30:00Z"
  }
]
```

#### `DELETE /api/v1/vectors/by-asset/{asset_id}`

Delete vector for a single asset.

**Response** `204 No Content`

#### `DELETE /api/v1/vectors/by-session/{session_id}`

Delete all vectors from a training session.

**Query Parameters**: `?confirm=true` (required)

**Response** `200 OK`
```json
{
  "deletedCount": 75,
  "pathPrefix": "session_5",
  "logId": 43
}
```

#### `DELETE /api/v1/vectors/by-category/{category_id}`

Delete all vectors in a category.

**Query Parameters**: `?confirm=true` (required)

**Response** `200 OK`
```json
{
  "deletedCount": 230,
  "pathPrefix": "category_2",
  "logId": 44
}
```

#### `POST /api/v1/vectors/cleanup-orphans`

Remove vectors without corresponding database records.

**Request Body**
```json
{
  "confirm": true,
  "deletionReason": "Cleanup after asset deletion"
}
```

**Response** `200 OK`
```json
{
  "deletedCount": 12,
  "orphanAssetIds": ["asset-1", "asset-2", ...]
}
```

#### `POST /api/v1/vectors/reset`

Delete ALL vectors and recreate collection (DANGEROUS).

**Request Body**
```json
{
  "confirm": true,
  "confirmationText": "DELETE ALL VECTORS",
  "deletionReason": "Complete system reset"
}
```

**Response** `200 OK`
```json
{
  "deletedCount": 1247,
  "message": "Successfully deleted 1247 vectors and reset collection"
}
```
```

Bump version to **1.2.0**.

---

## Phase 5: Frontend Implementation

### 5.1 Generate Types

After backend deployment:
```bash
cd image-search-ui && npm run gen:api
```

### 5.2 API Client

**New File**: `image-search-ui/src/lib/api/vectors.ts`

```typescript
import type {
  DeleteByDirectoryRequest,
  DeleteByDirectoryResponse,
  RetrainDirectoryRequest,
  RetrainDirectoryResponse,
  DirectoryStatusResponse,
  CleanupOrphansRequest,
  CleanupOrphansResponse,
  ResetCollectionRequest,
  ResetCollectionResponse
} from './generated';

export async function deleteByDirectory(
  request: DeleteByDirectoryRequest
): Promise<DeleteByDirectoryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vectors/by-directory`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Failed to delete vectors: ${response.statusText}`);
  }

  return response.json();
}

export async function retrainDirectory(
  request: RetrainDirectoryRequest
): Promise<RetrainDirectoryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vectors/retrain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Failed to retrain directory: ${response.statusText}`);
  }

  return response.json();
}

export async function getDirectoryStatus(): Promise<DirectoryStatusResponse[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vectors/directories/status`);

  if (!response.ok) {
    throw new Error(`Failed to fetch directory status: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteByAsset(assetId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vectors/by-asset/${assetId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Failed to delete asset vector: ${response.statusText}`);
  }
}

export async function deleteBySession(sessionId: number): Promise<DeleteByDirectoryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/vectors/by-session/${sessionId}?confirm=true`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete session vectors: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteByCategory(categoryId: number): Promise<DeleteByDirectoryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/vectors/by-category/${categoryId}?confirm=true`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete category vectors: ${response.statusText}`);
  }

  return response.json();
}

export async function cleanupOrphans(
  request: CleanupOrphansRequest
): Promise<CleanupOrphansResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vectors/cleanup-orphans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Failed to cleanup orphans: ${response.statusText}`);
  }

  return response.json();
}

export async function resetCollection(
  request: ResetCollectionRequest
): Promise<ResetCollectionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vectors/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Failed to reset collection: ${response.statusText}`);
  }

  return response.json();
}
```

### 5.3 Components

**New Files**:

1. **`src/lib/components/vectors/DirectoryManager.svelte`**
   - Display directory status table
   - Delete and retrain buttons per directory
   - Confirmation dialogs

2. **`src/lib/components/vectors/DeleteConfirmationModal.svelte`**
   - Generic confirmation modal for deletions
   - Shows operation type, target, and estimated count
   - Optional deletion reason input
   - Confirm/cancel buttons

3. **`src/lib/components/vectors/RetrainModal.svelte`**
   - Retrain dialog with directory path
   - Category selector
   - Deletion reason input
   - Confirmation checkbox

4. **`src/lib/components/vectors/OrphanCleanupPanel.svelte`**
   - Show orphan count (if available)
   - Cleanup button with confirmation
   - Results display after cleanup

5. **`src/lib/components/vectors/DangerZone.svelte`**
   - Full collection reset section
   - Red danger styling
   - Requires typing "DELETE ALL VECTORS"
   - Double confirmation

### 5.4 Vector Management Page

**New File**: `src/routes/vectors/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import DirectoryManager from '$lib/components/vectors/DirectoryManager.svelte';
  import OrphanCleanupPanel from '$lib/components/vectors/OrphanCleanupPanel.svelte';
  import DangerZone from '$lib/components/vectors/DangerZone.svelte';
  import { getDirectoryStatus } from '$lib/api/vectors';
  import type { DirectoryStatusResponse } from '$lib/api/generated';

  let directories = $state<DirectoryStatusResponse[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      directories = await getDirectoryStatus();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load directory status';
    } finally {
      loading = false;
    }
  });

  async function handleRefresh() {
    loading = true;
    error = null;
    try {
      directories = await getDirectoryStatus();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to refresh';
    } finally {
      loading = false;
    }
  }
</script>

<main>
  <header>
    <h1>Vector Management</h1>
    <p>Manage trained vector data stored in Qdrant</p>
  </header>

  {#if error}
    <div class="alert error" role="alert">{error}</div>
  {/if}

  <section>
    <h2>Directory Status</h2>
    {#if loading}
      <p>Loading directory status...</p>
    {:else}
      <DirectoryManager {directories} onRefresh={handleRefresh} />
    {/if}
  </section>

  <section>
    <h2>Orphan Cleanup</h2>
    <OrphanCleanupPanel onComplete={handleRefresh} />
  </section>

  <section class="danger-section">
    <h2>Danger Zone</h2>
    <DangerZone onComplete={handleRefresh} />
  </section>
</main>

<style>
  .danger-section {
    border: 2px solid #ef4444;
    border-radius: 8px;
    padding: 1.5rem;
    margin-top: 2rem;
    background-color: #fef2f2;
  }

  .alert.error {
    background-color: #fee;
    border: 1px solid #fcc;
    padding: 1rem;
    border-radius: 4px;
    color: #c00;
  }
</style>
```

### 5.5 Update Training/Sessions Page

**File**: `src/routes/training/sessions/+page.svelte`

Add directory management actions to training session list:
- "Delete Vectors" button per session
- "Retrain" button per session
- Opens modals from `src/lib/components/vectors/`

### 5.6 Navigation Update

**File**: `src/routes/+layout.svelte`

Add "Vector Management" link in header navigation:
```svelte
<nav>
  <a href="/">Dashboard</a>
  <a href="/categories">Categories</a>
  <a href="/training/sessions">Training Sessions</a>
  <a href="/vectors">Vector Management</a>
</nav>
```

---

## Phase 6: Backend Tests

**New File**: `image-search-service/tests/services/test_vector_management_service.py`

Test cases:
- [ ] Delete by directory (empty result, with results, invalid path)
- [ ] Retrain directory (creates job, resets sessions, deletes vectors)
- [ ] Get directory status (empty, with data)
- [ ] Cleanup orphans (no orphans, with orphans)
- [ ] Delete by asset (exists, not found)
- [ ] Delete by session (valid session, empty session)
- [ ] Delete by category (valid category, empty category)
- [ ] Reset collection (full delete and recreate)
- [ ] Audit logging for all deletion types

**New File**: `image-search-service/tests/vector/test_qdrant_deletions.py`

Test cases:
- [ ] Delete vectors by directory prefix (single match, multiple matches, no matches)
- [ ] Delete vectors by asset ID (exists, not found)
- [ ] Delete vectors by session ID
- [ ] Delete vectors by category ID
- [ ] Find orphaned vectors (mocked Qdrant scroll)
- [ ] Delete vectors by IDs (batch processing)
- [ ] Reset collection (deletes and recreates)
- [ ] Get directory stats (aggregation logic)

**New File**: `image-search-service/tests/api/test_vectors.py`

Test cases:
- [ ] DELETE /api/v1/vectors/by-directory (requires confirm, validates path)
- [ ] POST /api/v1/vectors/retrain (requires confirm, creates job)
- [ ] GET /api/v1/vectors/directories/status (returns list)
- [ ] DELETE /api/v1/vectors/by-asset/{id} (204 on success, 404 on not found)
- [ ] DELETE /api/v1/vectors/by-session/{id} (requires confirm)
- [ ] DELETE /api/v1/vectors/by-category/{id} (requires confirm)
- [ ] POST /api/v1/vectors/cleanup-orphans (requires confirm)
- [ ] POST /api/v1/vectors/reset (requires confirm + text match)

**Update**: `tests/conftest.py`
- Add fixtures for VectorDeletionLog
- Mock Qdrant client for deletion methods

---

## Phase 7: Frontend Tests

**New File**: `src/tests/components/vectors/DirectoryManager.test.ts`

```typescript
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import DirectoryManager from '$lib/components/vectors/DirectoryManager.svelte';
import { createDirectoryStatus } from '../../helpers/fixtures';

describe('DirectoryManager', () => {
  it('renders empty state', () => {
    const { getByText } = render(DirectoryManager, {
      props: { directories: [], onRefresh: () => {} }
    });
    expect(getByText(/no directories/i)).toBeInTheDocument();
  });

  it('displays directory status table', () => {
    const directories = [
      createDirectoryStatus({ path: '/photos/2024/', vectorCount: 150 }),
      createDirectoryStatus({ path: '/photos/2023/', vectorCount: 230 })
    ];
    const { getByText } = render(DirectoryManager, {
      props: { directories, onRefresh: () => {} }
    });

    expect(getByText('/photos/2024/')).toBeInTheDocument();
    expect(getByText('150')).toBeInTheDocument();
    expect(getByText('/photos/2023/')).toBeInTheDocument();
    expect(getByText('230')).toBeInTheDocument();
  });

  it('shows delete and retrain buttons', () => {
    const directories = [createDirectoryStatus()];
    const { getByRole } = render(DirectoryManager, {
      props: { directories, onRefresh: () => {} }
    });

    expect(getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /retrain/i })).toBeInTheDocument();
  });
});
```

**New File**: `src/tests/components/vectors/DeleteConfirmationModal.test.ts`

Test cases:
- [ ] Renders modal with operation details
- [ ] Shows deletion reason input
- [ ] Confirm button calls onConfirm
- [ ] Cancel button closes modal
- [ ] Validates required fields

**New File**: `src/tests/components/vectors/DangerZone.test.ts`

Test cases:
- [ ] Requires typing exact confirmation text
- [ ] Confirm button disabled until text matches
- [ ] Calls reset API on confirm
- [ ] Shows success message after reset

**New File**: `src/tests/routes/vectors.test.ts`

Test cases:
- [ ] Loads directory status on mount
- [ ] Displays error on API failure
- [ ] Refresh button reloads data
- [ ] Renders all management sections

**Update**: `src/tests/helpers/fixtures.ts`

Add fixture factories:
```typescript
export function createDirectoryStatus(
  overrides?: Partial<DirectoryStatusResponse>
): DirectoryStatusResponse {
  return {
    path: '/photos/2024/',
    vectorCount: 100,
    sessionCount: 2,
    lastTrainedAt: '2024-12-19T10:00:00Z',
    ...overrides
  };
}

export function createDeleteByDirectoryResponse(
  overrides?: Partial<DeleteByDirectoryResponse>
): DeleteByDirectoryResponse {
  return {
    deletedCount: 50,
    pathPrefix: '/photos/2024/',
    logId: 1,
    ...overrides
  };
}
```

**Update**: `src/tests/helpers/mockFetch.ts`

Add mocks for vector management endpoints:
```typescript
export function mockDeleteByDirectory(response: DeleteByDirectoryResponse) {
  mockResponse('/api/v1/vectors/by-directory', response, { method: 'DELETE' });
}

export function mockRetrainDirectory(response: RetrainDirectoryResponse) {
  mockResponse('/api/v1/vectors/retrain', response, { method: 'POST' });
}

export function mockDirectoryStatus(directories: DirectoryStatusResponse[]) {
  mockResponse('/api/v1/vectors/directories/status', directories);
}
```

---

## Implementation Order

```
Week 1: Backend Foundation
├── Day 1: Database migration (VectorDeletionLog, TrainingSession updates)
├── Day 2-3: Qdrant client methods (delete operations)
├── Day 3-4: VectorManagementService (business logic)
└── Day 4: Backend tests (vector, service layers)

Week 2: Backend API
├── Day 5: API schemas and routes
├── Day 5-6: API tests
├── Day 6: API contract update (v1.2.0)
└── Day 6: Deploy backend to dev

Week 3: Frontend
├── Day 7: Generate types + API client
├── Day 7-8: Components (modals, panels, manager)
├── Day 8-9: Vector management page
├── Day 9: Update training/sessions page
└── Day 10: Frontend tests + integration testing
```

---

## Critical Files to Modify

### Backend
1. `src/image_search_service/db/models.py` - Add VectorDeletionLog, update TrainingSession
2. `src/image_search_service/db/migrations/versions/008_*.py` - NEW migration
3. `src/image_search_service/vector/qdrant.py` - Add deletion methods
4. `src/image_search_service/services/vector_management_service.py` - NEW service
5. `src/image_search_service/api/vector_schemas.py` - NEW schemas
6. `src/image_search_service/api/routes/vectors.py` - NEW routes
7. `src/image_search_service/api/routes/__init__.py` - Register router
8. `tests/services/test_vector_management_service.py` - NEW
9. `tests/vector/test_qdrant_deletions.py` - NEW
10. `tests/api/test_vectors.py` - NEW

### Frontend
1. `src/lib/api/vectors.ts` - NEW API client
2. `src/lib/components/vectors/DirectoryManager.svelte` - NEW
3. `src/lib/components/vectors/DeleteConfirmationModal.svelte` - NEW
4. `src/lib/components/vectors/RetrainModal.svelte` - NEW
5. `src/lib/components/vectors/OrphanCleanupPanel.svelte` - NEW
6. `src/lib/components/vectors/DangerZone.svelte` - NEW
7. `src/routes/vectors/+page.svelte` - NEW
8. `src/routes/training/sessions/+page.svelte` - Update with vector actions
9. `src/routes/+layout.svelte` - Add navigation link
10. `src/tests/components/vectors/*.test.ts` - NEW tests
11. `src/tests/routes/vectors.test.ts` - NEW
12. `src/tests/helpers/fixtures.ts` - Add vector management fixtures

### Shared
- `docs/api-contract.md` (both repos) - Add Vector Management section, bump to v1.2.0

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Large deletions timeout | Batch processing with configurable batch_size; use background jobs for >1000 vectors |
| Qdrant scroll pagination issues | Implement robust scroll with offset tracking; test with large collections |
| Accidental full deletion | Multiple confirmation layers: confirm flag + confirmation text match |
| Database/Qdrant sync issues | Deletion logs track all operations; orphan cleanup handles inconsistencies |
| UI doesn't reflect deletions | Refresh directory status after all operations; show loading states |
| Path prefix matching errors | Validate path format; show preview of affected vectors before deletion |
| Session reset breaks training | Queue new job atomically with reset; test retrain workflow end-to-end |
| Audit log grows unbounded | Add retention policy (archive logs older than 90 days) in future |

---

## Future Enhancements

### Phase 8: Advanced Features (Post-MVP)
- **Soft Delete**: Mark vectors as deleted without removing from Qdrant
- **Deletion Preview**: Show list of affected assets before confirming
- **Batch Retrain**: Queue multiple directory retraining jobs
- **Deletion Undo**: Restore vectors from backup within 24 hours
- **Audit Log UI**: Browse deletion history with filters
- **Directory Tree View**: Hierarchical display of directories with expand/collapse
- **Retention Policies**: Automatic cleanup of old vectors based on rules
- **Export Before Delete**: Download asset list before bulk deletion
- **Scheduled Cleanup**: Cron job for orphan cleanup and retention enforcement

### Authentication Integration (When Auth Added)
- Deletion logs include user_id
- Role-based permissions (admin-only for reset operations)
- Deletion reason becomes required for admins
- Approval workflow for destructive operations

---

## Success Metrics

### Backend
- All deletion methods tested with >95% coverage
- Qdrant operations handle collections >10,000 vectors
- Audit logs capture all deletion events
- No orphaned vectors after cleanup operation

### Frontend
- Directory status loads in <2s for 100 directories
- Confirmation modals prevent accidental deletions
- User can delete/retrain directory in <3 clicks
- Error states clearly communicate failures

### Integration
- Retrain workflow completes successfully end-to-end
- Directory status accurate after deletions
- No database/Qdrant inconsistencies after operations

---

_This plan provides comprehensive vector management capabilities with safety guardrails and audit trails for the image search system._
