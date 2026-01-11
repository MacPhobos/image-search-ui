# Code Quality Guard-Rails

**Purpose**: Enforceable standards to prevent anti-patterns and maintain code quality in the image-search-ui SvelteKit 5 frontend.

**Last Updated**: 2026-01-10
**Status**: Mandatory for all new code and refactoring

---

## Table of Contents

1. [Component Complexity Limits](#1-component-complexity-limits-🔴-critical)
2. [Error Handling Standards](#2-error-handling-standards-🔴-critical)
3. [Svelte 5 State Management](#3-svelte-5-state-management-🔴-critical)
4. [Test Coverage Requirements](#4-test-coverage-requirements-🔴-critical)
5. [Effect Loop Prevention](#5-effect-loop-prevention-🟡-important)
6. [API Client Organization](#6-api-client-organization-🟡-important)
7. [Props Conventions](#7-props-conventions-🟡-important)
8. [Derived Best Practices](#8-derived-best-practices-🟢-recommended)
9. [localStorage Type Safety](#9-localstorage-type-safety-🟢-recommended)

---

## 1. Component Complexity Limits 🔴 Critical

### File Size Limits

**Strict enforcement**:
- **Components**: MAX 300 lines per `.svelte` file
- **Pages**: MAX 400 lines per `+page.svelte` (routes can be complex)
- **Utilities**: MAX 200 lines per `.ts` file

### Component Responsibilities

Each component should have **ONE primary responsibility**:

```svelte
<!-- ✅ GOOD: Single responsibility -->
<!-- PersonSearchBar.svelte - Only handles person search with autocomplete -->
<script lang="ts">
  let { onPersonSelected }: Props = $props();
  let searchQuery = $state('');
  // ... search logic only (50 lines total)
</script>

<!-- ❌ BAD: Multiple responsibilities -->
<!-- SuggestionDetailModal.svelte - 1,107 lines doing 4 things:
     1. Image viewing
     2. Face assignment
     3. Prototype pinning
     4. Suggestions loading
-->
```

### Composition Over Complexity

When a component exceeds 200 lines, take action:

1. **Extract sub-components** for distinct UI sections
2. **Extract custom hooks** for reusable state logic (Svelte 5 runes pattern)
3. **Extract event handlers** to separate files if >50 lines of handler logic

### Modal Component Pattern (Strict)

Modals should be **thin wrappers** around extracted logic:

```svelte
<!-- ✅ GOOD: Modal delegates to extracted components -->
<script lang="ts">
  import { Dialog } from '$lib/components/ui/dialog';
  import ImageViewer from './ImageViewer.svelte';
  import FaceAssignmentPanel from './FaceAssignmentPanel.svelte';
  import PrototypePinningPanel from './PrototypePinningPanel.svelte';

  let { open = $bindable(false), photoUrl, faces, prototypes }: Props = $props();

  function handleAssign(faceId: string, personId: string) {
    // Thin coordination logic
  }
</script>

<Dialog.Root bind:open>
  <ImageViewer url={photoUrl} />
  <FaceAssignmentPanel bind:faces onAssign={handleAssign} />
  <PrototypePinningPanel bind:prototypes onPin={handlePin} />
</Dialog.Root>
```

```svelte
<!-- ❌ BAD: Modal contains all logic inline (400+ lines) -->
<Dialog.Root bind:open>
  <!-- 100 lines: Image viewer implementation -->
  <!-- 150 lines: Face assignment panel implementation -->
  <!-- 150 lines: Prototype pinning panel implementation -->
</Dialog.Root>
```

### Refactoring Priority Queue

**Current violations** (must be fixed):

| Component | Lines | Action Required |
|-----------|-------|-----------------|
| `SuggestionDetailModal.svelte` | 1,107 | Split into 4 sub-components |
| `ImportPersonDataModal.svelte` | 884 | Extract step components |
| `FaceMatchingSettings.svelte` | 752 | Extract settings hooks |
| `PhotoPreviewModal.svelte` | 738 | Extract assignment panel |
| `PersonDropdown.svelte` | 652 | Extract person search logic |
| `PersonPhotosTab.svelte` | 600 | Split grid from lightbox |
| `FiltersPanel.svelte` | 575 | Extract filter widgets |
| `PersonPickerModal.svelte` | 546 | Extract person creation |
| `DirectoryBrowser.svelte` | 490 | Extract tree component |

### Enforcement

- Run `make check-complexity` before commits (TODO: implement)
- PR reviews MUST reject components >300 lines without refactoring justification
- CI fails if new components exceed limits

---

## 2. Error Handling Standards 🔴 Critical

### Centralized Error Handler (Mandatory)

**Location**: `src/lib/utils/errorHandler.ts`

```typescript
import { toast } from 'svelte-sonner';
import { ApiError } from '$lib/api/client';

export type ErrorHandlingStrategy = 'toast' | 'inline' | 'silent';

export function handleError(
  error: unknown,
  context: string,
  strategy: ErrorHandlingStrategy = 'toast'
): string {
  const message = getErrorMessage(error);

  // Always log for debugging
  console.error(`[${context}]`, error);

  // User feedback based on strategy
  if (strategy === 'toast') {
    toast.error(message);
  }

  return message;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Resource not found';
    if (error.status === 403) return 'Permission denied';
    if (error.status === 401) return 'Authentication required';
    return error.message || 'API request failed';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
```

### Error Handling Decision Tree

Choose strategy based on error context:

1. **User-Initiated Actions** (clicks, form submits) → `strategy: 'toast'`
   - Example: Assign face, create person, delete photo
   - User expects immediate feedback

2. **Data Loading** (page load, dropdown open) → `strategy: 'inline'`
   - Example: Load persons list, load categories
   - Show error in component (don't interrupt user)

3. **Background Operations** (auto-save, cache prefetch) → `strategy: 'silent'`
   - Example: Thumbnail cache, recent persons tracking
   - Log only, no user notification

### Component Error Pattern (Mandatory)

```typescript
// ✅ CORRECT: Use centralized handler
import { handleError } from '$lib/utils/errorHandler';

async function handleAssignClick() {
  try {
    await assignFaceToPerson(faceId, personId);
    toast.success('Face assigned successfully');
  } catch (err) {
    handleError(err, 'PersonAssignment', 'toast');
  }
}
```

```typescript
// ❌ WRONG: Inline error handling
async function handleAssignClick() {
  try {
    await assignFaceToPerson(faceId, personId);
  } catch (err) {
    console.error('Failed to assign:', err);  // User sees nothing
  }
}
```

```typescript
// ❌ WRONG: Inconsistent error messages
async function handleDeleteClick() {
  try {
    await deletePerson(personId);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed';  // Fragile
  }
}
```

### API Client Consolidation (Mandatory)

- MUST use single `apiRequest()` from `src/lib/api/client.ts`
- NEVER duplicate error transformation logic in API modules
- Import via `import { apiRequest } from '$lib/api/client';`

```typescript
// ✅ CORRECT: Import shared helper
import { apiRequest } from '$lib/api/client';
import type { PersonListResponse } from './generated';

export async function getPersons(): Promise<PersonListResponse> {
  return apiRequest<PersonListResponse>('/api/v1/persons');
}
```

```typescript
// ❌ WRONG: Duplicate apiRequest function
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // 30 lines of duplicated logic
}
```

### Testing Requirements

- Add test case for error state in every component with async operations
- Use `mockError()` helper from `tests/helpers/mockFetch.ts`

```typescript
// Example test
it('displays error message on API failure', async () => {
  mockError('/api/v1/persons', 'Network error');
  render(PersonList);

  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
```

---

## 3. Svelte 5 State Management 🔴 Critical

### $state vs $state.raw Decision Tree

**Use `$state()` (default)** for all reactive data:

```typescript
// ✅ CORRECT: Mutations trigger reactivity automatically
let persons = $state<Person[]>([]);
let selectedIds = $state<Set<string>>(new Set());
let cache = $state<Map<string, CachedValue>>(new Map());

// Mutations work automatically
persons.push(newPerson);
selectedIds.add('id-123');
cache.set('key', value);  // Reactivity works!
```

**Use `$state.raw()` (rare)** only when:
- Large objects (>1000 properties) updated infrequently
- Objects where ALL updates go through single setter function
- Performance-critical code with profiling evidence

**Trade-off**: `$state.raw()` skips deep reactivity tracking, so mutations don't trigger updates.

### Map/Set Reactivity Pattern (When Using $state.raw)

**MANDATORY wrapper pattern** for `$state.raw()`:

```typescript
// ✅ CORRECT: Wrapper ensures reactivity
let cache = $state.raw<Map<string, CachedValue>>(new Map());

function updateCache(key: string, value: CachedValue) {
  cache.set(key, value);
  cache = new Map(cache);  // Required for reactivity
}

function deleteFromCache(key: string) {
  cache.delete(key);
  cache = new Map(cache);  // Required for reactivity
}

// Use wrapper functions only
updateCache('key1', value);  // ✅
cache.set('key2', value);     // ❌ WRONG: No reactivity
```

### Prohibited Patterns

```typescript
// ❌ FORBIDDEN: Direct Map mutations with $state.raw
let data = $state.raw<Map<string, T>>(new Map());
data.set(key, value);  // BUG: No reactivity trigger

// ❌ FORBIDDEN: Mixing $state.raw with inline mutations
let items = $state.raw<Set<string>>(new Set());
items.add('foo');      // BUG: UI won't update
```

### Testing Requirements

- Test MUST verify UI updates after state changes
- Use Testing Library's `waitFor()` for async state updates

```typescript
await userEvent.click(assignButton);
await waitFor(() => {
  expect(getByText('Assigned to John')).toBeInTheDocument();
});
```

### Migration Path

**Current codebase** has 2 components using `$state.raw()` for Maps:
- `PhotoPreviewModal.svelte` (line 98) - `faceSuggestions`
- `SuggestionDetailModal.svelte` (line 113) - `faceSuggestions`

**Action required**:
1. Convert to plain `$state()` (simpler, automatic reactivity)
2. OR add wrapper functions (defensive, ensures reassignment)

**Prefer**: Option 1 (plain `$state()`) for Maps/Sets unless profiling shows performance issue.

---

## 4. Test Coverage Requirements 🔴 Critical

### Mandatory Test Coverage

Every component MUST have tests before merging if it contains:
- **User interactions** (buttons, forms, dropdowns)
- **API calls** (any async data fetching)
- **Conditional rendering** (loading/error/empty states)
- **Complex state** (>3 state variables)

### Component Test Template (Mandatory)

```typescript
// src/tests/components/MyComponent.test.ts
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockResponse, mockError } from '../helpers/mockFetch';
import MyComponent from '$lib/components/MyComponent.svelte';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('renders component with data', async () => {
      mockResponse('/api/v1/data', { items: [createItem()], total: 1 });
      render(MyComponent);

      await waitFor(() => {
        expect(screen.getByText('Expected Content')).toBeInTheDocument();
      });
    });

    it('handles user interaction successfully', async () => {
      render(MyComponent);
      const button = screen.getByRole('button', { name: /submit/i });

      await userEvent.click(button);

      expect(mockCallback).toHaveBeenCalledWith(expectedArgs);
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while fetching', async () => {
      mockResponse('/api/v1/data', { items: [] }, { delay: 100 });
      render(MyComponent);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('displays error message on API failure', async () => {
      mockError('/api/v1/data', 'Network error');
      render(MyComponent);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no data', async () => {
      mockResponse('/api/v1/data', { items: [], total: 0 });
      render(MyComponent);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('prevents double-click on submit button', async () => {
      const onSubmit = vi.fn();
      render(MyComponent, { props: { onSubmit } });

      const button = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(button);
      await userEvent.click(button);

      expect(onSubmit).toHaveBeenCalledTimes(1);  // Only once
    });
  });
});
```

### Test Coverage Gates (CI Enforcement)

- **New components**: MUST have test file in same PR
- **Modified components**: MUST update existing tests
- **Complex components** (>200 lines): MUST have >80% branch coverage
- **Destructive operations**: MUST have error scenario tests

### Priority Testing Queue (Immediate Action Required)

Fix test gaps for high-risk components in this order:

| Priority | Component | Risk | Lines |
|----------|-----------|------|-------|
| 1 | `AdminDataManagement.svelte` | Destructive operations (delete all data) | ~400 |
| 2 | `DeleteAllDataModal.svelte` | Data deletion confirmation | ~200 |
| 3 | `ImportPersonDataModal.svelte` | Data import validation | 884 |
| 4 | `PersonDropdown.svelte` | User-facing search component | 652 |
| 5 | `PersonPhotosTab.svelte` | Core workflow component | 600 |

### Fixture Usage (Mandatory)

NEVER inline API response objects in tests:

```typescript
// ✅ CORRECT: Use fixtures
import { createPerson, createFaceCluster } from '../helpers/fixtures';

mockResponse('/api/v1/persons', {
  items: [createPerson()],
  total: 1
});
```

```typescript
// ❌ WRONG: Inline objects
mockResponse('/api/v1/persons', {
  items: [{ id: '1', name: 'John', status: 'active' }],
  total: 1
});
```

**Reason**: Fixtures update when API contract changes, inline objects break.

---

## 5. Effect Loop Prevention 🟡 Important

### $effect() vs $derived() Decision Tree

**Use `$derived()` for computed values**:

```typescript
// ✅ CORRECT: Synchronous computation
let fullName = $derived(`${firstName} ${lastName}`);
let isValid = $derived(email.includes('@') && password.length >= 8);
let totalPrice = $derived(items.reduce((sum, item) => sum + item.price, 0));
```

**Use `$effect()` for side effects ONLY**:

```typescript
// ✅ CORRECT: Side effects (logging, analytics, cleanup)
$effect(() => {
  console.log('User viewed', currentPage);
  analytics.track('page_view', currentPage);
});
```

**DON'T use `$effect()` for**:
- ❌ Data fetching (use event handlers or `onMount`)
- ❌ Updating other state (use `$derived`)
- ❌ Validation (use `$derived`)

### Effect with Callback Props (Mandatory Pattern)

When effect calls callback prop, MUST use `untrack()`:

```typescript
// ✅ CORRECT: Prevent infinite loops
$effect(() => {
  const currentValue = trackedState;

  if (shouldNotify) {
    untrack(() => onValueChange(currentValue));  // Required
  }
});
```

```typescript
// ❌ WRONG: Callback can trigger loop
$effect(() => {
  if (shouldNotify) {
    onValueChange(trackedState);  // BUG: Loop if parent updates state
  }
});
```

**Why**: Parent component might update state that affects `trackedState`, creating infinite loop.

### Effect Cleanup (Mandatory for Async)

Effects with async operations MUST return cleanup function:

```typescript
// ✅ CORRECT: Cleanup cancels in-flight requests
$effect(() => {
  const id = resourceId;
  let cancelled = false;

  async function load() {
    const data = await fetchResource(id);
    if (!cancelled) {
      resource = data;
    }
  }

  load();

  return () => {
    cancelled = true;  // Prevent stale updates
  };
});
```

**Why**: Prevents race conditions when reactive value changes rapidly (e.g., user navigates quickly between pages).

### Effect Anti-Patterns (Prohibited)

```typescript
// ❌ FORBIDDEN: Data fetching in effect (use onMount or event handler)
$effect(() => {
  loadData();  // Wrong: Use onMount(() => loadData())
});

// ❌ FORBIDDEN: Updating state in effect (use $derived)
$effect(() => {
  fullName = `${firstName} ${lastName}`;  // Wrong: Use $derived
});

// ❌ FORBIDDEN: Validation in effect (use $derived)
$effect(() => {
  isValid = email.includes('@');  // Wrong: Use $derived
});
```

### Migration Checklist

- [ ] Audit all `$effect()` usages for `untrack()` with callbacks
- [ ] Add cleanup functions to effects with async operations
- [ ] Convert data fetching effects to `onMount()` or event handlers
- [ ] Convert state update effects to `$derived()`

---

## 6. API Client Organization 🟡 Important

### Single API Request Function (Mandatory)

ALL API calls MUST use `apiRequest()` from `src/lib/api/client.ts`:

```typescript
// ✅ CORRECT: Import shared helper
import { apiRequest, API_BASE_URL } from '$lib/api/client';

export async function getPersons(): Promise<PersonListResponse> {
  return apiRequest<PersonListResponse>('/api/v1/persons');
}
```

```typescript
// ❌ WRONG: Duplicate apiRequest function
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // 30 lines of duplicated logic
}
```

### Domain-Specific API Modules

Organize API functions by domain:

```
src/lib/api/
├── client.ts         # Core apiRequest() + API_BASE_URL
├── generated.ts      # Auto-generated types (NEVER EDIT)
├── faces.ts          # Face recognition endpoints
├── categories.ts     # Category management endpoints
├── training.ts       # Training session endpoints
├── vectors.ts        # Vector management endpoints
├── queues.ts         # Queue monitoring endpoints
└── admin.ts          # Admin/data management endpoints
```

### API Module Pattern (Standard)

```typescript
// src/lib/api/domain.ts
import { apiRequest, API_BASE_URL } from './client';
import type { DomainResponse, DomainListResponse } from './generated';

export async function listDomain(): Promise<DomainListResponse> {
  return apiRequest<DomainListResponse>('/api/v1/domain');
}

export async function getDomain(id: string): Promise<DomainResponse> {
  return apiRequest<DomainResponse>(`/api/v1/domain/${id}`);
}

export async function createDomain(data: CreateDomainRequest): Promise<DomainResponse> {
  return apiRequest<DomainResponse>('/api/v1/domain', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Helper functions specific to this domain (not API calls)
export function toDomainUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
```

### Enforcement

- ESLint rule: Disallow `function apiRequest` in files other than `client.ts` (TODO: implement)
- PR reviews: Reject new API files with duplicated helper functions

---

## 7. Props Conventions 🟡 Important

### Props Mutability Rules

**Read-Only Props** (default):

```typescript
interface Props {
  // ✅ Read-only: Component reads value only
  name: string;
  items: Item[];
  config: Settings;
}

let { name, items, config }: Props = $props();
// NEVER mutate these props directly
```

**Two-Way Binding Props** (explicit with `$bindable()`):

```typescript
interface Props {
  // ✅ Mutable: Parent expects updates
  open: boolean;
  selectedId: string | null;
}

let {
  open = $bindable(false),        // Explicit two-way binding
  selectedId = $bindable(null)
}: Props = $props();

// Can mutate (parent will see changes via bind: directive)
open = false;
selectedId = '123';
```

**Callback Props** (emit changes):

```typescript
interface Props {
  // ✅ Event emitters: Component notifies parent
  onClose: () => void;
  onChange: (value: string) => void;
  onItemSelected?: (item: Item) => void;
}

let { onClose, onChange, onItemSelected }: Props = $props();

// Use callbacks to emit changes (don't mutate props)
onClose();
onChange(newValue);
onItemSelected?.(selectedItem);
```

### Component API Decision Tree

**When parent needs to know about changes**:

1. **Simple values** (boolean, string, number) → Use `$bindable()`
   ```typescript
   let { value = $bindable('') }: Props = $props();
   value = newValue;  // Parent sees change via bind:value
   ```

2. **Complex objects or events** → Use callback props
   ```typescript
   let { onUpdate }: Props = $props();
   onUpdate({ field: 'new value' });
   ```

3. **Parent doesn't need updates** → Read-only props
   ```typescript
   let { config }: Props = $props();
   // Don't mutate config
   ```

### Prohibited Patterns

```typescript
// ❌ FORBIDDEN: Mutating prop without $bindable()
let { value }: Props = $props();
value = newValue;  // BUG: Only works if parent uses bind:value

// ❌ FORBIDDEN: Mutating object prop properties
let { config }: Props = $props();
config.setting = newValue;  // BUG: Parent won't see change

// ❌ FORBIDDEN: Mixing mutation and callbacks
let { items, onUpdate }: Props = $props();
items.push(newItem);   // ❌ Don't mutate
onUpdate(items);       // ❌ Then call callback
// Instead: onUpdate([...items, newItem]);
```

### Documentation Requirements

Every component MUST document prop mutability in interface:

```typescript
interface Props {
  /** Read-only: Component displays name */
  name: string;

  /** Two-way binding: Parent tracks open state via bind:open */
  open: boolean;

  /** Event: Called when user clicks delete button */
  onDelete: (id: string) => void;

  /** Optional callback: Called when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
}
```

---

## 8. Derived Best Practices 🟢 Recommended

### $derived() vs $derived.by() Decision

**Use `$derived()` for simple expressions**:

```typescript
// ✅ PREFER: Inline expression
let fullName = $derived(`${firstName} ${lastName}`);
let isValid = $derived(email.includes('@') && password.length > 8);
let totalPrice = $derived(items.reduce((sum, item) => sum + item.price, 0));
```

**Use `$derived.by()` when**:
1. Multiple reactive dependencies with complex logic
2. Early returns or conditional logic
3. Variable declarations needed

```typescript
// ✅ VALID: Complex logic with multiple dependencies
let filteredItems = $derived.by(() => {
  if (!searchQuery) return items;

  const query = searchQuery.toLowerCase();
  const filtered = items.filter(item => item.name.includes(query));

  return sortItems(filtered, sortOrder);
});
```

### Extract Long Derivations (>10 lines)

When derivation exceeds 10 lines, extract to named function:

```typescript
// ❌ AVOID: Long inline derivation
let result = $derived.by(() => {
  // 30 lines of complex logic
  return computed;
});
```

```typescript
// ✅ PREFER: Extracted function
function computeResult(dep1: T1, dep2: T2): Result {
  // 30 lines of logic (now testable)
  return computed;
}

let result = $derived(computeResult(dep1, dep2));
```

**Benefits**:
- Easier to unit test
- Self-documenting with function name
- Reusable across components

### Derivation Performance

**Avoid expensive operations in derivations**:

```typescript
// ❌ AVOID: Expensive operation runs on every reactivity trigger
let parsed = $derived(JSON.parse(jsonString));  // Parses on every change
```

```typescript
// ✅ BETTER: Use $effect with caching
let parsed = $state<ParsedData | null>(null);
$effect(() => {
  parsed = JSON.parse(jsonString);
});
```

**Why**: Derivations run synchronously on every dependency change.

### Testing Derivations

Extracted derivation functions should have unit tests:

```typescript
// src/lib/utils/personFiltering.test.ts
import { describe, it, expect } from 'vitest';
import { filterAndSortPersons } from './personFiltering';

describe('filterAndSortPersons', () => {
  it('filters by search query', () => {
    const persons = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' }
    ];
    const result = filterAndSortPersons(persons, 'jo', []);
    expect(result).toEqual([{ id: '1', name: 'John Doe' }]);
  });

  it('sorts by MRU order', () => {
    const persons = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ];
    const result = filterAndSortPersons(persons, '', ['2', '1']);
    expect(result[0].id).toBe('2');  // Bob first (most recent)
  });
});
```

---

## 9. localStorage Type Safety 🟢 Recommended

### Schema Validation Pattern

Add Zod schema validation to `localSettings`:

```typescript
// src/lib/stores/localSettings.svelte.ts
import { z } from 'zod';

type Schema<T> = z.ZodType<T>;

function get<T>(key: string, defaultValue: T, schema?: Schema<T>): T {
  // ... existing cache check ...

  if (browser) {
    try {
      const stored = localStorage.getItem(getStorageKey(key));
      if (stored !== null) {
        const parsed = JSON.parse(stored);

        // Validate if schema provided
        if (schema) {
          const result = schema.safeParse(parsed);
          if (result.success) {
            state.cache.set(key, result.data);
            return result.data;
          } else {
            console.warn(`Invalid setting "${key}":`, result.error);
            // Clear invalid data
            localStorage.removeItem(getStorageKey(key));
          }
        } else {
          state.cache.set(key, parsed as T);
          return parsed as T;
        }
      }
    } catch (err) {
      console.warn(`Failed to load setting "${key}"`, err);
    }
  }

  return defaultValue;
}
```

### Usage Pattern

```typescript
// Define schema with setting
const sortOrderSchema = z.enum(['relevance', 'date_asc', 'date_desc']);
type SortOrder = z.infer<typeof sortOrderSchema>;

// Get with validation
const sortOrder = localSettings.get(
  'search.sortOrder',
  'relevance' as SortOrder,
  sortOrderSchema  // Validates at runtime
);
```

### Schema Evolution Pattern

```typescript
// src/lib/schemas/settings.ts
const viewModeSchemaV1 = z.enum(['grid', 'list']);

const viewModeSchemaV2 = z.object({
  mode: z.enum(['grid', 'list']),
  size: z.enum(['small', 'medium', 'large'])
});

// Migration function
function migrateViewMode(stored: unknown): ViewModeV2 {
  const v1Result = viewModeSchemaV1.safeParse(stored);
  if (v1Result.success) {
    return { mode: v1Result.data, size: 'medium' };
  }

  const v2Result = viewModeSchemaV2.safeParse(stored);
  if (v2Result.success) {
    return v2Result.data;
  }

  return { mode: 'grid', size: 'medium' };  // Default
}
```

### Benefits

- **Type safety at runtime** - Zod validates actual stored values
- **Clear error messages** - Invalid data logged with details
- **Graceful degradation** - Falls back to defaults on validation failure
- **Schema versioning** - Explicit migration path for setting changes

---

## Summary: Action Items

### 🔴 Critical (Enforce Immediately)

1. **Component Complexity Limits**
   - Reject PRs with components >300 lines
   - Refactor 9 existing violations
   - Add `make check-complexity` to CI

2. **Centralized Error Handling**
   - Create `src/lib/utils/errorHandler.ts`
   - Mandate `handleError()` for all try/catch blocks
   - Use fixtures in all tests

3. **State Management Reactivity**
   - Use `$state()` for all Maps/Sets (not `$state.raw()`)
   - Add wrapper functions if `$state.raw()` required
   - Verify UI updates in tests

4. **Test Coverage Gates**
   - Require tests for all components with user interactions
   - Fix 5 untested high-risk components (admin, destructive ops)
   - Use test template with happy/error/loading/empty states

### 🟡 Important (Implement Within 1 Week)

5. **Effect Loop Prevention**
   - Use `untrack()` for effects calling callback props
   - Add cleanup for async effects
   - Convert state-update effects to `$derived()`

6. **API Client Consolidation**
   - Use single `apiRequest()` from `client.ts`
   - Remove 6 duplicated copies
   - Standardize error messages

7. **Props Mutation Conventions**
   - Use `$bindable()` for mutable props
   - Use callbacks for complex changes
   - Document prop mutability in interfaces

### 🟢 Recommended (Nice to Have)

8. **Derived Complexity**
   - Extract derivations >10 lines to named functions
   - Unit test extracted derivation logic

9. **localStorage Validation**
   - Add optional Zod schema validation
   - Validate critical user preferences
   - Document schema evolution pattern

---

**Last Updated**: 2026-01-10
**Next Review**: After 9 violation fixes completed
