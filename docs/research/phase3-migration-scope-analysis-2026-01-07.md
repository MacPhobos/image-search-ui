# Phase 3 shadcn-svelte Migration Scope Analysis

## Date: 2026-01-07

## Executive Summary

Phase 3 components (Select, Checkbox, Switch, Separator) are fully installed, and **1 production component has been migrated** (People page: `/src/routes/people/+page.svelte`). This analysis identifies **5 remaining components with 9 checkbox instances** and evaluates migration priority.

**Key Finding**: No native `<select>` elements remain in the codebase. All select dropdowns either use the migrated shadcn Select component or custom dropdown components (PersonDropdown).

---

## Phase 3 Component Installation Status

### ✅ Installed Components

All Phase 3 components are installed and verified:

1. **Select** (`src/lib/components/ui/select/`)
   - Dropdown select component with accessibility
   - Already used in: People page (`/src/routes/people/+page.svelte`)
   - Installed: 2026-01-06

2. **Checkbox** (`src/lib/components/ui/checkbox/`)
   - Accessible checkbox component
   - Already used in: People page (3 filter checkboxes)
   - Installed: 2026-01-06

3. **Switch** (`src/lib/components/ui/switch/`)
   - Toggle switch component
   - **Not yet used in production** (only in test page)
   - Installed: 2026-01-06

4. **Separator** (`src/lib/components/ui/separator/`)
   - Horizontal/vertical divider
   - Already used in: People page (replaced `.divider` class)
   - Installed: 2026-01-06

### 📋 Documentation

- **Primary Doc**: `docs/shadcn-phase3-migration.md` (comprehensive guide)
- **Test Page**: `src/routes/shadcn-test/+page.svelte` (working demos)
- **Migration Log**: Documents People page migration (completed 2026-01-06)

---

## Native Element Audit Results

### Select Elements: NONE FOUND ✅

**Search Pattern**: `<select`
**Results**: 0 matches

**Analysis**: All dropdowns have been migrated or use custom components:
- **Migrated**: People page sort dropdowns (now use shadcn Select)
- **Custom Component**: PersonDropdown (faces/PersonDropdown.svelte) - NOT A MIGRATION CANDIDATE

### Checkbox Elements: 9 INSTANCES FOUND

**Search Pattern**: `type="checkbox"`
**Results**: 5 files with 9 checkbox instances

| File | Checkboxes | Type | Complexity |
|------|------------|------|------------|
| `SuggestionGroupCard.svelte` | 1 | Bulk selection (indeterminate) | Medium |
| `DirectoryBrowser.svelte` | 2 | Filter toggle + multi-select | Medium |
| `ImportPersonDataModal.svelte` | 2 | Settings toggles | Simple |
| `SuggestionThumbnail.svelte` | 1 | Selection checkbox | Simple |
| `PersonPhotosTab.svelte` | 1 | Photo selection | Simple |

### Switch/Toggle Elements: NONE FOUND ✅

**Search Pattern**: `toggle|switch` (case-insensitive)
**Results**: Only found:
- Switch component definition (`src/lib/components/ui/switch/switch.svelte`)
- Test page usage (`src/routes/shadcn-test/+page.svelte`)
- Function names like `toggleDropdown()`, `toggleSelection()` (not UI components)

**Analysis**: No native toggle elements exist. Switch component is available but unused in production.

### Separator Elements: NONE FOUND ✅

**Search Pattern**: `class="divider"`, `<hr`
**Results**: 0 matches

**Analysis**: All dividers have been migrated or removed:
- **Migrated**: People page now uses `<Separator />` component
- **No other legacy dividers found**

---

## Detailed Migration Analysis

### 1. SuggestionGroupCard.svelte (Bulk Selection)

**File**: `src/lib/components/faces/SuggestionGroupCard.svelte`
**Lines**: 88-95
**Type**: Indeterminate checkbox (select all)

