# Styling Inconsistency Analysis: /faces/suggestions View

**Date**: 2026-02-12 (Amended)
**Researcher**: Claude Code Research Agent
**Issue**: Visual styling inconsistency between "Known Persons" and "Suggested New Persons" tabs

---

## Executive Summary

The `/faces/suggestions` route contains two tabs with **visually inconsistent styling**:

1. **"Known Persons" tab** - Established visual design with white cards, 12px rounded corners, specific green/red buttons, and subtle shadows
2. **"Suggested New Persons" tab** - Uses shadcn-svelte components with different visual appearance (smaller text, different borders, badge-heavy design)

**CORRECTED UNDERSTANDING**: The goal is to make the **Suggested New Persons tab visually match the Known Persons tab** while maintaining modern shadcn-svelte component architecture.

**Key Finding**: The Known Persons tab has an established visual style that users are accustomed to. New components should replicate this look-and-feel using shadcn-svelte components with custom styling overrides where needed.

---

## 1. Visual Design Reference: Known Persons Tab (Target Appearance)

### Card Styling (The Look We Want)

**Visual Characteristics**:

- **Background**: Pure white (`#ffffff`)
- **Border**: Light gray (`#e0e0e0`), 1px solid
- **Border Radius**: 12px (rounded-lg is 8px, so needs `rounded-xl`)
- **Padding**: 1rem (4 in Tailwind)
- **Shadow**: Subtle on hover (`0 2px 8px rgba(0, 0, 0, 0.08)`)
- **Hover Effect**: Border darkens to `#d0d0d0`, shadow increases

### Typography Hierarchy

**Group Name** (Person Name):

- Font size: 1rem (16px) = `text-base`
- Font weight: 600 = `font-semibold`
- Color: `#333` (dark gray, almost black)
- Truncation: Ellipsis on overflow

**Group Count** (Metadata):

- Font size: 0.75rem (12px) = `text-xs`
- Color: `#666` (medium gray)

### Button Styling (The Key Visual Element)

**Accept Button** (Green):

- Background: `#22c55e` (green-500)
- Hover: `#16a34a` (green-600)
- Color: White
- Padding: `0.5rem 0.875rem` (py-2 px-3.5)
- Border radius: 6px (rounded-md)
- Font size: 0.8125rem (13px) ≈ `text-sm`
- Font weight: 600 = `font-semibold`
- Hover effect: `translateY(-1px)` (lifts up slightly)

**Reject Button** (Red):

- Background: `#ef4444` (red-500)
- Hover: `#dc2626` (red-600)
- Color: White
- Same sizing/spacing as Accept button

### Error State Styling

**Error Message Box**:

- Background: `#fef2f2` (red-50)
- Border: `#fecaca` (red-200), 1px solid
- Border radius: 6px (rounded-md)
- Color: `#dc2626` (red-600)
- Padding: 0.75rem (p-3)
- Font size: 0.875rem (text-sm)

---

## 2. Current State: Suggested New Persons Tab (What Needs Changing)

### Visual Differences from Target

**Card Styling Mismatches**:

- ✅ Uses `rounded-lg` (8px) instead of 12px
- ✅ Uses `shadow-sm` which is subtler than Known Persons hover shadow
- ✅ Border color uses semantic `border` token (may not match `#e0e0e0` exactly)

**Typography Mismatches**:

- ❌ Header uses `text-sm font-semibold` instead of `text-base font-semibold`
- ❌ Metadata uses `text-muted-foreground` instead of specific `#666`

**Button Mismatches**:

- ❌ Uses shadcn `Button` component with `variant="default"` (blue primary, not green)
- ❌ Uses `variant="destructive"` (may not match exact red shade)
- ❌ No hover lift effect (`translateY(-1px)`)
- ❌ shadcn Button has different padding/sizing than custom buttons

**Missing Elements**:

- ❌ No visible "Accept All" / "Reject All" action buttons in cards
- ❌ Uses `Badge` components (adds visual noise not present in Known Persons)

