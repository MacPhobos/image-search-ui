# Claude Code Context

## Purpose

Image search UI for semantic image retrieval with face recognition. SvelteKit frontend connecting to a FastAPI backend via REST API.

## Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes: `$state`, `$derived`, `$effect`)
- **Adapter**: Node.js (`@sveltejs/adapter-node`)
- **Testing**: Vitest 4 + Testing Library (happy-dom environment)
- **Linting**: ESLint 9 + typescript-eslint + eslint-plugin-svelte
- **Formatting**: Prettier + prettier-plugin-svelte
- **Styling**: Tailwind CSS v4

## Canonical Commands (Makefile)

🔴 **CRITICAL**: Use Makefile targets for all development tasks:

```bash
make install     # Install dependencies (npm ci)
make dev         # Start dev server (http://localhost:5173)
make build       # Production build
make preview     # Preview production build
make test        # Run tests once
make test-watch  # Run tests in watch mode
make lint        # Lint code (ESLint)
make format      # Format code (Prettier)
make typecheck   # Type check (svelte-check)
make check       # Run all quality checks (lint + typecheck + test)
make gen-api     # Regenerate API types from backend OpenAPI spec
make clean       # Remove build artifacts
make all         # Install, check, and build
```

**npm commands still work** but Makefile is the canonical interface.

## Environment

- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:8000`)

## API Contract Rules

1. **`docs/api-contract.md` is the source of truth** - All API interactions must match this contract
2. **`src/lib/api/generated.ts` is auto-generated** - NEVER edit manually; regenerate with `npm run gen:api`
3. **Search endpoint is POST** - `POST /api/v1/search` with JSON body (not GET with query params)
4. **Health check has no prefix** - `GET /health` (not `/api/v1/health`)

## Project Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts      # Core API client functions
│   │   ├── generated.ts   # 🔴 Auto-generated OpenAPI types (NEVER EDIT)
│   │   ├── categories.ts  # Category management API
│   │   ├── faces.ts       # Face recognition API
│   │   ├── training.ts    # Training session API
│   │   ├── vectors.ts     # Vector management API
│   │   ├── queues.ts      # Background job queue API
│   │   └── admin.ts       # Admin/data management API
│   ├── components/
│   │   ├── admin/         # Admin panel components
│   │   ├── faces/         # Face recognition UI components
│   │   ├── queues/        # Job queue monitoring components
│   │   ├── training/      # Training session components
│   │   └── vectors/       # Vector management components
│   ├── stores/
│   │   ├── localSettings.svelte.ts   # Browser localStorage for UI preferences
│   │   └── thumbnailCache.svelte.ts  # Svelte 5 runes-based thumbnail cache
│   ├── dev/
│   │   ├── DevOverlay.svelte  # Development route debugger (DEV-only)
│   │   └── viewId.ts          # View breadcrumb tracking
│   ├── testing/
│   │   └── testid.ts      # Test ID generation utilities
│   ├── utils/             # Shared utilities
│   └── types.ts           # Frontend type definitions
├── routes/
│   ├── +layout.svelte     # App shell with navigation, health check
│   ├── +page.svelte       # Dashboard (search, filters, results)
│   ├── admin/             # Admin panel (data management, settings)
│   ├── categories/        # Category management
│   ├── faces/
│   │   ├── clusters/      # Face clusters view
│   │   ├── sessions/      # Face detection sessions
│   │   └── suggestions/   # Face assignment suggestions
│   ├── people/            # Person-centric face management
│   ├── queues/            # Background job monitoring
│   ├── training/          # Training session management
│   └── vectors/           # Vector/embedding management
└── tests/
    ├── helpers/
    │   ├── mockFetch.ts   # Centralized fetch mocking
    │   └── fixtures.ts    # Test data factories (30+ fixtures)
    ├── components/        # Component tests (organized by domain)
    ├── routes/            # Route/page tests
    ├── lib/api/           # API client tests
    └── setup.ts           # Auto-mocking setup
```

## Code Rules

### Components (`src/lib/components/`)

🟡 **Component Organization**:

- One component per file
- Props via `$props()` with TypeScript interface
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Emit events via callback props (e.g., `onSearch`, `onFilterChange`)
- Group related components in domain folders (faces/, admin/, queues/)

🟡 **Svelte 5 Patterns**:

```typescript
// ✅ CORRECT - Use $derived.by() for complex derivations
let groupedSuggestions = $derived.by(() => {
  return suggestions.reduce((acc, s) => { /* ... */ }, {});
});

// ❌ WRONG - Direct $derived for complex logic
let groupedSuggestions = $derived(suggestions.reduce(...));  // Error-prone
```

