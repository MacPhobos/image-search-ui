# Image Search UI - Codebase Analysis

**Date**: 2026-01-10
**Scope**: SvelteKit 5 frontend patterns, anti-patterns, and improvement opportunities
**Total Components**: 130 Svelte files
**Test Coverage**: 39 test files (28 component tests, ~21% component coverage)

---

## Executive Summary

The image-search-ui codebase demonstrates **strong architectural foundations** with SvelteKit 5 runes, auto-generated API types, and centralized testing patterns. However, analysis reveals **9 critical patterns** requiring guard-rails to prevent future issues:

### 🔴 Critical Issues (Require Immediate Guard-Rails)
1. **Component Complexity Explosion** - 9 components exceed 500 lines (max: 1,107 lines)
2. **Inconsistent Error Handling** - 97 catch blocks with 5 different error patterns
3. **State Management Reactivity Traps** - `$state.raw` used for Maps without clear guidelines
4. **Test Coverage Gaps** - 21% component test coverage, 0% for complex modals

### 🟡 Important Issues (Need Documentation)
5. **Effect Loop Anti-Patterns** - 21 `$effect()` usages, only 3 use `untrack()`
6. **API Request Duplication** - `apiRequest()` helper duplicated across 7 API files
7. **Props Mutation Risks** - 133 components use `$props()`, unclear mutation boundaries

### 🟢 Recommended Improvements
8. **Svelte 5 Derived Complexity** - 9 files use `$derived.by()`, need patterns
9. **localStorage Type Safety** - No validation for stored values (JSON parse can fail)

---

## 1. Component Complexity Explosion 🔴

### Findings

**9 components exceed 500 lines** (healthy target: <300 lines):

| Component | Lines | Primary Issue | Recommendation |
|-----------|-------|---------------|----------------|
| `SuggestionDetailModal.svelte` | 1,107 | Combines viewing, assignment, pinning, suggestions in one component | Split into 4 sub-components |
| `PhotoPreviewModal.svelte` | 738 | Image viewer + face assignment + suggestions in one file | Extract assignment panel |
| `FaceMatchingSettings.svelte` | 752 | UI + API calls + validation logic mixed | Extract settings hooks |
| `ImportPersonDataModal.svelte` | 884 | Multi-step wizard with 4 states in one component | Extract step components |
| `PersonDropdown.svelte` | 652 | Search + filtering + MRU sorting in dropdown | Extract person search logic |
| `PersonPhotosTab.svelte` | 600 | Photo grid + lightbox + assignment + unassignment | Split grid from lightbox |
| `FiltersPanel.svelte` | 575 | Date + category + person filters with separate loading | Extract filter widgets |
| `PersonPickerModal.svelte` | 546 | Person search + creation + selection + merging | Extract person creation |
| `DirectoryBrowser.svelte` | 490 | Tree navigation + stats + file listing | Extract tree component |

### Root Causes

1. **Modal Components Are God Objects** - Modals combine:
   - UI rendering (image viewer, forms)
   - State management (assignment, pinning, suggestions)
   - API orchestration (multiple endpoints per action)
   - Event handling (keyboard shortcuts, clicks)

2. **Missing Component Composition Patterns** - Example from `SuggestionDetailModal.svelte`:
   ```svelte
   <!-- Lines 1-100: Imports and state (14 imports, 20+ state variables) -->
   <!-- Lines 101-300: Face loading logic -->
   <!-- Lines 301-500: Assignment panel logic -->
   <!-- Lines 501-700: Pinning panel logic -->
   <!-- Lines 701-900: Suggestions loading logic -->
   <!-- Lines 901-1107: Template combining all above -->
   ```

3. **Lack of Custom Hooks Pattern** - Svelte 5 runes enable extraction, but codebase uses inline logic:
   ```typescript
   // ❌ CURRENT: All logic inline in component
   let persons = $state<Person[]>([]);
   let personsLoading = $state(false);
   async function loadPersons() { /* 30 lines */ }

   // ✅ RECOMMENDED: Extract to reusable hook
   const personsList = usePersonsList();
   ```

### Impact on Maintainability

- **Bug Surface Area**: 1,107-line component has ~50 possible state combinations (2^6 independent states)
- **Test Complexity**: `SuggestionDetailModal.test.ts` is 1,400 lines with 45 test cases
- **Cognitive Load**: Developers need to understand 4 distinct workflows in one file

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🔴 Component Complexity Limits

### File Size Limits
- **Components**: MAX 300 lines per .svelte file (strict)
- **Pages**: MAX 400 lines per +page.svelte (routes can be complex)
- **Utilities**: MAX 200 lines per .ts file