---

## 3. How to Match Known Persons Styling with shadcn-svelte

### Strategy: Custom Button Variants

The shadcn-svelte `Button` component supports custom variants via Tailwind classes. We can override the default styling to match Known Persons buttons.

**Approach**:

1. Use `Button` component for modern architecture
2. Apply custom Tailwind classes to match exact visual appearance
3. Create custom variants if needed for green/red buttons

### A. Card Container Styling

**Target** (Known Persons):

```css
background: white;
border: 1px solid #e0e0e0;
border-radius: 12px;
padding: 1rem;
box-shadow: hover -> 0 2px 8px rgba(0, 0, 0, 0.08);
```

**Implementation** (shadcn with overrides):

```svelte
<div
	class="bg-white border border-[#e0e0e0] rounded-xl p-4 transition-all hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
>
	<!-- Card content -->
</div>
```

**Key Changes**:

- `rounded-xl` instead of `rounded-lg` (12px vs 8px)
- `border-[#e0e0e0]` for exact color match
- Custom hover shadow: `hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]`

### B. Typography Matching

**Group Name** (Target: 1rem/600/#333):

```svelte
<h3 class="text-base font-semibold text-[#333] truncate">
	{person.name}
</h3>
```

**Group Count** (Target: 0.75rem/#666):

```svelte
<span class="text-xs text-[#666]">
	{group.suggestions.length} suggestions
</span>
```

### C. Button Styling (The Critical Part)

**Problem**: shadcn `Button` variants don't match Known Persons colors:

- `variant="default"` → Blue (`bg-primary`)
- `variant="destructive"` → Red but wrong shade

**Solution**: Custom button classes with shadcn `Button` as base

**Accept Button** (Green #22c55e):

```svelte
<Button
	size="sm"
	class="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
	onclick={handleAcceptAll}
>
	Accept All
</Button>
```

**Reject Button** (Red #ef4444):

```svelte
<Button
	size="sm"
	class="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
	onclick={handleRejectAll}
>
	Reject All
</Button>
```

**Key Tailwind Classes**:

- `bg-[#22c55e]` - Exact green color
- `hover:bg-[#16a34a]` - Exact hover green
- `px-3.5 py-2` - Matches `0.875rem 0.5rem` padding
- `hover:-translate-y-[1px]` - Button lift on hover
- `active:translate-y-0` - Reset on click
- `shadow-none` - Override shadcn default shadow

### D. Error State Styling

**Target** (Known Persons):

```css
background: #fef2f2;
border: 1px solid #fecaca;
color: #dc2626;
padding: 0.75rem;
border-radius: 6px;
```

**Implementation**:

```svelte
<div
	class="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-md text-[#dc2626] text-sm"
	role="alert"
>
	{error}
</div>
```

---

## 4. Complete Migration Guide: UnlabeledGroupCard

### Current State (Suggested New Persons)

```svelte
<div class="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-sm font-semibold">
			{group.faceCount} faces
		</h3>
		<Badge variant="success">85% confidence</Badge>
	</div>

	<Button size="sm" variant="default">Create Person</Button>
	<Button size="sm" variant="destructive">Mark as Noise</Button>
</div>
```

### Target State (Matching Known Persons Visually)

```svelte
<div
	class="bg-white border border-[#e0e0e0] rounded-xl p-4 transition-all hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
>
	<!-- Header with person name style -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h3 class="text-base font-semibold text-[#333] truncate">Unlabeled Group</h3>
			<span class="text-xs text-[#666]">
				{group.faceCount} faces · 85% confidence
			</span>
		</div>
	</div>

	<!-- Action buttons matching Known Persons styling -->
	<div class="flex gap-2 flex-wrap">
		<Button
			size="sm"
			class="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
		>
			Create Person ({selectedCount})
		</Button>
		<Button
			size="sm"
			class="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
		>
			Mark as Noise
		</Button>
	</div>
</div>
```

**Key Changes**:

1. ✅ Card border radius: `rounded-lg` → `rounded-xl`
2. ✅ Exact border color: `border` → `border-[#e0e0e0]`
3. ✅ Custom hover shadow to match Known Persons
4. ✅ Typography: `text-sm` → `text-base` for heading
5. ✅ Removed `Badge` components (too visually noisy)
6. ✅ Confidence shown as text, not badge
7. ✅ Green button for positive action (not blue)
8. ✅ Hover lift effect on buttons

---

## 5. Specific Code Changes Required

### File: `src/lib/components/faces/UnlabeledGroupCard.svelte`

**Change 1: Card Container**

```diff
<div
-  class="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
+  class="bg-white border border-[#e0e0e0] rounded-xl p-4 transition-all hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
  class:opacity-60={group.isDismissed}
>
```

**Change 2: Header Typography**

```diff
- <h3 class="text-sm font-semibold">
+ <h3 class="text-base font-semibold text-[#333]">
    {group.faceCount} face{group.faceCount !== 1 ? 's' : ''}
  </h3>
- <Badge variant={getConfidenceVariant(group.clusterConfidence)}>
-   {(group.clusterConfidence * 100).toFixed(0)}% confidence
- </Badge>
+ <span class="text-xs text-[#666]">
+   {(group.clusterConfidence * 100).toFixed(0)}% confidence
+ </span>
```

**Change 3: Action Buttons**

```diff
<Button
  size="sm"
+ class="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
  disabled={noneSelected || group.isDismissed}
  onclick={() => onCreatePerson(group, excludedFaceIds)}
>
  Create Person ({selectedCount})
</Button>

<Button
-  variant="destructive"
  size="sm"
+ class="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
  disabled={isDismissing || group.isDismissed}
  onclick={() => handleDismiss(true)}
>
  Mark as Noise
</Button>
```

**Change 4: Error Styling**

```diff
{#if dismissError}
-  <div class="mb-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive" role="alert">
+  <div class="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-md text-[#dc2626] text-sm" role="alert">
    {dismissError}
  </div>
{/if}
```

**Change 5: Remove Badge Import** (if not used elsewhere)

```diff
- import { Badge } from '$lib/components/ui/badge';
```

### File: `src/lib/components/faces/UnlabeledGroupsView.svelte`

**Change 1: Container Spacing**

The Known Persons tab uses specific spacing between cards:

```diff
<div class="space-y-4">
  {#each groups as group (group.groupId)}
    <UnlabeledGroupCard {...props} />
  {/each}
</div>
```

Keep `space-y-4` (matches Known Persons `gap-4` in grid).

**Change 2: Header Styling**

```diff
- <h2 class="text-lg font-semibold">
+ <h2 class="text-base font-semibold text-[#333]">
    Suggested New Persons
  </h2>
- <p class="text-sm text-muted-foreground">
+ <p class="text-xs text-[#666]">
    {stats.totalUnassignedFaces.toLocaleString()} unassigned faces
  </p>
```

**Change 3: Button Styling for Discovery**

```diff
<Button
  variant="outline"
+ class="border-[#e0e0e0] hover:border-[#d0d0d0]"
  onclick={handleDiscover}
  disabled={isDiscovering}
>
  {isDiscovering ? 'Discovering...' : 'Discover New Persons'}
</Button>
```

---

## 6. Visual Comparison Checklist

After implementing changes, verify these visual elements match:

### Card Appearance

- [ ] Border radius is 12px (not 8px)
- [ ] Border color is `#e0e0e0` (light gray)
- [ ] Background is pure white
- [ ] Hover border darkens to `#d0d0d0`
- [ ] Hover shadow is `0 2px 8px rgba(0, 0, 0, 0.08)`

### Typography

- [ ] Main heading is 16px (1rem), weight 600
- [ ] Main heading color is `#333`
- [ ] Metadata text is 12px (0.75rem)
- [ ] Metadata color is `#666`

### Buttons

- [ ] Positive action button is green (`#22c55e`)
- [ ] Negative action button is red (`#ef4444`)
- [ ] Buttons lift 1px on hover
- [ ] Button text is white, weight 600
- [ ] Button padding matches (approx 8px vertical, 14px horizontal)
- [ ] Border radius is 6px (rounded-md)

### Error States

- [ ] Error background is `#fef2f2` (pale red)
- [ ] Error border is `#fecaca` (light red)
- [ ] Error text color is `#dc2626` (red)

### Spacing

- [ ] Card padding is 1rem (16px)
- [ ] Gap between cards is 1rem
- [ ] Internal spacing matches Known Persons

---

## 7. Root Cause Analysis (Unchanged)

**Why the divergence happened**:

1. Suggested New Persons tab was built from scratch using default shadcn-svelte components
2. No visual design reference provided during implementation
3. shadcn-svelte defaults (blue primary, semantic tokens) differ from established Known Persons design
4. No style guide documenting the Known Persons visual language

**The issue**: Not architectural inconsistency, but **lack of visual design continuity**.

---

## 8. CLAUDE.md Improvements (CORRECTED)

### Proposed Addition: Visual Design Consistency

````markdown
## Visual Design Consistency

🔴 **CRITICAL**: New UI components must match the **established visual design** of the application.

### Design Reference: Known Persons Tab

The Known Persons tab (`/faces/suggestions`, first tab) is the **visual design reference** for face-related components.

**Card Styling Standard**:

```svelte
<div
	class="bg-white border border-[#e0e0e0] rounded-xl p-4 transition-all hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
>
	<!-- Card content -->
</div>
```
````

**Typography Standard**:

```svelte
<!-- Primary heading (person name, group title) -->
<h3 class="text-base font-semibold text-[#333] truncate">Person Name</h3>

<!-- Secondary text (counts, metadata) -->
<span class="text-xs text-[#666]"> 12 photos </span>
```

**Button Colors** (DO NOT use shadcn variants for these):

```svelte
<!-- Positive actions (Accept, Create, Save) - GREEN -->
<Button
	size="sm"
	class="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
>
	Accept
</Button>

<!-- Negative/Destructive actions (Reject, Delete, Remove) - RED -->
<Button
	size="sm"
	class="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
>
	Reject
</Button>

<!-- Neutral actions (Dismiss, Cancel) - Use variant="outline" -->
<Button variant="outline" size="sm">Cancel</Button>
```

**Error State Standard**:

```svelte
<div
	class="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-md text-[#dc2626] text-sm"
	role="alert"
>
	{error}
</div>
```

### When to Use Custom Styling vs. shadcn Defaults

**Use Custom Styling (Match Known Persons)**:

- ✅ Face-related components (suggestions, clusters, person cards)
- ✅ Any component that appears on same page as Known Persons tab
- ✅ Modal/dialog content related to face management

**Use shadcn Defaults**:

- ✅ Admin pages
- ✅ Settings pages
- ✅ Completely separate feature areas
- ✅ Generic UI components (inputs, selects, checkboxes)

### Pre-Implementation Checklist

Before building a new face-related component:

1. [ ] View Known Persons tab for visual reference
2. [ ] Note card styling (12px rounded corners, `#e0e0e0` borders)
3. [ ] Use green for positive actions, red for negative
4. [ ] Match typography (16px semibold for names, 12px for metadata)
5. [ ] Test side-by-side with Known Persons tab

### Badge Usage Guidelines

**Known Persons visual style avoids badges**. Use text instead:

```svelte
<!-- ❌ WRONG - Too visually noisy -->
<Badge variant="success">Active</Badge>
<Badge variant="warning">85% confidence</Badge>

<!-- ✅ CORRECT - Matches Known Persons style -->
<span class="text-xs text-[#666]">Active · 85% confidence</span>
```

**Exception**: Badges OK for status indicators in lists (e.g., job status).

````

### Proposed Addition: Component Architecture Standards

```markdown
## Component Architecture Standards

🟡 **IMPORTANT**: Use modern shadcn-svelte components with custom styling overrides to match visual design.

### Pattern: Custom-Styled shadcn Components

**Good**: Use `Button` component with custom classes
```svelte
<Button
  size="sm"
  class="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-3.5 py-2 rounded-md"
>
  Accept
</Button>
````

**Bad**: Recreate button from scratch

```svelte
<!-- ❌ DON'T DO THIS -->
<button class="custom-btn accept-btn">Accept</button>

<style>
	.custom-btn {
		/* ... */
	}
</style>
```

**Why**:

- ✅ Maintains accessibility (shadcn handles ARIA, focus, keyboard)
- ✅ Consistent behavior (disabled states, animations)
- ✅ Future-proof (shadcn updates propagate)
- ✅ Custom visual appearance via Tailwind classes

### Pattern: Visual Design Override

When shadcn defaults don't match your design:

1. **Identify visual difference** (color, spacing, shadow, etc.)
2. **Use Tailwind arbitrary values** for exact matches: `bg-[#22c55e]`
3. **Keep shadcn component structure** (don't rebuild)
4. **Override via `class` prop**, not variants

**Example**:

```svelte
<!-- shadcn default (blue primary) -->
<Button variant="default">Click</Button>

<!-- Custom styled (green) -->
<Button class="bg-[#22c55e] hover:bg-[#16a34a] shadow-none">Click</Button>
```

### When to Create Custom CSS Classes

**DO create custom classes for**:

- Complex layout structures
- Reusable component-specific patterns
- Responsive breakpoint overrides

**DON'T create custom classes for**:

- Colors (use Tailwind/arbitrary values)
- Spacing (use Tailwind utilities)
- Typography (use Tailwind utilities)

````

---

## 9. Implementation Plan (REVISED)

### Phase 1: Visual Alignment (2-3 hours)

**Goal**: Make Suggested New Persons tab visually match Known Persons tab

**Tasks**:
1. Update `UnlabeledGroupCard.svelte`:
   - Change card border radius to `rounded-xl`
   - Update border colors to `border-[#e0e0e0]`
   - Add custom hover shadow
   - Change button colors to green/red
   - Remove Badge components, use text
   - Update typography sizes

2. Update `UnlabeledGroupsView.svelte`:
   - Adjust header typography
   - Update button styling for consistency

3. Visual QA:
   - Compare side-by-side with Known Persons tab
   - Check all states (hover, disabled, error)
   - Test responsive breakpoints

**Files to modify**:
- `src/lib/components/faces/UnlabeledGroupCard.svelte`
- `src/lib/components/faces/UnlabeledGroupsView.svelte`

### Phase 2: Documentation (1 hour)

**Goal**: Prevent future inconsistencies

**Tasks**:
1. Add "Visual Design Consistency" section to CLAUDE.md
2. Document Known Persons as design reference
3. Add component styling patterns
4. Include before/after examples

**Files to modify**:
- `image-search-ui/CLAUDE.md`

### Phase 3: Testing (1 hour)

**Goal**: Ensure visual and functional parity

**Tasks**:
1. Visual regression testing (screenshots)
2. Verify accessibility (keyboard nav, screen readers)
3. Test all interactive states
4. Mobile/tablet responsive testing

---

## 10. Testing Checklist

### Visual Parity Tests

**Side-by-side comparison**:
- [ ] Tab 1 and Tab 2 cards look identical (aside from content)
- [ ] Button colors match (green for positive, red for negative)
- [ ] Typography sizes match (16px names, 12px metadata)
- [ ] Border styles match (color, radius, hover)
- [ ] Shadows match on hover

**State Testing**:
- [ ] Normal state matches
- [ ] Hover state matches (border darkening, shadow, button lift)
- [ ] Disabled state matches (opacity, cursor)
- [ ] Error state matches (colors, borders)
- [ ] Loading state matches (if applicable)

### Functional Tests

- [ ] All buttons still work correctly
- [ ] Accessibility unchanged (keyboard, screen reader)
- [ ] No console errors
- [ ] Responsive behavior intact
- [ ] Existing tests pass (update selectors if needed)

### Cross-Browser Testing

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if Mac available)

---

## 11. Success Criteria

**Visual Consistency**:
- ✅ User cannot distinguish between Known Persons and Suggested New Persons tabs visually
- ✅ Button colors consistent (green/red, not blue/red)
- ✅ Typography hierarchy matches
- ✅ Card styling matches (borders, shadows, radius)

**Code Quality**:
- ✅ Uses shadcn-svelte components (no custom button elements)
- ✅ Maintainable with Tailwind utilities and arbitrary values
- ✅ No custom `<style>` blocks for colors/spacing
- ✅ All tests passing

**Documentation**:
- ✅ CLAUDE.md includes visual design standards
- ✅ Known Persons tab documented as design reference
- ✅ Button color guidelines clear

---

## 12. Risk Assessment

### Low Risk
✅ Tailwind class changes (visual only, no behavior change)
✅ Typography updates (text size/color)
✅ Border/shadow adjustments

### Medium Risk
⚠️ Removing Badge components (ensure no logic depends on them)
⚠️ Button color changes (verify contrast ratios for accessibility)

### Mitigation
1. Test with screen readers after changes
2. Verify WCAG contrast ratios (green on white, red on white)
3. Review existing tests, update selectors if needed
4. Side-by-side visual comparison before merging

---

## 13. Appendix A: Color Reference

### Known Persons Color Palette (Target)

| Element | Color | Hex | Tailwind Equivalent |
|---------|-------|-----|---------------------|
| Card background | White | `#ffffff` | `bg-white` |
| Card border | Light gray | `#e0e0e0` | `border-[#e0e0e0]` |
| Card border (hover) | Medium gray | `#d0d0d0` | `hover:border-[#d0d0d0]` |
| Primary text | Dark gray | `#333` | `text-[#333]` |
| Secondary text | Medium gray | `#666` | `text-[#666]` |
| Accept button | Green | `#22c55e` | `bg-[#22c55e]` |
| Accept button hover | Dark green | `#16a34a` | `hover:bg-[#16a34a]` |
| Reject button | Red | `#ef4444` | `bg-[#ef4444]` |
| Reject button hover | Dark red | `#dc2626` | `hover:bg-[#dc2626]` |
| Error background | Pale red | `#fef2f2` | `bg-[#fef2f2]` |
| Error border | Light red | `#fecaca` | `border-[#fecaca]` |
| Error text | Red | `#dc2626` | `text-[#dc2626]` |

### Why Not Use Tailwind Color Classes?

**Question**: Why not use `bg-green-500` instead of `bg-[#22c55e]`?

**Answer**: They're actually the same color! Tailwind's `green-500` is `#22c55e`. However, using arbitrary values makes the color match **explicit** and prevents accidental changes if Tailwind color palette changes in future updates.

**Alternative approach** (if team prefers):
```svelte
<!-- Using Tailwind color names (simpler, equally valid) -->
<Button class="bg-green-500 hover:bg-green-600">Accept</Button>
<Button class="bg-red-500 hover:bg-red-600">Reject</Button>
````

Both approaches are correct. The hex values make the match to Known Persons **explicit**, while color names are more maintainable.

---

## 14. Appendix B: Detailed Before/After Code

### UnlabeledGroupCard.svelte - Card Container

**Before**:

```svelte
<div
  class="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
  class:opacity-60={group.isDismissed}
>
```

**After**:

```svelte
<div
  class="bg-white border border-[#e0e0e0] rounded-xl p-4 transition-all hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
  class:opacity-60={group.isDismissed}
>
```

**Changes**:

- `rounded-lg` → `rounded-xl` (8px → 12px radius)
- `bg-card` → `bg-white` (explicit white)
- `border` → `border-[#e0e0e0]` (exact color match)
- `shadow-sm` → Custom shadow on hover
- Added hover border color change

### UnlabeledGroupCard.svelte - Header

**Before**:

```svelte
<div class="mb-3 flex items-center justify-between">
	<div class="flex items-center gap-2">
		<h3 class="text-sm font-semibold">
			{group.faceCount} face{group.faceCount !== 1 ? 's' : ''}
		</h3>
		<Badge variant={getConfidenceVariant(group.clusterConfidence)}>
			{(group.clusterConfidence * 100).toFixed(0)}% confidence
		</Badge>
	</div>
	{#if group.isDismissed}
		<Badge variant="outline">Dismissed</Badge>
	{/if}
</div>
```

**After**:

```svelte
<div class="mb-4 flex items-center justify-between">
	<div class="flex flex-col gap-1">
		<h3 class="text-base font-semibold text-[#333]">
			{group.faceCount} face{group.faceCount !== 1 ? 's' : ''}
		</h3>
		<span class="text-xs text-[#666]">
			{(group.clusterConfidence * 100).toFixed(0)}% confidence
			{#if group.isDismissed}
				· Dismissed
			{/if}
		</span>
	</div>
</div>
```

**Changes**:

- `mb-3` → `mb-4` (match Known Persons spacing)
- `text-sm` → `text-base` (12px → 16px)
- Added `text-[#333]` (exact color)
- Removed `Badge` components
- Confidence shown as text with `text-xs text-[#666]`
- Dismissed status as inline text, not badge

### UnlabeledGroupCard.svelte - Buttons

**Before**:

```svelte
<Button
	size="sm"
	disabled={noneSelected || group.isDismissed}
	onclick={() => onCreatePerson(group, excludedFaceIds)}
>
	Create Person ({selectedCount})
</Button>
<Button
	variant="destructive"
	size="sm"
	disabled={isDismissing || group.isDismissed}
	onclick={() => handleDismiss(true)}
>
	Mark as Noise
</Button>
```

**After**:

```svelte
<Button
	size="sm"
	class="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
	disabled={noneSelected || group.isDismissed}
	onclick={() => onCreatePerson(group, excludedFaceIds)}
>
	Create Person ({selectedCount})
</Button>
<Button
	size="sm"
	class="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-3.5 py-2 rounded-md transition-all hover:-translate-y-[1px] active:translate-y-0 shadow-none"
	disabled={isDismissing || group.isDismissed}
	onclick={() => handleDismiss(true)}
>
	Mark as Noise
</Button>
```

**Changes**:

- Removed `variant` prop (not using shadcn defaults)
- Added custom classes for exact color match
- Green for positive action (not blue)
- Added hover lift effect (`-translate-y-[1px]`)
- Added active state reset
- Removed default shadow

---

## 15. Conclusion

**CORRECTED Understanding**: The task is to make the **Suggested New Persons tab visually match the Known Persons tab** while using modern shadcn-svelte components.

**Key Insights**:

1. Known Persons tab has an established visual language users are familiar with
2. New components should replicate this appearance using shadcn with custom styling
3. Green buttons for positive actions, red for negative (not blue/red)
4. Specific typography hierarchy (16px/600 for names, 12px for metadata)
5. 12px rounded corners, specific border colors, subtle shadows

**Recommended Approach**:

1. Use shadcn-svelte `Button` component (for behavior/accessibility)
2. Override colors with custom Tailwind classes
3. Match exact visual appearance of Known Persons tab
4. Document Known Persons as design reference in CLAUDE.md

**Estimated Effort**: 3-4 hours

- Visual alignment: 2-3 hours
- Documentation: 1 hour
- Testing: 1 hour (parallel with development)

**Expected Outcome**: Visually consistent face suggestions experience where users cannot distinguish between tabs based on styling.

---

**Research Amended**: 2026-02-12
**Next Steps**: Implement visual styling changes to Suggested New Persons tab components
