# Component Tracking Conversion Plan

**Created:** 2026-01-11
**Status:** Ready for Implementation
**Reference:** [Dev Component Tracking Guide](../dev-component-tracking.md)

## Summary

This plan identifies components that should have manual DevOverlay tracking added, prioritized by importance.

| Category | Count | Tracking Pattern | Priority |
|----------|-------|------------------|----------|
| Pages | 15 | Mount-based | HIGH |
| Modals/Dialogs | 12 | Visibility-based | HIGH |
| Feature Components | 17 | Mount-based | MEDIUM |
| UI Primitives | ~15 | Optional | LOW |

**Already Completed:**
- ✅ `SuggestionDetailModal.svelte` (proof of concept)
- ✅ Root `+layout.svelte` (initializes component stack)

---

## Phase 1: Pages (HIGH Priority)

All pages use **mount-based tracking**. Add to each `+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry.svelte';

  const cleanup = registerComponent('PageName', {
    filePath: 'src/routes/path/+page.svelte'
  });
  onMount(() => cleanup);

  // ... rest of component
</script>
```

| File | Component Name | Notes |
|------|---------------|-------|
| `src/routes/+page.svelte` | `routes/+page` | Main dashboard/search |
| `src/routes/admin/+page.svelte` | `routes/admin/+page` | Admin panel |
| `src/routes/categories/+page.svelte` | `routes/categories/+page` | Category management |
| `src/routes/faces/clusters/+page.svelte` | `routes/faces/clusters/+page` | Face clusters list |
| `src/routes/faces/clusters/[clusterId]/+page.svelte` | `routes/faces/clusters/[clusterId]/+page` | Cluster detail |
| `src/routes/faces/sessions/+page.svelte` | `routes/faces/sessions/+page` | Detection sessions |
| `src/routes/faces/suggestions/+page.svelte` | `routes/faces/suggestions/+page` | Face suggestions |
| `src/routes/faces/persons/[id]/history/+page.svelte` | `routes/faces/persons/[id]/history/+page` | Person history |
| `src/routes/people/+page.svelte` | `routes/people/+page` | People list |
| `src/routes/people/[personId]/+page.svelte` | `routes/people/[personId]/+page` | Person detail |
| `src/routes/queues/+page.svelte` | `routes/queues/+page` | Queue dashboard |
| `src/routes/queues/[queueName]/+page.svelte` | `routes/queues/[queueName]/+page` | Queue detail |
| `src/routes/training/+page.svelte` | `routes/training/+page` | Training sessions |
| `src/routes/training/[sessionId]/+page.svelte` | `routes/training/[sessionId]/+page` | Session detail |
| `src/routes/vectors/+page.svelte` | `routes/vectors/+page` | Vector management |

**Skip:** `src/routes/shadcn-test*/+page.svelte` (test pages)

---

## Phase 2: Modals/Dialogs (HIGH Priority)