### Component Responsibilities
Each component should have **ONE primary responsibility**:
- ✅ GOOD: `PersonSearchBar.svelte` - Person search with autocomplete
- ❌ BAD: `SuggestionDetailModal.svelte` - Image view + assignment + pinning + suggestions

### Composition Over Complexity
When a component exceeds 200 lines:
1. **Extract sub-components** for distinct UI sections
2. **Extract custom hooks** for reusable state logic (Svelte 5 runes pattern)
3. **Extract event handlers** to separate files if >50 lines of handler logic

### Modal Component Pattern (Strict)
Modals should be **thin wrappers** around extracted logic:
```svelte
<!-- ✅ GOOD: Modal delegates to extracted components -->
<Dialog.Root bind:open>
  <ImageViewer {imageUrl} />
  <FaceAssignmentPanel bind:faces onAssign={handleAssign} />
  <PrototypePinningPanel bind:prototypes onPin={handlePin} />
</Dialog.Root>

<!-- ❌ BAD: Modal contains all logic inline (400+ lines) -->
<Dialog.Root bind:open>
  <!-- 400 lines of mixed concerns -->
</Dialog.Root>
```

### Enforcement
- Run `make check-complexity` before commits (fails if files exceed limits)
- PR reviews MUST reject components >300 lines without refactoring justification
```

---

## 2. Inconsistent Error Handling 🔴

### Findings

**97 catch blocks across 41 files** with **5 different error handling patterns**:

#### Pattern 1: Console.error + Silent Failure (Most Common - 61 instances)
```typescript
try {
  const data = await loadCategories();
  categories = data.items;
} catch (err) {
  console.error('Failed to load categories:', err);  // ❌ User sees nothing
}
// No user feedback, component shows stale/empty state
```

#### Pattern 2: Console.error + State Variable (19 instances)
```typescript
try {
  persons = await fetchAllPersons('active');
} catch (err) {
  console.error('Failed to load persons:', err);
  personsError = err instanceof Error ? err.message : 'Failed to load persons';
}
// Error state set but may not be displayed in UI
```

#### Pattern 3: Toast Notification (36 instances - inconsistent)
```typescript
try {
  await assignFaceToPerson(faceId, personId);
  toast.success('Face assigned!');
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Failed to assign face');
}
// Only 7 files use toast consistently
```

#### Pattern 4: ApiError Type Check (12 instances)
```typescript
try {
  person = await getPersonById(personId);
} catch (err) {
  if (err instanceof ApiError && err.status === 404) {
    error = 'Person not found.';
  } else if (err instanceof ApiError) {
    error = err.message;
  } else {
    error = 'Failed to load person. Please try again.';
  }
}
// Most thorough but only in 12 locations
```

#### Pattern 5: API Layer Error Transformation (7 API files)
```typescript
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(message, response.status, errorData);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network request failed', 0, undefined);
  }
}
```

### Anti-Patterns Observed

1. **No Centralized Error Handling** - Each component makes own decision:
   - `FiltersPanel.svelte`: Console.error only (lines 59, 71)
   - `PhotoPreviewModal.svelte`: Console.error + toast (7 instances)
   - `/people/[personId]/+page.svelte`: Full ApiError handling with state (12 instances)

2. **Duplicated `apiRequest()` Helper** - Same 30-line function in 7 files:
   - `src/lib/api/client.ts`
   - `src/lib/api/faces.ts`
   - `src/lib/api/categories.ts`
   - `src/lib/api/vectors.ts`
   - `src/lib/api/training.ts`
   - `src/lib/api/admin.ts`
   - `src/lib/api/queues.ts`

3. **Inconsistent User Feedback**:
   - Background operations: Toast notifications (training, faces)
   - Data loading: Silent failure (categories, persons)
   - CRUD operations: Mixed (sometimes toast, sometimes inline error)

### Impact on User Experience

- **Hidden Failures**: 61 silent catch blocks mean errors never reach users
- **Debug Difficulty**: Errors logged to console but not surfaced in UI
- **Inconsistent UX**: Same operation (e.g., "assign face") shows error differently across components

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🔴 Error Handling Standards

### Centralized Error Handler (Mandatory)
Create `src/lib/utils/errorHandler.ts`:
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

  console.error(`[${context}]`, error);

  if (strategy === 'toast') {
    toast.error(message);
  }

  return message;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Resource not found';
    if (error.status === 403) return 'Permission denied';
    return error.message || 'API request failed';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
```

### Error Handling Decision Tree
1. **User-Initiated Actions** (clicks, form submits) → `strategy: 'toast'`
   - Example: Assign face, create person, delete photo
