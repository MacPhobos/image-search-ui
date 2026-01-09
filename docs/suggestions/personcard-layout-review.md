# UnifiedPersonCard Layout Fix

**Date**: 2026-01-08
**Component**: `src/lib/components/faces/UnifiedPersonCard.svelte`
**Status**: 🔴 BUG FOUND — Avatar stacked above content instead of beside it

---

## Problem

The Card.Root component from shadcn/ui has a **default `flex-col` class** that causes vertical stacking:

```html
<!-- Rendered DOM shows both flex AND flex-col -->
<div class="... flex-col ... flex gap-4 p-4 ...">
```

The `flex-col` comes from Card.Root's default styles and takes precedence, causing:
- Avatar on TOP
- Content BELOW

---

## Expected Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ┌────────┐  Person Name                      [Identified]   │
│ │  (img) │  2090 faces                                      │
│ └────────┘                                                   │
│   Avatar   Content (name, badge, count)                      │
└──────────────────────────────────────────────────────────────┘
```

## Current (Broken) Layout

```
┌──────────────────────────────────────────────────────────────┐
│              ┌────────┐                                      │
│              │  (img) │  Avatar                              │
│              └────────┘                                      │
│              Person Name           [Identified]              │
│              2090 faces                                      │
│              Content (stacked below)                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Fix

**Add `flex-row` to override the Card's default `flex-col`:**

### Before (line 114-117):
```svelte
<Card.Root
  class="flex gap-4 p-4 transition-all {isClickable
    ? 'cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-0.5'
    : ''} {selected ? 'border-primary bg-primary/5' : ''} {person.type === 'noise' ? 'opacity-85' : ''}"
```

### After:
```svelte
<Card.Root
  class="flex flex-row gap-4 p-4 transition-all {isClickable
    ? 'cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-0.5'
    : ''} {selected ? 'border-primary bg-primary/5' : ''} {person.type === 'noise' ? 'opacity-85' : ''}"
```

**Change**: Add `flex-row` after `flex` to explicitly set horizontal direction.

---

## Why This Works

Tailwind CSS processes classes left-to-right. When both `flex-col` (from Card.Root) and `flex-row` (added by us) are present, the later one wins:

```html
<!-- Before: flex-col wins (it's the only direction specified by us) -->
<div class="flex-col flex gap-4">  <!-- Vertical -->

<!-- After: flex-row overrides flex-col -->
<div class="flex-col flex flex-row gap-4">  <!-- Horizontal! -->
```

---

## Implementation

Change line 115 in `UnifiedPersonCard.svelte`:

```diff
<Card.Root
-  class="flex gap-4 p-4 transition-all {isClickable
+  class="flex flex-row gap-4 p-4 transition-all {isClickable
```

---

## Verification

After the fix, the rendered DOM should produce horizontal layout:
- Avatar (64×64px) on the LEFT
- Content (name, badge, count) on the RIGHT
