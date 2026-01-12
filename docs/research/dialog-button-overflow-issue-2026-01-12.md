# Dialog Button Overflow Investigation

**Date**: 2026-01-12
**Component**: CreateSessionModal.svelte
**Issue**: "Back" and "Create Session" buttons appearing outside/below dialog window in subdirs step

---

## Problem Summary

After implementing sizing fix (70vw width, 90vh height) on CreateSessionModal, the footer buttons in the "subdirs" step are appearing below the dialog instead of inside it.

---

## Current Dialog Structure

### High-Level Layout (CreateSessionModal.svelte)

```svelte
<Dialog.Root>
	<Dialog.Content class="sm:max-w-[70vw] max-h-[90vh]">
		<!-- Lines 147-149 -->
		<Dialog.Header>...</Dialog.Header>
		<!-- Lines 151-160 -->

		<!-- Body content (conditional based on step) -->
		{#if step === 'info'}
			<div>...</div>
			<!-- Lines 163-211 -->
			<Dialog.Footer>...</Dialog.Footer>
			<!-- Lines 213-229 -->
		{:else if step === 'subdirs'}
			<div>
				<DirectoryBrowser {rootPath} bind:selectedSubdirs />
				<!-- Lines 235-239 -->
			</div>
			<!-- Lines 231-246 -->
			<Dialog.Footer>...</Dialog.Footer>
			<!-- Lines 248-264 -->
		{/if}
	</Dialog.Content>
</Dialog.Root>
```

### Dialog Component Hierarchy

```
DialogPrimitive.Content (dialog-content.svelte, line 26-34)
├── Default CSS class: "grid w-full max-w-lg gap-4"
├── User override: "sm:max-w-[70vw] max-h-[90vh]"
└── Children (flat layout via {@render children?.()}):
    ├── Dialog.Header
    ├── <div> (body content)
    │   └── DirectoryBrowser (has max-height: calc(90vh - 300px))
    └── Dialog.Footer
```

---

## Root Cause Analysis

### 1. Dialog.Content Uses CSS Grid (Not Flex)

**File**: `dialog-content.svelte` (line 30)

```typescript
class={cn(
  'bg-background ... grid w-full max-w-lg gap-4 ...',
  className  // User override: "sm:max-w-[70vw] max-h-[90vh]"
)}
```

**Implications**:

- CSS Grid with `grid` class (no explicit template rows)
- `gap-4` adds spacing between children
- No explicit overflow control on content area
- All children (Header, Body, Footer) are **direct grid children** (flat siblings)

### 2. DirectoryBrowser Has Fixed Max-Height

**File**: `DirectoryBrowser.svelte` (line 353-359)

```css
.subdirs-list {
	max-height: calc(90vh - 300px); /* ⚠️ HARDCODED viewport calculation */
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
```

**Problem**:

- `calc(90vh - 300px)` assumes 300px available for header/footer/padding
- When Dialog.Content has `max-h-[90vh]`, the DirectoryBrowser's viewport-based height doesn't account for:
  - Dialog padding (24px via `p-6`)
  - Header height (~60-80px)
  - Gap spacing (16px via `gap-4`)
  - Footer height (~60px)
- **Actual space needed**: ~90px (header) + ~700px (DirectoryBrowser) + ~60px (footer) + ~40px (gaps/padding) = **~890px**
- **Available space**: `90vh` (e.g., 864px on 960px viewport)
- **Overflow**: Footer gets pushed outside dialog bounds

### 3. No Scroll Container on Dialog Body

**Current structure** (CreateSessionModal.svelte, lines 231-246):

```svelte
<div style="display: grid; gap: 1rem; padding: 0.5rem 0;">
  <DirectoryBrowser ... />
  {#if error}<Alert /></{/if}
</div>
```

**Issue**:

- Body `<div>` has no height constraint or `overflow-y: auto`
- DirectoryBrowser's internal `.subdirs-list` has overflow, but the parent container doesn't
- Footer is positioned after body in flat grid layout, so it flows naturally **outside** dialog if body content exceeds available space

---

## Why Buttons Appear Outside Dialog

**Sequence of Events**:

1. Dialog.Content applies `max-h-[90vh]` to container
2. CSS Grid lays out children (Header, Body, Footer) vertically
3. DirectoryBrowser's `.subdirs-list` has `max-height: calc(90vh - 300px)` (~630px)
4. Total content height (Header + Body + Footer + gaps) exceeds 90vh
5. **Grid does NOT clip content** by default (no `overflow: hidden` on Dialog.Content)
6. Footer overflows beyond dialog bottom edge, appearing below the dialog visually