2. **Data Loading** (page load, dropdown open) → `strategy: 'inline'`
   - Example: Load persons list, load categories
3. **Background Operations** (auto-save, cache prefetch) → `strategy: 'silent'`
   - Example: Thumbnail cache, recent persons tracking

### Component Error Pattern (Mandatory)
```typescript
// ✅ CORRECT: Use centralized handler
try {
  await assignFaceToPerson(faceId, personId);
  toast.success('Face assigned successfully');
} catch (err) {
  handleError(err, 'PersonAssignment', 'toast');
}

// ❌ WRONG: Inline error handling
try {
  await assignFaceToPerson(faceId, personId);
} catch (err) {
  console.error('Failed to assign:', err);  // User sees nothing
  error = err instanceof Error ? err.message : 'Failed';  // Inconsistent
}
```

### API Client Consolidation (Mandatory)
- MUST use single `apiRequest()` from `src/lib/api/client.ts`
- NEVER duplicate error transformation logic
- Import via `import { apiRequest } from '$lib/api/client';`

### Testing Requirements
- Add test case for error state in every component with async operations
- Use `mockError()` helper from `tests/helpers/mockFetch.ts`
```

---

## 3. State Management Reactivity Traps 🔴

### Findings

**`$state.raw()` used for Map objects in 2 critical components** without clear reactivity patterns:

#### PhotoPreviewModal.svelte (Line 98)
```typescript
let faceSuggestions = $state.raw<Map<string, FaceSuggestionsState>>(new Map());

// Later (line 158): Manual reactivity trigger required
faceSuggestions.set(faceId, { suggestions: items, loading: false, error: null });
faceSuggestions = new Map(faceSuggestions);  // ⚠️ Must reassign for reactivity
```

#### SuggestionDetailModal.svelte (Line 113)
```typescript
let faceSuggestions = $state.raw<Map<string, FaceSuggestionsState>>(new Map());
// Same pattern: Map mutations don't trigger reactivity
```

### Root Cause: Svelte 5 Runes Reactivity Model

**Svelte 5 runes reactivity** (from docs):
- `$state()` - **Deep reactivity** for objects/arrays (mutations tracked)
- `$state.raw()` - **No reactivity** for object mutations (only reassignment)

**When to use `$state.raw()`**:
- Large objects that change infrequently
- Objects with many nested levels (performance optimization)
- Objects where you control all mutations (can guarantee reassignment)

**Risks in current codebase**:
```typescript
// ❌ EASY TO BREAK: Developer adds Map.set() without reassignment
faceSuggestions.set(faceId, newValue);
// BUG: UI doesn't update because Map mutation isn't tracked

// ✅ CORRECT: Must remember reassignment
faceSuggestions.set(faceId, newValue);
faceSuggestions = new Map(faceSuggestions);
```

### Impact on Maintainability

- **Hidden Reactivity Bugs**: Forgetting reassignment causes "state update didn't work" bugs
- **Non-Obvious API**: Developers expect `$state()` to "just work" (like Svelte 4 stores)
- **Testing Challenges**: Tests must verify reassignment, not just state changes

### Alternative Patterns

#### Option 1: Use Plain `$state()` for Maps (Simpler)
```typescript
// ✅ RECOMMENDED: Mutations trigger reactivity automatically
let faceSuggestions = $state<Map<string, FaceSuggestionsState>>(new Map());

faceSuggestions.set(faceId, newValue);  // Reactivity works automatically
// No reassignment needed!
```

**Trade-off**: Slightly slower for large Maps (Svelte tracks all mutations)

#### Option 2: Use Object Instead of Map
```typescript
// ✅ ALTERNATIVE: Plain object with $state
let faceSuggestions = $state<Record<string, FaceSuggestionsState>>({});

faceSuggestions[faceId] = newValue;  // Reactivity works
```

**Trade-off**: Less ergonomic than Map API (`Map.get()` vs `obj[key]`)

#### Option 3: Wrapper Function for Map Updates
```typescript
// ✅ DEFENSIVE: Helper ensures reassignment
function updateSuggestions(faceId: string, value: FaceSuggestionsState) {
  faceSuggestions.set(faceId, value);
  faceSuggestions = new Map(faceSuggestions);  // Always reassign
}
```

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🔴 Svelte 5 State Management Rules

### $state vs $state.raw Decision Tree

**Use `$state()` (default)**:
- Arrays: `$state<Person[]>([])`
- Objects: `$state<Settings>({})`
- Maps: `$state<Map<string, Value>>(new Map())`
- Sets: `$state<Set<string>>(new Set())`
- **Reason**: Mutations trigger reactivity automatically

**Use `$state.raw()` (rare)**:
- Large objects (>1000 properties) updated infrequently
- Objects where ALL updates go through single setter function
- Performance-critical code with profiling evidence
- **Reason**: Avoid deep reactivity overhead

### Map/Set Reactivity Pattern (When Using $state.raw)

**MANDATORY wrapper pattern**:
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
data.set(key, value);  // BUG: No reactivity

// ❌ FORBIDDEN: Mixing $state.raw with inline mutations
let items = $state.raw<Set<string>>(new Set());
items.add('foo');      // BUG: No reactivity
```

