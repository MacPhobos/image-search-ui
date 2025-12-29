# Face/Image Thumbnail API Investigation

**Date**: 2025-12-29
**Purpose**: Identify correct API endpoint pattern for loading face thumbnail images in the UI
**Status**: COMPLETE

---

## Executive Summary

**Finding**: The image-search-service provides image serving through `/api/v1/images/{asset_id}/thumbnail` and `/api/v1/images/{asset_id}/full` endpoints. For face thumbnails in prototype data, the backend should construct the thumbnail URL using the `asset_id` from the associated `FaceInstance`.

**Correct URL Pattern**:
```typescript
// For a prototype with face_instance_id
const thumbnailUrl = `/api/v1/images/${assetId}/thumbnail`;
const fullImageUrl = `/api/v1/images/${assetId}/full`;
```

**Frontend Usage Pattern**:
```typescript
// Prepend API_BASE_URL to relative URLs
import { API_BASE_URL } from '$lib/api/client';

function getImageUrl(url: string): string {
  return `${API_BASE_URL}${url}`;
}

// In component
<img src={getImageUrl(photo.thumbnailUrl)} alt="" loading="lazy" />
```

---

## 1. Backend API Routes

### Image Serving Endpoints

**Location**: `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/images.py`

#### Endpoint: `GET /api/v1/images/{asset_id}/thumbnail`

**Purpose**: Serve thumbnail for an image asset (generates on-the-fly if missing)

**Parameters**:
- `asset_id` (int) - Image asset ID from `ImageAsset` table

**Response**: `FileResponse` with JPEG image

**Features**:
- Auto-generates thumbnails if they don't exist
- Updates database with thumbnail metadata (path, width, height)
- Security validation to prevent directory traversal attacks
- 24-hour cache headers (`Cache-Control: public, max-age=86400`)
- ETag support for conditional requests

**Code Reference**:
```python
@router.get("/{asset_id}/thumbnail")
async def get_thumbnail(
    asset_id: int, db: AsyncSession = Depends(get_db)
) -> FileResponse:
    # ... fetches asset from database
    # ... generates thumbnail if needed
    # ... validates security
    return FileResponse(
        path=thumb_path,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "ETag": f'"{asset_id}"',
        },
    )
```

#### Endpoint: `GET /api/v1/images/{asset_id}/full`

**Purpose**: Serve full-size original image

**Parameters**:
- `asset_id` (int) - Image asset ID

**Response**: `FileResponse` with original image (MIME type detected)

**Features**:
- Serves original file from filesystem
- Security validation for allowed directories
- 24-hour cache headers
- ETag support

---

## 2. API Contract Documentation

**Location**: `/export/workspace/image-search/image-search-service/docs/api-contract.md`

### Asset Schema (Lines 306-329)

```typescript
interface Asset {
  id: string; // UUID
  path: string; // Original file path
  filename: string; // Basename of file
  url: string; // Accessible URL for full image
  thumbnailUrl: string; // Accessible URL for thumbnail
  mimeType: string; // e.g., "image/jpeg"
  width: number; // Pixels
  height: number; // Pixels
  fileSize: number; // Bytes
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

**Example Asset Response** (Lines 346-378):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "/files/550e8400-e29b-41d4-a716-446655440000/full",
  "thumbnailUrl": "/files/550e8400-e29b-41d4-a716-446655440000/thumb"
}
```

**NOTE**: The contract shows `/files/` prefix but the actual implementation uses `/api/v1/images/`.

### Face Suggestion Schema (Lines 746-768)

```typescript
interface FaceSuggestion {
  id: number;
  faceInstanceId: string; // UUID of the suggested face
  suggestedPersonId: string;
  confidence: number;
  sourceFaceId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  reviewedAt: string | null;
  faceThumbnailUrl: string | null; // Thumbnail URL for the suggested face
  personName: string | null;
  fullImageUrl: string | null; // Full image URL (e.g., /api/v1/images/{assetId}/full)
  bboxX: number | null; // Bounding box X coordinate (pixels)
  bboxY: number | null;
  bboxW: number | null;
  bboxH: number | null;
  detectionConfidence: number | null;
  qualityScore: number | null;
}
```