**Visual Result**:

```
┌─────────────────────────────────────┐
│ Dialog.Content (max-h-[90vh])       │
│ ┌─────────────────────────────────┐ │
│ │ Header                          │ │
│ ├─────────────────────────────────┤ │
│ │ DirectoryBrowser                │ │
│ │ (max-height: calc(90vh - 300px))│ │
│ │ └──────────────────────────────┘│ │ ← Scrollable area
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
  ┌─────────────────────────────────┐  ← Footer pushed outside!
  │ [Back] [Create Session]         │
  └─────────────────────────────────┘
```

---

## Recommended Fix

### Strategy: Flexbox Layout with Constrained Scroll Area

**Change Dialog.Content layout from Grid to Flex** with:

1. **Header**: Fixed height at top
2. **Body**: Flex-grow with `overflow-y: auto` (scrollable area)
3. **Footer**: Fixed height at bottom

### Implementation (CreateSessionModal.svelte)

**Option 1: Override Dialog.Content Layout (Minimal Change)**

```svelte
<Dialog.Content
  data-testid="modal__create-session"
  class={step === 'subdirs'
    ? 'sm:max-w-[70vw] max-h-[90vh] flex flex-col overflow-hidden'
    : ''
  }
>
  <Dialog.Header>...</Dialog.Header>

  {#if step === 'subdirs'}
    <!-- Scrollable body container -->
    <div class="flex-1 overflow-y-auto" style="padding: 0.5rem 0;">
      <DirectoryBrowser ... />
      {#if error}<Alert /></{/if}
    </div>

    <Dialog.Footer class="flex-shrink-0">
      <Button ...>Back</Button>
      <Button ...>Create Session</Button>
    </Dialog.Footer>
  {/if}
</Dialog.Content>
```

**Key Changes**:

- Add `flex flex-col` to Dialog.Content (override default grid)
- Add `overflow-hidden` to Dialog.Content (prevent content overflow)
- Wrap body content in `flex-1 overflow-y-auto` div (scrollable area)
- Add `flex-shrink-0` to Dialog.Footer (prevent footer compression)
- **Remove** DirectoryBrowser's `max-height: calc(90vh - 300px)` (no longer needed)

**Option 2: Update DirectoryBrowser Height Calculation**

```svelte
<!-- DirectoryBrowser.svelte, line 353 -->
<style>
	.subdirs-list {
		max-height: 400px; /* Fixed height instead of viewport-based */
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
```

**Trade-offs**:

- Simpler fix (no layout changes)
- Less flexible (fixed height doesn't adapt to viewport)
- Still doesn't solve root cause (dialog overflow issue)

---

## Recommended Approach

**Use Option 1** (Flexbox layout) because:

1. **Fixes root cause**: Properly constrains dialog content
2. **Responsive**: Adapts to viewport height automatically
3. **Reusable pattern**: Can be applied to other modals with scrollable content
4. **Removes magic number**: No more `calc(90vh - 300px)` hack

**Implementation Priority**:

1. Update CreateSessionModal.svelte dialog structure (add flex classes)
2. Remove hardcoded `max-height: calc(90vh - 300px)` from DirectoryBrowser
3. Replace with `height: 100%` or `flex: 1` (fill available space)
4. Test with different viewport heights (small laptops, large monitors)

---

## Related Files

- **CreateSessionModal.svelte**: Lines 146-266 (dialog structure)
- **DirectoryBrowser.svelte**: Lines 353-359 (`.subdirs-list` max-height)
- **dialog-content.svelte**: Lines 26-34 (Dialog.Content CSS classes)
- **dialog-footer.svelte**: Lines 13-20 (footer styling)

---

## Test Scenarios

**After implementing fix, verify**:

1. ✅ Footer buttons visible inside dialog on standard laptop (1366x768)
2. ✅ Footer buttons visible inside dialog on large monitor (2560x1440)
3. ✅ DirectoryBrowser scrollable when >30 subdirectories
4. ✅ Filter/selection controls accessible without scrolling
5. ✅ Footer always visible at bottom (no overlap with content)
6. ✅ Dialog height adapts to viewport (90vh constraint respected)
