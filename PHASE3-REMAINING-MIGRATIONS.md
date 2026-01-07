# Phase 3 Remaining Migrations - Quick Reference

**Status**: 1 of 6 components migrated (People page ✅)
**Remaining**: 5 components with 9 checkbox instances

---

## 🎯 Migration Targets (Priority Order)

### ✅ COMPLETED
1. **People Page** (`/src/routes/people/+page.svelte`)
   - 3 checkboxes → Checkbox components
   - 2 select dropdowns → Select components
   - 1 divider → Separator component

---

### 🔴 PRIORITY 1: Simple Migrations (Do First)

#### 1. ImportPersonDataModal (2 checkboxes → Switch)
- **File**: `src/lib/components/admin/ImportPersonDataModal.svelte`
- **Lines**: 234, 249
- **Type**: Settings toggles (RECOMMEND SWITCH, NOT CHECKBOX)
- **Effort**: 30 min
- **Pattern**: Settings card with description

```svelte
<!-- CURRENT -->
<label class="checkbox-label">
  <input type="checkbox" bind:checked={skipMissingImages} />
  Skip faces for missing images
</label>

<!-- MIGRATE TO -->
<div class="flex items-center justify-between rounded-lg border p-4">
  <div class="space-y-0.5">
    <Label for="skip-missing">Skip faces for missing images</Label>
    <p class="text-sm text-muted-foreground">Description text</p>
  </div>
  <Switch id="skip-missing" bind:checked={skipMissingImages} />
</div>
```

#### 2. SuggestionThumbnail (1 checkbox)
- **File**: `src/lib/components/faces/SuggestionThumbnail.svelte`
- **Line**: 85
- **Type**: Selection checkbox in thumbnail grid
- **Effort**: 20 min
- **Notes**: May need custom positioning CSS

#### 3. PersonPhotosTab (1 checkbox)
- **File**: `src/lib/components/faces/PersonPhotosTab.svelte`
- **Line**: 181
- **Type**: Photo selection in grid
- **Effort**: 20 min
- **Notes**: Similar to SuggestionThumbnail

**Total Priority 1**: 4 instances, ~1.5 hours

---

### 🟡 PRIORITY 2: Medium Complexity

#### 4. DirectoryBrowser - Filter Toggle (1 checkbox → Switch)
- **File**: `src/lib/components/training/DirectoryBrowser.svelte`
- **Line**: 142
- **Type**: "Hide fully trained directories" toggle
- **Effort**: 20 min
- **RECOMMEND**: Switch component (it's a filter toggle, not selection)

```svelte
<!-- CURRENT -->
<label class="checkbox-filter">
  <input type="checkbox" bind:checked={hideTrainedDirs} />
  <span>Hide fully trained directories</span>
</label>

<!-- MIGRATE TO -->
<div class="flex items-center justify-between">
  <Label for="hide-trained">Hide fully trained directories</Label>
  <Switch id="hide-trained" bind:checked={hideTrainedDirs} />
</div>
```

#### 5. DirectoryBrowser - Selection (1 checkbox)
- **File**: `src/lib/components/training/DirectoryBrowser.svelte`
- **Line**: 177
- **Type**: Directory multi-select
- **Effort**: 30 min
- **Notes**: Test multi-select with arrays

**Total Priority 2**: 2 instances, ~1 hour

---

### 🟠 PRIORITY 3: Complex Migration

#### 6. SuggestionGroupCard (1 checkbox with indeterminate)
- **File**: `src/lib/components/faces/SuggestionGroupCard.svelte`
- **Line**: 88
- **Type**: Bulk selection with indeterminate state
- **Effort**: 1 hour
- **Risk**: Medium (need to verify indeterminate support)

```svelte
<!-- CURRENT -->
<input
  type="checkbox"
  checked={allSelected}
  indeterminate={someSelected}
  onchange={handleSelectAll}
/>

<!-- MIGRATE TO -->
<Checkbox
  id="group-select"
  checked={allSelected}
  indeterminate={someSelected}
  onchange={handleSelectAll}
/>
```

**Action**: Test indeterminate state in shadcn-test page FIRST

**Total Priority 3**: 1 instance, ~1 hour

---

## 📊 Summary

| Priority | Components | Instances | Effort | Checkbox | Switch |
|----------|------------|-----------|--------|----------|--------|
| 1 (Simple) | 3 | 4 | 1.5h | 2 | 2 |
| 2 (Medium) | 1 | 2 | 1h | 1 | 1 |
| 3 (Complex) | 1 | 1 | 1h | 1 | 0 |
| **TOTAL** | **5** | **7** | **3.5h** | **4** | **3** |

---

## 🔄 Switch vs Checkbox Guidelines

### Use Switch When:
- ✅ Toggle behavior (on/off, enable/disable)
- ✅ Settings and preferences
- ✅ Filter toggles
- ✅ Feature flags
- ✅ Has descriptive text

**Examples in our app**:
- "Hide fully trained directories" (DirectoryBrowser)
- "Skip faces for missing images" (ImportPersonDataModal)
- "Auto-ingest images" (ImportPersonDataModal)

### Use Checkbox When:
- ✅ Selection behavior (select items)
- ✅ Multi-select lists
- ✅ Bulk operations
- ✅ Forms with multiple options

**Examples in our app**:
- Photo selection (PersonPhotosTab)
- Suggestion selection (SuggestionThumbnail)
- Directory selection (DirectoryBrowser)
- Bulk selection (SuggestionGroupCard)

---

## 🚀 Quick Start

```bash
# 1. Verify indeterminate state support (for Priority 3)
npm run dev
# Test in http://localhost:5173/shadcn-test

# 2. Create migration branch
git checkout -b feat/phase3-checkbox-migrations

# 3. Start with Priority 1 (easiest)
# Edit: src/lib/components/admin/ImportPersonDataModal.svelte
# Replace 2 checkboxes with Switch components

# 4. Test manually
npm run dev
# Navigate to admin panel → Import Person Data

# 5. Run tests
npm run test

# 6. Commit
git add .
git commit -m "feat(ui): migrate ImportPersonDataModal to Switch components"

# 7. Repeat for other components
```

---

## 📋 Migration Checklist

### Per Component
- [ ] Replace native checkbox with Checkbox/Switch
- [ ] Update container layout (flex, space-x-2)
- [ ] Add Label association with `for` attribute
- [ ] Test visual appearance
- [ ] Test keyboard navigation (Tab, Space)
- [ ] Test with screen reader
- [ ] Update tests to match new structure
- [ ] Verify no regressions

### Final Verification
- [ ] All 7 checkboxes migrated
- [ ] 3 Switch components working in production
- [ ] 4 Checkbox components working in production
- [ ] All tests passing
- [ ] No visual regressions
- [ ] Accessibility maintained (WCAG AA)
- [ ] Documentation updated

---

## 📚 Resources

- **Full Analysis**: `docs/research/phase3-migration-scope-analysis-2026-01-07.md`
- **Phase 3 Guide**: `docs/shadcn-phase3-migration.md`
- **People Page Example**: See phase3 guide for completed migration
- **shadcn Checkbox**: https://shadcn-svelte.com/docs/components/checkbox
- **shadcn Switch**: https://shadcn-svelte.com/docs/components/switch

---

**Last Updated**: 2026-01-07
**Total Remaining Effort**: ~3.5 hours
**Next Action**: Start with ImportPersonDataModal (Priority 1, Switch pattern demo)
