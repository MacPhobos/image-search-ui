# Image Search API Contract

> **Version**: 1.17.0
> **Last Updated**: 2026-01-16
> **Status**: FROZEN - Changes require version bump and UI sync

This document defines the API contract between `image-search-service` (backend) and `image-search-ui` (frontend).

---

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Type Generation Strategy](#type-generation-strategy)
3. [Common Types](#common-types)
4. [Endpoints](#endpoints)
   - [Health](#health)
   - [Categories](#categories)
   - [Assets](#assets)
   - [Search](#search)
   - [People/Faces](#peoplefaces)
   - [Face Suggestions](#face-suggestions)
   - [Face Clusters](#face-clusters)
   - [Face Centroids](#face-centroids)
   - [Temporal Prototypes](#temporal-prototypes)
   - [Configuration](#configuration)
   - [Jobs](#jobs)
   - [Job Progress](#job-progress)
   - [Corrections](#corrections)
   - [Queue Monitoring](#queue-monitoring)
5. [Pagination](#pagination)
6. [Error Handling](#error-handling)
7. [Status Codes](#status-codes)
8. [CORS Configuration](#cors-configuration)
9. [Authentication (Future)](#authentication-future)

---

## Base Configuration

| Environment | Base URL                                     |
| ----------- | -------------------------------------------- |
| Development | `http://localhost:8000`                      |
| Production  | `https://api.image-search.example.com` (TBD) |

All endpoints are prefixed with `/api/v1` except `/health` and `/openapi.json`.

---

## Type Generation Strategy

**This strategy is LOCKED. Do not deviate.**

### Backend (FastAPI)

- OpenAPI spec auto-generated at `/openapi.json`
- FastAPI generates from Pydantic models
- All response models must inherit from `BaseModel`

### Frontend (SvelteKit)

- Generated types at `src/lib/api/generated.ts`
- Use `openapi-typescript` package
- Generation script: `npm run gen:api`

```bash
# UI generation command (package.json script)
npx openapi-typescript ${VITE_API_BASE_URL}/openapi.json -o src/lib/api/generated.ts
```

**Workflow**: Backend changes Pydantic models → Backend deploys → UI runs `npm run gen:api` → UI updates

---

## Common Types

### Pagination Wrapper

All list endpoints return paginated responses.

```typescript
interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number; // Current page (1-indexed)
		pageSize: number; // Items per page
		totalItems: number; // Total count
		totalPages: number; // Calculated total pages
	};
}
```

```python
# Backend Pydantic equivalent
class PaginationMeta(BaseModel):
    page: int
    page_size: int = Field(alias="pageSize")
    total_items: int = Field(alias="totalItems")
    total_pages: int = Field(alias="totalPages")

class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    pagination: PaginationMeta
```

### ErrorResponse

All errors follow this shape.

```typescript
interface ErrorResponse {
	error: {
		code: string; // Machine-readable code (e.g., "ASSET_NOT_FOUND")
		message: string; // Human-readable message
		details?: unknown; // Optional additional context
	};
}
```

```python
# Backend Pydantic equivalent
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict | None = None

class ErrorResponse(BaseModel):
    error: ErrorDetail
```

---

## Endpoints

### Health

Health check endpoint. No authentication required. No `/api/v1` prefix.

#### `GET /health`

**Response** `200 OK`

```json
{
	"status": "ok"
}
```

---

### Categories

Category management for organizing training sessions and filtering search results.

#### Category Schema

```typescript
interface Category {
	id: number; // Auto-increment ID
	name: string; // Category name (max 100 chars, unique)
	description?: string | null; // Optional description
	color?: string | null; // Hex color code (e.g., "#3B82F6")
	isDefault: boolean; // Whether this is the default category
	createdAt: string; // ISO 8601 timestamp
	updatedAt: string; // ISO 8601 timestamp
	sessionCount?: number; // Number of training sessions (in responses)
}
```

#### `GET /api/v1/categories`

List all categories with pagination.

**Query Parameters**

| Parameter  | Type    | Default | Description               |
| ---------- | ------- | ------- | ------------------------- |
| `page`     | integer | 1       | Page number (1-indexed)   |
| `pageSize` | integer | 50      | Items per page (max: 100) |

**Response** `200 OK`

```json
{
	"items": [
		{
			"id": 1,
			"name": "General",
			"description": "Default category for all training sessions",
			"color": null,
			"isDefault": true,
			"createdAt": "2024-12-19T10:00:00Z",
			"updatedAt": "2024-12-19T10:00:00Z",
			"sessionCount": 5
		},
		{
			"id": 2,
			"name": "Vacation",
			"description": "Photos from vacations and trips",
			"color": "#10B981",
			"isDefault": false,
			"createdAt": "2024-12-19T11:00:00Z",
			"updatedAt": "2024-12-19T11:00:00Z",
			"sessionCount": 2
		}
	],
	"total": 2,
	"page": 1,
	"pageSize": 50,
	"hasMore": false
}
```

#### `POST /api/v1/categories`

Create a new category.

**Request Body**

```json
{
	"name": "Vacation",
	"description": "Photos from vacations and trips",
	"color": "#10B981"
}
```

| Field         | Type   | Required | Description                    |
| ------------- | ------ | -------- | ------------------------------ |
| `name`        | string | Yes      | Category name (max 100 chars)  |
| `description` | string | No       | Category description           |
| `color`       | string | No       | Hex color code (e.g., #10B981) |

**Response** `201 Created` - Category object

**Response** `409 Conflict` - Duplicate name

```json
{
	"detail": "Category with name 'Vacation' already exists"
}
```

#### `GET /api/v1/categories/{id}`

Get single category by ID.

**Response** `200 OK` - Category object with sessionCount

**Response** `404 Not Found`

```json
{
	"detail": "Category not found"
}
```

#### `PATCH /api/v1/categories/{id}`

Update a category.

**Request Body**

```json
{
	"name": "Updated Name",
	"description": "Updated description",
	"color": "#EF4444"
}
```

All fields are optional. Only provided fields are updated.

**Response** `200 OK` - Updated Category object

**Response** `404 Not Found` - Category not found

**Response** `409 Conflict` - Duplicate name

#### `DELETE /api/v1/categories/{id}`

Delete a category.

**Response** `204 No Content` - Successfully deleted

**Response** `400 Bad Request` - Cannot delete default category

```json
{
	"detail": "Cannot delete the default category"
}
```

**Response** `404 Not Found` - Category not found

**Response** `409 Conflict` - Category has training sessions

```json
{
	"detail": "Cannot delete category with 5 training sessions. Reassign sessions first."
}
```

---

### Assets

Asset management for image files.

#### Asset Schema

```typescript
interface LocationMetadata {
	lat: number; // Latitude in decimal degrees (-90 to 90)
	lng: number; // Longitude in decimal degrees (-180 to 180)
}

interface CameraMetadata {
	make: string | null; // Camera manufacturer (e.g., "Apple", "Canon")
	model: string | null; // Camera model (e.g., "iPhone 15 Pro", "EOS 5D Mark IV")
}

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
	takenAt?: string | null; // ISO 8601 datetime when photo was taken (from EXIF DateTimeOriginal)
	camera?: CameraMetadata | null; // Camera identification from EXIF
	location?: LocationMetadata | null; // GPS coordinates from EXIF
}
```

#### `GET /api/v1/assets`

List all assets with pagination.

**Query Parameters**

| Parameter   | Type    | Default     | Description                                     |
| ----------- | ------- | ----------- | ----------------------------------------------- |
| `page`      | integer | 1           | Page number (1-indexed)                         |
| `pageSize`  | integer | 50          | Items per page (max: 100)                       |
| `sortBy`    | string  | `createdAt` | Sort field: `createdAt`, `filename`, `fileSize` |
| `sortOrder` | string  | `desc`      | Sort direction: `asc`, `desc`                   |

**Response** `200 OK`

```json
{
	"data": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"path": "/photos/2024/vacation/beach.jpg",
			"filename": "beach.jpg",
			"url": "/files/550e8400-e29b-41d4-a716-446655440000/full",
			"thumbnailUrl": "/files/550e8400-e29b-41d4-a716-446655440000/thumb",
			"mimeType": "image/jpeg",
			"width": 4032,
			"height": 3024,
			"fileSize": 3542890,
			"createdAt": "2024-12-19T10:30:00Z",
			"updatedAt": "2024-12-19T10:30:00Z",
			"takenAt": "2024-12-15T14:22:00Z",
			"camera": {
				"make": "Apple",
				"model": "iPhone 15 Pro"
			},
			"location": {
				"lat": 25.7617,
				"lng": -80.1918
			}
		}
	],
	"pagination": {
		"page": 1,
		"pageSize": 50,
		"totalItems": 1247,
		"totalPages": 25
	}
}
```

#### `GET /api/v1/assets/{id}`

Get single asset by ID.

**Response** `200 OK` - Asset object (see schema above)

**Response** `404 Not Found`

```json
{
	"error": {
		"code": "ASSET_NOT_FOUND",
		"message": "Asset with ID '550e8400-...' not found"
	}
}
```

#### `POST /api/v1/assets/scan`

Trigger a directory scan to discover new assets.

**Request Body**

```json
{
	"paths": ["/photos/2024", "/photos/2023"],
	"recursive": true
}
```

**Response** `202 Accepted`

```json
{
	"jobId": "job-550e8400-e29b-41d4-a716-446655440000",
	"message": "Scan job queued"
}
```

#### `DELETE /api/v1/assets/{id}`

Remove asset from index (does not delete source file).

**Response** `204 No Content`

#### `POST /api/v1/images/thumbnails/batch`

Fetch multiple thumbnails in a single request, returning base64-encoded data URIs.

**Request Body**

```json
{
	"assetIds": [1, 2, 3, 4, 5]
}
```

| Field      | Type      | Required | Description                   |
| ---------- | --------- | -------- | ----------------------------- |
| `assetIds` | integer[] | Yes      | Array of asset IDs (max: 100) |

**Response** `200 OK`

```json
{
	"thumbnails": {
		"1": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
		"2": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
		"3": null
	},
	"found": 2,
	"notFound": [3]
}
```

| Field        | Type      | Description                                                      |
| ------------ | --------- | ---------------------------------------------------------------- |
| `thumbnails` | object    | Map of asset ID (string) to base64 data URI or null if not found |
| `found`      | integer   | Count of successfully retrieved thumbnails                       |
| `notFound`   | integer[] | Array of asset IDs that were not found or failed                 |

**Response** `422 Unprocessable Entity` - Validation error

```json
{
	"detail": [
		{
			"loc": ["body", "assetIds"],
			"msg": "ensure this value has at most 100 items",
			"type": "value_error.list.max_items"
		}
	]
}
```

---

### Search

Vector similarity search across indexed assets.

#### `GET /api/v1/search`

Search assets by text query (semantic search).

**Query Parameters**

| Parameter    | Type    | Default    | Description                        |
| ------------ | ------- | ---------- | ---------------------------------- |
| `q`          | string  | _required_ | Search query text                  |
| `page`       | integer | 1          | Page number                        |
| `pageSize`   | integer | 20         | Results per page (max: 100)        |
| `minScore`   | number  | 0.0        | Minimum similarity score (0.0-1.0) |
| `personId`   | string  | -          | Filter by person ID                |
| `categoryId` | integer | -          | Filter by category ID              |
| `dateFrom`   | string  | -          | Filter: date taken >= (ISO 8601)   |
| `dateTo`     | string  | -          | Filter: date taken <= (ISO 8601)   |

**Response** `200 OK`

```json
{
	"data": [
		{
			"asset": {
				"id": "550e8400-e29b-41d4-a716-446655440000",
				"path": "/photos/2024/vacation/beach.jpg",
				"filename": "beach.jpg",
				"url": "/files/550e8400-e29b-41d4-a716-446655440000/full",
				"thumbnailUrl": "/files/550e8400-e29b-41d4-a716-446655440000/thumb",
				"mimeType": "image/jpeg",
				"width": 4032,
				"height": 3024,
				"fileSize": 3542890,
				"createdAt": "2024-12-19T10:30:00Z",
				"updatedAt": "2024-12-19T10:30:00Z"
			},
			"score": 0.89,
			"highlights": ["beach", "ocean", "sunset"]
		}
	],
	"pagination": {
		"page": 1,
		"pageSize": 20,
		"totalItems": 47,
		"totalPages": 3
	}
}
```

#### `POST /api/v1/search/similar`

Find visually similar images to a given asset.

**Request Body**

```json
{
	"assetId": "550e8400-e29b-41d4-a716-446655440000",
	"limit": 10,
	"minScore": 0.7
}
```

**Response** `200 OK` - Same structure as search results

---

### People/Faces

Face detection and person labeling.

#### Person Schema

```typescript
interface Person {
	id: string; // UUID
	name: string; // Display name (unique, required)
	birthDate?: string | null; // ISO 8601 date (YYYY-MM-DD)
	status: string; // Person status: "active" or "inactive"
	thumbnailUrl?: string; // Representative face thumbnail
	faceCount: number; // Number of detected faces
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}
```

#### Face Schema

```typescript
interface Face {
	id: string; // UUID
	assetId: string; // Parent asset ID
	personId?: string; // Assigned person (null if unassigned)
	personAgeAtPhoto?: number | null; // Calculated age when photo was taken
	boundingBox: {
		x: number; // Top-left X (0.0-1.0 normalized)
		y: number; // Top-left Y (0.0-1.0 normalized)
		width: number; // Width (0.0-1.0 normalized)
		height: number; // Height (0.0-1.0 normalized)
	};
	confidence: number; // Detection confidence (0.0-1.0)
	thumbnailUrl: string; // Cropped face thumbnail
	createdAt: string; // ISO 8601
}
```

#### `POST /api/v1/faces/persons`

Create a new person entity.

**Request Body**

```json
{
	"name": "John Smith"
}
```

| Field  | Type   | Required | Description          |
| ------ | ------ | -------- | -------------------- |
| `name` | string | Yes      | Person name (unique) |

**Response** `201 Created`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "John Smith",
	"status": "active",
	"createdAt": "2024-12-24T10:00:00Z"
}
```

**Response** `409 Conflict` - Person with name already exists

```json
{
	"detail": "Person with name 'John Smith' already exists"
}
```

#### `GET /api/v1/faces/persons/{personId}`

Get a single person by ID with detailed information including face count, photo count, and thumbnail.

**Path Parameters**

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `personId` | string | Yes      | Person ID (UUID) |

**Response** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "John Smith",
	"birthDate": "1990-05-15",
	"status": "active",
	"faceCount": 42,
	"photoCount": 15,
	"thumbnailUrl": "/api/v1/images/123/thumbnail",
	"createdAt": "2024-12-24T10:00:00Z",
	"updatedAt": "2024-12-25T14:30:00Z"
}
```

| Field          | Type         | Description                              |
| -------------- | ------------ | ---------------------------------------- |
| `id`           | string       | Person UUID                              |
| `name`         | string       | Person name                              |
| `birthDate`    | string\|null | ISO 8601 date (YYYY-MM-DD)               |
| `status`       | string       | Status: `active`, `merged`, `hidden`     |
| `faceCount`    | integer      | Total number of face instances           |
| `photoCount`   | integer      | Total number of distinct photos (assets) |
| `thumbnailUrl` | string\|null | Thumbnail URL from highest quality face  |
| `createdAt`    | string       | ISO 8601 timestamp                       |
| `updatedAt`    | string       | ISO 8601 timestamp                       |

**Response** `404 Not Found` - Person not found

```json
{
	"detail": "Person not found"
}
```

#### `PATCH /api/v1/faces/persons/{personId}`

Update person's name and/or birth date.

**Path Parameters**

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `personId` | string | Yes      | Person ID (UUID) |

**Request Body**

```json
{
	"name": "John Smith",
	"birthDate": "1990-05-15"
}
```

| Field       | Type         | Required | Description                               |
| ----------- | ------------ | -------- | ----------------------------------------- |
| `name`      | string       | No       | Person name (unique)                      |
| `birthDate` | string\|null | No       | ISO 8601 date (YYYY-MM-DD), null to clear |

All fields are optional. Only provided fields are updated.

**Response** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "John Smith",
	"birthDate": "1990-05-15",
	"status": "active",
	"createdAt": "2024-12-24T10:00:00Z",
	"updatedAt": "2024-12-25T14:30:00Z"
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"detail": "Person not found"
}
```

**Response** `409 Conflict` - Duplicate name

```json
{
	"detail": "Person with name 'John Smith' already exists"
}
```

**Response** `422 Unprocessable Entity` - Invalid birth date format

```json
{
	"detail": "Birth date must be in YYYY-MM-DD format"
}
```

#### `GET /api/v1/people`

List all identified people.

**Query Parameters**

| Parameter   | Type    | Default     | Description                            |
| ----------- | ------- | ----------- | -------------------------------------- |
| `page`      | integer | 1           | Page number                            |
| `pageSize`  | integer | 50          | Items per page                         |
| `sortBy`    | string  | `faceCount` | Sort: `name`, `faceCount`, `createdAt` |
| `sortOrder` | string  | `desc`      | Direction: `asc`, `desc`               |

**Response** `200 OK` - `PaginatedResponse<Person>`

#### `GET /api/v1/people/{id}`

Get person details.

**Response** `200 OK` - Person object

#### `PATCH /api/v1/people/{id}`

Update person name and/or birth date.

**Request Body**

```json
{
	"name": "John Smith",
	"birthDate": "1990-05-15"
}
```

| Field       | Type         | Required | Description                               |
| ----------- | ------------ | -------- | ----------------------------------------- |
| `name`      | string       | No       | Person name (unique)                      |
| `birthDate` | string\|null | No       | ISO 8601 date (YYYY-MM-DD), null to clear |

All fields are optional. Only provided fields are updated.

**Response** `200 OK` - Updated Person object

#### `POST /api/v1/people/merge`

Merge multiple people into one (e.g., when same person was detected separately).

**Request Body**

```json
{
	"sourceIds": ["id-1", "id-2", "id-3"],
	"targetId": "id-1"
}
```

**Response** `200 OK`

```json
{
	"merged": {
		"id": "id-1",
		"name": "John Smith",
		"faceCount": 47
	},
	"deletedIds": ["id-2", "id-3"]
}
```

#### `GET /api/v1/people/{id}/faces`

List all faces for a person.

**Response** `200 OK` - `PaginatedResponse<Face>`

#### `GET /api/v1/faces/unassigned`

List faces not yet assigned to any person.

**Response** `200 OK` - `PaginatedResponse<Face>`

#### `POST /api/v1/faces/faces/{faceId}/assign`

Assign a face instance to a person.

**Path Parameters**

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `faceId`  | string | Yes      | Face instance ID (UUID) |

**Request Body**

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field      | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `personId` | string | Yes      | Person ID (UUID) |

**Response** `200 OK`

```json
{
	"faceId": "123e4567-e89b-12d3-a456-426614174000",
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"personName": "John Smith"
}
```

**Response** `404 Not Found` - Face or person not found

```json
{
	"error": {
		"code": "FACE_NOT_FOUND",
		"message": "Face with ID '123e4567-...' not found"
	}
}
```

or

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

#### `DELETE /api/v1/faces/faces/{faceId}/person`

Unassign a face instance from its currently assigned person. The face returns to unassigned state and can be reassigned later.

**Path Parameters**

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `faceId`  | string | Yes      | Face instance ID (UUID) |

**Response** `200 OK`

```json
{
	"faceId": "123e4567-e89b-12d3-a456-426614174000",
	"previousPersonId": "550e8400-e29b-41d4-a716-446655440000",
	"previousPersonName": "John Smith"
}
```

**Response** `404 Not Found` - Face not found

```json
{
	"error": {
		"code": "FACE_NOT_FOUND",
		"message": "Face with ID '123e4567-...' not found"
	}
}
```

**Response** `400 Bad Request` - Face is not assigned to any person

```json
{
	"error": {
		"code": "FACE_NOT_ASSIGNED",
		"message": "Face is not assigned to any person"
	}
}
```

---

### Face Suggestions

Automatic face assignment suggestions based on similarity to labeled faces. When a face is assigned to a person, the system generates suggestions for other similar unassigned faces.

#### FaceSuggestion Schema

```typescript
interface FaceSuggestion {
	id: number; // Auto-increment ID
	faceInstanceId: string; // UUID of the suggested face
	suggestedPersonId: string; // UUID of the person to assign
	confidence: number; // Similarity score (0.0-1.0)
	sourceFaceId: string; // UUID of the source face that triggered this suggestion
	status: 'pending' | 'accepted' | 'rejected' | 'expired'; // Suggestion status
	createdAt: string; // ISO 8601 timestamp
	reviewedAt: string | null; // ISO 8601 timestamp when reviewed (null if pending)
	faceThumbnailUrl: string | null; // Thumbnail URL for the suggested face
	personName: string | null; // Name of the suggested person
	// Bounding box and image data for face overlay display
	fullImageUrl: string | null; // Full image URL (e.g., /api/v1/images/{assetId}/full)
	path: string; // Original filesystem path of the image asset
	bboxX: number | null; // Bounding box X coordinate (pixels)
	bboxY: number | null; // Bounding box Y coordinate (pixels)
	bboxW: number | null; // Bounding box width (pixels)
	bboxH: number | null; // Bounding box height (pixels)
	detectionConfidence: number | null; // Face detection confidence (0.0-1.0)
	qualityScore: number | null; // Face quality score (0.0-1.0)
}
```

#### SuggestionStats Response

```typescript
interface SuggestionStats {
	total: number; // Total suggestions
	pending: number; // Pending suggestions
	accepted: number; // Accepted suggestions
	rejected: number; // Rejected suggestions
	expired: number; // Expired suggestions
	reviewed: number; // Total reviewed (accepted + rejected)
	acceptanceRate: number; // Percentage of accepted vs reviewed (0-100)
	topPersonsWithPending: Array<{
		personId: string; // UUID
		name: string; // Person name
		pendingCount: number; // Number of pending suggestions for this person
	}>;
}
```

#### BulkActionRequest

```typescript
interface BulkActionRequest {
	suggestionIds: number[]; // Array of suggestion IDs to act on
	action: 'accept' | 'reject'; // Action to perform
}
```

#### BulkActionResponse

```typescript
interface BulkActionResponse {
	successCount: number; // Number of successfully processed suggestions
	failedCount: number; // Number of failed suggestions
	errors: Array<{
		suggestionId: number; // ID of the suggestion that failed
		reason: string; // Error message
	}>;
}
```

#### `GET /api/v1/faces/suggestions`

List face suggestions with pagination and filtering.

**Query Parameters**

| Parameter  | Type    | Default | Description                                            |
| ---------- | ------- | ------- | ------------------------------------------------------ |
| `page`     | integer | 1       | Page number (1-indexed)                                |
| `pageSize` | integer | 20      | Items per page (max: 100)                              |
| `status`   | string  | -       | Filter by status: pending, accepted, rejected, expired |
| `personId` | string  | -       | Filter by suggested person ID (UUID)                   |

**Response** `200 OK`

```json
{
	"data": [
		{
			"id": 1,
			"faceInstanceId": "123e4567-e89b-12d3-a456-426614174000",
			"suggestedPersonId": "550e8400-e29b-41d4-a716-446655440000",
			"confidence": 0.92,
			"sourceFaceId": "789e0123-e89b-12d3-a456-426614174456",
			"status": "pending",
			"createdAt": "2025-12-25T10:00:00Z",
			"reviewedAt": null,
			"faceThumbnailUrl": "/files/123e4567-e89b-12d3-a456-426614174000/face_thumb",
			"personName": "John Smith",
			"fullImageUrl": "/api/v1/images/1234/full",
			"bboxX": 100,
			"bboxY": 150,
			"bboxW": 80,
			"bboxH": 80,
			"detectionConfidence": 0.95,
			"qualityScore": 0.78
		}
	],
	"pagination": {
		"page": 1,
		"pageSize": 20,
		"totalItems": 15,
		"totalPages": 1
	}
}
```

#### `GET /api/v1/faces/suggestions/stats`

Get statistics about face suggestions.

**Response** `200 OK`

```json
{
	"total": 100,
	"pending": 45,
	"accepted": 40,
	"rejected": 10,
	"expired": 5,
	"reviewed": 50,
	"acceptanceRate": 80.0,
	"topPersonsWithPending": [
		{
			"personId": "550e8400-e29b-41d4-a716-446655440000",
			"name": "John Smith",
			"pendingCount": 15
		},
		{
			"personId": "660e8400-e29b-41d4-a716-446655440111",
			"name": "Jane Doe",
			"pendingCount": 12
		}
	]
}
```

#### `GET /api/v1/faces/suggestions/{id}`

Get a single face suggestion by ID.

**Path Parameters**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Suggestion ID |

**Response** `200 OK` - FaceSuggestion object

**Response** `404 Not Found`

```json
{
	"error": {
		"code": "SUGGESTION_NOT_FOUND",
		"message": "Suggestion with ID 123 not found"
	}
}
```

#### `POST /api/v1/faces/suggestions/{id}/accept`

Accept a face suggestion and assign the face to the suggested person.

**Path Parameters**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Suggestion ID |

**Response** `200 OK`

```json
{
	"id": 1,
	"faceInstanceId": "123e4567-e89b-12d3-a456-426614174000",
	"suggestedPersonId": "550e8400-e29b-41d4-a716-446655440000",
	"confidence": 0.92,
	"sourceFaceId": "789e0123-e89b-12d3-a456-426614174456",
	"status": "accepted",
	"createdAt": "2025-12-25T10:00:00Z",
	"reviewedAt": "2025-12-25T10:15:00Z",
	"faceThumbnailUrl": "/files/123e4567-e89b-12d3-a456-426614174000/face_thumb",
	"personName": "John Smith",
	"fullImageUrl": "/api/v1/images/1234/full",
	"bboxX": 100,
	"bboxY": 150,
	"bboxW": 80,
	"bboxH": 80,
	"detectionConfidence": 0.95,
	"qualityScore": 0.78
}
```

**Response** `404 Not Found` - Suggestion not found

**Response** `409 Conflict` - Suggestion already reviewed

```json
{
	"error": {
		"code": "SUGGESTION_ALREADY_REVIEWED",
		"message": "Suggestion has already been accepted or rejected"
	}
}
```

#### `POST /api/v1/faces/suggestions/{id}/reject`

Reject a face suggestion without assigning the face.

**Path Parameters**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Suggestion ID |

**Response** `200 OK`

```json
{
	"id": 1,
	"faceInstanceId": "123e4567-e89b-12d3-a456-426614174000",
	"suggestedPersonId": "550e8400-e29b-41d4-a716-446655440000",
	"confidence": 0.92,
	"sourceFaceId": "789e0123-e89b-12d3-a456-426614174456",
	"status": "rejected",
	"createdAt": "2025-12-25T10:00:00Z",
	"reviewedAt": "2025-12-25T10:15:00Z",
	"faceThumbnailUrl": "/files/123e4567-e89b-12d3-a456-426614174000/face_thumb",
	"personName": "John Smith"
}
```

**Response** `404 Not Found` - Suggestion not found

**Response** `409 Conflict` - Suggestion already reviewed

#### `POST /api/v1/faces/suggestions/persons/{person_id}/find-more`

Start a background job to find additional face suggestions using dynamic prototype sampling. Samples random labeled faces (weighted by quality and diversity) as temporary prototypes to search for similar unknown faces.

**Path Parameters**

| Parameter   | Type   | Required | Description      |
| ----------- | ------ | -------- | ---------------- |
| `person_id` | string | Yes      | Person ID (UUID) |

**Request Body**

```json
{
	"prototypeCount": 50,
	"maxSuggestions": 100,
	"minConfidence": 0.65
}
```

| Field            | Type    | Required | Default | Description                                                                         |
| ---------------- | ------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `prototypeCount` | integer | No       | 50      | Number of labeled faces to sample as prototypes (10-1000)                           |
| `maxSuggestions` | integer | No       | 100     | Maximum number of new suggestions to create (1-500)                                 |
| `minConfidence`  | float   | No       | null    | Minimum similarity threshold (0.3-1.0). Uses system default (0.70) if not provided. |

**Response** `201 Created`

```json
{
	"jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"personName": "John Smith",
	"prototypeCount": 50,
	"labeledFaceCount": 234,
	"status": "queued",
	"progressKey": "find_more:progress:550e8400-e29b-41d4-a716-446655440000:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field              | Type    | Description                                 |
| ------------------ | ------- | ------------------------------------------- |
| `jobId`            | string  | Background job UUID                         |
| `personId`         | string  | Person UUID                                 |
| `personName`       | string  | Person display name                         |
| `prototypeCount`   | integer | Actual number of prototypes to be used      |
| `labeledFaceCount` | integer | Total labeled faces available for sampling  |
| `status`           | string  | Job status (always "queued" on creation)    |
| `progressKey`      | string  | Redis key for tracking job progress via SSE |

**Response** `404 Not Found` - Person not found

```json
{
	"detail": "Person not found"
}
```

**Response** `400 Bad Request` - Insufficient labeled faces

```json
{
	"detail": "Person has only 5 labeled faces. Minimum 10 required."
}
```

**Notes:**

- Does NOT modify the person's configured prototypes
- Uses the same similarity threshold as normal suggestion generation
- Automatically adjusts `prototypeCount` if it exceeds available labeled faces
- Job progress can be monitored via `/api/v1/job-progress/events` endpoint

#### `POST /api/v1/faces/suggestions/bulk-action`

Accept or reject multiple suggestions in a single request.

**Request Body**

```json
{
	"suggestionIds": [1, 2, 3, 4, 5],
	"action": "accept",
	"autoFindMore": true,
	"findMorePrototypeCount": 50
}
```

| Field                    | Type      | Required | Default | Description                                                 |
| ------------------------ | --------- | -------- | ------- | ----------------------------------------------------------- |
| `suggestionIds`          | integer[] | Yes      | -       | Array of suggestion IDs                                     |
| `action`                 | string    | Yes      | -       | Action: "accept" or "reject"                                |
| `autoFindMore`           | boolean   | No       | false   | Auto-trigger find-more job after accepting suggestions      |
| `findMorePrototypeCount` | integer   | No       | 50      | Prototype count for auto-triggered find-more jobs (10-1000) |

**Response** `200 OK`

```json
{
	"successCount": 4,
	"failedCount": 1,
	"errors": [
		{
			"suggestionId": 3,
			"reason": "Suggestion has already been reviewed"
		}
	],
	"findMoreJobs": [
		{
			"personId": "550e8400-e29b-41d4-a716-446655440000",
			"jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			"progressKey": "find_more:progress:550e8400-e29b-41d4-a716-446655440000:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
		}
	]
}
```

| Field          | Type    | Description                                                                               |
| -------------- | ------- | ----------------------------------------------------------------------------------------- |
| `successCount` | integer | Number of successfully processed suggestions                                              |
| `failedCount`  | integer | Number of failed suggestions                                                              |
| `errors`       | array   | Array of error objects with `suggestionId` and `reason`                                   |
| `findMoreJobs` | array   | Array of auto-triggered find-more jobs (optional, only present when `autoFindMore: true`) |

**FindMoreJob Object:**

| Field         | Type   | Description                         |
| ------------- | ------ | ----------------------------------- |
| `personId`    | string | Person UUID                         |
| `jobId`       | string | Background job UUID                 |
| `progressKey` | string | Redis key for tracking job progress |

**Response** `400 Bad Request` - Invalid request

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid action. Must be 'accept' or 'reject'"
	}
}
```

---

### Face Clusters

Face clustering groups similar unidentified faces for efficient labeling. Clusters represent groups of faces that likely belong to the same person based on visual similarity.

#### ClusterSummary Schema

```typescript
interface ClusterSummary {
	clusterId: string; // Cluster identifier
	faceCount: number; // Number of faces in cluster
	sampleFaceIds: string[]; // Array of sample face IDs (max 5, sorted by quality)
	avgQuality: number | null; // Average face quality score (0.0-1.0)
	clusterConfidence: number | null; // Average pairwise cosine similarity (0.0-1.0)
	representativeFaceId: string | null; // Highest quality face ID in cluster
	personId: string | null; // Assigned person ID (null if unlabeled)
	personName: string | null; // Assigned person name (null if unlabeled)
}
```

#### ClusterListResponse Schema

```typescript
interface ClusterListResponse {
	items: ClusterSummary[]; // Array of clusters
	total: number; // Total number of clusters
	page: number; // Current page (1-indexed)
	pageSize: number; // Items per page
	hasMore: boolean; // Whether more pages available
}
```

#### `GET /api/v1/faces/clusters`

List face clusters with optional filtering.

**Query Parameters**

| Parameter          | Type    | Default | Description                                |
| ------------------ | ------- | ------- | ------------------------------------------ |
| `page`             | integer | 1       | Page number (1-indexed)                    |
| `page_size`        | integer | 20      | Items per page (max: 100)                  |
| `include_labeled`  | boolean | false   | Include labeled clusters (default: false)  |
| `min_confidence`   | number  | -       | Minimum intra-cluster confidence (0.0-1.0) |
| `min_cluster_size` | integer | -       | Minimum faces per cluster (≥1)             |

**Response** `200 OK`

```json
{
	"items": [
		{
			"clusterId": "clu_abc123",
			"faceCount": 12,
			"sampleFaceIds": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"],
			"avgQuality": 0.78,
			"clusterConfidence": 0.91,
			"representativeFaceId": "uuid1",
			"personId": null,
			"personName": null
		},
		{
			"clusterId": "clu_def456",
			"faceCount": 8,
			"sampleFaceIds": ["uuid6", "uuid7", "uuid8"],
			"avgQuality": 0.82,
			"clusterConfidence": 0.88,
			"representativeFaceId": "uuid6",
			"personId": null,
			"personName": null
		}
	],
	"total": 45,
	"page": 1,
	"pageSize": 20,
	"hasMore": true
}
```

**Response Fields**:

- `clusterConfidence` (number, optional): Average pairwise cosine similarity score between all faces in cluster (0.0-1.0). Higher values indicate more cohesive clusters.
- `representativeFaceId` (string UUID, optional): ID of the highest quality face in the cluster, useful for displaying a primary thumbnail.
- `sampleFaceIds` (array): Face IDs sorted by quality score descending, up to 5 faces.

**Example Requests**

```bash
# Get unlabeled clusters only (default)
GET /api/v1/faces/clusters

# Get high-confidence unlabeled clusters with at least 5 faces
GET /api/v1/faces/clusters?min_confidence=0.85&min_cluster_size=5

# Get all clusters including labeled ones
GET /api/v1/faces/clusters?include_labeled=true

# Pagination
GET /api/v1/faces/clusters?page=2&page_size=50
```

**Response** `400 Bad Request` - Invalid parameters

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "min_confidence must be between 0.0 and 1.0"
	}
}
```

---

### Face Centroids

Face centroid management for person identity representation. Centroids are computed average embeddings of a person's labeled faces, used for efficient similarity matching and face suggestion generation. Supports both global centroids (all faces) and cluster-based centroids (subdivided by temporal/quality groups).

#### Centroid Schema

```typescript
interface Centroid {
	centroidId: string; // UUID
	centroidType: 'global' | 'cluster'; // Centroid type
	clusterLabel: string; // Cluster identifier (e.g., "global", "cluster_0")
	nFaces: number; // Number of faces used to compute centroid
	modelVersion: string; // Embedding model version (e.g., "arcface_r100_glint360k_v1")
	centroidVersion: number; // Centroid algorithm version
	createdAt: string; // ISO 8601 timestamp
	isStale: boolean; // Whether centroid needs recomputation
}
```

#### PersonCentroidsResponse Schema

```typescript
interface PersonCentroidsResponse {
	personId: string; // UUID
	centroids: Centroid[]; // Array of centroids
	rebuilt?: boolean; // Whether centroids were rebuilt (POST only)
	isStale: boolean; // Whether any centroid is stale
	staleReason: string | null; // Reason for staleness (if applicable)
}
```

#### CentroidSuggestion Schema

```typescript
interface CentroidSuggestion {
	faceInstanceId: string; // UUID of suggested face
	assetId: string; // UUID of parent asset
	score: number; // Similarity score (0.0-1.0)
	matchedCentroid: string; // Cluster label of matching centroid
	thumbnailUrl: string; // Face thumbnail URL
}
```

#### CentroidSuggestionsResponse Schema

```typescript
interface CentroidSuggestionsResponse {
	personId: string; // UUID
	centroidsUsed: string[]; // Array of centroid IDs used for search
	suggestions: CentroidSuggestion[]; // Array of suggested faces
	totalFound: number; // Total number of suggestions found
	rebuiltCentroids: boolean; // Whether centroids were rebuilt during request
}
```

#### `POST /api/v1/faces/centroids/persons/{person_id}/compute`

Compute or recompute centroids for a person. By default, creates a single global centroid from all labeled faces. Optionally enable clustering to create multiple centroids for improved representation diversity.

**Path Parameters**

| Parameter   | Type   | Required | Description      |
| ----------- | ------ | -------- | ---------------- |
| `person_id` | string | Yes      | Person ID (UUID) |

**Request Body**

```json
{
	"forceRebuild": false,
	"enableClustering": false,
	"minFaces": 2
}
```

| Field              | Type    | Required | Default | Description                                         |
| ------------------ | ------- | -------- | ------- | --------------------------------------------------- |
| `forceRebuild`     | boolean | No       | false   | Force recomputation even if centroids exist         |
| `enableClustering` | boolean | No       | false   | Create cluster-based centroids (requires ≥10 faces) |
| `minFaces`         | integer | No       | 2       | Minimum number of labeled faces required (1-100)    |

**Response** `200 OK`

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"centroids": [
		{
			"centroidId": "660e8400-e29b-41d4-a716-446655440111",
			"centroidType": "global",
			"clusterLabel": "global",
			"nFaces": 150,
			"modelVersion": "arcface_r100_glint360k_v1",
			"centroidVersion": 2,
			"createdAt": "2026-01-16T10:30:00Z",
			"isStale": false
		}
	],
	"rebuilt": true,
	"isStale": false,
	"staleReason": null
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

**Response** `422 Unprocessable Entity` - Insufficient labeled faces

```json
{
	"error": {
		"code": "INSUFFICIENT_FACES",
		"message": "Person has only 1 labeled face. Minimum 2 required."
	}
}
```

**Notes:**

- Global centroid requires at least `minFaces` labeled faces (default: 2)
- Cluster-based centroids require at least 10 labeled faces
- Automatically marks old centroids as stale when creating new ones
- Uses InsightFace embeddings (512-dimensional vectors)

#### `GET /api/v1/faces/centroids/persons/{person_id}`

Get existing centroids for a person without triggering recomputation.

**Path Parameters**

| Parameter   | Type   | Required | Description      |
| ----------- | ------ | -------- | ---------------- |
| `person_id` | string | Yes      | Person ID (UUID) |

**Query Parameters**

| Parameter      | Type    | Default | Description                        |
| -------------- | ------- | ------- | ---------------------------------- |
| `includeStale` | boolean | false   | Include deprecated/stale centroids |

**Response** `200 OK`

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"centroids": [
		{
			"centroidId": "660e8400-e29b-41d4-a716-446655440111",
			"centroidType": "global",
			"clusterLabel": "global",
			"nFaces": 150,
			"modelVersion": "arcface_r100_glint360k_v1",
			"centroidVersion": 2,
			"createdAt": "2026-01-16T10:30:00Z",
			"isStale": false
		}
	],
	"isStale": false,
	"staleReason": null
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

**Response** `200 OK` - No centroids exist (empty array)

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"centroids": [],
	"isStale": true,
	"staleReason": "No centroids exist for this person"
}
```

#### `POST /api/v1/faces/centroids/persons/{person_id}/suggestions`

Get face suggestions using person centroids. Searches for unassigned faces similar to the person's centroid embeddings. Optionally auto-rebuild stale centroids before searching.

**Path Parameters**

| Parameter   | Type   | Required | Description      |
| ----------- | ------ | -------- | ---------------- |
| `person_id` | string | Yes      | Person ID (UUID) |

**Request Body**

```json
{
	"minSimilarity": 0.65,
	"maxResults": 200,
	"unassignedOnly": true,
	"excludePrototypes": true,
	"autoRebuild": true
}
```

| Field               | Type    | Required | Default | Description                                      |
| ------------------- | ------- | -------- | ------- | ------------------------------------------------ |
| `minSimilarity`     | number  | No       | 0.65    | Minimum cosine similarity threshold (0.3-1.0)    |
| `maxResults`        | integer | No       | 200     | Maximum number of suggestions to return (1-1000) |
| `unassignedOnly`    | boolean | No       | true    | Only return faces not assigned to any person     |
| `excludePrototypes` | boolean | No       | true    | Exclude faces already used as prototypes         |
| `autoRebuild`       | boolean | No       | true    | Auto-rebuild centroids if stale before searching |

**Response** `200 OK`

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"centroidsUsed": ["660e8400-e29b-41d4-a716-446655440111"],
	"suggestions": [
		{
			"faceInstanceId": "770e8400-e29b-41d4-a716-446655440222",
			"assetId": "880e8400-e29b-41d4-a716-446655440333",
			"score": 0.78,
			"matchedCentroid": "global",
			"thumbnailUrl": "/api/v1/faces/770e8400-e29b-41d4-a716-446655440222/thumbnail"
		},
		{
			"faceInstanceId": "990e8400-e29b-41d4-a716-446655440444",
			"assetId": "aa0e8400-e29b-41d4-a716-446655440555",
			"score": 0.73,
			"matchedCentroid": "global",
			"thumbnailUrl": "/api/v1/faces/990e8400-e29b-41d4-a716-446655440444/thumbnail"
		}
	],
	"totalFound": 150,
	"rebuiltCentroids": false
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

**Response** `422 Unprocessable Entity` - No centroids available

```json
{
	"error": {
		"code": "CENTROIDS_NOT_AVAILABLE",
		"message": "No centroids available for person. Compute centroids first."
	}
}
```

**Notes:**

- Returns suggestions sorted by similarity score (highest first)
- If `autoRebuild: true` and centroids are stale, automatically recomputes them
- Uses InsightFace embedding similarity (cosine distance)
- Results limited to `maxResults` parameter

#### `DELETE /api/v1/faces/centroids/persons/{person_id}`

Delete all centroids for a person. Centroids will be rebuilt on next compute or suggestion request. Useful when person's labeled faces have changed significantly.

**Path Parameters**

| Parameter   | Type   | Required | Description      |
| ----------- | ------ | -------- | ---------------- |
| `person_id` | string | Yes      | Person ID (UUID) |

**Response** `200 OK`

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"deletedCount": 2
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

**Response** `200 OK` - No centroids to delete

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000",
	"deletedCount": 0
}
```

**Notes:**

- Does not affect labeled faces or prototypes
- Next compute request will create fresh centroids
- Suggestion requests with `autoRebuild: true` will trigger rebuild
- Deletion is idempotent (safe to call multiple times)

---

### Temporal Prototypes

Manage person prototypes with temporal diversity. Prototypes are exemplar faces representing a person across different age eras. The system supports pinned (user-selected) and automatic prototypes with temporal coverage reporting.

#### Prototype Concepts

**Age Era Buckets**: Photos are categorized into 6 age eras based on estimated age:

- `infant`: 0-3 years
- `child`: 4-12 years
- `teen`: 13-19 years
- `young_adult`: 20-35 years
- `adult`: 36-55 years
- `senior`: 56+ years

**Prototype Roles**: Four role types determine prototype selection:

- `primary`: User-pinned definitive photo (max 3 per person)
- `temporal`: Age-era based exemplar (max 1 per era, auto or pinned)
- `exemplar`: High-quality auto-selected (fills remaining slots)
- `fallback`: Lower quality, fills era gaps when needed

**Pin Quotas**:

- Max 3 PRIMARY pins per person
- Max 1 TEMPORAL pin per era bucket (6 possible eras)
- Total prototype limit: 12 per person

#### Prototype Schema

```typescript
interface Prototype {
	id: string; // UUID
	faceInstanceId: string; // UUID of the face instance
	role: 'primary' | 'temporal' | 'exemplar' | 'fallback'; // Prototype role
	ageEraBucket?: string; // Age era: infant|child|teen|young_adult|adult|senior
	decadeBucket?: string; // Decade: 1990s, 2000s, 2010s, etc.
	isPinned: boolean; // Whether user manually pinned this prototype
	qualityScore: number; // Face quality score (0.0-1.0)
	createdAt: string; // ISO 8601 timestamp
}
```

#### TemporalCoverage Schema

```typescript
interface TemporalCoverage {
	coveredEras: string[]; // Age eras with prototypes
	missingEras: string[]; // Age eras without prototypes
	coveragePercentage: number; // Percentage of eras covered (0-100)
	totalPrototypes: number; // Total number of prototypes
}
```

#### PrototypeListResponse Schema

```typescript
interface PrototypeListResponse {
	items: Prototype[]; // Array of prototypes
	coverage: TemporalCoverage; // Coverage statistics
}
```

#### `POST /api/v1/faces/persons/{personId}/prototypes/pin`

Pin a face as a prototype with optional era assignment.

**Path Parameters**

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `personId` | string | Yes      | Person ID (UUID) |

**Request Body**

```json
{
	"faceInstanceId": "550e8400-e29b-41d4-a716-446655440000",
	"ageEraBucket": "child",
	"role": "temporal",
	"note": "Best childhood photo"
}
```

| Field            | Type   | Required | Description                                              |
| ---------------- | ------ | -------- | -------------------------------------------------------- |
| `faceInstanceId` | string | Yes      | Face instance ID (UUID)                                  |
| `ageEraBucket`   | string | No       | Age era: infant\|child\|teen\|young_adult\|adult\|senior |
| `role`           | string | Yes      | Prototype role: "primary" or "temporal"                  |
| `note`           | string | No       | Optional note about this prototype                       |

**Response** `200 OK`

```json
{
	"prototypeId": "660e8400-e29b-41d4-a716-446655440111",
	"role": "temporal",
	"ageEraBucket": "child",
	"isPinned": true,
	"createdAt": "2025-12-29T10:00:00Z"
}
```

**Response** `400 Bad Request` - Pin quota exceeded

```json
{
	"error": {
		"code": "PROTOTYPE_QUOTA_EXCEEDED",
		"message": "Maximum 3 PRIMARY prototypes allowed per person"
	}
}
```

or

```json
{
	"error": {
		"code": "TEMPORAL_QUOTA_EXCEEDED",
		"message": "Only 1 TEMPORAL prototype allowed per age era"
	}
}
```

**Response** `400 Bad Request` - Face does not belong to person

```json
{
	"error": {
		"code": "FACE_PERSON_MISMATCH",
		"message": "Face does not belong to the specified person"
	}
}
```

**Response** `404 Not Found` - Person or face not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

#### `DELETE /api/v1/faces/persons/{personId}/prototypes/{prototypeId}/pin`

Unpin a prototype. The slot may be filled automatically by the system.

**Path Parameters**

| Parameter     | Type   | Required | Description         |
| ------------- | ------ | -------- | ------------------- |
| `personId`    | string | Yes      | Person ID (UUID)    |
| `prototypeId` | string | Yes      | Prototype ID (UUID) |

**Response** `200 OK`

```json
{
	"success": true
}
```

**Response** `404 Not Found` - Prototype not found

```json
{
	"error": {
		"code": "PROTOTYPE_NOT_FOUND",
		"message": "Prototype with ID '660e8400-...' not found"
	}
}
```

#### `GET /api/v1/faces/persons/{personId}/prototypes`

List all prototypes for a person with temporal breakdown and coverage statistics.

**Path Parameters**

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `personId` | string | Yes      | Person ID (UUID) |

**Response** `200 OK`

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
			"createdAt": "2025-12-29T10:00:00Z"
		},
		{
			"id": "770e8400-e29b-41d4-a716-446655440222",
			"faceInstanceId": "660e8400-e29b-41d4-a716-446655440111",
			"role": "temporal",
			"ageEraBucket": "teen",
			"decadeBucket": "2010s",
			"isPinned": false,
			"qualityScore": 0.88,
			"createdAt": "2025-12-29T10:05:00Z"
		}
	],
	"coverage": {
		"coveredEras": ["child", "teen", "young_adult", "adult"],
		"missingEras": ["infant", "senior"],
		"coveragePercentage": 66.7,
		"totalPrototypes": 8
	}
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

#### `GET /api/v1/faces/persons/{personId}/temporal-coverage`

Get detailed temporal coverage report for a person.

**Path Parameters**

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `personId` | string | Yes      | Person ID (UUID) |

**Response** `200 OK`

```json
{
	"coveredEras": ["child", "teen", "young_adult", "adult"],
	"missingEras": ["infant", "senior"],
	"coveragePercentage": 66.7,
	"totalPrototypes": 8
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

#### `POST /api/v1/faces/persons/{personId}/prototypes/recompute`

Trigger temporal re-diversification of prototypes. This recomputes automatic prototypes while optionally preserving user-pinned selections.

**Path Parameters**

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `personId` | string | Yes      | Person ID (UUID) |

**Request Body**

```json
{
	"preservePins": true
}
```

| Field          | Type    | Required | Description                                                 |
| -------------- | ------- | -------- | ----------------------------------------------------------- |
| `preservePins` | boolean | No       | Keep pinned prototypes during recomputation (default: true) |

**Response** `200 OK`

```json
{
	"prototypesCreated": 3,
	"prototypesRemoved": 1,
	"coverage": {
		"coveredEras": ["infant", "child", "adult"],
		"missingEras": ["teen", "young_adult", "senior"],
		"coveragePercentage": 50.0,
		"totalPrototypes": 8
	}
}
```

**Response** `404 Not Found` - Person not found

```json
{
	"error": {
		"code": "PERSON_NOT_FOUND",
		"message": "Person with ID '550e8400-...' not found"
	}
}
```

---

### Configuration

Application configuration management for user preferences and system settings.

#### UnknownFaceClusteringConfig Schema

```typescript
interface UnknownFaceClusteringConfig {
	minConfidence: number; // Minimum intra-cluster confidence threshold (0.0-1.0)
	minClusterSize: number; // Minimum number of faces per cluster (1-100)
}
```

#### `GET /api/v1/config/face-clustering-unknown`

Get current configuration for unknown face clustering filtering.

**Response** `200 OK`

```json
{
	"minConfidence": 0.85,
	"minClusterSize": 5
}
```

**Response Fields**:

- `minConfidence` (number): Minimum intra-cluster confidence threshold (0.0-1.0). Only clusters with average pairwise similarity above this value are displayed in the Unknown Faces view.
- `minClusterSize` (number): Minimum number of faces required per cluster (1-100). Clusters with fewer faces are filtered out.

**Default Values**:

- `minConfidence`: 0.85 (85% similarity)
- `minClusterSize`: 5 faces

#### `PUT /api/v1/config/face-clustering-unknown`

Update configuration for unknown face clustering filtering.

**Request Body**

```json
{
	"minConfidence": 0.9,
	"minClusterSize": 10
}
```

**Request Fields**:

- `minConfidence` (number, required): Minimum confidence threshold (0.0-1.0)
- `minClusterSize` (number, required): Minimum cluster size (1-100)

**Response** `200 OK`

Returns updated configuration (same schema as GET).

```json
{
	"minConfidence": 0.9,
	"minClusterSize": 10
}
```

**Response** `422 Unprocessable Entity`

Validation error if values are out of range.

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "minConfidence must be between 0.0 and 1.0"
	}
}
```

or

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "minClusterSize must be between 1 and 100"
	}
}
```

---

### Jobs

Background job management for long-running operations.

#### Job Schema

```typescript
interface Job {
	id: string; // UUID
	type: JobType; // Job type enum
	status: JobStatus; // Current status
	progress?: {
		current: number; // Items processed
		total: number; // Total items
		percentage: number; // 0-100
	};
	result?: unknown; // Job-specific result data
	error?: string; // Error message if failed
	createdAt: string; // ISO 8601
	startedAt?: string; // When processing began
	completedAt?: string; // When finished (success or failure)
}

type JobType =
	| 'SCAN' // Directory scan
	| 'EMBED' // Generate embeddings
	| 'FACE_DETECT' // Detect faces
	| 'FACE_CLUSTER' // Cluster faces into people
	| 'THUMBNAIL'; // Generate thumbnails

type JobStatus =
	| 'PENDING' // Queued, not started
	| 'RUNNING' // In progress
	| 'COMPLETED' // Finished successfully
	| 'FAILED' // Finished with error
	| 'CANCELLED'; // User cancelled
```

#### `GET /api/v1/jobs`

List jobs with optional filters.

**Query Parameters**

| Parameter  | Type    | Default | Description        |
| ---------- | ------- | ------- | ------------------ |
| `page`     | integer | 1       | Page number        |
| `pageSize` | integer | 20      | Items per page     |
| `type`     | string  | -       | Filter by job type |
| `status`   | string  | -       | Filter by status   |

**Response** `200 OK` - `PaginatedResponse<Job>`

#### `GET /api/v1/jobs/{id}`

Get job details.

**Response** `200 OK` - Job object

#### `POST /api/v1/jobs/{id}/cancel`

Cancel a pending or running job.

**Response** `200 OK`

```json
{
	"id": "job-123",
	"status": "CANCELLED"
}
```

**Response** `409 Conflict` - Job already completed

```json
{
	"error": {
		"code": "JOB_NOT_CANCELLABLE",
		"message": "Job is already completed"
	}
}
```

---

### Job Progress

Real-time progress monitoring for background jobs using Server-Sent Events (SSE) or polling. Used for long-running operations like face suggestion discovery.

#### JobProgress Schema

```typescript
interface JobProgress {
	phase: string; // Current phase: selecting, searching, creating, completed, failed
	current: number; // Items processed in current phase
	total: number; // Total items in current phase
	message: string; // Human-readable status message
	timestamp: string; // ISO 8601 timestamp
	// Additional fields when phase is "completed"
	suggestionsCreated?: number; // Number of new suggestions created
	prototypesUsed?: number; // Number of prototypes used
	candidatesFound?: number; // Number of candidate faces found
	duplicatesSkipped?: number; // Number of duplicate suggestions skipped
	error?: string; // Error message if phase is "failed"
}
```

#### `GET /api/v1/job-progress/events`

Stream real-time progress updates for a background job via Server-Sent Events (SSE). The connection remains open until the job completes or fails.

**Query Parameters**

| Parameter      | Type   | Required | Description                             |
| -------------- | ------ | -------- | --------------------------------------- |
| `progress_key` | string | Yes      | Progress key from job creation response |

**Response** - Server-Sent Events stream

```
event: progress
data: {"phase":"searching","current":25,"total":50,"message":"Processing prototype 25/50","timestamp":"2026-01-10T15:30:00Z"}

event: progress
data: {"phase":"creating","current":42,"total":50,"message":"Creating suggestions...","timestamp":"2026-01-10T15:30:15Z"}

event: complete
data: {"phase":"completed","current":50,"total":50,"message":"Found 42 new suggestions","suggestionsCreated":42,"prototypesUsed":50,"candidatesFound":156,"duplicatesSkipped":114,"timestamp":"2026-01-10T15:30:20Z"}
```

**Event Types:**

| Event      | Description                                    |
| ---------- | ---------------------------------------------- |
| `progress` | Periodic progress updates during job execution |
| `complete` | Final result when job finishes successfully    |
| `error`    | Error message if job fails                     |

**Response Headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Response** `404 Not Found` - Job not found or expired

```json
{
	"detail": "Job not found or expired"
}
```

**Notes:**

- Connection automatically closes when job completes or fails
- Progress updates sent approximately every 1 second
- Connection timeout: 10 minutes (600 seconds)
- Job data expires from Redis after 1 hour

#### `GET /api/v1/job-progress/status`

Get current status of a background job without streaming (polling alternative to SSE).

**Query Parameters**

| Parameter      | Type   | Required | Description                             |
| -------------- | ------ | -------- | --------------------------------------- |
| `progress_key` | string | Yes      | Progress key from job creation response |

**Response** `200 OK`

```json
{
	"phase": "searching",
	"current": 25,
	"total": 50,
	"message": "Processing prototype 25/50",
	"timestamp": "2026-01-10T15:30:00Z"
}
```

When job completes:

```json
{
	"phase": "completed",
	"current": 50,
	"total": 50,
	"message": "Found 42 new suggestions",
	"timestamp": "2026-01-10T15:30:20Z",
	"suggestionsCreated": 42,
	"prototypesUsed": 50,
	"candidatesFound": 156,
	"duplicatesSkipped": 114
}
```

When job fails:

```json
{
	"phase": "failed",
	"current": 15,
	"total": 50,
	"message": "Job failed",
	"timestamp": "2026-01-10T15:30:10Z",
	"error": "Database connection lost"
}
```

**Response** `404 Not Found` - Job not found or expired

```json
{
	"detail": "Job not found or expired"
}
```

**Notes:**

- Use SSE endpoint (`/events`) for real-time updates when possible
- Use this endpoint for polling when SSE connection limit is reached (browsers limit ~6 SSE connections per domain)
- Recommended polling interval: 2 seconds
- Job data expires from Redis after 1 hour

---

### Training Sessions

Training session management for CLIP embedding generation and face detection workflows.

#### Get Unified Training Progress

Get combined progress across all training phases (training, face detection, clustering).

**Endpoint**: `GET /api/v1/training/sessions/{sessionId}/progress-unified`

**Path Parameters**:

- `sessionId` (integer): Training session ID

**Response** (200 OK):

```json
{
	"sessionId": 123,
	"overallStatus": "running",
	"overallProgress": {
		"percentage": 62.5,
		"etaSeconds": 180,
		"currentPhase": "face_detection"
	},
	"phases": {
		"training": {
			"name": "training",
			"status": "completed",
			"progress": {
				"current": 1000,
				"total": 1000,
				"percentage": 100.0
			},
			"startedAt": "2026-01-12T10:00:00Z",
			"completedAt": "2026-01-12T10:00:30Z"
		},
		"faceDetection": {
			"name": "face_detection",
			"status": "processing",
			"progress": {
				"current": 500,
				"total": 1000,
				"percentage": 50.0
			},
			"startedAt": "2026-01-12T10:00:35Z",
			"completedAt": null
		},
		"clustering": {
			"name": "clustering",
			"status": "pending",
			"progress": {
				"current": 0,
				"total": 1,
				"percentage": 0.0
			}
		}
	}
}
```

**Progress Weights**:

- Training (CLIP embeddings): 30%
- Face Detection (InsightFace): 65%
- Clustering (HDBSCAN): 5%

**Overall Status Values**:

- `pending`: No phases started
- `running`: At least one phase is running
- `completed`: All phases completed successfully
- `failed`: At least one phase failed
- `paused`: Training was paused

**Current Phase Values**:

- `training`: Phase 1 (CLIP embedding generation) in progress
- `face_detection`: Phase 2 (face detection) in progress or pending
- `clustering`: Phase 3 (clustering) in progress
- `completed`: All phases finished

**Response** (404 Not Found): Session not found

---

### Corrections

User feedback for improving search quality. **This is a future feature placeholder.**

#### Correction Schema

```typescript
interface Correction {
	id: string; // UUID
	type: CorrectionType;
	assetId: string; // Related asset
	data: unknown; // Type-specific correction data
	status: 'PENDING' | 'APPLIED' | 'REJECTED';
	createdAt: string; // ISO 8601
}

type CorrectionType =
	| 'FACE_IDENTITY' // Wrong person assigned to face
	| 'SEARCH_RELEVANCE' // Search result was not relevant
	| 'METADATA'; // Incorrect metadata
```

#### `POST /api/v1/corrections`

Submit a correction.

**Request Body**

```json
{
	"type": "FACE_IDENTITY",
	"assetId": "asset-123",
	"data": {
		"faceId": "face-456",
		"incorrectPersonId": "person-789",
		"correctPersonId": "person-012"
	}
}
```

**Response** `201 Created` - Correction object

#### `GET /api/v1/corrections`

List submitted corrections (admin).

**Response** `200 OK` - `PaginatedResponse<Correction>`

---

### Queue Monitoring

Read-only endpoints for monitoring RQ queue status, jobs, and worker health.

#### `GET /api/v1/queues`

Get overview of all queues with job counts and worker status.

**Response** `200 OK`

```json
{
	"queues": [
		{
			"name": "training-high",
			"count": 5,
			"isEmpty": false,
			"startedCount": 1,
			"failedCount": 0,
			"finishedCount": 100,
			"scheduledCount": 0
		},
		{
			"name": "training-normal",
			"count": 12,
			"isEmpty": false,
			"startedCount": 0,
			"failedCount": 2,
			"finishedCount": 50,
			"scheduledCount": 0
		}
	],
	"totalJobs": 17,
	"totalWorkers": 1,
	"workersBusy": 1,
	"redisConnected": true
}
```

**Notes:**

- Returns `redisConnected: false` with empty data if Redis is unavailable
- Queue names: `training-high`, `training-normal`, `training-low`, `default`

#### `GET /api/v1/queues/{queue_name}`

Get detailed information for a specific queue with paginated job list.

**Path Parameters**

| Parameter    | Type   | Description                                                        |
| ------------ | ------ | ------------------------------------------------------------------ |
| `queue_name` | string | Queue name (training-high, training-normal, training-low, default) |

**Query Parameters**

| Parameter  | Type    | Default | Description               |
| ---------- | ------- | ------- | ------------------------- |
| `page`     | integer | 1       | Page number (1-indexed)   |
| `pageSize` | integer | 50      | Items per page (max: 100) |

**Response** `200 OK`

```json
{
	"name": "training-normal",
	"count": 12,
	"isEmpty": false,
	"jobs": [
		{
			"id": "abc-123-def",
			"funcName": "image_search_service.queue.jobs.train_session",
			"status": "queued",
			"queueName": "training-normal",
			"args": ["session-uuid"],
			"kwargs": {},
			"createdAt": "2025-12-30T10:00:00Z",
			"enqueuedAt": "2025-12-30T10:00:01Z",
			"startedAt": null,
			"endedAt": null,
			"timeout": 86400,
			"result": null,
			"errorMessage": null,
			"workerName": null
		}
	],
	"startedJobs": [],
	"failedJobs": [],
	"page": 1,
	"pageSize": 50,
	"hasMore": false
}
```

**Response** `404 Not Found`

```json
{
	"detail": {
		"code": "QUEUE_NOT_FOUND",
		"message": "Queue 'invalid-name' not found. Valid queues: training-high, training-normal, training-low, default"
	}
}
```

#### `GET /api/v1/jobs/{job_id}`

Get detailed information for a specific RQ job.

**Path Parameters**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `job_id`  | string | RQ job ID   |

**Response** `200 OK`

```json
{
	"id": "abc-123-def",
	"funcName": "image_search_service.queue.jobs.train_session",
	"status": "finished",
	"queueName": "training-normal",
	"args": ["session-uuid"],
	"kwargs": {},
	"createdAt": "2025-12-30T10:00:00Z",
	"enqueuedAt": "2025-12-30T10:00:01Z",
	"startedAt": "2025-12-30T10:00:05Z",
	"endedAt": "2025-12-30T10:05:00Z",
	"timeout": 86400,
	"result": "{'processed': 100, 'failed': 0}",
	"errorMessage": null,
	"workerName": "worker-1",
	"excInfo": null,
	"meta": {},
	"retryCount": 0,
	"origin": "training-normal"
}
```

**Response** `404 Not Found`

```json
{
	"detail": {
		"code": "JOB_NOT_FOUND",
		"message": "Job 'nonexistent-id' not found"
	}
}
```

#### `GET /api/v1/workers`

Get information about all RQ workers.

**Response** `200 OK`

```json
{
	"workers": [
		{
			"name": "worker-1.12345",
			"state": "busy",
			"queues": ["training-high", "training-normal", "training-low", "default"],
			"currentJob": {
				"jobId": "abc-123-def",
				"funcName": "image_search_service.queue.jobs.train_session",
				"startedAt": "2025-12-30T10:00:05Z"
			},
			"successfulJobCount": 150,
			"failedJobCount": 2,
			"totalWorkingTime": 7200.5,
			"birthDate": "2025-12-30T08:00:00Z",
			"lastHeartbeat": "2025-12-30T10:00:10Z",
			"pid": 12345,
			"hostname": "worker-host"
		}
	],
	"total": 1,
	"active": 1,
	"idle": 0
}
```

**Worker States:**

- `idle` - Worker is waiting for jobs
- `busy` - Worker is processing a job
- `suspended` - Worker is paused

---

## Pagination

All list endpoints use consistent pagination.

### Request Parameters

| Parameter  | Type    | Default | Max | Description           |
| ---------- | ------- | ------- | --- | --------------------- |
| `page`     | integer | 1       | -   | 1-indexed page number |
| `pageSize` | integer | 20      | 100 | Items per page        |

### Response Structure

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 247,
    "totalPages": 13
  }
}
```

### Edge Cases

- `page` > `totalPages`: Returns empty `data` array, valid pagination meta
- `page` < 1: Treated as `page=1`
- `pageSize` < 1: Treated as `pageSize=1`
- `pageSize` > 100: Clamped to 100

---

## Error Handling

All errors return JSON with consistent structure.

### Error Response Shape

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": { ... }
  }
}
```

### Error Codes

| Code                          | HTTP Status | Description                              |
| ----------------------------- | ----------- | ---------------------------------------- |
| `VALIDATION_ERROR`            | 400         | Invalid request parameters               |
| `ASSET_NOT_FOUND`             | 404         | Asset ID does not exist                  |
| `CATEGORY_NOT_FOUND`          | 404         | Category ID does not exist               |
| `PERSON_NOT_FOUND`            | 404         | Person ID does not exist                 |
| `FACE_NOT_FOUND`              | 404         | Face ID does not exist                   |
| `FACE_NOT_ASSIGNED`           | 400         | Face is not assigned to any person       |
| `JOB_NOT_FOUND`               | 404         | Job ID does not exist                    |
| `QUEUE_NOT_FOUND`             | 404         | Queue name does not exist                |
| `SUGGESTION_NOT_FOUND`        | 404         | Suggestion ID does not exist             |
| `PROTOTYPE_NOT_FOUND`         | 404         | Prototype ID does not exist              |
| `CATEGORY_NAME_EXISTS`        | 409         | Category name already exists             |
| `PERSON_NAME_EXISTS`          | 409         | Person name already exists               |
| `CATEGORY_HAS_SESSIONS`       | 409         | Category has training sessions           |
| `CATEGORY_IS_DEFAULT`         | 400         | Cannot delete default category           |
| `JOB_NOT_CANCELLABLE`         | 409         | Job already completed                    |
| `MERGE_CONFLICT`              | 409         | Cannot merge (e.g., same person)         |
| `SUGGESTION_ALREADY_REVIEWED` | 409         | Suggestion already accepted/rejected     |
| `PROTOTYPE_QUOTA_EXCEEDED`    | 400         | Maximum PRIMARY prototypes exceeded      |
| `TEMPORAL_QUOTA_EXCEEDED`     | 400         | Era already has TEMPORAL prototype       |
| `FACE_PERSON_MISMATCH`        | 400         | Face does not belong to person           |
| `INSUFFICIENT_FACES`          | 422         | Insufficient labeled faces for operation |
| `CENTROIDS_NOT_AVAILABLE`     | 422         | No centroids available for person        |
| `RATE_LIMITED`                | 429         | Too many requests                        |
| `INTERNAL_ERROR`              | 500         | Server error                             |

---

## Status Codes

| Code                        | Usage                                     |
| --------------------------- | ----------------------------------------- |
| `200 OK`                    | Successful GET, PATCH, POST (for actions) |
| `201 Created`               | Successful POST (for resource creation)   |
| `202 Accepted`              | Job queued for async processing           |
| `204 No Content`            | Successful DELETE                         |
| `400 Bad Request`           | Validation error                          |
| `404 Not Found`             | Resource not found                        |
| `409 Conflict`              | State conflict (e.g., job already done)   |
| `429 Too Many Requests`     | Rate limited                              |
| `500 Internal Server Error` | Unexpected server error                   |

---

## CORS Configuration

### Development

During development, the backend allows:

```python
# FastAPI CORS middleware config
origins = [
    "http://localhost:5173",   # SvelteKit dev server
    "http://localhost:4173",   # SvelteKit preview
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
]
```

**Note**: Credentials are allowed for future cookie-based sessions.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Production

Production CORS will be configured via environment variable:

```bash
CORS_ORIGINS=https://app.image-search.example.com
```

---

## Authentication (Future)

**Not implemented in v1.0.0. This section documents the planned approach.**

### Strategy

Single API key in header. No OAuth, no sessions, no cookies.

### Header

```
Authorization: Bearer <api-key>
```

### Implementation Plan

1. Optional in development (when `AUTH_REQUIRED=false`)
2. Required in production
3. Keys stored in database with scopes
4. Rate limiting per key

### Endpoints Requiring Auth (Future)

All endpoints except:

- `GET /health`
- `GET /openapi.json`

---

## Changelog

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.17.0  | 2026-01-16 | Added Face Centroids section with 4 new endpoints: POST /api/v1/faces/centroids/persons/{person_id}/compute (compute/recompute centroids with optional clustering), GET /api/v1/faces/centroids/persons/{person_id} (retrieve existing centroids), POST /api/v1/faces/centroids/persons/{person_id}/suggestions (get face suggestions using centroid similarity), DELETE /api/v1/faces/centroids/persons/{person_id} (delete all centroids for person). Added Centroid, PersonCentroidsResponse, CentroidSuggestion, and CentroidSuggestionsResponse schemas. Added INSUFFICIENT_FACES and CENTROIDS_NOT_AVAILABLE error codes (HTTP 422). Centroids provide efficient face suggestion generation by computing average embeddings of labeled faces, supporting both global (all faces) and cluster-based (subdivided) representations. |
| 1.16.0  | 2026-01-14 | Added optional `minConfidence` field to POST /api/v1/faces/suggestions/persons/{person_id}/find-more endpoint. Allows customizing similarity threshold (0.3-1.0) for finding suggestions. Uses system default (0.70) when not provided.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1.15.0  | 2026-01-10 | Added "Find More Suggestions" feature with dynamic prototype sampling. Added POST /api/v1/faces/suggestions/persons/{person_id}/find-more endpoint to start background job finding additional suggestions using random face sampling. Added Job Progress section with GET /api/v1/job-progress/events (SSE streaming) and GET /api/v1/job-progress/status (polling) endpoints for real-time job progress monitoring. Enhanced POST /api/v1/faces/suggestions/bulk-action with optional `autoFindMore` and `findMorePrototypeCount` fields to auto-trigger find-more jobs after accepting suggestions. Response includes optional `findMoreJobs` array with job IDs and progress keys. Added JobProgress schema for progress tracking.                                                                                                  |
| 1.14.0  | 2026-01-09 | Added `path` field to FaceSuggestion schema exposing the original filesystem path of the image asset.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 1.13.0  | 2026-01-09 | Added `path` field to PersonPhotoGroup schema exposing the original filesystem path of the image asset.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1.12.0  | 2026-01-09 | Added birth date feature: Added `birthDate` field (ISO 8601 date, YYYY-MM-DD, nullable) to Person schema. Added PATCH /api/v1/faces/persons/{personId} endpoint for updating person name and/or birth date. Added `personAgeAtPhoto` field (nullable integer) to Face schema for displaying calculated age when photo was taken. Updated GET /api/v1/faces/persons/{personId} response to include birthDate field.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 1.11.0  | 2026-01-09 | Added EXIF metadata fields to Asset schema: `takenAt` (ISO 8601 datetime from EXIF DateTimeOriginal), `camera` (object with `make` and `model` strings), and `location` (object with `lat` and `lng` decimal degree coordinates). Introduced `LocationMetadata` and `CameraMetadata` interfaces. All new fields are optional/nullable to support images without EXIF data.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 1.10.0  | 2026-01-07 | Added GET /api/v1/faces/persons/{personId} endpoint to retrieve a single person by ID with detailed information including faceCount, photoCount, and thumbnailUrl fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 1.9.0   | 2025-12-31 | Added batch thumbnail endpoint POST /api/v1/images/thumbnails/batch for fetching multiple thumbnails in a single request with base64-encoded data URIs. Supports up to 100 asset IDs per request with validation error responses.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 1.8.0   | 2025-12-30 | Added Face Clusters section with GET /api/v1/faces/clusters endpoint supporting optional filtering by min_confidence and min_cluster_size query parameters. Enhanced ClusterSummary schema with clusterConfidence (average pairwise similarity) and representativeFaceId (highest quality face) fields. Added Configuration section with GET /api/v1/config/face-clustering-unknown and PUT /api/v1/config/face-clustering-unknown endpoints for managing unknown face clustering display settings.                                                                                                                                                                                                                                                                                                                                    |
| 1.7.0   | 2025-12-30 | Added Queue Monitoring section with 3 new endpoints: GET /api/v1/queues (overview), GET /api/v1/queues/{queue_name} (queue details), GET /api/v1/jobs/{job_id} (job details), GET /api/v1/workers (worker information). Added QUEUE_NOT_FOUND error code. Read-only endpoints for monitoring RQ queue status, jobs, and worker health.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1.6.0   | 2025-12-29 | Added Temporal Prototypes section with 5 new endpoints: POST /api/v1/faces/persons/{personId}/prototypes/pin (pin prototype), DELETE /api/v1/faces/persons/{personId}/prototypes/{prototypeId}/pin (unpin), GET /api/v1/faces/persons/{personId}/prototypes (list), GET /api/v1/faces/persons/{personId}/temporal-coverage (coverage report), POST /api/v1/faces/persons/{personId}/prototypes/recompute (recompute). Added Prototype, TemporalCoverage, and PrototypeListResponse schemas. Added PROTOTYPE_NOT_FOUND, PROTOTYPE_QUOTA_EXCEEDED, TEMPORAL_QUOTA_EXCEEDED, and FACE_PERSON_MISMATCH error codes. Documented age era buckets (infant, child, teen, young_adult, adult, senior) and prototype roles (primary, temporal, exemplar, fallback).                                                                              |
| 1.5.0   | 2025-12-28 | Enhanced FaceSuggestion schema with bounding box data: added fullImageUrl, bboxX, bboxY, bboxW, bboxH, detectionConfidence, qualityScore fields for face overlay display support.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 1.4.0   | 2025-12-26 | Added face unassignment endpoint: DELETE /api/v1/faces/faces/{faceId}/person. Added FACE_NOT_ASSIGNED error code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 1.3.0   | 2025-12-25 | Added Face Suggestions endpoints: GET /api/v1/faces/suggestions (list), GET /api/v1/faces/suggestions/stats (statistics), GET /api/v1/faces/suggestions/{id} (single), POST /api/v1/faces/suggestions/{id}/accept, POST /api/v1/faces/suggestions/{id}/reject, POST /api/v1/faces/suggestions/bulk-action. Added SUGGESTION_NOT_FOUND and SUGGESTION_ALREADY_REVIEWED error codes.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 1.2.0   | 2024-12-24 | Added person creation endpoint (POST /api/v1/faces/persons), face assignment endpoint (POST /api/v1/faces/faces/{faceId}/assign), and status field to Person schema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 1.1.0   | 2024-12-19 | Added Categories CRUD endpoints, categoryId filter in search, categoryId in training sessions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 1.0.0   | 2024-12-19 | Initial contract freeze                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

_This contract is the source of truth. UI and service implementations must conform to these definitions._
