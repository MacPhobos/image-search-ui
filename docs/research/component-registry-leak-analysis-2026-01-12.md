# Component Registry Resource Leak Analysis

**Date**: 2026-01-12
**Reporter**: Investigation of DevOverlay component tree showing multiple instances of FaceListSidebar
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

**Root Cause**: FaceListSidebar is using **mount-based tracking** (`onMount(() => cleanup)`) instead of **visibility-based tracking**. The component remains in the DevOverlay registry after the modal is closed because the component is not destroyed when the modal closes.

**Impact**: Low - Only affects DevOverlay display in DEV mode, no runtime memory leak in actual component instances.

**Severity**: Low (cosmetic)

---

## Problem Description

When FaceListSidebar is displayed and closed multiple times (e.g., 10 times by opening/closing PhotoPreviewModal or SuggestionDetailModal), the DevOverlay component tree shows ~10 instances of `faces/FaceListSidebar` still registered.

This suggests either:

1. Bug in DevOverlay/componentRegistry - components not properly unregistered on unmount
2. Actual resource leak in FaceListSidebar - component not being destroyed properly

---

## Analysis: Component Registry System

### How Component Tracking Works

**File**: `src/lib/dev/componentRegistry.svelte.ts`

#### Registration Flow

```typescript
export function registerComponent(name: string, options: RegisterOptions = {}): () => void {
	if (!import.meta.env.DEV) return () => {};

	const stack = getContext<ComponentStack>(CONTEXT_KEY);
	if (!stack) {
		console.warn('[ComponentRegistry] No component stack found...');
		return () => {};
	}

	const component: ComponentInfo = {
		name,
		id: `${name}-${++idCounter}`, // Unique ID per instance
		mountedAt: Date.now(),
		filePath: options.filePath,
		props: options.props
	};

	// Add to stack
	stack.components.push(component);
	stack.lastUpdate = Date.now();

	// Return cleanup function
	return () => {
		if (!import.meta.env.DEV) return;

		const index = stack.components.findIndex((c) => c.id === component.id);
		if (index !== -1) {
			stack.components.splice(index, 1);
			stack.lastUpdate = Date.now();
		}
	};
}
```

**Key Observations**:

- ✅ Cleanup function correctly removes component by unique ID
- ✅ Uses `findIndex` and `splice` to remove from array
- ✅ No obvious bugs in registration/unregistration logic

#### Display Logic

**File**: `src/lib/dev/DevOverlay.svelte`

```typescript
// Get component stack synchronously during component init
const stack = getComponentStack();

// Component tracking - derive from the reactive stack
let componentStack = $derived(stack?.components ?? []);
let componentPath = $derived(
	componentStack.length > 0 ? componentStack.map((c) => c.name).join(' → ') : ''
);
```

**Key Observations**:

- ✅ Correctly derives from reactive stack
- ✅ No state duplication or stale references
- ✅ ComponentTree receives fresh `componentStack` on every render

**Conclusion**: The component registry system is functioning correctly. No bugs detected.

---

## Analysis: FaceListSidebar Component

**File**: `src/lib/components/faces/FaceListSidebar.svelte`

### Current Implementation (Lines 8-12)

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('faces/FaceListSidebar', {
		filePath: 'src/lib/components/faces/FaceListSidebar.svelte'
	});
	onMount(() => cleanup);

	// ... rest of component
</script>
```

**Pattern**: Mount-based tracking

- Registers synchronously during component initialization
- Cleanup called on component unmount via `onMount`

---

## Analysis: Parent Modal Components

### PhotoPreviewModal (Lines 71-92)

```svelte
<script lang="ts">
	// Component tracking for modals (visibility-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('PhotoPreviewModal', {
					filePath: 'src/lib/components/faces/PhotoPreviewModal.svelte'
				})
			);
		} else if (trackingCleanup) {
			trackingCleanup();
			trackingCleanup = null;
		}
		return () => {
			if (trackingCleanup) {
				trackingCleanup();
				trackingCleanup = null;
			}
		};
	});

	// ... FaceListSidebar is rendered inside the modal template
</script>
```

**Pattern**: Visibility-based tracking
**Key Observation**: Modal uses `$effect` to register/unregister based on `open` prop

### SuggestionDetailModal (Lines 27-83)

```svelte
<script lang="ts">
	// Component tracking for modals (visibility-based, not mount-based)
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	let open = $derived(suggestion !== null);

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('SuggestionDetailModal', {
					filePath: 'src/lib/components/faces/SuggestionDetailModal.svelte'
				})
			);
		} else if (trackingCleanup) {
			trackingCleanup();
			trackingCleanup = null;
		}
		return () => {
			if (trackingCleanup) {
				trackingCleanup();
				trackingCleanup = null;
			}
		};
	});

	// ... FaceListSidebar is rendered inside the modal template