**Example** (Lines 828-847):
```json
{
  "id": 1,
  "faceInstanceId": "123e4567-e89b-12d3-a456-426614174000",
  "faceThumbnailUrl": "/files/123e4567-e89b-12d3-a456-426614174000/face_thumb",
  "fullImageUrl": "/api/v1/images/1234/full",
  "bboxX": 100,
  "bboxY": 150,
  "bboxW": 80,
  "bboxH": 80
}
```

---

## 3. Frontend Usage Patterns

### Component: PersonPhotosTab.svelte

**Location**: `/export/workspace/image-search/image-search-ui/src/lib/components/faces/PersonPhotosTab.svelte`

**Pattern** (Lines 4, 125-130, 193):
```typescript
import { API_BASE_URL } from '$lib/api/client';

function getImageUrl(url: string): string {
  // Backend returns relative URLs like "/api/v1/images/123/thumbnail"
  // Frontend prepends base URL to create absolute URL
  return `${API_BASE_URL}${url}`;
}

// Usage in template
<img src={getImageUrl(photo.thumbnailUrl)} alt="" loading="lazy" />
```

### API Type: PersonPhotoGroup

**Location**: `/export/workspace/image-search/image-search-ui/src/lib/api/faces.ts`

**Interface** (Lines 179-187):
```typescript
export interface PersonPhotoGroup {
  photoId: number;
  takenAt: string | null;
  thumbnailUrl: string; // Relative URL from backend
  fullUrl: string; // Relative URL from backend
  faces: FaceInPhoto[];
  faceCount: number;
  hasNonPersonFaces: boolean;
}
```

---

## 4. Prototype Data Structure

### Backend Endpoint: `GET /api/v1/faces/persons/{personId}/prototypes`

**Location**: `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/faces.py` (Lines 1489-1527)

**Response Schema**: `PrototypeListResponse`

**Code**:
```python
async def list_prototypes_endpoint(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> PrototypeListResponse:
    """List all prototypes with temporal breakdown and coverage stats."""
    prototypes = await prototype_service.get_prototypes_for_person(db, person_id)
    coverage = await prototype_service.get_temporal_coverage(db, person_id)

    # Load face instances for quality scores
    face_ids = [p.face_instance_id for p in prototypes if p.face_instance_id]
    faces_map = {}
    if face_ids:
        face_query = select(FaceInstance).where(FaceInstance.id.in_(face_ids))
        face_result = await db.execute(face_query)
        faces_map = {f.id: f for f in face_result.scalars().all()}

    # Build response items
    items = []
    for proto in prototypes:
        face = faces_map.get(proto.face_instance_id) if proto.face_instance_id else None
        quality_score = face.quality_score if face else None

        items.append(
            PrototypeListItem(
                id=proto.id,
                face_instance_id=proto.face_instance_id,
                role=proto.role.value,
                age_era_bucket=proto.age_era_bucket,
                decade_bucket=proto.decade_bucket,
                is_pinned=proto.is_pinned,
                quality_score=quality_score,
                created_at=proto.created_at,
            )
        )

    return PrototypeListResponse(items=items, coverage=coverage)
```

### Schema: PrototypeListItem

**Location**: `/export/workspace/image-search/image-search-service/src/image_search_service/api/face_schemas.py` (Lines 394-404)

**Current Fields**:
```python
class PrototypeListItem(CamelCaseModel):
    """Single prototype in listing."""

    id: UUID
    face_instance_id: UUID | None
    role: str
    age_era_bucket: str | None
    decade_bucket: str | None
    is_pinned: bool
    quality_score: float | None
    created_at: datetime
```

**ISSUE**: No `asset_id` or `thumbnail_url` field exposed in response.

---

## 5. Face Instance Model

**Location**: `/export/workspace/image-search/image-search-service/src/image_search_service/db/models.py` (Lines 437-467)

**Model**:
```python
class FaceInstance(Base):
    """Face instance detected in an image asset."""

    __tablename__ = "face_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("image_assets.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Bounding box (pixel coordinates)
    bbox_x: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_y: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_w: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_h: Mapped[int] = mapped_column(Integer, nullable=False)

    # Detection metadata
    detection_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Vector storage reference
    qdrant_point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )

    # Clustering and person assignment
    person_id: Mapped[uuid.UUID | None] = mapped_column(...)
    cluster_id: Mapped[int | None] = mapped_column(...)
```

