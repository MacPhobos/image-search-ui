# DevOverlay Component Tracking Guide

> **Purpose**: Track Svelte components in the DevOverlay for debugging and development visibility.
> **Status**: Manual registration required (automatic Vite plugin incompatible with Svelte 5 SSR)

---

## Quick Reference

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  // Register component (MUST be synchronous - not inside onMount)
  const cleanup = registerComponent('MyComponent', {
    filePath: 'src/lib/components/MyComponent.svelte'
  });

  // Cleanup on unmount
  onMount(() => cleanup);
</script>
```

---

## When to Add Tracking

### Must Track (High Priority)

| Component Type | Examples | Pattern | Why Track |
|---------------|----------|---------|-----------|
| **Pages** | `+page.svelte` in routes | Mount-based | Show current route in DevOverlay |
| **Layouts** | `+layout.svelte` | Mount-based | Show layout hierarchy |
| **Modals/Dialogs** | `*Modal.svelte`, `*Dialog.svelte` | **Visibility-based** | Track overlay visibility |
| **Complex State Components** | `PersonManager.svelte` | Mount-based | Debug state flow |

### Should Track (Medium Priority)

| Component Type | Examples | Why Track |
|---------------|----------|-----------|
| **Feature Components** | `FaceGrid.svelte`, `SearchFilters.svelte` | Identify active features |
| **Data-Bound Components** | `PersonCard.svelte`, `AssetThumbnail.svelte` | Debug data flow |

### Skip Tracking (Low Value)

| Component Type | Examples | Why Skip |
|---------------|----------|----------|
| **UI Primitives** | `Button.svelte`, `Input.svelte` | Too granular, adds noise |
| **Pure Display** | `Badge.svelte`, `Icon.svelte` | No meaningful state |
| **Third-Party** | `shadcn-svelte` components | Not our code |

---

## Implementation Pattern

### Basic Registration

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  // 1. Call registerComponent synchronously during component initialization
  //    This is required because it uses Svelte's getContext() internally
  const cleanup = registerComponent('ComponentName', {
    filePath: 'src/path/to/Component.svelte'
  });

  // 2. Return cleanup function from onMount to unregister on destroy
  onMount(() => cleanup);
</script>
```

### With Props Tracking (Optional)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  interface Props {
    personId: string;
    mode: 'view' | 'edit';
  }
  let { personId, mode }: Props = $props();

  // Track props for debugging (useful for complex components)
  const cleanup = registerComponent('PersonEditor', {
    filePath: 'src/lib/components/PersonEditor.svelte',
    props: { personId, mode }  // Shows in DevOverlay
  });

  onMount(() => cleanup);
</script>
```

### Modal/Dialog Components (Visibility-Based Tracking)

Modals and dialogs are typically always mounted in the DOM but conditionally visible. For these components, use **visibility-based tracking** instead of mount-based:

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';

  interface Props {
    open: boolean;
    // ... other props
  }
  let { open }: Props = $props();

  // Get stack reference synchronously (required for context)
  const componentStack = getComponentStack();
  let trackingCleanup: (() => void) | null = null;

  // Track based on visibility, not mount
  $effect(() => {
    if (open && componentStack) {
      // Modal opened - register
      trackingCleanup = untrack(() =>
        registerComponent('MyModal', {
          filePath: 'src/lib/components/MyModal.svelte'
        })
      );
    } else if (trackingCleanup) {
      // Modal closed - unregister
      trackingCleanup();
      trackingCleanup = null;
    }

    // Cleanup on unmount or effect re-run
    return () => {
      if (trackingCleanup) {
        trackingCleanup();
        trackingCleanup = null;
      }
    };
  });
</script>
```

**When to use visibility-based tracking:**
- Modals/dialogs that are always in the DOM
- Components with `open` or `visible` props
- Overlay panels that show/hide without unmounting

### Conditional Registration (DEV-only)

The `registerComponent` function already has DEV guards internally, but you can add an explicit guard if you want to avoid the import in production:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  // Simpler approach - import is tree-shaken, function is no-op in prod
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';
  const cleanup = registerComponent('MyComponent', {
    filePath: 'src/lib/components/MyComponent.svelte'
  });

  onMount(() => cleanup);