All modals use **visibility-based tracking**. Pattern:

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { registerComponent, getComponentStack } from '$lib/dev/componentRegistry.svelte';

  // Props include open state
  let { open, ... }: Props = $props();

  const componentStack = getComponentStack();
  let trackingCleanup: (() => void) | null = null;

  $effect(() => {
    if (open && componentStack) {
      trackingCleanup = untrack(() =>
        registerComponent('ModalName', {
          filePath: 'src/lib/components/path/Modal.svelte'
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

  // ... rest of component
</script>
```

| File | Component Name | Notes |
|------|---------------|-------|
| `src/lib/components/faces/PhotoPreviewModal.svelte` | `PhotoPreviewModal` | Full-screen photo viewer |
| `src/lib/components/faces/LabelClusterModal.svelte` | `LabelClusterModal` | Cluster labeling |
| `src/lib/components/faces/PersonPickerModal.svelte` | `PersonPickerModal` | Person selection |
| `src/lib/components/faces/FindMoreDialog.svelte` | `FindMoreDialog` | Find more suggestions |
| `src/lib/components/training/CreateSessionModal.svelte` | `CreateSessionModal` | New training session |
| `src/lib/components/vectors/RetrainModal.svelte` | `RetrainModal` | Retrain vectors |
| `src/lib/components/vectors/DeleteConfirmationModal.svelte` | `DeleteConfirmationModal` | Delete confirmation |
| `src/lib/components/admin/DeleteAllDataModal.svelte` | `DeleteAllDataModal` | Delete all data |
| `src/lib/components/admin/ExportPersonDataModal.svelte` | `ExportPersonDataModal` | Export data |
| `src/lib/components/admin/ImportPersonDataModal.svelte` | `ImportPersonDataModal` | Import data |
| `src/lib/components/CategoryCreateModal.svelte` | `CategoryCreateModal` | Create category |
| `src/lib/components/CategoryEditModal.svelte` | `CategoryEditModal` | Edit category |

**Already done:** ✅ `SuggestionDetailModal.svelte`

---

## Phase 3: Feature Components (MEDIUM Priority)

Complex stateful components. Use **mount-based tracking**.

### Training Components
| File | Component Name |
|------|---------------|
| `src/lib/components/training/SessionDetailView.svelte` | `training/SessionDetailView` |
| `src/lib/components/training/TrainingControlPanel.svelte` | `training/TrainingControlPanel` |
| `src/lib/components/training/TrainingSessionList.svelte` | `training/TrainingSessionList` |
| `src/lib/components/training/DirectoryBrowser.svelte` | `training/DirectoryBrowser` |

### Admin Components
| File | Component Name |
|------|---------------|
| `src/lib/components/admin/AdminDataManagement.svelte` | `admin/AdminDataManagement` |
| `src/lib/components/admin/PersonDataManagement.svelte` | `admin/PersonDataManagement` |
| `src/lib/components/admin/FaceMatchingSettings.svelte` | `admin/FaceMatchingSettings` |

### Queue Components
| File | Component Name |
|------|---------------|
| `src/lib/components/queues/WorkersPanel.svelte` | `queues/WorkersPanel` |
| `src/lib/components/queues/QueueJobsTable.svelte` | `queues/QueueJobsTable` |

### Face Components
| File | Component Name |
|------|---------------|
| `src/lib/components/faces/TemporalTimeline.svelte` | `faces/TemporalTimeline` |
| `src/lib/components/faces/PersonAssignmentPanel.svelte` | `faces/PersonAssignmentPanel` |

### Vector Components
| File | Component Name |
|------|---------------|
| `src/lib/components/vectors/DangerZone.svelte` | `vectors/DangerZone` |
| `src/lib/components/vectors/DirectoryStatsTable.svelte` | `vectors/DirectoryStatsTable` |
| `src/lib/components/vectors/DeletionLogsTable.svelte` | `vectors/DeletionLogsTable` |

### General Components
| File | Component Name |
|------|---------------|
| `src/lib/components/ResultsGrid.svelte` | `ResultsGrid` |
| `src/lib/components/SearchBar.svelte` | `SearchBar` |
| `src/lib/components/CategorySelector.svelte` | `CategorySelector` |

---

## Phase 4: Low Priority (Optional)

Simple display components - tracking is optional and may add noise.

- **Badges**: StatusBadge, CategoryBadge, JobStatusBadge, WorkerStatusBadge
- **Cards**: PersonCard, ClusterCard, QueueCard
- **Thumbnails**: FaceThumbnail
- **Indicators**: ConnectionIndicator, CoverageIndicator
- **Display**: ETADisplay, TrainingStats

---

## Implementation Approach

### Option A: Gradual Rollout (Recommended)
1. Add tracking to pages first (15 components)
2. Test and verify DevOverlay shows page hierarchy
3. Add tracking to modals (12 components)
4. Add tracking to feature components as needed

### Option B: Batch Implementation
1. Create a script to add tracking code to all HIGH priority components
2. Review and test all changes together
3. Commit as a single PR

### Option C: On-Demand
1. Add tracking only when debugging specific components
2. Lower upfront effort, gradual coverage

---

## Checklist Template

For each component:
- [ ] Add imports (`onMount`/`untrack`, `registerComponent`, optionally `getComponentStack`)
- [ ] Add registration call (mount-based or visibility-based pattern)
- [ ] Use correct component name (follows naming convention)
- [ ] Use correct file path (full path from `src/`)
- [ ] Verify in DevOverlay (component appears/disappears correctly)

---

## Notes

1. **Root layout** (`src/routes/+layout.svelte`) already initializes the component stack - no changes needed there.

2. **Naming convention**: Use path-like names for pages (`routes/people/+page`) and domain-prefixed names for components (`faces/PersonAssignmentPanel`).

3. **Production safety**: All tracking code is guarded by `import.meta.env.DEV` - zero production overhead.

4. **Test pages**: Skip `shadcn-test*` pages - these are for development testing.

---

**Last Updated:** 2026-01-11