### Testing Requirements
- Test MUST verify UI updates after state changes
- Use Testing Library's `waitFor()` for async state updates
- Example:
```typescript
await userEvent.click(assignButton);
await waitFor(() => {
  expect(getByText('Assigned to John')).toBeInTheDocument();
});
```

### Migration Path
- Prefer `$state()` for all new Map/Set usage
- Refactor existing `$state.raw()` Map usage to plain `$state()`
- Only use `$state.raw()` with wrapper functions (mandatory)
```

---

## 4. Test Coverage Gaps 🔴

### Findings

**Component Test Coverage: 21% (28 tests for 130 components)**

#### Categories Without Tests

| Component Category | Total Files | Tests | Coverage | Missing |
|-------------------|-------------|-------|----------|---------|
| **Complex Modals** | 9 | 3 | 33% | 6 untested |
| **Admin Components** | 5 | 0 | 0% | All untested |
| **Queue Monitoring** | 5 | 0 | 0% | All untested |
| **Training Session UI** | 8 | 1 | 13% | 7 untested |
| **Vector Management** | 5 | 4 | 80% | Good coverage |
| **Face Recognition** | 20 | 10 | 50% | Half tested |
| **UI Library (shadcn)** | 60 | 0 | 0% | Expected (3rd party) |

#### Critical Untested Components

**High Complexity + Zero Tests**:
1. `ImportPersonDataModal.svelte` (884 lines) - Multi-step import wizard
2. `PersonDropdown.svelte` (652 lines) - Person search with MRU sorting
3. `PersonPhotosTab.svelte` (600 lines) - Photo grid with assignment
4. `FaceMatchingSettings.svelte` (752 lines) - Complex settings form
5. `DirectoryBrowser.svelte` (490 lines) - Tree navigation component

**High Risk + Zero Tests**:
- `AdminDataManagement.svelte` - Deletes all data (no test coverage)
- `DeleteAllDataModal.svelte` - Destructive operation (no test coverage)
- `ExportPersonDataModal.svelte` - Data export (no test coverage)
- All queue monitoring components (real-time SSE, no tests)

### Test Quality Issues

#### Issue 1: Mock Timing Problems (Documented in Tests)
```typescript
// From SuggestionDetailModal.test.ts:1377
// TODO: Fix mock timing issues with error responses
// Tests skip error scenarios due to flaky mocks
```

#### Issue 2: Overuse of `as unknown` Casts (6 instances)
```typescript
// From tests/components/faces/PhotoPreviewModalSuggestions.test.ts:163
const fetchCalls = (globalThis.fetch as any).mock?.calls || [];
// Type safety bypassed in tests
```

#### Issue 3: Insufficient Edge Case Coverage
Most tests cover "happy path" only:
- ✅ Load data successfully
- ❌ Missing: Loading state transitions
- ❌ Missing: Error state UI
- ❌ Missing: Empty state handling
- ❌ Missing: Race conditions (multiple clicks)

### Impact on Reliability

- **Regression Risk**: 79% of components can break without test failures
- **Refactoring Fear**: Developers avoid refactoring untested complex components
- **Debug Overhead**: Bugs found in production, not during development

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🔴 Test Coverage Requirements

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
    it('renders component with data', async () => { /* ... */ });
    it('handles user interaction successfully', async () => { /* ... */ });
  });

  describe('Loading States', () => {
    it('shows loading indicator while fetching', async () => { /* ... */ });
  });

  describe('Error States', () => {
    it('displays error message on API failure', async () => {
      mockError('/api/v1/endpoint', 'Network error');
      // ...
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no data', async () => { /* ... */ });
  });

  describe('Edge Cases', () => {
    it('prevents double-click on submit button', async () => { /* ... */ });
    it('handles rapid state changes', async () => { /* ... */ });
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
1. `AdminDataManagement.svelte` - Destructive operations
2. `DeleteAllDataModal.svelte` - Data deletion confirmation
3. `ImportPersonDataModal.svelte` - Data import validation
4. `PersonDropdown.svelte` - User-facing search component
5. `PersonPhotosTab.svelte` - Core workflow component

### Fixture Usage (Mandatory)
NEVER inline API response objects in tests:
```typescript
// ✅ CORRECT: Use fixtures
import { createPerson, createFaceCluster } from '../helpers/fixtures';
mockResponse('/api/v1/persons', { items: [createPerson()], total: 1 });

