# Hooks Directory

This directory contains **Svelte 5 runes-based hooks** for shared component logic.

## What are Hooks?

Hooks are reusable functions that encapsulate stateful logic using Svelte 5's runes API (`$state`, `$derived`, `$effect`). They follow a similar pattern to React hooks but leverage Svelte's fine-grained reactivity.

## Pattern

All hooks follow this structure:

```typescript
export function useFeatureName() {
  // Reactive state using $state
  let someValue = $state(initialValue);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Derived state using $derived
  let computedValue = $derived(transformSomeValue(someValue));

  // Action functions
  async function doSomething() {
    loading = true;
    try {
      // ... logic ...
      someValue = newValue;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error';
    } finally {
      loading = false;
    }
  }

  // Return object with getters for reactivity
  return {
    get someValue() { return someValue; },
    get loading() { return loading; },
    get error() { return error; },
    get computedValue() { return computedValue; },
    doSomething
  };
}
```

## Available Hooks

### `useFaceAssignment.svelte.ts`

Manages face assignment logic shared between modals:

- **State**: persons list, loading states, errors
- **Actions**: `loadPersons()`, `assignToExisting()`, `createAndAssign()`, `reset()`
- **MRU Tracking**: Tracks recent person IDs in localStorage
- **Used By**: PhotoPreviewModal, SuggestionDetailModal (future)

**Example**:
```typescript
import { useFaceAssignment } from '$lib/hooks/useFaceAssignment.svelte';

const assignment = useFaceAssignment();

onMount(() => {
  assignment.loadPersons();
});

await assignment.assignToExisting(faceId, personId);
```

See `useFaceAssignment.example.md` for detailed usage examples.

## When to Create a Hook

Create a new hook when:

1. **Logic is duplicated** across multiple components (150+ lines duplicated)
2. **Stateful logic** needs to be shared (not just utility functions)
3. **Reactivity is needed** (requires `$state`, `$derived`, or `$effect`)
4. **Unit testing** would benefit from isolated logic

## When NOT to Use Hooks

Use regular functions or stores instead when:

- **Stateless utilities**: Use `src/lib/utils/` for pure functions
- **Global state**: Use `src/lib/stores/` for app-wide state (e.g., `thumbnailCache`, `localSettings`)
- **Simple logic**: < 50 lines of code, single-use in one component

## Naming Convention

- **File**: `useFeatureName.svelte.ts` (camelCase with "use" prefix)
- **Function**: `export function useFeatureName()` (matches filename)
- **Examples**: `useFaceAssignment`, `useImageFilters`, `useSearchHistory`

## Testing Hooks

Test hooks in isolation using Vitest:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { useFaceAssignment } from './useFaceAssignment.svelte';

describe('useFaceAssignment', () => {
  it('should load persons successfully', async () => {
    const hook = useFaceAssignment();
    await hook.loadPersons();
    expect(hook.persons.length).toBeGreaterThan(0);
    expect(hook.personsLoading).toBe(false);
  });

  it('should handle assignment errors', async () => {
    const hook = useFaceAssignment();
    await expect(() =>
      hook.assignToExisting('invalid-id', 'invalid-person')
    ).rejects.toThrow();
    expect(hook.error).toBeTruthy();
  });
});
```

## Related Patterns

- **Stores** (`src/lib/stores/`): Global reactive state using runes pattern
- **API Clients** (`src/lib/api/`): Domain-specific API functions (stateless)
- **Components** (`src/lib/components/`): UI components that consume hooks

## References

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/$state)
- [thumbnailCache.svelte.ts](../stores/thumbnailCache.svelte.ts) - Runes-based store pattern
- [localSettings.svelte.ts](../stores/localSettings.svelte.ts) - localStorage wrapper