</script>
```

---

## Naming Conventions

### Component Name Format

Use consistent naming that reflects the component's location and purpose:

| Component Location | Name Format | Example |
|-------------------|-------------|---------|
| `src/routes/*/+page.svelte` | `routes/{path}/+page` | `routes/people/+page` |
| `src/routes/*/+layout.svelte` | `routes/{path}/+layout` | `routes/faces/+layout` |
| `src/lib/components/*.svelte` | `{ComponentName}` | `SuggestionDetailModal` |
| `src/lib/components/{domain}/*.svelte` | `{domain}/{ComponentName}` | `faces/PersonCard` |

### File Path Format

Always use the full path from `src/`:

```typescript
// Good
filePath: 'src/lib/components/faces/SuggestionDetailModal.svelte'
filePath: 'src/routes/people/+page.svelte'

// Bad - relative paths are confusing
filePath: './SuggestionDetailModal.svelte'
filePath: 'SuggestionDetailModal.svelte'
```

---

## DevOverlay Display

When components are tracked, the DevOverlay shows:

```
┌─ Components (3) ─────────────────────────────┐
│ 🔵 routes/people/+page                       │
│    src/routes/people/+page.svelte            │
│                                              │
│ 🟡 faces/PersonCard                          │
│    src/lib/components/faces/PersonCard.svelte│
│                                              │
│ 🟣 SuggestionDetailModal                     │
│    src/lib/components/faces/SuggestionDet... │
└──────────────────────────────────────────────┘
```

**Color Coding**:
- 🔵 Blue: Route pages (`+page.svelte`)
- 🟣 Purple: Layouts (`+layout.svelte`)
- 🟡 Yellow: Regular components

---

## Common Mistakes

### 1. Calling registerComponent Inside onMount

```svelte
<!-- ❌ WRONG - getContext fails inside onMount -->
<script>
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  onMount(() => {
    const cleanup = registerComponent('MyComponent', {...});
    return cleanup;
  });
</script>

<!-- ✅ CORRECT - Call synchronously, return cleanup from onMount -->
<script>
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  const cleanup = registerComponent('MyComponent', {...});
  onMount(() => cleanup);
</script>
```

### 2. Forgetting Cleanup

```svelte
<!-- ❌ WRONG - Component stays in registry after unmount -->
<script>
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';
  registerComponent('MyComponent', {...});  // No cleanup!
</script>

<!-- ✅ CORRECT - Cleanup removes component on destroy -->
<script>
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  const cleanup = registerComponent('MyComponent', {...});
  onMount(() => cleanup);
</script>
```

### 3. Wrong File Path

```svelte
<!-- ❌ WRONG - Relative or incorrect path -->
const cleanup = registerComponent('PersonCard', {
  filePath: 'PersonCard.svelte'  // Not useful for navigation
});

<!-- ✅ CORRECT - Full path from src/ -->
const cleanup = registerComponent('PersonCard', {
  filePath: 'src/lib/components/faces/PersonCard.svelte'
});
```

---

## API Reference

### `registerComponent(name, options?)`

Registers a component with the tracking system.

**Parameters**:
- `name: string` - Display name for the component
- `options?: RegisterOptions` - Optional metadata
  - `filePath?: string` - Source file path (for "copy path" feature)
  - `props?: Record<string, unknown>` - Props to display in DevOverlay
  - `customData?: Record<string, unknown>` - Additional debug data

**Returns**: `() => void` - Cleanup function to call on component destroy

**Example**:
```typescript
const cleanup = registerComponent('SuggestionDetailModal', {
  filePath: 'src/lib/components/faces/SuggestionDetailModal.svelte',
  props: { suggestionId, personName }
});
```

### `getComponentStack()`

Gets the current component stack (for custom tooling).

**Returns**: `ComponentStack | null`

### `formatComponentPath(stack)`

Formats the component stack as a breadcrumb string.

**Returns**: `string` - e.g., `"+layout → +page → PersonCard → Modal"`

---

## Production Safety

All component tracking code is:
1. **Guarded by `import.meta.env.DEV`** - Functions become no-ops in production
2. **Tree-shaken** - Dead code eliminated during build
3. **Zero runtime cost** - No performance impact in production

You don't need to wrap your tracking code in DEV checks, but you can for clarity:

```svelte
<script>
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  // Both approaches are production-safe:

  // Approach 1: Direct (functions are no-ops in prod)
  const cleanup = registerComponent('MyComponent', {...});
  onMount(() => cleanup);

  // Approach 2: Explicit guard (slightly cleaner in prod bundle)
  if (import.meta.env.DEV) {
    const cleanup = registerComponent('MyComponent', {...});
    onMount(() => cleanup);
  }
</script>
```

---

## Checklist for Adding Tracking

- [ ] Import `onMount` from `'svelte'`
- [ ] Import `registerComponent` from `'$lib/dev/componentRegistry.svelte'`
- [ ] Call `registerComponent()` synchronously (not inside onMount/effect)
- [ ] Use descriptive component name matching naming conventions
- [ ] Include full `filePath` from `src/`
- [ ] Add `onMount(() => cleanup)` for proper cleanup
- [ ] Test in DevOverlay to verify component appears

---

## Related Documentation

- [Code Quality Guard-Rails](./code-quality-guardrails.md) - Overall code standards
- [DevOverlay Component Tracking Plan](./plans/devoverlay-component-tracking.md) - Implementation history

---

**Last Updated**: 2026-01-11