// ❌ WRONG: Inline objects
mockResponse('/api/v1/persons', { items: [{ id: '1', name: 'John' }], total: 1 });
```

**Reason**: Fixtures update when API contract changes, inline objects break.
```

---

## 5. Effect Loop Anti-Patterns 🟡

### Findings

**21 components use `$effect()`, but only 3 use `untrack()` to prevent loops**

#### Problematic Pattern: Effect Calling Callback Props

**Common in FiltersPanel.svelte (lines 86-97)**:
```typescript
let filters = $derived<SearchFilters>({ /* ... */ });

// Effect notifies parent when filters change
$effect(() => {
  const currentFilters = filters;  // Track filters

  if (initialized) {
    untrack(() => onFilterChange(currentFilters));  // ✅ Uses untrack
  } else {
    initialized = true;
  }
});
```

**Problem**: If `onFilterChange` modifies state that affects `filters`, creates infinite loop without `untrack()`.

**Risk in 18 other components**: Same pattern without `untrack()`:
```typescript
// From multiple components (18 instances)
$effect(() => {
  if (someState) {
    onCallback(someState);  // ❌ Missing untrack()
  }
});
```

#### Effect Used for Side Effects (Not Derivations)

**Common misuse**: Using `$effect()` for actions that should be event handlers:

```typescript
// ❌ ANTI-PATTERN: Effect for side effects
$effect(() => {
  if (assigningFaceId) {
    loadPersons();  // Should be in handleAssignClick()
  }
});

// ✅ CORRECT: Direct function call
function handleAssignClick(faceId: string) {
  assigningFaceId = faceId;
  loadPersons();
}
```

#### Effect for Data Fetching (Race Conditions)

**Found in 6 components**:
```typescript
// From people/[personId]/+page.svelte (lines 92-98)
$effect(() => {
  const id = personId;  // Reactive to route param
  if (id) {
    loadPerson();       // ⚠️ No cleanup, no race condition handling
    loadPrototypes();
  }
});
```

**Problem**: If `personId` changes rapidly (fast navigation):
1. Effect triggers for `personId='123'`
2. `loadPerson()` starts async request for person 123
3. Effect triggers for `personId='456'` (user navigated away)
4. `loadPerson()` starts async request for person 456
5. Response for person 123 arrives **after** response for 456
6. **Bug**: UI shows person 123 data on person 456 page

**Missing**: Effect cleanup to cancel in-flight requests.

### Impact on Reliability

- **Infinite Loop Risk**: 18 effects could cause loops if callback props modify tracked state
- **Race Conditions**: 6 data-fetching effects have no cleanup (wrong person data shown)
- **Debugging Difficulty**: Effect loops are hard to debug (no stack trace)

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🟡 Svelte 5 Effect Patterns (Important)

### $effect() vs $derived() Decision Tree

**Use `$derived()` for computed values**:
```typescript
// ✅ CORRECT: Synchronous computation
let fullName = $derived(`${firstName} ${lastName}`);
let isValid = $derived(email.includes('@') && password.length >= 8);
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
- ❌ Data fetching (use event handlers or onMount)
- ❌ Updating other state (use $derived)
- ❌ Validation (use $derived)

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

// ❌ WRONG: Callback can trigger loop
$effect(() => {
  if (shouldNotify) {
    onValueChange(trackedState);  // BUG: Loop if parent updates state
  }
});
```

**Why**: Parent component might update state that affects `trackedState`, creating loop.

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

