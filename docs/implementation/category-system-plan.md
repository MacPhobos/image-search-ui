# Image Category System Implementation Plan

**Created**: 2024-12-19
**Status**: Approved - Pending Implementation
**Scope**: image-search-service (backend) + image-search-ui (frontend)

## Overview

Add an image category system to organize training sessions and enable filtered search results. Categories provide logical grouping for different image collections (e.g., "Family", "Vacation", "Work").

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Required vs Optional | **Required** | Users must select a category when creating training sessions |
| Default Category Name | **"General"** | Pre-created default category for initial use |
| Category Deletion | **Prevent if has sessions** | Return 409 error; user must reassign sessions first |
| UI Access | **Dedicated page + inline** | /categories page for full CRUD, plus "Create New" in dropdowns |

---

## Phase 1: Backend Database Changes

### 1.1 Create Category Model

**File**: `image-search-service/src/image_search_service/db/models.py`

```python
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)  # Hex color
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    training_sessions: Mapped[list["TrainingSession"]] = relationship(back_populates="category")
```

### 1.2 Update TrainingSession Model

**File**: `image-search-service/src/image_search_service/db/models.py`

Add foreign key to existing TrainingSession:
```python
category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
category: Mapped["Category"] = relationship(back_populates="training_sessions")
```

### 1.3 Create Migration

**File**: `image-search-service/src/image_search_service/db/migrations/versions/007_create_categories.py`

- Create `categories` table
- Insert default "General" category with `is_default=true`
- Add `category_id` column to `training_sessions`
- Assign existing sessions to "General" category
- Add foreign key constraint

---

## Phase 2: Backend API

### 2.1 Category Schemas

**New File**: `image-search-service/src/image_search_service/api/category_schemas.py`

```python
class CategoryCreate(BaseModel):
    name: str = Field(max_length=100)
    description: str | None = None
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")

class CategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = None
    color: str | None = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None
    color: str | None
    is_default: bool = Field(alias="isDefault")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    session_count: int | None = Field(None, alias="sessionCount")
```

### 2.2 Category Routes

**New File**: `image-search-service/src/image_search_service/api/routes/categories.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/categories` | GET | List all categories (paginated) |
| `/api/v1/categories` | POST | Create new category |
| `/api/v1/categories/{id}` | GET | Get category with session count |
| `/api/v1/categories/{id}` | PATCH | Update category |
| `/api/v1/categories/{id}` | DELETE | Delete category (409 if has sessions) |

### 2.3 Update Training Schemas

**File**: `image-search-service/src/image_search_service/api/training_schemas.py`

```python
class TrainingSessionCreate(BaseModel):
    # ... existing fields ...
    category_id: int = Field(alias="categoryId")  # Now required

class TrainingSessionResponse(BaseModel):
    # ... existing fields ...
    category_id: int = Field(alias="categoryId")
    category: CategoryResponse | None = None  # Optional embedded
```

### 2.4 Update Search Schema

**File**: `image-search-service/src/image_search_service/api/schemas.py`

```python
class SearchFilters(BaseModel):
    from_date: datetime | None = Field(None, alias="dateFrom")
    to_date: datetime | None = Field(None, alias="dateTo")
    category_id: int | None = Field(None, alias="categoryId")  # NEW
```

### 2.5 Update Qdrant Integration

**File**: `image-search-service/src/image_search_service/vector/qdrant.py`

- Store `category_id` in Qdrant payload during training
- Filter by `category_id` in `search_vectors()` function

### 2.6 Register Routes

**File**: `image-search-service/src/image_search_service/api/routes/__init__.py`

```python
from .categories import router as categories_router
api_v1_router.include_router(categories_router)
```

---

## Phase 3: API Contract Update

**Files**:
- `image-search-service/docs/api-contract.md`
- `image-search-ui/docs/api-contract.md`

Add Category section with:
- Category schema definition
- All CRUD endpoints
- Updated TrainingSessionCreate (categoryId required)
- Updated SearchRequest filters (categoryId optional)

Bump version to **1.1.0**.

---

## Phase 4: Frontend Implementation

### 4.1 Generate Types

After backend deployment:
```bash
cd image-search-ui && npm run gen:api
```

### 4.2 API Client

**New File**: `image-search-ui/src/lib/api/categories.ts`

```typescript
export async function listCategories(page?, pageSize?): Promise<PaginatedResponse<Category>>
export async function createCategory(data: CategoryCreate): Promise<Category>
export async function getCategory(id: number): Promise<Category>
export async function updateCategory(id: number, data: CategoryUpdate): Promise<Category>
export async function deleteCategory(id: number): Promise<void>
```

