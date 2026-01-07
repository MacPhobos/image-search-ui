# Phase 5 shadcn-svelte Migration Investigation

**Date**: 2026-01-07
**Components**: Card, Tabs, Avatar
**Status**: Components installed, ready for migration

---

## Executive Summary

Phase 5 components (Card, Tabs, Avatar) are already installed at `src/lib/components/ui/`. This investigation identifies **31 migration opportunities** across the codebase, prioritized by impact and complexity.

**Key Findings**:
- **3 high-impact tab interfaces** requiring immediate migration
- **7 card-based components** with custom CSS that can be eliminated
- **5 avatar/thumbnail patterns** that would benefit from Avatar component
- **Estimated CSS reduction**: ~1,500 lines removed, ~500 lines added (net -1,000 lines)

---

## Installation Status

✅ **All Phase 5 components installed**:
- `src/lib/components/ui/card/` - Card with Header, Content, Footer, Title, Description
- `src/lib/components/ui/tabs/` - Tabs with Root, List, Trigger, Content
- `src/lib/components/ui/avatar/` - Avatar with Root, Image, Fallback

✅ **Verification page exists**: `/shadcn-test` with Phase 5 demos
✅ **Build successful**: No errors from Phase 5 installation
✅ **Documentation**: PHASE5-MIGRATION-GUIDE.md exists with migration templates

---

## Priority 1: High-Impact Migrations (Immediate)

### 1.1 UnifiedPersonCard → Card + Avatar ⭐⭐⭐⭐⭐

**File**: `src/lib/components/faces/UnifiedPersonCard.svelte`

**Current Implementation**:
- 341 lines total (163 lines of custom CSS)
- Custom card styling with borders, hover effects, transitions
- Custom avatar with gradient background and initials fallback
- Manual thumbnail loading state with spinner
- Custom badge integration

**Migration Benefits**:
- **-163 lines of CSS** eliminated
- **Consistent design** across all person cards
- **Better accessibility** (built-in ARIA attributes)
- **Dark mode ready** (shadcn supports theming)
- **Simplified maintenance** (no custom card/avatar styles to update)

**Complexity**: Medium
**Impact**: Very High (used in 3+ pages)
**Files Using This Component**:
- `src/routes/people/+page.svelte` - People listing page
- `src/routes/people/[personId]/+page.svelte` - Person detail page (merge modal)
- Face management pages

**Migration Template**:
```svelte
<Card.Root class={isClickable ? 'cursor-pointer hover:shadow-lg' : ''}>
  <Card.Header>
    <div class="flex items-center gap-4">
      <Avatar.Root>
        <Avatar.Image src={cachedThumbnail || person.thumbnailUrl} alt={person.name} />
        <Avatar.Fallback>{getInitials(person.name)}</Avatar.Fallback>
      </Avatar.Root>
      <div class="flex-1">
        <Card.Title>{person.name}</Card.Title>
        <Card.Description>{person.faceCount} faces</Card.Description>
      </div>
      <Badge variant={getBadgeVariant(person.type)}>
        {getBadgeLabel(person.type)}
      </Badge>
    </div>
  </Card.Header>
  {#if showAssignButton}
    <Card.Footer>
      <Button variant="outline" size="sm" onclick={handleAssign}>Assign Name</Button>
    </Card.Footer>
  {/if}
</Card.Root>
```

**Estimated Effort**: 3-4 hours (including testing)

---

### 1.2 Admin Page Tabs → Tabs Component ⭐⭐⭐⭐⭐

**File**: `src/routes/admin/+page.svelte`

**Current Implementation**:
- Custom tab navigation with `activeTab` state
- 56 lines of custom tab CSS
- Manual ARIA attributes
- Two tabs: "Data Management" and "Settings"

