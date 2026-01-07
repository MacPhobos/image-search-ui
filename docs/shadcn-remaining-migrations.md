# Remaining shadcn-svelte Migration Opportunities

**Last Updated**: 2026-01-06
**Phase 1 Completed**: Badge, Input, Label, Alert

---

## Badge Migration Targets (Remaining)

### High Impact

1. **Face confidence badges** (6 files)
   - `src/lib/components/faces/ClusterCard.svelte` - Confidence indicators
   - `src/lib/components/faces/PersonCard.svelte` - Face quality badges
   - `src/lib/components/faces/UnifiedPersonCard.svelte` - Type badges
   - `src/lib/components/faces/SuggestionThumbnail.svelte` - Match confidence
   - `src/routes/faces/clusters/[clusterId]/+page.svelte` - Cluster stats
   - `src/routes/people/[personId]/+page.svelte` - Person stats

2. **Face detection session badges** (1 file)
   - `src/lib/components/faces/FaceDetectionSessionCard.svelte` - Status badges

3. **Temporal timeline badges** (1 file)
   - `src/lib/components/faces/TemporalTimeline.svelte` - Age range badges

4. **Dev overlay badges** (1 file)
   - `src/lib/dev/DevOverlay.svelte` - Route breadcrumb badges

5. **Vector deletion logs** (1 file)
   - `src/lib/components/vectors/DeletionLogsTable.svelte` - Status badges

### Medium Impact

6. **Inline badge usage** - Search for `<span class="badge"` patterns
   - `src/routes/faces/suggestions/+page.svelte`
   - Any remaining custom badge CSS classes

**Estimated Effort**: 3-4 hours for all badge migrations

---

## Input/Label Migration Targets

### High Priority

1. **Search bars** (2 locations)
   - Dashboard main search input
   - People page filter search (if exists)

2. **Filter inputs** (3 files)
   - `src/routes/people/+page.svelte` - Checkbox labels (Show Identified, etc.)
   - Date range inputs (if implemented)
   - Number range inputs (face count filters)

3. **Modal forms** (5+ files)
   - `src/lib/components/faces/PersonDetailModal.svelte` - Name input
   - `src/lib/components/faces/PrototypeEditModal.svelte` - Age range inputs
   - `src/lib/components/CategoryCreateModal.svelte` - Name/description inputs
   - `src/lib/components/training/DirectoryBrowser.svelte` - Path input
   - Any other edit/create modals

4. **Settings pages** (if exists)
   - Configuration forms
   - Admin settings

**Estimated Effort**: 4-5 hours

---

## Alert Migration Targets

### Error/Success Messages

1. **API error displays** (search for error state rendering)
   - Dashboard search errors
   - People page load errors
   - Face detection errors
   - Training session errors

2. **Empty states** (could use Alert for info)
   - "No results found"
   - "No faces detected"
   - "No training sessions"

3. **Success notifications** (if exists)
   - "Person saved"
   - "Prototype updated"
   - "Category created"

**Estimated Effort**: 2-3 hours

---

## Phase 2 Components (Next Installation)

### Dialog/Modal (Critical)

**Usage Count**: 10+ modals across the app

**Files to Migrate**:
1. `src/lib/components/faces/PersonDetailModal.svelte`
2. `src/lib/components/faces/PhotoPreviewModal.svelte`
3. `src/lib/components/faces/SuggestionDetailModal.svelte`
4. `src/lib/components/faces/PrototypeEditModal.svelte`
5. `src/lib/components/CategoryCreateModal.svelte`
6. `src/lib/components/CategoryEditModal.svelte`
7. Any other `*Modal.svelte` files

**Benefits**:
- Consistent modal styling
- Built-in accessibility (focus trap, ESC key)
- Portal rendering (avoids z-index issues)
- Keyboard navigation

**Estimated Effort**: 6-8 hours

---

### Card Component

**Usage Count**: 20+ card-like containers

**Files to Migrate**:
1. `src/lib/components/faces/ClusterCard.svelte`
2. `src/lib/components/faces/PersonCard.svelte`
3. `src/lib/components/faces/UnifiedPersonCard.svelte`
4. `src/lib/components/faces/FaceDetectionSessionCard.svelte`
5. `src/lib/components/training/SessionCard.svelte`
6. Dashboard result cards
7. Any `<article>` or custom card containers

**Benefits**:
- Consistent card styling
- Built-in hover/focus states
- Composable card parts (header, content, footer)

**Estimated Effort**: 4-6 hours

---

### Select/Dropdown

**Usage Count**: 5-10 select elements

**Files to Migrate**:
1. `src/routes/people/+page.svelte` - Sort by dropdown, Sort order dropdown
2. Filter dropdowns (if any)
3. Settings dropdowns

**Benefits**:
- Better mobile experience
- Searchable options
- Keyboard navigation
- Custom styling

**Estimated Effort**: 2-3 hours

---

### Checkbox

**Usage Count**: 3+ checkboxes

**Files to Migrate**:
1. `src/routes/people/+page.svelte` - Show Identified, Show Unidentified, Show Unknown
2. Multi-select forms (if any)
3. Settings toggles

**Benefits**:
- Consistent styling
- Indeterminate state support
- Accessibility built-in

**Estimated Effort**: 1-2 hours

---

### Separator

**Usage Count**: 10+ dividers