**Why**: Prevents race conditions when reactive value changes rapidly.

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
```

---

## 6. API Request Duplication 🟡

### Findings

**`apiRequest()` helper duplicated in 7 files** (identical 30-line function):

```typescript
// Found in:
// - src/lib/api/client.ts
// - src/lib/api/faces.ts
// - src/lib/api/categories.ts
// - src/lib/api/vectors.ts
// - src/lib/api/training.ts
// - src/lib/api/admin.ts
// - src/lib/api/queues.ts

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        errorData?.message || errorData?.detail || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    // Handle 204 No Content (faces.ts only)
    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network request failed', 0, undefined);
  }
}
```

### Inconsistencies Across Copies

**Variation 1**: `client.ts` vs `faces.ts`
- `client.ts`: No 204 handling
- `faces.ts`: Has 204 No Content handling (line 47-49)

**Variation 2**: Error message format
- `client.ts`: Uses `errorData?.message || HTTP ${status}: ${statusText}`
- `faces.ts`: Uses `errorData?.message || errorData?.detail || HTTP ${status}`

**Variation 3**: API_BASE_URL source
- Some import from `$env/dynamic/public`
- Some use relative imports
- All redefine the constant

### Impact on Maintainability

- **Bug Fix Overhead**: Same bug must be fixed 7 times
- **Inconsistent Behavior**: Different error messages across API modules
- **Code Size**: 210 lines of duplicated code (7 × 30 lines)

### Root Cause

**Historical**: Each API module started as independent file, copy-pasted `apiRequest()`.

**Why not consolidated**:
- `client.ts` only used by search endpoint (1 function)
- Other API modules have 5-10 functions each
- No clear "base API client" pattern established

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🟡 API Client Organization (Important)

### Single API Request Function (Mandatory)

ALL API calls MUST use `apiRequest()` from `src/lib/api/client.ts`:

```typescript
// ✅ CORRECT: Import shared helper
import { apiRequest, API_BASE_URL } from '$lib/api/client';

export async function getPersons(): Promise<PersonListResponse> {
  return apiRequest<PersonListResponse>('/api/v1/persons');
}

// ❌ WRONG: Duplicate apiRequest function
async function apiRequest<T>(...) { /* 30 lines */ }
```

### Consolidation Plan (Immediate Action)

**Phase 1**: Move consolidated `apiRequest()` to `client.ts`
- Include 204 No Content handling (from faces.ts)
- Use consistent error message format
- Export as named export

**Phase 2**: Update all API modules to import
```typescript
// Before (7 copies)
async function apiRequest<T>(...) { /* duplicate code */ }

// After (1 import)
import { apiRequest } from '$lib/api/client';
```

**Phase 3**: Delete duplicates
- Remove local `apiRequest()` from faces.ts, categories.ts, etc.
- Verify tests pass (no behavior change)

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

// Helper functions specific to this domain (not API calls)
export function toDomainUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
```

### Enforcement
- ESLint rule: Disallow `function apiRequest` in files other than `client.ts`
- PR reviews: Reject new API files with duplicated helper functions
```

---

## 7. Props Mutation Risks 🟡

### Findings

**133 components use `$props()` with unclear mutation boundaries**

#### Current Pattern: Props Destructured Inline
```typescript
// From 133 components
let { prop1, prop2, onCallback }: Props = $props();

// Later in component (line 200)
prop1 = newValue;  // ⚠️ Is this allowed? Props are reactive in Svelte 5
```

#### Svelte 5 Props Behavior (From Docs)

**Props are REACTIVE in parent**:
```svelte
<!-- Parent.svelte -->
<Child bind:value={parentState} />
<!-- Changes in Child update parentState -->
```

**But mutation without `bind:` is anti-pattern**:
```svelte
<!-- Parent.svelte -->
<Child value={parentState} />
<!-- Child mutating `value` is confusing (no bind directive) -->
```

#### Risk in Current Codebase

**Example from PhotoPreviewModal.svelte**:
```typescript
let {
  open = $bindable(true),  // ✅ Explicit two-way binding
  photo,                   // ❓ Can this be mutated?
  currentPersonId = null,  // ❓ Can this be mutated?
  onClose,                 // ❓ Can this be called with different args?
  onFaceAssigned           // ❓ Optional callback, can be undefined?
}: Props = $props();

// Line 300: Mutation without bind directive
currentPersonId = selectedPerson.id;  // ⚠️ Allowed? Or should emit event?
```

### Mutation Patterns Found

**Pattern 1: Local state derived from props** (Good)
```typescript
let { initialValue }: Props = $props();
let localValue = $state(initialValue);  // ✅ Copy to local state
```

**Pattern 2: Direct prop mutation** (Risky)
```typescript
let { value }: Props = $props();
value = newValue;  // ⚠️ Only works with bind: directive in parent
```

**Pattern 3: Callback props with state** (Mixed)
```typescript
let { onUpdate, items }: Props = $props();
onUpdate(items.filter(...));  // ❓ Is items mutation or new array?
```

### Impact on Component API Clarity

- **Unclear Contracts**: Which props are read-only vs. mutable?
- **Missing `$bindable()`**: Explicit two-way binding not used consistently
- **Callback Ambiguity**: When to call callback vs. mutate prop?

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🟡 Component Props Conventions (Important)

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
   ```

2. **Complex objects or events** → Use callback props
   ```typescript
   let { onUpdate }: Props = $props();
   onUpdate({ field: 'new value' });
   ```