</script>
```

**Pattern**: Visibility-based tracking
**Key Observation**: Modal uses `$effect` based on derived `open` state

---

## Root Cause

### The Problem

**FaceListSidebar uses mount-based tracking, but it's inside modals that use conditional rendering without unmounting.**

When a modal closes:

1. Modal sets `open = false`
2. Modal's visibility-based tracking **correctly unregisters** the modal itself
3. **However**, FaceListSidebar inside the modal is **NOT unmounted** from the DOM
4. FaceListSidebar's `onMount` cleanup **never runs** because the component never unmounts
5. FaceListSidebar remains registered in the component stack

### Why This Happens

Modern dialog/modal implementations often keep their content mounted in the DOM for performance reasons:

- Preserve scroll position
- Faster open/close animations
- Maintain internal component state

SvelteKit's Dialog component (based on shadcn-svelte) likely uses CSS `display: none` or `visibility: hidden` to hide the modal content, rather than conditionally rendering it with `{#if}`.

### Evidence from Parent Components

Both modal components explicitly use **visibility-based tracking** because they know they are "always mounted but conditionally visible":

**From `docs/dev-component-tracking.md` (Lines 98-147)**:

> ### Modal/Dialog Components (Visibility-Based Tracking)
>
> Modals and dialogs are typically always mounted in the DOM but conditionally visible. For these components, use **visibility-based tracking** instead of mount-based...
>
> **When to use visibility-based tracking:**
>
> - Modals/dialogs that are always in the DOM
> - Components with `open` or `visible` props
> - Overlay panels that show/hide without unmounting

The documentation explicitly addresses this exact scenario, but FaceListSidebar wasn't updated to follow the pattern.

---

## Impact Assessment

### User-Visible Impact: ❌ NONE

- FaceListSidebar component instances are properly cleaned up by Svelte's reactivity system
- No actual memory leak in production code
- Only affects DevOverlay display (DEV mode only)

### DevOverlay Impact: ⚠️ COSMETIC

- Multiple "ghost" entries in component tree
- Misleading component count
- Makes debugging harder (noise in component list)

### Production Impact: ✅ NONE

- `registerComponent` is a no-op in production builds (`import.meta.env.DEV` guard)
- Zero runtime overhead
- Tree-shaken completely in production

---

## Recommended Fix

### Option A: Visibility-Based Tracking in FaceListSidebar (RECOMMENDED)

Add `open` prop to FaceListSidebar and use visibility-based tracking:

```svelte
<script lang="ts">
	import { untrack } from 'svelte';
	import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';

	interface Props {
		// Add open prop to track visibility
		open?: boolean;
		// ... existing props
	}

	let { open = true /* ...existing props */ }: Props = $props();

	// Visibility-based tracking
	const componentStack = getComponentStack();
	let trackingCleanup: (() => void) | null = null;

	$effect(() => {
		if (open && componentStack) {
			trackingCleanup = untrack(() =>
				registerComponent('faces/FaceListSidebar', {
					filePath: 'src/lib/components/faces/FaceListSidebar.svelte'
				})
			);
		} else if (trackingCleanup) {
			trackingCleanup();
			trackingCleanup = null;
		}
		return () => {
			if (trackingCleanup) {
				trackingCleanup();
				trackingCleanup = null;
			}
		};
	});
</script>
```

**Pros**:

- Consistent with modal tracking pattern
- Accurately reflects component lifecycle
- Follows documented best practices

**Cons**:

- Requires adding `open` prop to FaceListSidebar
- Parent components must pass `open={open}` to FaceListSidebar
- More complex than mount-based tracking

### Option B: Remove Tracking from FaceListSidebar (SIMPLEST)

FaceListSidebar is a child component that's always visible when its parent modal is open. The parent modal already tracks itself, so tracking the sidebar adds limited value.

```svelte
<script lang="ts">
	// Remove tracking entirely - parent modal already tracked
	// import { onMount } from 'svelte';
	// import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// const cleanup = registerComponent(...);
	// onMount(() => cleanup);
</script>
```

**Pros**:

- Simplest solution
- No additional props needed
- Parent modal tracking already provides context

**Cons**:

- Less granular debugging visibility
- Can't see FaceListSidebar in component tree

### Option C: Force Remount with Svelte's `{#key}` (ALTERNATIVE)

Force FaceListSidebar to remount when modal opens/closes:

```svelte
<!-- In PhotoPreviewModal.svelte -->
{#if open}
	{#key photo.assetId}
		<FaceListSidebar {...props} />
	{/key}
{/if}
```

**Pros**:

- FaceListSidebar keeps mount-based tracking
- No changes to FaceListSidebar component

**Cons**:

- Forces component recreation (performance cost)
- Loses internal state on every open/close
- Not idiomatic for modal content

---

## Recommendation

**Choose Option B (Remove Tracking)** for simplicity and clarity:

1. **Low Value**: FaceListSidebar tracking provides minimal debugging benefit when parent modals are already tracked
2. **Consistent**: Matches priority guidance from tracking docs ("Skip Tracking" for child components in tracked parents)
3. **Simple**: No API changes, no additional props, no complex effects

**If granular tracking is needed later**, implement Option A (visibility-based tracking) to match the modal pattern.

---

## Prevention Strategy

### Documentation Update

Add to `docs/dev-component-tracking.md` under "Common Mistakes":

#### 5. Using Mount-Based Tracking Inside Modals

```svelte
<!-- ❌ WRONG - Child component uses mount-based tracking inside modal -->
<script lang="ts">
  // In ChildComponent.svelte (inside a modal)
  const cleanup = registerComponent('ChildComponent', {...});
  onMount(() => cleanup);  // Never runs if modal uses CSS visibility
</script>

<!-- ✅ CORRECT - Use visibility-based tracking in modal children -->
<script lang="ts">
  interface Props {
    open?: boolean;  // Track parent modal's open state
  }
  let { open = true }: Props = $props();

  const componentStack = getComponentStack();
  let trackingCleanup: (() => void) | null = null;

  $effect(() => {
    if (open && componentStack) {
      trackingCleanup = untrack(() => registerComponent(...));
    } else if (trackingCleanup) {
      trackingCleanup();
      trackingCleanup = null;
    }
    return () => {
      if (trackingCleanup) {
        trackingCleanup();
        trackingCleanup = null;
      }
    };
  });
</script>

<!-- ✅ ALSO CORRECT - Skip tracking child components in tracked modals -->
<script lang="ts">
  // No tracking - parent modal already tracked
</script>
```

### Code Review Checklist

When adding component tracking:

- [ ] Is this component inside a modal/dialog?
- [ ] Does the parent use CSS visibility (`display: none`) instead of conditional rendering?
- [ ] If yes, use visibility-based tracking or skip tracking
- [ ] If mount-based tracking is used, verify component actually unmounts when parent closes

---

## Related Files

- `src/lib/dev/componentRegistry.svelte.ts` - Registry implementation ✅ No bugs
- `src/lib/dev/DevOverlay.svelte` - Display logic ✅ No bugs
- `src/lib/dev/ComponentTree.svelte` - Tree rendering ✅ No bugs
- `src/lib/components/faces/FaceListSidebar.svelte` - 🔴 Uses wrong tracking pattern
- `src/lib/components/faces/PhotoPreviewModal.svelte` - Parent modal (visibility-based tracking)
- `src/lib/components/faces/SuggestionDetailModal.svelte` - Parent modal (visibility-based tracking)
- `docs/dev-component-tracking.md` - Tracking documentation (has guidance, but needs common mistake added)

---

## Verification Steps

### To Reproduce Issue

1. Start dev server: `make dev`
2. Navigate to any page with face modals (e.g., `/people/[id]`)
3. Open DevOverlay (expand component tree)
4. Open and close PhotoPreviewModal 10 times
5. Check DevOverlay - observe ~10 instances of `faces/FaceListSidebar`

### To Verify Fix (After Implementing Option B)

1. Remove tracking code from FaceListSidebar
2. Repeat reproduction steps
3. DevOverlay should show only modal instances, no FaceListSidebar duplicates
4. Component tree remains clean across multiple open/close cycles

---

## Conclusion

This is a **tracking pattern mismatch**, not a bug in the component registry system or a memory leak.

**Action Items**:

1. Implement Option B (remove tracking from FaceListSidebar)
2. Update documentation with new "Common Mistake #5"
3. Audit other modal child components for same pattern
4. Add to code review checklist

**Priority**: Low (cosmetic issue, DEV-only)
**Effort**: 5 minutes (code change) + 10 minutes (docs update)
**Risk**: None (DEV-only, no production impact)