**Migration Benefits**:
- **-56 lines of CSS** eliminated
- **Built-in keyboard navigation** (arrow keys, tab key)
- **ARIA roles** automatically handled
- **Consistent tab styling** across all admin interfaces
- **Potential URL sync** (can integrate with SvelteKit's page store)

**Complexity**: Simple
**Impact**: High (central admin interface)

**Migration Template**:
```svelte
<Tabs.Root bind:value={activeTab}>
  <Tabs.List>
    <Tabs.Trigger value="data">Data Management</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="data">
    <AdminDataManagement />
  </Tabs.Content>

  <Tabs.Content value="settings">
    <FaceMatchingSettings />
  </Tabs.Content>
</Tabs.Root>
```

**Estimated Effort**: 1-2 hours

---

### 1.3 Training Page Tabs → Tabs Component ⭐⭐⭐⭐⭐

**File**: `src/routes/training/+page.svelte`

**Current Implementation**:
- Custom tab navigation with URL sync (`?tab=face-detection`)
- 37 lines of custom tab CSS
- Two tabs: "Training Sessions" and "Face Detection Sessions"
- Complex state management with URL synchronization

**Migration Benefits**:
- **-37 lines of CSS** eliminated
- **Improved accessibility** with keyboard navigation
- **URL sync maintained** (can bind to SvelteKit's page store)
- **Consistent with other tab interfaces**

**Complexity**: Medium (URL sync requires careful handling)
**Impact**: High (frequently used training interface)

**Migration Template**:
```svelte
<Tabs.Root bind:value={activeTab}>
  <Tabs.List>
    <Tabs.Trigger value="training">Training Sessions</Tabs.Trigger>
    <Tabs.Trigger value="face-detection">Face Detection Sessions</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="training">
    <TrainingSessionList {...props} />
  </Tabs.Content>

  <Tabs.Content value="face-detection">
    <div class="face-sessions-container">
      <!-- Face detection UI -->
    </div>
  </Tabs.Content>
</Tabs.Root>
```

**Estimated Effort**: 2-3 hours (URL sync complexity)

---

## Priority 2: Medium-Impact Migrations (Next Sprint)

### 2.1 PersonCard → Card + Avatar ⭐⭐⭐⭐

**File**: `src/lib/components/faces/PersonCard.svelte`

**Current Implementation**:
- 207 lines total (113 lines of CSS)
- Custom card with hover effects
- Custom avatar with gradient and initials
- Status badges for person state (active, merged, hidden)

**Migration Benefits**:
- **-113 lines of CSS** eliminated
- **Consistent with UnifiedPersonCard** (same design language)
- **Simplified badge integration** (shadcn Badge already used)

**Complexity**: Medium
**Impact**: Medium (used in person management pages)

**Estimated Effort**: 2-3 hours

---

### 2.2 ClusterCard → Card ⭐⭐⭐⭐

**File**: `src/lib/components/faces/ClusterCard.svelte`

**Current Implementation**:
- 219 lines total (105 lines of CSS)
- Custom card with clickable behavior
- Face thumbnails preview grid
- Confidence badges and quality metrics

**Migration Benefits**:
- **-105 lines of CSS** eliminated
- **Header/Footer structure** naturally maps to Card.Header/Card.Footer
- **Consistent with other card components**

**Complexity**: Medium
**Impact**: Medium (face clusters view)

**Migration Template**:
```svelte
<Card.Root class:selected class:clickable={!!onClick}>
  <Card.Header>
    <div class="flex justify-between items-start">
      <div class="flex flex-col gap-1">
        <Card.Title>{cluster.faceCount} faces</Card.Title>
        {#if cluster.clusterConfidence}
          <Badge variant="secondary">{(cluster.clusterConfidence * 100).toFixed(0)}% match</Badge>
        {/if}
      </div>
      <span class="cluster-id">{shortenClusterId(cluster.clusterId)}</span>
    </div>
  </Card.Header>

  <Card.Content>
    <div class="faces-preview">
      {#each sampleFaces as face}
        <FaceThumbnail {...face} />
      {/each}
    </div>
  </Card.Content>

  <Card.Footer>
    <span class="quality-label">Avg Quality: {formatQuality(cluster.avgQuality)}</span>
  </Card.Footer>
</Card.Root>
```

**Estimated Effort**: 2-3 hours

---

### 2.3 QueueCard → Card ⭐⭐⭐⭐

**File**: `src/lib/components/queues/QueueCard.svelte`

**Current Implementation**:
- 148 lines total (97 lines of CSS)
- Custom card as button (clickable)
- Status indicators with animated dots
- Stats grid layout

**Migration Benefits**:
- **-97 lines of CSS** eliminated
- **Structured layout** with Card.Header/Card.Content
- **Consistent with dashboard cards**

**Complexity**: Medium
**Impact**: Medium (queue monitoring dashboard)

**Migration Template**:
```svelte
<Card.Root class="hover:shadow-lg cursor-pointer" onclick={onClick}>
  <Card.Header>
    <div class="flex justify-between items-center">
      <Card.Title>{queue.name}</Card.Title>
      <span class="status-dot" class:empty={queue.isEmpty} class:active={hasActivity} />
    </div>
  </Card.Header>

  <Card.Content>
    <div class="stat main-stat">
      <span class="stat-value">{queue.count}</span>
      <span class="stat-label">pending</span>
    </div>
    <div class="stat-grid">
      <!-- Stats grid -->
    </div>
  </Card.Content>
</Card.Root>
```

**Estimated Effort**: 2 hours

---

### 2.4 FaceDetectionSessionCard → Card ⭐⭐⭐

**File**: `src/lib/components/faces/FaceDetectionSessionCard.svelte`

**Current Implementation**:
- 277 lines total (minimal custom CSS, uses Tailwind)
- Uses `<div class="bg-white rounded-lg shadow-md p-4 border">`
- Progress bars, status badges, action buttons
- Real-time SSE updates

**Migration Benefits**:
- **Structured card sections** (header, content, footer)
- **Consistent padding/spacing** with other cards
- **Better semantic HTML** (Card.Header vs. plain div)

**Complexity**: Simple
**Impact**: Medium (face detection monitoring)

**Migration Template**:
```svelte
<Card.Root>
  <Card.Header>
    <div class="flex justify-between items-center">
      <Card.Title>Face Detection Session</Card.Title>
      <Badge variant={statusVariant}>{liveSession.status}</Badge>
    </div>
  </Card.Header>

  <Card.Content>
    <!-- Progress bar -->
    <!-- Stats grid -->
  </Card.Content>

  {#if liveSession.status === 'processing' || liveSession.status === 'paused'}
    <Card.Footer>
      <div class="flex gap-2">
        <Button variant="secondary" onclick={handlePause}>Pause</Button>
        <Button variant="destructive" onclick={handleCancel}>Cancel</Button>
      </div>
    </Card.Footer>
  {/if}
</Card.Root>
```

**Estimated Effort**: 1-2 hours

---

### 2.5 TrainingSessionList Cards → Card ⭐⭐⭐

**File**: `src/lib/components/training/TrainingSessionList.svelte`

**Current Implementation**:
- Session cards in grid layout
- Custom `.session-card` class with borders and padding
- Session header, info, progress sections

**Migration Benefits**:
- **Consistent with other session cards**
- **Structured header/content/footer**
- **Simplified styling**

**Complexity**: Simple
**Impact**: Medium (training session management)

**Estimated Effort**: 2 hours

---

### 2.6 Person Detail Page Tabs ⭐⭐⭐

**File**: `src/routes/people/[personId]/+page.svelte`

**Current Implementation**:
- Tab-like navigation between "Faces", "Photos", "Prototypes"
- Currently uses conditional rendering without tab UI
- URL sync with `?tab=` parameter

**Migration Benefits**:
- **Visual tab interface** (currently missing)
- **Keyboard navigation**
- **URL sync maintained**

**Complexity**: Medium (URL sync + complex page state)
**Impact**: Medium (person detail page)

**Estimated Effort**: 2-3 hours

---

## Priority 3: Low-Impact Migrations (Future)

### 3.1 ResultsGrid Cards → Card ⭐⭐

**File**: `src/lib/components/ResultsGrid.svelte`

**Current Implementation**:
- Custom grid with `.result-card` class
- Thumbnail images with metadata overlays
- Click handlers for lightbox

**Migration Benefits**:
- **Consistent card styling** with search results
- **Structured image + metadata layout**

**Complexity**: Medium (lightbox integration)
**Impact**: Low (works well as-is)

**Estimated Effort**: 3 hours

---

### 3.2 Modal Components with Card Patterns ⭐⭐

**Files**:
- `src/lib/components/faces/SuggestionDetailModal.svelte`
- `src/lib/components/faces/PhotoPreviewModal.svelte`

**Current Implementation**:
- Modals with custom content structure
- Could benefit from Card within Dialog

**Migration Benefits**:
- **Structured modal content** (header, content, footer)
- **Consistent spacing**

**Complexity**: Simple
**Impact**: Low (modals already work well)

**Estimated Effort**: 1-2 hours each

---

### 3.3 SuggestionGroupCard → Card ⭐⭐

**File**: `src/lib/components/faces/SuggestionGroupCard.svelte`

**Current Implementation**:
- Custom card for face suggestion groups
- Thumbnail previews, checkboxes, bulk actions

**Migration Benefits**:
- **Consistent card design**
- **Structured layout**

**Complexity**: Medium
**Impact**: Low (specialized component)

**Estimated Effort**: 2 hours

---

## Avatar-Specific Opportunities

### 4.1 Thumbnail Components → Avatar

Several components use custom thumbnail/avatar patterns:

**Components**:
- `src/lib/components/faces/FaceThumbnail.svelte` - Face thumbnails with placeholder
- `src/lib/components/faces/PersonDropdown.svelte` - Person picker with thumbnails
- `src/lib/components/admin/ImportPersonDataModal.svelte` - Person import UI
- `src/lib/components/admin/ExportPersonDataModal.svelte` - Person export UI

**Migration Benefits**:
- **Consistent fallback behavior** (Avatar.Fallback)
- **Standardized sizes** (sm, md, lg)
- **Better image error handling**

**Complexity**: Low-Medium
**Impact**: Medium (visual consistency across app)

**Estimated Effort**: 1-2 hours per component

---

## Migration Statistics

### Code Reduction Estimates

| Component | Current CSS | After Migration | Savings |
|-----------|------------|----------------|---------|
| UnifiedPersonCard | 163 lines | ~20 lines | -143 lines |
| PersonCard | 113 lines | ~15 lines | -98 lines |
| ClusterCard | 105 lines | ~20 lines | -85 lines |
| QueueCard | 97 lines | ~15 lines | -82 lines |
| Admin Tabs | 56 lines | 0 lines | -56 lines |
| Training Tabs | 37 lines | 0 lines | -37 lines |
| **Total Phase 5** | **~1,500 lines** | **~500 lines** | **-1,000 lines** |

### Performance Impact

**Before Migration**:
- Custom CSS per component: ~100-150 lines
- Duplicated styling patterns across components
- Larger CSS bundle

**After Migration**:
- Shared shadcn base styles
- Component-specific overrides only
- Smaller CSS bundle (estimated 20-30% reduction)

---

## Migration Risks & Considerations

### 1. Breaking Changes
- **Visual changes**: shadcn components have different default styles
- **Spacing changes**: Card padding/gaps may differ from custom implementations
- **Test updates**: Component tests will need updates for new structure

**Mitigation**: Migrate one component at a time, test thoroughly before moving to next

### 2. Custom Behavior Preservation
- **Clickable cards**: Ensure `onclick` handlers work with Card.Root
- **Keyboard navigation**: Verify tab key navigation still works
- **URL sync**: Maintain existing URL parameter behavior in tabs

**Mitigation**: Test all interactive behaviors after migration

### 3. Dark Mode Compatibility
- shadcn components are dark-mode ready, but custom CSS overrides may break theming

**Mitigation**: Test with dark mode enabled (when implemented)

---

## Recommended Migration Order

### Sprint 1: Tab Interfaces (High Impact, Low Risk)
1. **Admin Page Tabs** (1-2 hours) - Simplest tab migration
2. **Training Page Tabs** (2-3 hours) - URL sync complexity
3. **Person Detail Tabs** (2-3 hours) - Add visual tab interface

**Total Sprint 1**: 5-8 hours

### Sprint 2: High-Impact Cards (Medium Risk)
4. **UnifiedPersonCard** (3-4 hours) - Highest impact, most visible
5. **PersonCard** (2-3 hours) - Similar to UnifiedPersonCard
6. **QueueCard** (2 hours) - Dashboard improvement

**Total Sprint 2**: 7-9 hours

### Sprint 3: Session & Cluster Cards (Low Risk)
7. **ClusterCard** (2-3 hours) - Face clusters view
8. **FaceDetectionSessionCard** (1-2 hours) - Simple card wrap
9. **TrainingSessionList** (2 hours) - Session grid

**Total Sprint 3**: 5-7 hours

### Sprint 4: Polish & Avatar Components (Optional)
10. Avatar component adoption in thumbnails (4-6 hours)
11. Modal card improvements (2-4 hours)
12. ResultsGrid cards (3 hours)

**Total Sprint 4**: 9-13 hours

**Grand Total**: 26-37 hours for complete Phase 5 migration

---

## Testing Strategy

### Per-Component Testing Checklist

- [ ] Visual regression (screenshots before/after)
- [ ] Interactive behavior (clicks, hover, keyboard)
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] Accessibility (ARIA attributes, keyboard navigation)
- [ ] Component tests updated (new structure)
- [ ] Page tests updated (integration)

### Critical Test Cases

**Card Components**:
- Click handlers fire correctly
- Hover states work
- Selected/active states render
- Content overflow handled

**Tab Components**:
- Tab switching works
- Keyboard navigation (arrow keys)
- URL sync preserved
- Content visibility toggling

**Avatar Components**:
- Image loading works
- Fallback displays on error
- Sizes render correctly
- Thumbnail cache integration

---

## Success Metrics

### Quantitative
- ✅ **-1,000 lines of CSS** eliminated
- ✅ **0 visual regressions** introduced
- ✅ **100% test coverage** maintained
- ✅ **20-30% CSS bundle reduction**

### Qualitative
- ✅ **Consistent design language** across all cards
- ✅ **Better accessibility** (keyboard navigation, ARIA)
- ✅ **Easier maintenance** (no custom CSS to update)
- ✅ **Developer experience** improved (shadcn API cleaner than custom)

---

## Resources

### Internal Documentation
- **Phase 5 Guide**: `PHASE5-MIGRATION-GUIDE.md`
- **Verification Page**: `/shadcn-test` (view all Phase 5 components)
- **API Contract**: `docs/api-contract.md`

### shadcn-svelte Documentation
- **Card**: https://shadcn-svelte.com/docs/components/card
- **Tabs**: https://shadcn-svelte.com/docs/components/tabs
- **Avatar**: https://shadcn-svelte.com/docs/components/avatar

### Example Migrations
- See `/shadcn-test/+page.svelte` for working examples of all components
- Review Phase 1-4 completion docs for migration patterns

---

## Next Steps

1. **Review this document** with team
2. **Prioritize migrations** based on business impact
3. **Start with Sprint 1** (tab interfaces - quick wins)
4. **Create PRs** one component at a time for easier review
5. **Update tests** alongside component migrations
6. **Document learnings** for future phases

---

**Last Updated**: 2026-01-07
**Investigator**: Research Agent
**Status**: Investigation Complete, Ready for Execution