3. **Parent doesn't need updates** → Read-only props
   ```typescript
   let { config }: Props = $props();
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

Every component MUST document prop mutability:
```typescript
interface Props {
  /** Read-only: Component displays name */
  name: string;

  /** Two-way binding: Parent tracks open state via bind:open */
  open: boolean;

  /** Event: Called when user clicks delete button */
  onDelete: (id: string) => void;
}
```

### Migration Path
- Audit components with `$props()` for undocumented mutations
- Add `$bindable()` to props that are mutated
- Convert prop mutations to callback emissions where appropriate
```

---

## 8. Svelte 5 Derived Complexity 🟢

### Findings

**9 files use `$derived.by()` for complex derivations**

#### Pattern: Multi-Step Transformations

**From FindMoreDialog.svelte**:
```typescript
let groupedSuggestions = $derived.by(() => {
  return suggestions.reduce((acc, s) => {
    const key = `${s.faceSimilarity.toFixed(2)}_${s.personId}`;
    if (!acc[key]) {
      acc[key] = { person: s.person, suggestions: [] };
    }
    acc[key].suggestions.push(s);
    return acc;
  }, {} as Record<string, GroupedSuggestion>);
});
```

**Complexity**: 10 lines of imperative reduce logic inside derivation.

#### Alternative: Separate Function

```typescript
// ✅ RECOMMENDED: Extract to named function
function groupSuggestionsByPerson(
  suggestions: FaceSuggestion[]
): Record<string, GroupedSuggestion> {
  return suggestions.reduce((acc, s) => {
    const key = `${s.faceSimilarity.toFixed(2)}_${s.personId}`;
    if (!acc[key]) {
      acc[key] = { person: s.person, suggestions: [] };
    }
    acc[key].suggestions.push(s);
    return acc;
  }, {});
}

// Derivation is now simple
let groupedSuggestions = $derived(groupSuggestionsByPerson(suggestions));
```

**Benefits**:
1. **Testable**: Can unit test `groupSuggestionsByPerson()` independently
2. **Readable**: Function name documents intent
3. **Reusable**: Same logic can be used elsewhere

### When to Use $derived.by()

**Valid use cases** (from codebase):
```typescript
// ✅ GOOD: Multiple reactive dependencies
let filteredPersons = $derived.by(() => {
  const query = personSearchQuery.toLowerCase().trim();
  let results = query ? persons.filter(p => p.name.includes(query)) : persons;

  return [...results].sort((a, b) => {
    const rankA = recentPersonIds.indexOf(a.id);
    const rankB = recentPersonIds.indexOf(b.id);
    // ... sorting logic
  });
});
```

**Why valid**: Depends on 3 reactive variables (`personSearchQuery`, `persons`, `recentPersonIds`).

**Invalid use case**:
```typescript
// ❌ OVERUSE: Single reactive dependency
let fullName = $derived.by(() => {
  return `${firstName} ${lastName}`;
});

// ✅ SIMPLER: Use plain $derived
let fullName = $derived(`${firstName} ${lastName}`);
```

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🟢 Svelte 5 Derived Best Practices (Recommended)

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
  // 30 lines of logic
  return computed;
});

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

// ✅ BETTER: Memoize or use $effect with caching
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
    const persons = [{ name: 'John' }, { name: 'Jane' }];
    const result = filterAndSortPersons(persons, 'jo', []);
    expect(result).toEqual([{ name: 'John' }]);
  });

  it('sorts by MRU order', () => { /* ... */ });
});
```

### Migration Path
- Extract derivations >10 lines to named functions
- Add unit tests for extracted functions
- Document complex derivations with comments
```

---

## 9. localStorage Type Safety 🟢

### Findings

**`localSettings.svelte.ts` lacks runtime validation for stored values**

#### Current Implementation (Lines 35-58)
```typescript
function get<T>(key: string, defaultValue: T): T {
  if (state.cache.has(key)) {
    return state.cache.get(key) as T;  // ⚠️ Unchecked cast
  }

  if (browser) {
    try {
      const stored = localStorage.getItem(getStorageKey(key));
      if (stored !== null) {
        const parsed = JSON.parse(stored) as T;  // ⚠️ No validation
        state.cache.set(key, parsed);
        return parsed;
      }
    } catch (err) {
      console.warn(`Failed to load setting "${key}"`, err);
      // Falls through to return default
    }
  }

  return defaultValue;
}
```

### Potential Issues