**Key Relationship**: `FaceInstance.asset_id` → `ImageAsset.id`

### PersonPrototype Model

**Location**: Same file (Lines 509-539)

**Model**:
```python
class PersonPrototype(Base):
    """Person prototype for face recognition (centroid or exemplar)."""

    __tablename__ = "person_prototypes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
    )
    face_instance_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("face_instances.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Temporal metadata
    age_era_bucket: Mapped[str | None] = mapped_column(String(50), nullable=True)
    decade_bucket: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    role: Mapped[PrototypeRole] = mapped_column(...)
```

**Relationship Chain**: `PersonPrototype.face_instance_id` → `FaceInstance.id` → `FaceInstance.asset_id` → `ImageAsset.id`

---

## 6. How Other Endpoints Construct Thumbnail URLs

### Example: Face Suggestions Endpoint

**Location**: `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/face_suggestions.py` (Lines 36-79)

**Code**:
```python
async def _build_suggestion_response(
    suggestion: FaceSuggestion,
    db: AsyncSession,
    person: Person | None = None,
    face_instance: FaceInstance | None = None,
) -> FaceSuggestionResponse:
    """Build a FaceSuggestionResponse from database models."""
    # Lazy load if not provided
    if face_instance is None:
        face_instance = await db.get(FaceInstance, suggestion.face_instance_id)

    thumbnail_url = (
        f"/api/v1/images/{face_instance.asset_id}/thumbnail"
        if face_instance
        else None
    )
    full_image_url = (
        f"/api/v1/images/{face_instance.asset_id}/full"
        if face_instance
        else None
    )

    return FaceSuggestionResponse(
        id=suggestion.id,
        face_instance_id=str(suggestion.face_instance_id),
        suggested_person_id=str(suggestion.suggested_person_id),
        confidence=suggestion.confidence,
        source_face_id=str(suggestion.source_face_id),
        status=suggestion.status,
        created_at=suggestion.created_at,
        reviewed_at=suggestion.reviewed_at,
        face_thumbnail_url=thumbnail_url,  # ← USES ASSET_ID
        person_name=person.name if person else None,
        full_image_url=full_image_url,  # ← USES ASSET_ID
        bbox_x=face_instance.bbox_x if face_instance else None,
        bbox_y=face_instance.bbox_y if face_instance else None,
        bbox_w=face_instance.bbox_w if face_instance else None,
        bbox_h=face_instance.bbox_h if face_instance else None,
        detection_confidence=face_instance.detection_confidence if face_instance else None,
        quality_score=face_instance.quality_score if face_instance else None,
    )
```

**Pattern**: Extract `asset_id` from `FaceInstance` and construct URL as `/api/v1/images/{asset_id}/thumbnail`.

### Example: Person Photos Endpoint

**Location**: `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/faces.py` (Lines 460-572)

**Code** (Lines 554-563):
```python
items.append(
    PersonPhotoGroup(
        photo_id=asset_id,
        taken_at=None,
        thumbnail_url=f"/api/v1/images/{asset_id}/thumbnail",  # ← USES ASSET_ID
        full_url=f"/api/v1/images/{asset_id}/full",  # ← USES ASSET_ID
        faces=face_schemas,
        face_count=len(face_schemas),
        has_non_person_faces=has_non_person_faces,
    )
)
```

**Pattern**: Same - construct URL from `asset_id`.

---

## 7. Recommendations

### Backend Modification Required

**Problem**: The `PrototypeListItem` schema does NOT include `asset_id` or `thumbnail_url`.

**Solution**: Modify the prototype list endpoint to include thumbnail URLs by:

1. **Load FaceInstance data** (already done for `quality_score`)
2. **Extract `asset_id`** from `FaceInstance`
3. **Construct thumbnail URL** using pattern: `/api/v1/images/{asset_id}/thumbnail`
4. **Add field to response schema**: `thumbnail_url: str | None`

**Suggested Code Change** (in `list_prototypes_endpoint`):