**Current Implementation**:
```svelte
<input
  type="checkbox"
  checked={allSelected}
  indeterminate={someSelected}
  onchange={handleSelectAll}
  class="group-checkbox"
  aria-label="Select all suggestions in this group"
/>
```

**Migration Complexity**: 🟡 **Medium**

**Reasons**:
- Uses `indeterminate` state (partial selection indicator)
- Custom styling for group selection pattern
- Need to verify Checkbox component supports indeterminate state
- Part of bulk action UI pattern

**Migration Strategy**:
```svelte
<Checkbox
  id="group-select-all"
  checked={allSelected}
  indeterminate={someSelected}
  onchange={handleSelectAll}
  class="group-checkbox"
  aria-label="Select all suggestions in this group"
/>
```

**Testing Requirements**:
- Verify indeterminate state rendering
- Test keyboard navigation (Space to toggle)
- Verify visual distinction between checked/unchecked/indeterminate
- Test with screen readers

---

### 2. DirectoryBrowser.svelte (Filter + Multi-Select)

**File**: `src/lib/components/training/DirectoryBrowser.svelte`
**Lines**: 142, 177
**Type**: Filter toggle + directory selection checkboxes

#### Checkbox 1: Filter Toggle (Line 142)

**Current Implementation**:
```svelte
<label class="checkbox-filter">
  <input type="checkbox" bind:checked={hideTrainedDirs} />
  <span>Hide fully trained directories</span>
</label>
```

**Migration Complexity**: 🟢 **Simple**

**Migration Strategy**:
```svelte
<div class="flex items-center space-x-2">
  <Checkbox id="hide-trained" bind:checked={hideTrainedDirs} />
  <Label for="hide-trained" class="cursor-pointer">
    Hide fully trained directories
  </Label>
</div>
```

**Alternative**: Consider **Switch component** instead of Checkbox:
```svelte
<div class="flex items-center justify-between">
  <Label for="hide-trained" class="cursor-pointer">
    Hide fully trained directories
  </Label>
  <Switch id="hide-trained" bind:checked={hideTrainedDirs} />
</div>
```

**Rationale for Switch**:
- This is a **filter toggle**, not a selection
- Switch better communicates "on/off" state vs "selected/unselected"
- Consistent with modern UI patterns (e.g., iOS/Android settings)
- shadcn Switch component is installed and available

#### Checkbox 2: Directory Selection (Line 177)

**Current Implementation**:
```svelte
<input
  type="checkbox"
  checked={safeSelectedSubdirs.includes(subdir.path)}
  onchange={() => toggleSubdir(subdir.path)}
/>
```

**Migration Complexity**: 🟢 **Simple**

**Migration Strategy**:
```svelte
<Checkbox
  id="subdir-{subdir.path}"
  checked={safeSelectedSubdirs.includes(subdir.path)}
  onchange={() => toggleSubdir(subdir.path)}
  aria-label="Select directory {subdir.path}"
/>
```

**Testing Requirements**:
- Verify multi-select behavior with many directories
- Test keyboard navigation through directory list
- Test filter interaction with selection state
- Verify accessibility with screen readers

---

### 3. ImportPersonDataModal.svelte (Settings Toggles)

**File**: `src/lib/components/admin/ImportPersonDataModal.svelte`
**Lines**: 234-239, 249-254
**Type**: Import configuration toggles

#### Checkbox 1: Skip Missing Images (Line 234)

**Current Implementation**:
```svelte
<label class="checkbox-label">
  <input
    type="checkbox"
    bind:checked={skipMissingImages}
    disabled={loading}
    class="form-checkbox"
  />
  Skip faces for missing images
</label>
<p class="input-help">
  Continue import even if some images are not found in the database
</p>
```

**Migration Complexity**: 🟢 **Simple**

**Migration Strategy** (Option A: Checkbox):
```svelte
<div class="flex items-start space-x-2">
  <Checkbox
    id="skip-missing"
    bind:checked={skipMissingImages}
    disabled={loading}
  />
  <div>
    <Label for="skip-missing" class="cursor-pointer">
      Skip faces for missing images
    </Label>
    <p class="text-sm text-muted-foreground">
      Continue import even if some images are not found
    </p>
  </div>
</div>
```