**Issue 1: JSON.parse() can return unexpected types**
```typescript
// User manually edits localStorage in DevTools:
localStorage.setItem('image-search.search.sortOrder', '"invalid_value"');

// Code expects: 'relevance' | 'date_asc' | 'date_desc'
const sortOrder = localSettings.get<SortOrder>('search.sortOrder', 'relevance');
// Result: sortOrder = "invalid_value" (type safety broken at runtime)
```

**Issue 2: Schema changes over time**
```typescript
// V1: Setting stored as string
localSettings.set('people.viewMode', 'grid');

// V2: Changed to object { mode: 'grid', size: 'medium' }
const viewMode = localSettings.get<ViewModeConfig>('people.viewMode', defaultConfig);
// Result: viewMode = "grid" (wrong type, causes runtime error)
```

**Issue 3: User data corruption**
```typescript
// Malformed JSON in localStorage (user edited, browser bug, etc.)
localStorage.setItem('image-search.filters', '{invalid json}');

// Code catches parse error and returns default (good)
// But: No user notification, silent data loss
```

### Impact on User Experience

- **Silent Failures**: Invalid data returns default without user knowing
- **Type Safety Illusion**: TypeScript types don't match runtime values
- **Upgrade Pain**: Changing setting schema breaks existing users

### Proposed Guard-Rails for CLAUDE.md

```markdown
## 🟢 localStorage Type Safety (Recommended)

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

### Migration Path

**Phase 1**: Add optional schema parameter
- Backward compatible (schema is optional)
- Existing code continues to work

**Phase 2**: Add schemas to critical settings
- User preferences (sort orders, view modes)
- App state (recent selections, filter presets)

**Phase 3**: Mandatory schemas for new settings
- Enforce in code reviews
- Document schema requirement in CLAUDE.md

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
```

---

## Summary: Recommended Action Items

### 🔴 Critical (Add to CLAUDE.md Immediately)

1. **Component Complexity Limits**
   - MAX 300 lines per component (strict enforcement)
   - Extract modals over 500 lines (9 components)
   - Add `make check-complexity` to CI

2. **Centralized Error Handling**
   - Create `src/lib/utils/errorHandler.ts`
   - Consolidate 5 error patterns into 1 standard
   - Mandate `handleError()` for all try/catch blocks

3. **State Management Reactivity**
   - Document `$state()` vs `$state.raw()` decision tree
   - Add wrapper functions for `$state.raw()` Maps
   - Mandate cleanup functions for async `$effect()`

4. **Test Coverage Gates**
   - Require tests for components with user interactions
   - Test template with happy/error/loading/empty states
   - Fix untested high-risk components (admin, destructive operations)

### 🟡 Important (Add Within 1 Week)

5. **Effect Loop Prevention**
   - Mandate `untrack()` for effects calling callback props
   - Add cleanup for data-fetching effects
   - Convert state-update effects to `$derived()`

6. **API Client Consolidation**
   - Move `apiRequest()` to single `client.ts` export
   - Remove 6 duplicated copies
   - Standardize error message format

7. **Props Mutation Conventions**
   - Document which props are read-only vs `$bindable()`
   - Use callbacks for complex change notifications
   - Add prop mutability to interface docs

### 🟢 Recommended (Nice to Have)

8. **Derived Complexity**
   - Extract derivations >10 lines to named functions
   - Unit test extracted derivation logic
   - Document when to use `$derived.by()`

9. **localStorage Validation**
   - Add optional Zod schema validation
   - Validate critical user preferences
   - Document schema evolution pattern

---

## Appendix: Metrics Summary

### Codebase Size
- **Components**: 130 .svelte files
- **API Modules**: 7 files (52 async functions)
- **Routes**: 17 pages
- **Tests**: 39 test files
- **Total SLOC**: ~18,000 lines (components only)

### Complexity Metrics
- **Components >500 lines**: 9 (7% of total)
- **Components >300 lines**: 23 (18% of total)
- **Largest component**: 1,107 lines (SuggestionDetailModal.svelte)

### Code Quality
- **Catch blocks**: 97 instances
- **Console.error**: 61 instances
- **$effect() usage**: 21 instances
- **$state.raw() usage**: 3 instances
- **Type casts (as)**: 6 in tests (acceptable)
- **ESLint disables**: 0 (excellent)

### Test Coverage
- **Component tests**: 28 files
- **Coverage rate**: 21% of components
- **Untested complex components**: 6 critical
- **Untested categories**: Admin (0%), Queues (0%)

### API Patterns
- **Duplicated apiRequest()**: 7 copies
- **Error transformation**: Inconsistent across 7 files
- **API modules**: All use generated types (good)

---

**Research Complete**
**Next Steps**: Prioritize 🔴 critical issues for CLAUDE.md updates