**Files to Search**:
- Look for `<hr>` elements
- Look for `<div class="divider">` or similar
- `src/routes/people/+page.svelte` has `.divider` class

**Benefits**:
- Semantic separators
- Consistent spacing
- Vertical/horizontal variants

**Estimated Effort**: 1 hour

---

## Phase 3 Components (Advanced)

### Table Component

**Usage Count**: 3-5 tables

**Files**:
1. `src/lib/components/vectors/DeletionLogsTable.svelte`
2. Queue dashboard tables
3. Face suggestions tables
4. Training session tables

**Estimated Effort**: 4-5 hours

---

### Tabs Component

**Usage Count**: 2-3 tabbed interfaces

**Potential Usage**:
1. Person detail page (Photos, Prototypes, Stats tabs)
2. Training page (Sessions, Face Sessions as tabs - recently consolidated)
3. Admin panel sections

**Estimated Effort**: 2-3 hours

---

### Popover/Tooltip

**Usage Count**: 5-10 tooltip opportunities

**Potential Usage**:
- Face confidence explanations
- Button help text
- Stat tooltips
- Icon explanations

**Estimated Effort**: 2-3 hours

---

### Form Components

**Advanced form primitives**:
- **Textarea** - Description fields
- **Radio Group** - Exclusive options
- **Switch** - Toggle settings
- **Slider** - Confidence thresholds

**Estimated Effort**: 3-4 hours

---

## Migration Priority Roadmap

### Sprint 1: Complete Badge Migrations (3-4 hours)
- Migrate remaining 10 badge usages
- Consolidate badge styling
- Update tests

### Sprint 2: Phase 2 Foundation (8-10 hours)
- Install Dialog, Card, Select, Checkbox, Separator
- Migrate highest-impact modals (3-4)
- Migrate card components (5-6)
- Replace select/checkbox on people page

### Sprint 3: Polish & Advanced (10-12 hours)
- Complete remaining modal migrations
- Add Table component for data displays
- Add Tabs for multi-view pages
- Add Popover/Tooltip for help text
- Final cleanup and documentation

---

## Testing Strategy

### For Each Migration

1. **Visual Regression**
   - Take screenshot before migration
   - Take screenshot after migration
   - Compare for unintended changes

2. **Unit Tests**
   - Update component tests
   - Test all variants
   - Test accessibility

3. **Integration Tests**
   - Test in context (page-level)
   - Test user workflows
   - Test keyboard navigation

4. **Manual QA**
   - Test on desktop
   - Test on mobile
   - Test with screen reader

---

## Success Metrics

### Code Quality
- **LOC Reduction**: Target 30-40% reduction in custom CSS
- **Type Safety**: 100% TypeScript coverage maintained
- **Test Coverage**: No decrease in coverage %

### Consistency
- **Component Reuse**: All badges use Badge component
- **Styling**: No custom badge CSS classes
- **Accessibility**: All ARIA attributes preserved

### Developer Experience
- **Onboarding**: New devs use shadcn components by default
- **Documentation**: All components documented in shadcn-test page
- **Maintenance**: Easier to update styles globally

---

## Risk Mitigation

### Breaking Changes
- **Gradual Migration**: One component type at a time
- **Backward Compatibility**: Old and new components coexist
- **Feature Flags**: Use dev flags for risky migrations

### Performance
- **Bundle Size**: Monitor bundle size impact
- **Lazy Loading**: Load shadcn components only when needed
- **Tree Shaking**: Ensure unused components are excluded

### Accessibility
- **Screen Reader Testing**: Test each migrated component
- **Keyboard Navigation**: Verify all interactions work
- **Focus Management**: Test focus trap in modals

---

## Questions/Decisions Needed

1. **Date Pickers**: Should we add shadcn Calendar/DatePicker?
   - Current: Native date inputs
   - Benefit: Better UX, consistent styling
   - Effort: Medium (2-3 hours)

2. **Search Autocomplete**: Add Combobox component?
   - Current: Simple text input
   - Benefit: Type-ahead suggestions
   - Effort: High (4-5 hours)

3. **Toast Notifications**: Add Toast component?
   - Current: No toast system
   - Benefit: Better success/error feedback
   - Effort: Medium (3-4 hours)

4. **Command Palette**: Add Command component?
   - Current: No command palette
   - Benefit: Power user shortcuts
   - Effort: High (6-8 hours)

---

## Total Estimated Effort

- **Remaining Badges**: 3-4 hours
- **Phase 2 (Dialog, Card, Select, etc.)**: 14-20 hours
- **Phase 3 (Advanced)**: 11-15 hours
- **Testing & Polish**: 5-8 hours

**Grand Total**: 33-47 hours (~1-2 weeks of dedicated work)

---

## Next Actions

1. ✅ Complete Phase 1 migrations (Badge, Input, Label, Alert)
2. ⬜ Install Phase 2 components (Dialog, Card, Select, Checkbox, Separator)
3. ⬜ Migrate PersonDetailModal to Dialog component (proof of concept)
4. ⬜ Migrate ClusterCard to Card component (proof of concept)
5. ⬜ Decide on advanced components (Toast, Combobox, Command)
6. ⬜ Create migration checklist for each component type
7. ⬜ Schedule migration sprints with team

**Recommendation**: Start Phase 2 with Dialog migration (highest impact, most used)