**Migration Strategy** (Option B: Switch - RECOMMENDED):
```svelte
<div class="flex items-center justify-between rounded-lg border p-4">
  <div class="space-y-0.5">
    <Label for="skip-missing">Skip faces for missing images</Label>
    <p class="text-sm text-muted-foreground">
      Continue import even if some images are not found
    </p>
  </div>
  <Switch
    id="skip-missing"
    bind:checked={skipMissingImages}
    disabled={loading}
  />
</div>
```

**Rationale for Switch**:
- Settings pattern (consistent with shadcn-test demos)
- Better visual hierarchy with description
- Clearer on/off state for configuration options
- Follows modern admin panel conventions

#### Checkbox 2: Auto-Ingest Images (Line 249)

**Same pattern as Checkbox 1** - migrate to Switch component.

---

### 4. SuggestionThumbnail.svelte (Selection Checkbox)

**File**: `src/lib/components/faces/SuggestionThumbnail.svelte`
**Lines**: 85-89
**Type**: Item selection in thumbnail grid

**Current Implementation**:
```svelte
<input
  type="checkbox"
  checked={selected}
  onchange={handleCheckbox}
  class="checkbox"
  aria-label="Select suggestion {suggestion.id}"
/>
```

**Migration Complexity**: 🟢 **Simple**

**Migration Strategy**:
```svelte
<Checkbox
  id="suggestion-{suggestion.id}"
  checked={selected}
  onchange={handleCheckbox}
  aria-label="Select suggestion {suggestion.id}"
/>
```

**CSS Considerations**:
- Current `.checkbox` class likely positions checkbox over thumbnail
- May need custom positioning classes for shadcn Checkbox
- Test visual appearance in thumbnail grid layout

**Testing Requirements**:
- Verify checkbox visibility over thumbnail images
- Test touch target size on mobile (44x44px minimum)
- Verify selection state persists during scroll
- Test bulk selection with SuggestionGroupCard

---

### 5. PersonPhotosTab.svelte (Photo Selection)

**File**: `src/lib/components/faces/PersonPhotosTab.svelte`
**Lines**: 181-186
**Type**: Photo selection in grid layout

**Current Implementation**:
```svelte
<input
  type="checkbox"
  class="photo-checkbox"
  checked={isSelected}
  onchange={() => toggleSelection(photo.photoId)}
  aria-label="Select photo {photo.photoId}"
/>
```

**Migration Complexity**: 🟢 **Simple**

**Migration Strategy**:
```svelte
<Checkbox
  id="photo-{photo.photoId}"
  class="photo-checkbox"
  checked={isSelected}
  onchange={() => toggleSelection(photo.photoId)}
  aria-label="Select photo {photo.photoId}"
/>
```

**Similar to SuggestionThumbnail**: Same CSS positioning concerns.

---

## Switch Component Opportunities

### Current Switch Usage: Test Page Only

The Switch component is installed but **only used in `/src/routes/shadcn-test/+page.svelte`** for demonstration purposes.

### Recommended Switch Migration Targets

Based on UI patterns and modern conventions, these checkboxes should become **Switch components**:

| Component | Checkbox Purpose | Why Switch is Better |
|-----------|------------------|----------------------|
| **DirectoryBrowser** | "Hide fully trained directories" | Filter toggle, not selection |
| **ImportPersonDataModal** | "Skip missing images" | Settings toggle with description |
| **ImportPersonDataModal** | "Auto-ingest images" | Settings toggle with description |

**Benefits of Switch for Settings/Toggles**:
- Clearer visual metaphor for on/off states
- Better communicates "this changes behavior" vs "this selects an item"
- Consistent with iOS/Android/modern web conventions
- shadcn Switch includes hover states and animations

