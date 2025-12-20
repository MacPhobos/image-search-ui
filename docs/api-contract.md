# Image Search API Contract

> **Version**: 1.1.0
> **Last Updated**: 2024-12-19
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
   - [Jobs](#jobs)
   - [Corrections](#corrections)
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

| Field         | Type   | Required | Description                     |
| ------------- | ------ | -------- | ------------------------------- |
| `name`        | string | Yes      | Category name (max 100 chars)   |
| `description` | string | No       | Category description            |
| `color`       | string | No       | Hex color code (e.g., #10B981)  |

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
	metadata?: {
		camera?: string;
		dateTaken?: string;
		location?: {
			latitude: number;
			longitude: number;
		};
	};
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
			"metadata": {
				"camera": "iPhone 15 Pro",
				"dateTaken": "2024-12-15T14:22:00Z",
				"location": {
					"latitude": 25.7617,
					"longitude": -80.1918
				}
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

---

### Search

Vector similarity search across indexed assets.

#### `GET /api/v1/search`

Search assets by text query (semantic search).

**Query Parameters**

| Parameter  | Type    | Default    | Description                        |
| ---------- | ------- | ---------- | ---------------------------------- |
| `q`        | string  | _required_ | Search query text                  |
| `page`     | integer | 1          | Page number                        |
| `pageSize` | integer | 20         | Results per page (max: 100)        |
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
	name: string; // Display name (may be "Unknown" initially)
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

Update person (e.g., rename).

**Request Body**

```json
{
	"name": "John Smith"
}
```

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

#### `POST /api/v1/faces/{faceId}/assign`

Assign a face to a person.

**Request Body**

```json
{
	"personId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** `200 OK` - Updated Face object

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

| Code                     | HTTP Status | Description                          |
| ------------------------ | ----------- | ------------------------------------ |
| `VALIDATION_ERROR`       | 400         | Invalid request parameters           |
| `ASSET_NOT_FOUND`        | 404         | Asset ID does not exist              |
| `CATEGORY_NOT_FOUND`     | 404         | Category ID does not exist           |
| `PERSON_NOT_FOUND`       | 404         | Person ID does not exist             |
| `FACE_NOT_FOUND`         | 404         | Face ID does not exist               |
| `JOB_NOT_FOUND`          | 404         | Job ID does not exist                |
| `CATEGORY_NAME_EXISTS`   | 409         | Category name already exists         |
| `CATEGORY_HAS_SESSIONS`  | 409         | Category has training sessions       |
| `CATEGORY_IS_DEFAULT`    | 400         | Cannot delete default category       |
| `JOB_NOT_CANCELLABLE`    | 409         | Job already completed                |
| `MERGE_CONFLICT`         | 409         | Cannot merge (e.g., same person)     |
| `RATE_LIMITED`           | 429         | Too many requests                    |
| `INTERNAL_ERROR`         | 500         | Server error                         |

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

| Version | Date       | Changes                                                                                      |
| ------- | ---------- | -------------------------------------------------------------------------------------------- |
| 1.1.0   | 2024-12-19 | Added Categories CRUD endpoints, categoryId filter in search, categoryId in training sessions |
| 1.0.0   | 2024-12-19 | Initial contract freeze                                                                      |

---

_This contract is the source of truth. UI and service implementations must conform to these definitions._