🟢 **State Management**:

- **Local state first**: Use `$state` in components
- **Shared state**: Use runes-based stores (see `thumbnailCache.svelte.ts`)
- **No writable stores**: Prefer Svelte 5 runes pattern over legacy stores
- **UI preferences**: Use `localSettings` store for browser localStorage persistence

### Local Storage for UI Preferences

🟡 **Use `localSettings` for persisting UI state** (sort orders, view modes, last-used values):

```typescript
import { localSettings } from '$lib/stores/localSettings.svelte';

// Define key and type at point of use (no central registry)
const SORT_KEY = 'search.sortOrder';
type SortOrder = 'relevance' | 'date_asc' | 'date_desc';

// Get with default (lazy-loads from localStorage)
let sortOrder = $derived(localSettings.get<SortOrder>(SORT_KEY, 'relevance'));

// Set (persists immediately)
localSettings.set(SORT_KEY, 'date_desc');
```

🟢 **Key naming convention**: `domain.settingName` (e.g., `training.lastRootPath`, `people.viewMode`)

🟢 **Features**:
- SSR-safe (handles server-side rendering)
- Namespaced (`image-search.` prefix) to avoid conflicts
- Automatic JSON serialization for objects/arrays
- Error resilient (graceful handling of private browsing)

🔴 **NOT for backend settings** - Use Admin Settings for database-stored configuration.

### Pages (`src/routes/`)

🟡 **Page Organization**:

- Keep pages thin - delegate to components
- Use `+page.ts` for data loading when needed
- Handle loading/error states at page level
- Use `+layout.svelte` for shared UI (navigation, header)

🟢 **Route Structure**:

- Dynamic routes: `[id]/+page.svelte` (e.g., `/people/[personId]`)
- Route groups: Use folders for logical organization
- Page data: Export from `+page.ts` if server-side data needed

### Types (`src/lib/types.ts`)

🔴 **Type Safety Rules**:

- Re-export generated types from `generated.ts`
- Define frontend-specific interfaces here
- NEVER manually type API responses (use generated types)
- Use `import type` for type-only imports

## Testing Rules

### Test Organization

- **Components**: `src/tests/components/{ComponentName}.test.ts`
- **Routes/Pages**: `src/tests/routes/{route}.test.ts`
- **Stores**: `src/tests/stores/{storeName}.test.ts`
- **Utilities**: `src/tests/api-client.test.ts`, etc.
- **Helpers**: `src/tests/helpers/` (shared test utilities)

### Fetch Mocking (Use Centralized Helpers)

```typescript
// ✅ CORRECT - Use mockFetch helpers
import { mockResponse, mockError, assertCalled } from '../helpers/mockFetch';

mockResponse('/api/v1/search', { results: [], total: 0, query: 'test' });
// setup.ts auto-installs and resets mocks

// ❌ WRONG - Inline vi.stubGlobal
vi.stubGlobal('fetch', vi.fn()); // Don't do this
```

### Test Data (Use Fixtures)

🔴 **CRITICAL**: Always use fixtures for API responses:

```typescript
// ✅ CORRECT - Use fixtures for API types
import { createSearchResponse, createAsset } from '../helpers/fixtures';
mockResponse('/api/v1/search', createSearchResponse([createBeachResult()]));

// ❌ WRONG - Inline objects for API responses
mockResponse('/api/v1/search', { results: [...], total: 1 });  // Fragile
```

🟡 **Available Fixtures** (see `tests/helpers/fixtures.ts`):

- `createAsset()` - Search result asset
- `createSearchResponse()` - Search API response
- `createPerson()` - Person entity
- `createFaceCluster()` - Face cluster
- `createFaceSuggestion()` - Face assignment suggestion
- `createCategory()` - Image category
- `createTrainingSession()` - Training job
- `createQueueInfo()` - Queue status
- Plus 20+ more domain-specific fixtures

### When to Add Tests

- **New component** → Add `ComponentName.test.ts` in `components/`
- **New page** → Add `pagename.test.ts` in `routes/`
- **API client changes** → Update `api-client.test.ts`
- **Bug fix** → Add regression test BEFORE fixing

### Test Assertions

- Use Testing Library queries: `getByRole`, `getByLabelText`, `getByText`
- Avoid `getByTestId` unless no semantic alternative
- Assert user-visible behavior, not implementation details
- Use `waitFor` for async operations

### Svelte 5 Testing Patterns

🟡 **Component Testing**:

- Props: Pass via `render(Component, { props: { ... } })`
- Events: Mock callback functions with `vi.fn()`
- Effects: Use `untrack()` when callbacks trigger effects to avoid loops

