# DirectoryBrowser Component Sizing Investigation

**Date**: 2026-01-12
**Issue**: DirectoryBrowser component displays too small
**Goal**: Achieve 70% horizontal × 90% vertical viewport sizing
**Status**: Root cause identified, recommendations provided

---

## Executive Summary

The DirectoryBrowser component is constrained by its parent modal's default sizing. The root cause is:

1. **Dialog modal constraint**: `sm:max-w-lg` (32rem/512px) in `dialog-content.svelte`
2. **Fixed subdirectory list height**: `max-height: 400px` in DirectoryBrowser component
3. **No viewport-relative sizing**: Component uses fixed pixel values

**Solution**: Override modal max-width and implement viewport-relative dimensions for the directory list.

---

## Component Hierarchy Analysis

```
CreateSessionModal.svelte (Modal Container)
  └─ Dialog.Root (bits-ui dialog wrapper)
      └─ Dialog.Content (dialog-content.svelte)
          └─ <div> (grid gap: 1rem)
              └─ DirectoryBrowser.svelte
                  └─ <div class="directory-browser">
                      └─ <div class="subdirs-list"> ⚠️ max-height: 400px
```

---

## Current Sizing Implementation

### 1. Modal Container Constraints

**File**: `src/lib/components/ui/dialog/dialog-content.svelte`
**Line**: 30

```svelte
class={cn(
  'bg-background ... fixed top-[50%] left-[50%] z-50 grid w-full
   max-w-[calc(100%-2rem)] ... sm:max-w-lg',
  className
)}
```

**Key constraints**:

- `w-full` - Full width (but capped by max-width)
- `max-w-[calc(100%-2rem)]` - Mobile: viewport width minus 2rem margin
- `sm:max-w-lg` - Desktop: **32rem (512px)** ⚠️ **PRIMARY BOTTLENECK**
- Fixed positioning at viewport center (50% top/left)

### 2. DirectoryBrowser Component Sizing

**File**: `src/lib/components/training/DirectoryBrowser.svelte`
**Lines**: 253-359

```css
.directory-browser {
	background-color: #f9fafb;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	padding: 1rem;
	/* ⚠️ NO explicit width or height constraints */
}

.subdirs-list {
	max-height: 400px; /* ⚠️ FIXED HEIGHT - limits vertical space */
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
```

**Observations**:

- No explicit width/height on `.directory-browser` (inherits from modal)
- Subdirectory list limited to **400px height** (fixed, not viewport-relative)
- Other sections (header, filters, summary) use dynamic sizing

### 3. Parent Layout Context

**File**: `src/lib/components/training/CreateSessionModal.svelte`
**Lines**: 228-236

```svelte
<div style="display: grid; gap: 1rem; padding: 0.5rem 0;">
	<DirectoryBrowser
		{rootPath}
		bind:selectedSubdirs
		onSelectionChange={(selected) => (selectedSubdirs = selected)}
	/>
</div>
```

**Observations**:

- Grid container with 1rem gap
- No width/height constraints passed to DirectoryBrowser
- Component sizing fully inherited from modal default

---

## Root Cause Analysis

### Primary Constraint: Modal Max-Width

The dialog uses Tailwind's `sm:max-w-lg` breakpoint class:

- **Below 640px viewport**: `max-w-[calc(100%-2rem)]` (nearly full width)
- **Above 640px viewport**: `max-w-lg` = **32rem (512px)** ⚠️

For a typical desktop viewport (1920px wide):

- **Current width**: 512px (26.7% of viewport)
- **Target width**: 70% of viewport = 1344px
- **Gap**: +832px (163% increase needed)

### Secondary Constraint: Fixed List Height

The `.subdirs-list` uses `max-height: 400px`:

- **Current height**: 400px (fixed)
- **Target height**: 90vh minus header/footer/padding
- For 1080px viewport height:
  - 90vh = 972px
  - Minus chrome (~150px header/footer/padding) = ~822px usable
  - **Gap**: +422px (106% increase needed)

---

## Recommendations

### ✅ Recommended Approach: Custom Modal Size Variant

**Pros**:

- Maintains separation of concerns (modal sizing vs. component logic)
- Reusable pattern for other large modals
- Respects existing Dialog component API
- Type-safe with Svelte 5 props

**Cons**:

- Requires modal component change (but small, focused change)

#### Implementation Steps

**Step 1**: Add size variant to CreateSessionModal (lines 228-243)

```svelte
{:else if step === 'subdirs'}
  <div
    style="display: grid; gap: 1rem; padding: 0.5rem 0;"
    data-testid="modal__create-session__body"
  >
    <DirectoryBrowser
      {rootPath}
      bind:selectedSubdirs
      onSelectionChange={(selected) => (selectedSubdirs = selected)}
    />
  </div>
```

**Change Dialog.Content in line 147**:

```svelte
<Dialog.Content
  data-testid="modal__create-session"
  class={step === 'subdirs' ? 'max-w-[70vw] max-h-[90vh]' : ''}
>
```

**Step 2**: Update DirectoryBrowser subdirs-list height (line 353-359)

```css
.subdirs-list {
	/* Old: max-height: 400px; */
	max-height: calc(90vh - 300px); /* Viewport-relative, minus header/footer/padding */
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
```

**Estimated chrome height**:

- Browser header: ~60px (Select Subdirectories heading)
- Filter container: ~80px (search input + switch + count)
- Selection summary: ~60px (summary bar at bottom)
- Modal padding/margins: ~100px (Dialog header, footer, padding)
- **Total**: ~300px

**Alternative**: Use CSS custom properties for precise control:

```css
.subdirs-list {
	max-height: var(--subdirs-list-height, 400px);
	overflow-y: auto;
	/* ... */
}
```

Then set the custom property in CreateSessionModal:

```svelte
<DirectoryBrowser
	{rootPath}
	bind:selectedSubdirs
	onSelectionChange={(selected) => (selectedSubdirs = selected)}
	style="--subdirs-list-height: calc(90vh - 300px);"
/>
```

---

### Alternative Approach: Global Dialog Size Override

**File**: `src/lib/components/ui/dialog/dialog-content.svelte`

Add a `size` prop to allow modal-specific sizing:

```typescript
let {
	ref = $bindable(null),
	class: className,
	size = 'default', // 'default' | 'large' | 'full'
	portalProps,
	children,
	showCloseButton = true,
	...restProps
}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
	portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
	children: Snippet;
	showCloseButton?: boolean;
	size?: 'default' | 'large' | 'full';
} = $props();

const sizeClasses = {
	default: 'sm:max-w-lg',
	large: 'sm:max-w-[70vw] max-h-[90vh]',
	full: 'sm:max-w-[95vw] max-h-[95vh]'
};
```

Then use in CreateSessionModal:

```svelte
<Dialog.Content
  data-testid="modal__create-session"
  size={step === 'subdirs' ? 'large' : 'default'}
>
```

**Pros**:

- More maintainable (centralized size variants)
- Easy to reuse for other modals

**Cons**:

- Changes shared UI component
- May affect other dialogs if not carefully tested

---

## Testing Recommendations

After implementing changes, verify:

1. **Viewport responsiveness**:
   - Test at 1920×1080 (desktop)
   - Test at 1366×768 (laptop)
   - Test at mobile breakpoints (<640px)

2. **Content overflow**:
   - Load directory with 100+ subdirectories
   - Verify scrolling works without layout breaks
   - Check selection summary doesn't obscure list

3. **Modal transitions**:
   - Step 1 (info) → Step 2 (subdirs) size transition
   - Back button doesn't cause layout jumps

4. **Browser compatibility**:
   - Test viewport units (vh/vw) in Safari, Firefox, Chrome
   - Verify calc() expressions work correctly

---

## Impact Assessment

### User Experience Improvements

**Before**:

- 512px × 400px usable area (~0.2 megapixels)
- ~8-10 directories visible without scrolling
- Cramped on wide monitors

**After (70% × 90% viewport)**:

- 1344px × 822px usable area (~1.1 megapixels) on 1920×1080
- ~18-20 directories visible without scrolling
- **5.5× increase in visible content area**

### Code Quality Impact

- **Lines changed**: ~8 lines (minimal change)
- **Breaking changes**: None (CSS-only change)
- **Test updates**: Update snapshot tests for DirectoryBrowser size
- **Accessibility**: No impact (scrolling still keyboard-accessible)

---

## Implementation Checklist

- [ ] Decide between recommended approach (inline class) vs. size variant prop
- [ ] Update CreateSessionModal to apply viewport-relative size on subdirs step
- [ ] Update DirectoryBrowser `.subdirs-list` max-height to use calc(90vh - 300px)
- [ ] Test modal transitions between steps (info → subdirs)
- [ ] Test with 100+ subdirectories (scrolling behavior)
- [ ] Verify mobile responsiveness (< 640px viewport)
- [ ] Update component tests if assertions depend on fixed dimensions
- [ ] Update visual regression tests (if applicable)
- [ ] Document sizing decision in code comments

---

## Related Files

**Modified**:

- `src/lib/components/training/CreateSessionModal.svelte` (modal size override)
- `src/lib/components/training/DirectoryBrowser.svelte` (subdirs-list height)

**Referenced**:

- `src/lib/components/ui/dialog/dialog-content.svelte` (constraint source)
- `docs/code-quality-guardrails.md` (component complexity guidelines)

**Tests to Update**:

- `src/tests/components/DirectoryBrowser.test.ts` (if size-dependent assertions exist)
- `src/tests/components/CreateSessionModal.test.ts` (modal sizing assertions)

---

## Appendix: CSS Calculation Breakdown

### Target Dimensions (70% × 90% viewport)

**Viewport**: 1920×1080 (typical desktop)

**Horizontal (70%)**:

```
1920px × 0.70 = 1344px
```

**Vertical (90%)**:

```
1080px × 0.90 = 972px
```

### Chrome Height Estimation

**Modal components**:

- Dialog.Header (title + description): ~60px
- Dialog.Footer (buttons): ~60px
- Modal padding (p-6 = 1.5rem): ~48px (24px × 2)
- **Subtotal**: ~168px

**DirectoryBrowser components**:

- .browser-header (heading + buttons): ~60px
- .filter-container (input + switch + count): ~80px
- .selection-summary (summary bar): ~60px
- Component padding (1rem): ~32px
- **Subtotal**: ~232px

**Total chrome**: ~400px (conservative estimate)

**Usable subdirs-list height**:

```
972px (90vh) - 400px (chrome) = 572px
```

**Recommendation**: Use `calc(90vh - 300px)` for safety margin.

---

**End of Report**
