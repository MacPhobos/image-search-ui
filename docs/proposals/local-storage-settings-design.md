# Local Storage Settings System - Design Proposal

> **Created**: 2026-01-08
> **Updated**: 2026-01-08
> **Status**: Draft - For Review
> **Author**: Claude Code

---

## Problem Statement

The application needs to persist UI-related user preferences in the browser, separate from backend database settings. Current approach (seen in `CreateSessionModal.svelte`) uses inline localStorage calls which:

1. Lacks type safety for stored values
2. Requires repetitive boilerplate (try/catch, JSON parsing)
3. Doesn't integrate well with Svelte 5 reactivity

---

## Requirements

### Functional
- Store and retrieve UI settings from browser localStorage
- Type-safe values at point of use (generics)
- Default values when no stored value exists
- Easy integration with existing Svelte 5 components
- **No centralized knowledge of specific settings** - keys defined at point of use

### Non-Functional
- SSR-safe (localStorage doesn't exist on server)
- Graceful degradation (private browsing, quota exceeded)
- Namespaced keys to avoid conflicts with other apps
- Consistent with existing codebase patterns (`thumbnailCache.svelte.ts`)

---

## Proposed Solution: Generic Runes-Based Store

Create a **generic** settings store using Svelte 5 runes pattern. The store handles:
- Serialization/deserialization (JSON)
- localStorage interaction with error handling
- SSR safety
- Namespace prefixing

**The store has NO knowledge of specific settings** - all keys and types are defined at the component level.

**Architecture**:
```
src/lib/stores/
└── localSettings.svelte.ts   # Generic store (single file)
```

---

## Detailed Design

### Core Store (`localSettings.svelte.ts`)

```typescript
// src/lib/stores/localSettings.svelte.ts
import { browser } from '$app/environment';

/** Namespace prefix for all localStorage keys to avoid conflicts */
const STORAGE_NAMESPACE = 'image-search';

interface LocalSettingsState {
  /** In-memory cache of all accessed settings */
  cache: Map<string, unknown>;
}

function createLocalSettings() {
  const state = $state<LocalSettingsState>({
    cache: new Map()
  });

  /**
   * Get the full localStorage key with namespace
   */
  function getStorageKey(key: string): string {
    return `${STORAGE_NAMESPACE}.${key}`;
  }

  /**
   * Get a setting value. Returns the stored value if it exists,
   * otherwise returns the provided default.
   *
   * @param key - The setting key (e.g., 'training.lastRootPath')
   * @param defaultValue - Value to return if setting doesn't exist
   * @returns The stored value or default
   *
   * @example
   * const sortOrder = localSettings.get('search.sortOrder', 'relevance');
   * const pageSize = localSettings.get('search.pageSize', 24);
   */
  function get<T>(key: string, defaultValue: T): T {
    // Check in-memory cache first
    if (state.cache.has(key)) {
      return state.cache.get(key) as T;
    }

    // Try to load from localStorage
    if (browser) {
      try {
        const stored = localStorage.getItem(getStorageKey(key));
        if (stored !== null) {
          const parsed = JSON.parse(stored) as T;
          state.cache.set(key, parsed);
          return parsed;
        }
      } catch (err) {
        // JSON parse error or localStorage access error
        console.warn(`Failed to load setting "${key}" from localStorage:`, err);
      }
    }

    // Cache and return default
    state.cache.set(key, defaultValue);
    return defaultValue;
  }

  /**
   * Set a setting value with automatic persistence.
   *
   * @param key - The setting key
   * @param value - The value to store
   *
   * @example
   * localSettings.set('search.sortOrder', 'date_desc');
   * localSettings.set('people.viewMode', 'grid');
   */
  function set<T>(key: string, value: T): void {
    // Update in-memory cache
    state.cache.set(key, value);
    // Trigger reactivity by creating new Map
    state.cache = new Map(state.cache);

    // Persist to localStorage
    if (browser) {
      try {
        localStorage.setItem(getStorageKey(key), JSON.stringify(value));
      } catch (err) {
        console.warn(`Failed to save setting "${key}" to localStorage:`, err);
      }
    }
  }

  /**
   * Remove a setting from storage.
   *
   * @param key - The setting key to remove
   */
  function remove(key: string): void {
    state.cache.delete(key);
    state.cache = new Map(state.cache);

    if (browser) {
      try {
        localStorage.removeItem(getStorageKey(key));
      } catch (err) {
        console.warn(`Failed to remove setting "${key}" from localStorage:`, err);
      }
    }
  }

  /**
   * Check if a setting exists in storage (not just cached default).
   *
   * @param key - The setting key to check
   */
  function has(key: string): boolean {
    if (browser) {
      try {
        return localStorage.getItem(getStorageKey(key)) !== null;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Clear all settings under the namespace.
   * Use with caution - this removes ALL persisted UI settings.
   */
  function clearAll(): void {
    if (browser) {
      try {
        const prefix = `${STORAGE_NAMESPACE}.`;
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (err) {
        console.warn('Failed to clear settings from localStorage:', err);
      }
    }
    state.cache = new Map();
  }

  return {
    get state() {
      return state;
    },
    get,
    set,
    remove,
    has,
    clearAll
  };
}

export const localSettings = createLocalSettings();
```

### No Initialization Required

Unlike the previous design, this generic approach **does not require initialization** in the root layout. Settings are lazily loaded on first access.

---

## Usage Examples

### Example 1: Simple Get/Set in a Select

```svelte
<script lang="ts">
  import { localSettings } from '$lib/stores/localSettings.svelte';

  // Define the key and default WHERE IT'S USED
  type SortOrder = 'relevance' | 'date_asc' | 'date_desc' | 'name';
  const SORT_KEY = 'search.sortOrder';
  const DEFAULT_SORT: SortOrder = 'relevance';

  function handleSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    localSettings.set(SORT_KEY, select.value as SortOrder);
  }
</script>

<select
  value={localSettings.get(SORT_KEY, DEFAULT_SORT)}
  onchange={handleSortChange}
>
  <option value="relevance">Relevance</option>
  <option value="date_desc">Newest First</option>
  <option value="date_asc">Oldest First</option>
  <option value="name">Name</option>
</select>
```

### Example 2: Reactive Binding with $derived

```svelte
<script lang="ts">
  import { localSettings } from '$lib/stores/localSettings.svelte';

  // Settings key and type defined locally
  type ViewMode = 'grid' | 'list';
  const VIEW_MODE_KEY = 'people.viewMode';

  // Derive reactive state - will update when setting changes
  let viewMode = $derived(localSettings.get<ViewMode>(VIEW_MODE_KEY, 'grid'));

  function toggleViewMode() {
    const newMode: ViewMode = viewMode === 'grid' ? 'list' : 'grid';
    localSettings.set(VIEW_MODE_KEY, newMode);
  }
</script>

<button onclick={toggleViewMode}>
  {viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
</button>
```

### Example 3: Migrating Existing Code (CreateSessionModal)

**Before** (current inline approach - ~30 lines):
```svelte
<script lang="ts">
  const STORAGE_KEYS = {
    LAST_ROOT_PATH: 'training.lastRootPath',
    LAST_CATEGORY_ID: 'training.lastCategoryId'
  };

  onMount(() => {
    try {
      const lastRootPath = localStorage.getItem(STORAGE_KEYS.LAST_ROOT_PATH);
      if (lastRootPath) rootPath = lastRootPath;

      const lastCategoryId = localStorage.getItem(STORAGE_KEYS.LAST_CATEGORY_ID);
      if (lastCategoryId) {
        const categoryIdNum = parseInt(lastCategoryId, 10);
        if (!isNaN(categoryIdNum)) {
          categoryId = categoryIdNum;
        }
      }
    } catch (err) {
      console.warn('Failed to load last-used values from localStorage:', err);
    }
  });

  // On save...
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ROOT_PATH, rootPath);
    if (categoryId !== null) {
      localStorage.setItem(STORAGE_KEYS.LAST_CATEGORY_ID, categoryId.toString());
    }
  } catch (err) {
    console.warn('Failed to save last-used values to localStorage:', err);
  }
</script>
```

**After** (with localSettings - ~10 lines):
```svelte
<script lang="ts">
  import { localSettings } from '$lib/stores/localSettings.svelte';
  import { onMount } from 'svelte';

  // Keys defined where they're used
  const KEYS = {
    ROOT_PATH: 'training.lastRootPath',
    CATEGORY_ID: 'training.lastCategoryId'
  } as const;

  let rootPath = $state('');
  let categoryId = $state<number | null>(null);

  onMount(() => {
    // Clean one-liners with defaults and automatic JSON parsing
    rootPath = localSettings.get(KEYS.ROOT_PATH, '');
    categoryId = localSettings.get<number | null>(KEYS.CATEGORY_ID, null);
  });

  // On save - automatic JSON serialization, error handling
  function saveSettings() {
    localSettings.set(KEYS.ROOT_PATH, rootPath);
    localSettings.set(KEYS.CATEGORY_ID, categoryId);
  }
</script>
```

### Example 4: Checkbox Persistence

```svelte
<script lang="ts">
  import { localSettings } from '$lib/stores/localSettings.svelte';

  const SHOW_UNKNOWN_KEY = 'people.showUnknown';

  // Reactive - updates if setting changes elsewhere
  let showUnknown = $derived(localSettings.get(SHOW_UNKNOWN_KEY, false));

  function handleToggle(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    localSettings.set(SHOW_UNKNOWN_KEY, checkbox.checked);
  }
</script>

<label>
  <input
    type="checkbox"
    checked={showUnknown}
    onchange={handleToggle}
  />
  Show unknown faces
</label>
```

### Example 5: Numeric Settings

```svelte
<script lang="ts">
  import { localSettings } from '$lib/stores/localSettings.svelte';

  const PAGE_SIZE_KEY = 'search.resultsPerPage';

  // Numbers are automatically serialized/deserialized as JSON
  let pageSize = $derived(localSettings.get(PAGE_SIZE_KEY, 24));

  function handlePageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    localSettings.set(PAGE_SIZE_KEY, parseInt(select.value, 10));
  }
</script>

<select value={pageSize} onchange={handlePageSizeChange}>
  <option value="12">12 per page</option>
  <option value="24">24 per page</option>
  <option value="48">48 per page</option>
</select>
```

### Example 6: Complex Object Settings

```svelte
<script lang="ts">
  import { localSettings } from '$lib/stores/localSettings.svelte';

  // Complex types work too - JSON serialized automatically
  interface FilterState {
    dateRange: { start: string; end: string } | null;
    categories: number[];
    minScore: number;
  }

  const FILTER_KEY = 'search.advancedFilters';
  const DEFAULT_FILTERS: FilterState = {
    dateRange: null,
    categories: [],
    minScore: 0
  };

  let filters = $derived(localSettings.get<FilterState>(FILTER_KEY, DEFAULT_FILTERS));

  function saveFilters(newFilters: FilterState) {
    localSettings.set(FILTER_KEY, newFilters);
  }
</script>
```

---

## Adding New Settings

To add a new setting, simply use it in your component:

```svelte
<script lang="ts">
  import { localSettings } from '$lib/stores/localSettings.svelte';

  // 1. Define key (recommend domain.settingName convention)
  const MY_SETTING_KEY = 'myFeature.myPreference';

  // 2. Define type and default
  type MySettingType = 'option1' | 'option2' | 'option3';
  const DEFAULT_VALUE: MySettingType = 'option1';

  // 3. Use it
  let setting = $derived(localSettings.get<MySettingType>(MY_SETTING_KEY, DEFAULT_VALUE));

  function updateSetting(newValue: MySettingType) {
    localSettings.set(MY_SETTING_KEY, newValue);
  }
</script>
```

**No central registry needed** - TypeScript generics provide type safety at the point of use.

---

## Testing Strategy

### Unit Tests for Store

```typescript
// src/tests/stores/localSettings.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Note: Need to mock $app/environment for SSR check
vi.mock('$app/environment', () => ({ browser: true }));

describe('localSettings', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Fresh mock localStorage for each test
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      get length() { return Object.keys(mockStorage).length; },
      key: (i: number) => Object.keys(mockStorage)[i] ?? null,
    });
  });

  it('returns default when setting not stored', async () => {
    const { localSettings } = await import('$lib/stores/localSettings.svelte');
    const result = localSettings.get('test.key', 'default-value');
    expect(result).toBe('default-value');
  });

  it('returns stored value when present', async () => {
    mockStorage['image-search.test.key'] = '"stored-value"';
    const { localSettings } = await import('$lib/stores/localSettings.svelte');
    const result = localSettings.get('test.key', 'default');
    expect(result).toBe('stored-value');
  });

  it('persists setting to localStorage with namespace', async () => {
    const { localSettings } = await import('$lib/stores/localSettings.svelte');
    localSettings.set('test.key', 'new-value');
    expect(mockStorage['image-search.test.key']).toBe('"new-value"');
  });

  it('handles complex objects', async () => {
    const { localSettings } = await import('$lib/stores/localSettings.svelte');
    const obj = { foo: 'bar', num: 42, nested: { a: 1 } };
    localSettings.set('test.complex', obj);
    expect(JSON.parse(mockStorage['image-search.test.complex'])).toEqual(obj);
  });

  it('handles JSON parse errors gracefully', async () => {
    mockStorage['image-search.test.invalid'] = 'not-valid-json';
    const { localSettings } = await import('$lib/stores/localSettings.svelte');
    const result = localSettings.get('test.invalid', 'fallback');
    expect(result).toBe('fallback');
  });

  it('removes setting from storage', async () => {
    mockStorage['image-search.test.key'] = '"value"';
    const { localSettings } = await import('$lib/stores/localSettings.svelte');
    localSettings.remove('test.key');
    expect(mockStorage['image-search.test.key']).toBeUndefined();
  });

  it('clears all namespaced settings', async () => {
    mockStorage['image-search.a'] = '"1"';
    mockStorage['image-search.b'] = '"2"';
    mockStorage['other-app.c'] = '"3"';  // Should not be cleared
    const { localSettings } = await import('$lib/stores/localSettings.svelte');
    localSettings.clearAll();
    expect(mockStorage['image-search.a']).toBeUndefined();
    expect(mockStorage['image-search.b']).toBeUndefined();
    expect(mockStorage['other-app.c']).toBe('"3"');
  });
});
```

### Component Integration Tests

Use existing mock patterns from `tests/helpers/mockFetch.ts` as a model. Components that use `localSettings` can be tested by pre-populating the mock localStorage.

---

## Key Naming Convention

**Recommended**: `domain.settingName` using dot notation

| Domain | Example Keys |
|--------|--------------|
| `search` | `search.sortOrder`, `search.pageSize` |
| `people` | `people.viewMode`, `people.showUnknown` |
| `training` | `training.lastRootPath`, `training.lastCategoryId` |
| `faces` | `faces.thumbnailSize`, `faces.groupBy` |
| `ui` | `ui.sidebarCollapsed`, `ui.theme` |

This convention:
- Groups related settings visually in DevTools
- Avoids key collisions
- Makes debugging easier
- All keys are prefixed with `image-search.` in actual storage

---

## Migration Path

### Phase 1: Core Implementation (Day 1)
1. Create `localSettings.svelte.ts` store
2. Add unit tests
3. Verify SSR safety

### Phase 2: Migrate Existing Code (Day 2)
1. Migrate `CreateSessionModal.svelte` (first consumer)
2. Verify existing behavior preserved

### Phase 3: Adopt in New Features (Ongoing)
1. Use `localSettings` for any new UI persistence needs
2. Document patterns in CLAUDE.md

---

## Alternatives Considered

### A. Centralized Schema (Original Proposal)

Define all setting keys and types in a central registry file.

**Pros**: Compile-time enforcement of all keys, single source of truth
**Cons**: Requires updating central file for each new setting, couples store to specific settings, more ceremony

**Decision**: Rejected - prefer decentralized approach where keys are defined at point of use.

### B. Per-Component localStorage Hooks

Each component uses its own `useLocalStorage(key, default)` function without shared state.

**Pros**: Complete component isolation
**Cons**: No reactivity across components, duplicated cache logic

**Decision**: Rejected - shared cache provides cross-component reactivity.

### C. Svelte Context API

Provide settings via Svelte context from root layout.

**Pros**: Explicit dependency injection, testable
**Cons**: More boilerplate, requires layout changes, verbose

**Decision**: Rejected - singleton store is simpler for this use case.

### D. Third-Party Library (svelte-persisted-store)

Use existing npm package for persistence.

**Pros**: Battle-tested, feature-rich
**Cons**: External dependency, designed for Svelte 4 stores not Svelte 5 runes

**Decision**: Rejected - custom implementation better fits Svelte 5 patterns.

---

## Open Questions

1. **Session vs persistent storage**: Should some settings use sessionStorage?
   - *Recommendation*: Start with localStorage only. If needed, add `sessionSettings` store later with same API.

2. **Type validation**: Should we validate stored values match expected type?
   - *Recommendation*: No runtime validation - trust JSON parsing. TypeScript generics provide dev-time safety.

3. **Default value reference equality**: Returning same default object could cause mutation issues.
   - *Recommendation*: Document that defaults for objects should be inline or frozen. Could add deep-clone if problems arise.

---

## Decision Checklist

- [x] Approve overall approach (Generic Runes-Based Store)
- [x] Confirm decentralized key definitions (at point of use)
- [ ] Confirm key naming convention (dot notation recommended)
- [ ] Approve file location (`src/lib/stores/localSettings.svelte.ts`)
- [ ] Confirm migration starts with `CreateSessionModal.svelte`

---

## Next Steps (After Approval)

1. Implement `localSettings.svelte.ts` (single file, ~80 lines)
2. Add unit tests (`src/tests/stores/localSettings.test.ts`)
3. Migrate `CreateSessionModal.svelte` as proof of concept
4. Update `CLAUDE.md` with usage patterns

---

## API Summary

```typescript
import { localSettings } from '$lib/stores/localSettings.svelte';

// Get with default (lazy-loads from localStorage)
const value = localSettings.get<T>(key: string, defaultValue: T): T;

// Set (persists to localStorage immediately)
localSettings.set<T>(key: string, value: T): void;

// Remove single setting
localSettings.remove(key: string): void;

// Check if setting exists in storage
localSettings.has(key: string): boolean;

// Clear all settings (use with caution)
localSettings.clearAll(): void;

// Access reactive state (for advanced use)
localSettings.state; // { cache: Map<string, unknown> }
```