🟢 **Test ID Convention** (for non-semantic queries):

```typescript
import { tid } from '$lib/testing/testid';

// In component:
<button data-testid={tid('person-card', 'btn-delete')}>Delete</button>

// In test:
const deleteBtn = getByTestId(tid('person-card', 'btn-delete'));
```

🟢 **Development Tools**:

- `DevOverlay.svelte` - Shows route info, params, breadcrumbs in DEV mode
- `viewId.ts` - Breadcrumb tracking for route debugging
- Both integrated in `+layout.svelte` behind `import.meta.env.DEV` check

## Accessibility

- All form inputs must have associated `<label>`
- Use semantic HTML (`<article>`, `<aside>`, `<main>`)
- Buttons must have accessible names
- Error messages use `role="alert"`

## Key Decisions

🔴 **Architecture Decisions**:

- **No Playwright** - Component/unit tests only (Vitest + Testing Library)
- **Svelte 5 runes over stores** - Use `$state`/`$derived` for new code
- **Runes-based stores pattern** - For shared state (see `thumbnailCache.svelte.ts`)
- **Auto-generated types** - NEVER manually type API responses
- **Date filters** - ISO 8601 format (`YYYY-MM-DD`)

🟡 **Recent Patterns** (Last 30 Days):

- **localStorage UI settings** - Use `localSettings` store for persisting UI preferences
- **Batch thumbnail loading** - Use `thumbnailCache` store for face/person thumbnails
- **Modal state persistence** - Pass state to modals, receive updates via callbacks
- **Multi-face images** - Handle images with multiple detected faces
- **Prototype pinning** - Temporal face prototypes with age ranges
- **Queue monitoring** - Real-time job queue dashboard with SSE
- **Person-centric model** - Unified view of persons (known + unknown clusters)

🟢 **Component Patterns**:

- **Detail modals** - Full-screen modals for viewing/editing entities
- **Thumbnail grids** - Lazy-loaded image grids with loading states
- **Status badges** - Reusable badge components for job/worker status
- **Progress indicators** - Real-time progress bars for async jobs
- **Bounding boxes** - SVG overlays for face detection visualization

## Feature Areas

### Face Recognition

- **People View** (`/people`) - Unified person management (known + unknown)
- **Face Clusters** (`/faces/clusters`) - Browse unknown face clusters
- **Face Suggestions** (`/faces/suggestions`) - Review auto-assignment suggestions
- **Face Sessions** (`/faces/sessions`) - Monitor face detection jobs
- **Person Detail** (`/people/[id]`) - Manage person with photos and prototypes

### Training & Vectors

- **Training Sessions** (`/training`) - Manage CLIP embedding training jobs
- **Vector Management** (`/vectors`) - Delete/retrain vectors by directory
- **Categories** (`/categories`) - Manage image categorization

### Admin & Monitoring

- **Admin Panel** (`/admin`) - Data management, settings, import/export
- **Queue Dashboard** (`/queues`) - Monitor background job queues
- **Health Indicator** - Real-time backend health check in header

## API Client Organization

🔴 **Domain-Specific API Modules**:

```typescript
// Use domain-specific API modules, NOT generated client directly
import { searchImages } from '$lib/api/client'; // Core search
import { getPersons } from '$lib/api/faces'; // Face recognition
import { getCategories } from '$lib/api/categories'; // Categories
import { getQueueInfo } from '$lib/api/queues'; // Queue monitoring
import { deleteAllData } from '$lib/api/admin'; // Admin operations
```

🟡 **Common API Patterns**:

- Transform query params from frontend conventions to backend (e.g., `sortBy: 'faceCount'` → `sort_by: 'face_count'`)
- Handle pagination with `offset`/`limit` params
- Use `POST` for search (JSON body, not query params)
- Batch operations where possible (e.g., `getBatchThumbnails()`)

## Common Gotchas

🔴 **Face API Field Names**:

- Backend uses **snake_case** (`face_id`, `asset_id`)
- Frontend TypeScript uses **camelCase** (from OpenAPI generation)
- Some backend responses return both formats (handle defensively)

🔴 **State Persistence in Modals**:

- Modals should receive initial state via props
- Modifications update local state
- Emit changes via callbacks (don't mutate props)
- Parent component merges changes with page state

🟡 **Svelte 5 Effect Loops**:

- Use `untrack()` when effect callbacks trigger other effects
- Prefer `$derived` over `$effect` for computed values
- Use `$effect.pre()` for DOM measurements

🟢 **Thumbnail Loading**:

- Always use `thumbnailCache` for batch loading
- Fetch visible items first, prefetch next page
- Handle null thumbnails (not all faces have thumbnails)