```python
# In /export/workspace/image-search/image-search-service/src/image_search_service/api/routes/faces.py
# Around line 1510-1527

for proto in prototypes:
    face = faces_map.get(proto.face_instance_id) if proto.face_instance_id else None
    quality_score = face.quality_score if face else None

    # ✅ ADD: Construct thumbnail URL from asset_id
    thumbnail_url = (
        f"/api/v1/images/{face.asset_id}/thumbnail"
        if face
        else None
    )

    items.append(
        PrototypeListItem(
            id=proto.id,
            face_instance_id=proto.face_instance_id,
            role=proto.role.value,
            age_era_bucket=proto.age_era_bucket,
            decade_bucket=proto.decade_bucket,
            is_pinned=proto.is_pinned,
            quality_score=quality_score,
            thumbnail_url=thumbnail_url,  # ✅ ADD THIS FIELD
            created_at=proto.created_at,
        )
    )
```

**Schema Change** (in `PrototypeListItem`):

```python
# In /export/workspace/image-search/image-search-service/src/image_search_service/api/face_schemas.py
# Around line 394-404

class PrototypeListItem(CamelCaseModel):
    """Single prototype in listing."""

    id: UUID
    face_instance_id: UUID | None
    role: str
    age_era_bucket: str | None
    decade_bucket: str | None
    is_pinned: bool
    quality_score: float | None
    thumbnail_url: str | None  # ✅ ADD THIS FIELD
    created_at: datetime
```

### Frontend Implementation

**Pattern**: Once backend exposes `thumbnail_url`, use existing pattern:

```typescript
// In PrototypeGallery.svelte or similar component
import { API_BASE_URL } from '$lib/api/client';

function getImageUrl(url: string): string {
  return `${API_BASE_URL}${url}`;
}

// In template
{#each prototypes as prototype}
  <img src={getImageUrl(prototype.thumbnailUrl)} alt="Prototype face" />
{/each}
```

### API Contract Update

**Update** `/export/workspace/image-search/image-search-service/docs/api-contract.md` and `/export/workspace/image-search/image-search-ui/docs/api-contract.md`:

**Section**: Temporal Prototypes → Prototype Schema (around line 1062)

```typescript
interface Prototype {
  id: string; // UUID
  faceInstanceId: string; // UUID of the face instance
  role: 'primary' | 'temporal' | 'exemplar' | 'fallback';
  ageEraBucket?: string;
  decadeBucket?: string;
  isPinned: boolean;
  qualityScore: number;
  thumbnailUrl: string | null; // ✅ ADD: Thumbnail URL for face image
  createdAt: string;
}
```

**Example Response** (around line 1222):

```json
{
  "items": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "faceInstanceId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "primary",
      "ageEraBucket": "child",
      "decadeBucket": "2000s",
      "isPinned": true,
      "qualityScore": 0.95,
      "thumbnailUrl": "/api/v1/images/1234/thumbnail",
      "createdAt": "2025-12-29T10:00:00Z"
    }
  ]
}
```

---

## 8. Summary

### URL Pattern for Loading Face Thumbnails

**Correct Pattern**:
```
/api/v1/images/{asset_id}/thumbnail
```

Where `asset_id` is obtained from:
```
PersonPrototype → FaceInstance → ImageAsset
prototype.face_instance_id → face.asset_id
```

### Current State

✅ **Backend has image serving endpoints** (`/api/v1/images/{asset_id}/thumbnail`)
✅ **Frontend has URL construction pattern** (`getImageUrl()` helper)
❌ **Prototype API does NOT expose `thumbnail_url`** (needs backend change)
❌ **Prototype API does NOT expose `asset_id`** (can be derived from face_instance)

### Required Changes

1. **Backend**: Add `thumbnail_url` field to `PrototypeListItem` schema
2. **Backend**: Construct thumbnail URL in `list_prototypes_endpoint()`
3. **Contract**: Update API contract with new field
4. **Frontend**: Use existing `getImageUrl()` pattern with new field
5. **Frontend**: Regenerate API types: `npm run gen:api`

### References

- Image serving: `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/images.py`
- Face suggestions (example): `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/face_suggestions.py`
- Person photos (example): `/export/workspace/image-search/image-search-service/src/image_search_service/api/routes/faces.py#L460-L572`
- Frontend pattern: `/export/workspace/image-search/image-search-ui/src/lib/components/faces/PersonPhotosTab.svelte`

---

**Status**: Research complete. Backend modification required before frontend can load prototype thumbnails.