**Keep as Checkbox**:
- **Selection checkboxes** (SuggestionThumbnail, PersonPhotosTab, SuggestionGroupCard)
- **Multi-select patterns** (DirectoryBrowser subdirectory selection)

---

## Migration Priority Matrix

### Priority 1: Simple Migrations (Do First)

| Component | Checkboxes | Effort | Impact | Risk |
|-----------|------------|--------|--------|------|
| **ImportPersonDataModal** | 2 | Low | Medium | Low |
| **SuggestionThumbnail** | 1 | Low | High | Low |
| **PersonPhotosTab** | 1 | Low | High | Low |

**Rationale**:
- Simple checkbox → component replacements
- No indeterminate state complexity
- ImportPersonDataModal is good candidate for Switch pattern demo
- High user interaction frequency (thumbnails, photos)

**Estimated Time**: 1-2 hours total

---

### Priority 2: Medium Complexity (Do Second)

| Component | Checkboxes | Effort | Impact | Risk |
|-----------|------------|--------|--------|------|
| **DirectoryBrowser** (filter) | 1 | Low | Medium | Low |
| **DirectoryBrowser** (selection) | 1 | Medium | Medium | Medium |

**Rationale**:
- Filter checkbox is simple but good Switch migration candidate
- Selection checkbox requires testing multi-select behavior
- Used in training workflow (moderate frequency)

**Estimated Time**: 1.5-2 hours total

---

### Priority 3: Complex Migration (Do Last)

| Component | Checkboxes | Effort | Impact | Risk |
|-----------|------------|--------|--------|------|
| **SuggestionGroupCard** | 1 | Medium | High | Medium |

**Rationale**:
- Uses `indeterminate` state (partial selection)
- Critical to bulk suggestion acceptance workflow
- Need to verify shadcn Checkbox supports indeterminate
- Requires comprehensive testing

**Estimated Time**: 1-1.5 hours (includes testing)

---

## Technical Considerations

### 1. Checkbox Component API

**Verify shadcn-svelte Checkbox supports**:
- ✅ `bind:checked` (confirmed in People page migration)
- ✅ `disabled` prop (standard HTML pass-through)
- ❓ `indeterminate` prop (needs verification)
- ✅ `class` prop for custom styling
- ✅ `aria-label` and accessibility attributes

**Action**: Test indeterminate state before migrating SuggestionGroupCard.

### 2. Switch Component API

**Verify shadcn-svelte Switch supports**:
- ✅ `bind:checked` (confirmed in test page)
- ✅ `disabled` prop (confirmed in test page)
- ✅ `class` prop for custom styling
- ✅ Label integration pattern

**Pattern from test page**:
```svelte
<div class="flex items-center justify-between rounded-lg border p-4">
  <div class="space-y-0.5">
    <Label for="setting-id">Setting Name</Label>
    <p class="text-sm text-muted-foreground">Description</p>
  </div>
  <Switch id="setting-id" bind:checked={value} />
</div>
```

### 3. CSS Migration Strategy

**Current Custom Styles**:
- `.checkbox-filter` - DirectoryBrowser filter layout
- `.group-checkbox` - SuggestionGroupCard positioning
- `.photo-checkbox` - Photo grid overlay positioning
- `.form-checkbox` - ImportPersonDataModal form styling

**Migration Approach**:
1. Replace HTML checkbox with shadcn Checkbox/Switch
2. Keep existing container classes (`.checkbox-filter`, etc.)
3. Use Tailwind classes for layout (`flex items-center space-x-2`)
4. Test visual appearance matches current design
5. Add custom positioning classes if needed (e.g., for thumbnails)

### 4. State Management Patterns

**All checkboxes use simple `bind:checked` pattern** - no complex state migration needed:
- ✅ Boolean state variables
- ✅ Derived state (e.g., `allSelected`, `someSelected`)
- ✅ State arrays (e.g., `selectedSubdirs`, `selectedPhotoIds`)

**No changes required** to state management logic.