### 4.3 Components

**New Files**:
- `src/lib/components/CategorySelector.svelte` - Dropdown with "Create New" option
- `src/lib/components/CategoryBadge.svelte` - Color badge for display
- `src/lib/components/CategoryCreateModal.svelte` - Inline creation modal

### 4.4 Update Existing Components

**File**: `src/lib/components/training/CreateSessionModal.svelte`
- Add CategorySelector (required field)
- Validation: cannot proceed without category selection

**File**: `src/lib/components/FiltersPanel.svelte`
- Add category dropdown filter
- Load categories on mount
- Include categoryId in filter object

### 4.5 Category Management Page

**New File**: `src/routes/categories/+page.svelte`
- List all categories with session counts
- Create/Edit/Delete actions
- Prevent deletion of categories with sessions (show error)
- Prevent deletion of default category

### 4.6 Navigation Update

**File**: `src/routes/+layout.svelte`
- Add "Categories" link in header navigation

---

## Phase 5: Backend Tests

**New File**: `image-search-service/tests/api/test_categories.py`

Test cases:
- [ ] List categories (empty, with data, pagination)
- [ ] Create category (valid, duplicate name fails)
- [ ] Get category (exists, not found)
- [ ] Update category (valid, partial update)
- [ ] Delete category (empty, with sessions fails, default fails)
- [ ] Training session creation requires category_id
- [ ] Search filters by category_id

**Update**: `tests/conftest.py`
- Add `default_category` fixture
- Update training session fixtures to include category_id

---

## Phase 6: Frontend Tests

**New File**: `src/tests/components/CategorySelector.test.ts`
- Renders loading state
- Displays categories after load
- Calls onSelect on change
- Shows "Create New" option
- Opens modal on "Create New" click

**New File**: `src/tests/routes/categories.test.ts`
- Lists categories
- Create flow
- Delete confirmation
- Error on delete with sessions

**Update**: `src/tests/components/FiltersPanel.test.ts`
- Category filter renders
- Category filter includes in filter object

**Update**: `src/tests/helpers/fixtures.ts`
- Add `createCategory()` fixture factory
- Add `createDefaultCategory()` fixture

---

## Implementation Order

```
Week 1: Backend
├── Day 1-2: Database (migration, models)
├── Day 2-3: API (schemas, routes, services)
├── Day 3: Tests + API contract update
└── Day 3: Deploy backend to dev

Week 2: Frontend
├── Day 4: Generate types + API client
├── Day 4-5: Components (selector, badge, modal)
├── Day 5: Update existing components
├── Day 5-6: Category management page
└── Day 6: Frontend tests + integration testing
```

---

## Critical Files to Modify

### Backend
1. `src/image_search_service/db/models.py` - Add Category model, update TrainingSession
2. `src/image_search_service/db/migrations/versions/` - New migration file
3. `src/image_search_service/api/category_schemas.py` - NEW
4. `src/image_search_service/api/routes/categories.py` - NEW
5. `src/image_search_service/api/routes/__init__.py` - Register router
6. `src/image_search_service/api/training_schemas.py` - Add categoryId
7. `src/image_search_service/api/schemas.py` - Add categoryId to SearchFilters
8. `src/image_search_service/services/training_service.py` - Handle category
9. `src/image_search_service/vector/qdrant.py` - Store/filter category_id
10. `tests/api/test_categories.py` - NEW

### Frontend
1. `src/lib/api/categories.ts` - NEW
2. `src/lib/types.ts` - Add category type aliases
3. `src/lib/components/CategorySelector.svelte` - NEW
4. `src/lib/components/CategoryBadge.svelte` - NEW
5. `src/lib/components/CategoryCreateModal.svelte` - NEW
6. `src/lib/components/FiltersPanel.svelte` - Add category filter
7. `src/lib/components/training/CreateSessionModal.svelte` - Add category selection
8. `src/routes/categories/+page.svelte` - NEW
9. `src/routes/+layout.svelte` - Add nav link
10. `src/tests/components/CategorySelector.test.ts` - NEW
11. `src/tests/helpers/fixtures.ts` - Add category fixtures

### Shared
- `docs/api-contract.md` (both repos) - Add Category section, bump to v1.1.0

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Existing training sessions lack category | Migration assigns all to "General" default |
| Qdrant payloads don't have category_id | Store during training; existing assets need re-training or migration script |
| Frontend type mismatch | Strict workflow: backend deploy → gen:api → frontend update |
| Category deletion breaks references | 409 error with session count; prevent deletion |
