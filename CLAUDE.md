# Claude Code Context

## Purpose
Image search UI for semantic image retrieval. SvelteKit frontend connecting to a FastAPI backend via REST API.

## Stack
- **Framework**: SvelteKit 2 + Svelte 5 (runes: `$state`, `$derived`, `$effect`)
- **Adapter**: Node.js (`@sveltejs/adapter-node`)
- **Testing**: Vitest 4 + Testing Library (happy-dom environment)
- **Linting**: ESLint 9 + typescript-eslint + eslint-plugin-svelte
- **Formatting**: Prettier + prettier-plugin-svelte

## Canonical Commands
```bash
npm ci              # Install dependencies (CI-safe)
npm run dev         # Start dev server (http://localhost:5173)
npm run build       # Production build
npm run preview     # Preview production build
npm run test        # Run tests once
npm run test:watch  # Run tests in watch mode
npm run lint        # Lint code
npm run format      # Format code with Prettier
npm run gen:api     # Regenerate API types from backend OpenAPI spec
```

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
│   │   ├── client.ts      # API client functions
│   │   └── generated.ts   # Auto-generated OpenAPI types (DO NOT EDIT)
│   ├── components/        # Reusable Svelte components
│   └── types.ts           # Frontend type definitions
├── routes/
│   ├── +layout.svelte     # App shell (header, footer, health indicator)
│   └── +page.svelte       # Dashboard page (search, filters, results)
└── tests/
    ├── helpers/
    │   ├── mockFetch.ts   # Centralized fetch mocking
    │   └── fixtures.ts    # Test data factories
    ├── components/        # Component tests
    ├── routes/            # Route/page tests
    ├── api-client.test.ts # API client tests
    └── setup.ts           # Auto-mocking setup
```

## Code Rules

### Components (`src/lib/components/`)
- One component per file
- Props via `$props()` with TypeScript interface
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Emit events via callback props (e.g., `onSearch`, `onFilterChange`)

### Pages (`src/routes/`)
- Keep pages thin - delegate to components
- Local state management (no global store yet)
- Handle loading/error states at page level

### Types (`src/lib/types.ts`)
- Re-export generated types from `generated.ts`
- Define frontend-specific interfaces here

## Testing Rules

### Test Organization
- **Components**: `src/tests/components/{ComponentName}.test.ts`
- **Routes/Pages**: `src/tests/routes/{route}.test.ts`
- **Utilities**: `src/tests/api-client.test.ts`, etc.
- **Helpers**: `src/tests/helpers/` (shared test utilities)

### Fetch Mocking (Use Centralized Helpers)
```typescript
// ✅ CORRECT - Use mockFetch helpers
import { mockResponse, mockError, assertCalled } from '../helpers/mockFetch';

mockResponse('/api/v1/search', { results: [], total: 0, query: 'test' });
// setup.ts auto-installs and resets mocks

// ❌ WRONG - Inline vi.stubGlobal
vi.stubGlobal('fetch', vi.fn());  // Don't do this
```

### Test Data (Use Fixtures)
```typescript
// ✅ CORRECT - Use fixtures for API types
import { createSearchResponse, createAsset } from '../helpers/fixtures';
mockResponse('/api/v1/search', createSearchResponse([createBeachResult()]));

// ❌ WRONG - Inline objects for API responses
mockResponse('/api/v1/search', { results: [...], total: 1 });  // Fragile
```

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
- Props: Pass via `render(Component, { props: { ... } })`
- Events: Mock callback functions with `vi.fn()`
- Effects: Use `untrack()` when callbacks trigger effects to avoid loops

## Accessibility
- All form inputs must have associated `<label>`
- Use semantic HTML (`<article>`, `<aside>`, `<main>`)
- Buttons must have accessible names
- Error messages use `role="alert"`

## Key Decisions
- **No Playwright** - Component/unit tests only (Vitest + Testing Library)
- **No global state** - Local page state for now; add stores when needed
- **Date filters** - ISO 8601 format (`YYYY-MM-DD`)
- **Image placeholders** - Actual image serving is backend responsibility