---

## Testing Strategy

### Per-Component Testing

For each migrated component:

1. **Visual Regression**:
   - Checkbox appears in correct position
   - Sizing matches design system
   - Hover/focus states work correctly
   - Disabled state renders properly

2. **Functional Testing**:
   - `bind:checked` updates state correctly
   - `onchange` handlers fire as expected
   - Keyboard navigation works (Tab, Space, Enter)
   - Multi-select behavior unchanged (where applicable)

3. **Accessibility Testing**:
   - Screen reader announces checkbox state
   - `aria-label` or Label association works
   - Focus indicators visible
   - Color contrast meets WCAG AA

4. **Integration Testing**:
   - Checkbox state syncs with parent component
   - API calls triggered correctly (e.g., suggestion acceptance)
   - Selection state persists during filtering/sorting
   - Bulk operations work with new checkboxes

### Cross-Component Testing

After all migrations:

1. **Multi-select workflows**:
   - Select multiple suggestions → bulk accept/reject
   - Select multiple directories → batch train
   - Select multiple photos → batch remove from person

2. **Filter interactions**:
   - Toggle filters + make selections
   - Verify selection state preserved during filter changes

3. **Performance**:
   - Test with large lists (100+ items)
   - Verify smooth scrolling with checkboxes
   - No performance degradation vs native checkboxes

---

## Recommended Migration Order

### Phase 3A: Simple Migrations (Week 1)

**Day 1-2**: Low-hanging fruit
1. ✅ **ImportPersonDataModal** (2 checkboxes → Switch components)
   - Good pattern demo for Switch component
   - Low risk, isolated component
   - Introduces Settings toggle pattern

2. ✅ **SuggestionThumbnail** (1 checkbox)
   - High user interaction frequency
   - Simple replacement, custom CSS only concern

3. ✅ **PersonPhotosTab** (1 checkbox)
   - Similar to SuggestionThumbnail
   - Tests selection pattern in different context

**Deliverable**: 4 checkboxes migrated, Switch pattern established

---

### Phase 3B: Medium Complexity (Week 2)

**Day 3**: Filter pattern
4. ✅ **DirectoryBrowser - Filter Toggle** (1 checkbox → Switch)
   - Demonstrates Switch for filter toggles
   - Tests Switch in different layout context

**Day 4**: Multi-select pattern
5. ✅ **DirectoryBrowser - Directory Selection** (1 checkbox)
   - Tests multi-select with new Checkbox
   - Verifies array state management

**Deliverable**: 2 more checkboxes migrated, 6 total complete

---

### Phase 3C: Complex Migration (Week 2)

**Day 5**: Indeterminate state
6. ✅ **SuggestionGroupCard** (1 checkbox with indeterminate)
   - Verify indeterminate state support
   - Test bulk selection UI pattern
   - Comprehensive testing required

**Deliverable**: All 7 checkboxes migrated, Phase 3 complete

---

## Risk Assessment

### Low Risk ✅
- **ImportPersonDataModal**: Isolated modal, low usage frequency
- **SuggestionThumbnail**: Simple replacement, existing tests available
- **PersonPhotosTab**: Similar pattern to above
- **DirectoryBrowser (filter)**: Simple toggle, easy rollback

### Medium Risk ⚠️
- **DirectoryBrowser (selection)**: Multi-select complexity
- **SuggestionGroupCard**: Indeterminate state, critical workflow

### Mitigation Strategies

1. **Feature Flags**: Not needed (component-level, easy rollback via git)
2. **Incremental Deployment**: Migrate one component at a time
3. **Testing**: Comprehensive manual testing before committing
4. **Rollback Plan**: Keep git history clean, each component = 1 commit
5. **Documentation**: Update component tests to match new structure

---

## Bundle Size Impact

**Phase 3 Components** (from phase3 doc):
- Total bundle size increase: ~10KB compressed
- Includes: Select, Checkbox, Switch, Separator

**Expected Impact from Migrations**:
- Removing native checkboxes: -0KB (minimal HTML)
- Adding Checkbox instances: +2-3KB compressed
- Adding Switch instances: +1-2KB compressed
- **Net impact**: +3-5KB compressed (negligible)

**Performance**: No noticeable impact on runtime or build time.

---

## Success Metrics

### Completion Criteria

- ✅ 9 native checkboxes replaced with shadcn components
- ✅ 3 appropriate checkboxes migrated to Switch component
- ✅ All existing functionality preserved
- ✅ Accessibility improved (ARIA, keyboard nav)
- ✅ Tests updated to match new component structure
- ✅ Documentation updated with Switch pattern examples

### Quality Gates

1. **Visual consistency**: All components match design system
2. **Functional parity**: No regressions in existing workflows
3. **Accessibility**: WCAG AA compliance maintained
4. **Performance**: No degradation in large lists (100+ items)
5. **Test coverage**: All migrated components have passing tests

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Verify indeterminate state support**:
   ```bash
   # Test in shadcn-test page
   npm run dev
   # Navigate to http://localhost:5173/shadcn-test
   # Add indeterminate checkbox demo
   ```

2. ✅ **Create migration branch**:
   ```bash
   git checkout -b feat/phase3-checkbox-migrations
   ```

3. ✅ **Start with Priority 1 components**:
   - ImportPersonDataModal (Switch pattern demo)
   - SuggestionThumbnail
   - PersonPhotosTab

### Phase 3 Complete Checklist

- [ ] ImportPersonDataModal migrated (2 Switch components)
- [ ] SuggestionThumbnail migrated (1 Checkbox)
- [ ] PersonPhotosTab migrated (1 Checkbox)
- [ ] DirectoryBrowser filter migrated (1 Switch)
- [ ] DirectoryBrowser selection migrated (1 Checkbox)
- [ ] SuggestionGroupCard migrated (1 Checkbox with indeterminate)
- [ ] All tests updated and passing
- [ ] Documentation updated with Switch patterns
- [ ] Migration guide created for future reference

---

## Appendix: Component File Paths

### Migration Targets

```
src/lib/components/faces/SuggestionGroupCard.svelte (1 checkbox, indeterminate)
src/lib/components/training/DirectoryBrowser.svelte (2 checkboxes: filter + selection)
src/lib/components/admin/ImportPersonDataModal.svelte (2 checkboxes → Switch)
src/lib/components/faces/SuggestionThumbnail.svelte (1 checkbox)
src/lib/components/faces/PersonPhotosTab.svelte (1 checkbox)
```

### shadcn Components

```
src/lib/components/ui/checkbox/ (installed, partially used)
src/lib/components/ui/switch/ (installed, unused in production)
src/lib/components/ui/label/ (installed, will be used with Checkbox/Switch)
src/lib/components/ui/separator/ (installed, already migrated)
src/lib/components/ui/select/ (installed, already migrated)
```

### Test Files to Update

```
src/tests/components/faces/SuggestionGroupCard.test.ts (if exists)
src/tests/components/training/DirectoryBrowser.test.ts
src/tests/components/admin/ImportPersonDataModal.test.ts (if exists)
src/tests/components/faces/SuggestionThumbnail.test.ts (if exists)
src/tests/components/faces/PersonPhotosTab.test.ts (if exists)
```

---

## References

- **Phase 3 Documentation**: `docs/shadcn-phase3-migration.md`
- **People Page Migration**: Example in phase3 doc (completed 2026-01-06)
- **shadcn-svelte Docs**: https://shadcn-svelte.com/docs/components/checkbox
- **Accessibility Guidelines**: WCAG 2.1 AA
- **Testing Library**: https://testing-library.com/docs/queries/about

---

**Analysis Date**: 2026-01-07
**Analyst**: Research Agent
**Status**: Complete and Ready for Implementation
**Estimated Total Effort**: 5-7 hours (spread over 1-2 weeks)
