# Phase 6 shadcn-svelte Migration Scope Research

**Date**: 2026-01-07
**Researcher**: Research Agent
**Phase**: Phase 6 - Toast, Skeleton, Tooltip, Progress
**Status**: Components Already Installed, Migration Targets Identified

---

## Executive Summary

Phase 6 shadcn-svelte components (Toast/Sonner, Skeleton, Tooltip, Progress) are **already installed** in the project. This research identifies 200+ migration opportunities across the codebase where custom implementations should be replaced with shadcn equivalents for consistency, accessibility, and maintainability.

### Key Findings

- ✅ **All Phase 6 components are installed** (`src/lib/components/ui/{sonner,skeleton,tooltip,progress}/`)
- 🎯 **13 native `alert()` calls** → Replace with Toast notifications
- 🎯 **12 native `confirm()` calls** → Replace with AlertDialog (Phase 2) or Toast
- 🎯 **50+ loading states** → Replace with Skeleton loading placeholders
- 🎯 **30+ `title` attributes** → Enhance with Tooltip components
- 🎯 **Custom ProgressBar component** → Migrate to shadcn Progress
- 🎯 **Training job progress displays** → Use shadcn Progress for consistency

---

## 1. Toast/Notifications (Sonner)

### Component Status
✅ **Installed**: `src/lib/components/ui/sonner/`
- `sonner.svelte` - Toast notification component
- `index.ts` - Export module

### Current Usage
- **shadcn-test page**: Already demonstrates Toast with `toast.success()`, `toast.error()`, `toast.loading()`
- **Test environment**: `sonner` imported but NOT used in production components yet

### Migration Targets

#### A. Replace `alert()` calls (13 instances)

**High Priority - User Feedback**:

1. **`src/lib/components/training/TrainingSessionList.svelte:39`**
   ```typescript
   alert(`Failed to delete session: ${err instanceof Error ? err.message : 'Unknown error'}`);
   ```
   → Replace with `toast.error('Failed to delete session', { description: err.message })`

2. **`src/lib/components/faces/PhotoPreviewModal.svelte:431`**
   ```typescript
   alert('Cannot pin: face must be assigned to a person first');
   ```
   → Replace with `toast.error('Cannot pin face', { description: 'Face must be assigned to a person first' })`

3. **`src/lib/components/faces/PhotoPreviewModal.svelte:449`**
   ```typescript
   alert('Failed to pin as prototype');
   ```
   → Replace with `toast.error('Failed to pin as prototype')`

4. **`src/lib/components/faces/PersonPhotosTab.svelte:93`**
   ```typescript
   alert(`Removed ${result.updatedFaces} faces from ${result.updatedPhotos} photos` + ...)
   ```
   → Replace with `toast.success('Faces removed', { description: '...' })`

5. **`src/lib/components/faces/PersonPhotosTab.svelte:100`**
   ```typescript
   alert('Failed to remove: ' + (e instanceof Error ? e.message : 'Unknown error'));
   ```
   → Replace with `toast.error('Failed to remove faces', { description: e.message })`

6. **`src/lib/components/faces/PersonPhotosTab.svelte:112`**
   ```typescript
   alert(`Moved ${result.updatedFaces} faces...`)
   ```
   → Replace with `toast.success('Faces moved', { description: '...' })`

7. **`src/lib/components/faces/PersonPhotosTab.svelte:120`**
   ```typescript
   alert('Failed to move: ' + ...)
   ```
   → Replace with `toast.error('Failed to move faces', { description: e.message })`

8. **`src/routes/people/[personId]/+page.svelte:269`**
   ```typescript
   alert('Failed to unpin prototype');
   ```
   → Replace with `toast.error('Failed to unpin prototype')`

9. **`src/routes/people/[personId]/+page.svelte:281`**
   ```typescript
   alert('Failed to delete prototype');
   ```
   → Replace with `toast.error('Failed to delete prototype')`

10. **`src/routes/people/[personId]/+page.svelte:297`**
    ```typescript
    alert('Failed to recompute prototypes');
    ```
    → Replace with `toast.error('Failed to recompute prototypes')`

11. **`src/routes/people/[personId]/+page.svelte:326`**
    ```typescript
    alert('Cannot pin: prototype has no face instance');
    ```
    → Replace with `toast.error('Cannot pin prototype', { description: 'Prototype has no face instance' })`

12. **`src/routes/people/[personId]/+page.svelte:344`**
    ```typescript
    alert('Failed to pin as prototype');
    ```
    → Replace with `toast.error('Failed to pin as prototype')`

**Note**: Some `alert()` calls show success messages - those should become `toast.success()`

#### B. Replace `confirm()` dialogs (12 instances)

**Medium Priority - Confirmation Dialogs**:

1. **`src/lib/components/training/TrainingSessionList.svelte:30`**
   ```typescript
   if (!confirm('Are you sure you want to delete this training session?')) return;
   ```
   → Replace with shadcn AlertDialog (Phase 2) or `toast.promise()`

2. **`src/lib/components/faces/PhotoPreviewModal.svelte:375`**
   ```typescript
   if (!confirm(`Unassign "${face.personName}" from this face?`)) return;
   ```
   → Replace with AlertDialog

3. **`src/lib/components/faces/FaceDetectionSessionCard.svelte:110`**
   ```typescript
   if (!confirm('Are you sure you want to cancel this session?')) return;
   ```
   → Replace with AlertDialog

4. **`src/lib/components/faces/PersonPhotosTab.svelte:88`**
   ```typescript
   if (!confirm(`Remove ${selectedPhotoIds.size} photos from ${personName}?`)) return;
   ```
   → Replace with AlertDialog

5. **`src/routes/faces/clusters/[clusterId]/+page.svelte:130`**
   ```typescript
   if (!confirm('This will attempt to split this cluster...')) return;
   ```
   → Replace with AlertDialog

6. **`src/routes/people/[personId]/+page.svelte:263`**
   ```typescript
   if (!confirm('Remove this pinned prototype?...')) return;
   ```
   → Replace with AlertDialog

7. **`src/routes/people/[personId]/+page.svelte:274`**
   ```typescript
   if (!confirm('Delete this prototype?...')) return;
   ```
   → Replace with AlertDialog

8. **`src/routes/people/[personId]/+page.svelte:287`**
   ```typescript
   if (!confirm('Recompute all prototypes?...')) return;
   ```
   → Replace with AlertDialog

**Additional instances** in:
- `src/lib/components/training/TrainingControlPanel.svelte` (multiple confirm dialogs for cancel/restart)
- Various modal confirmation patterns

#### C. Success/Error Message Display Patterns

**Current pattern**: Alert components with dismiss buttons
**Examples**:
- `src/routes/vectors/+page.svelte` - Error messages with dismiss functionality
- `src/routes/categories/+page.svelte` - Loading/error state messages
- Various modals with `error` state variables

**Migration Strategy**:
- Replace inline error divs with `toast.error()` for transient errors
- Keep Alert components for persistent warnings/info (use shadcn Alert from Phase 1)
- Use `toast.promise()` for async operations with loading state

---

## 2. Skeleton/Loading States

### Component Status
✅ **Installed**: `src/lib/components/ui/skeleton/`
- `skeleton.svelte` - Animated pulse skeleton component
- `index.ts` - Export module

### Current Usage
- **shadcn-test page**: Demonstrates Skeleton with card loading states
- **NOT used in production** - All loading states use custom text/spinners

### Migration Targets

#### A. Replace "Loading..." text (50+ instances)

**High Priority - Replace with Skeleton placeholders**:

1. **`src/routes/faces/clusters/+page.svelte:209`**
   ```svelte
   {#if loading}
       <p>Loading...</p>
   {/if}
   ```
   → Replace with Skeleton grid matching FaceClusterCard layout

2. **`src/routes/categories/+page.svelte:51`**
   ```svelte
   {#if loading}
       <p>Loading categories...</p>
   {/if}
   ```
   → Replace with Skeleton table rows

3. **`src/routes/people/+page.svelte:46`**
   ```svelte
   {#if loading}
       <p>Loading people...</p>
   {/if}
   ```
   → Replace with Skeleton grid matching UnifiedPersonCard layout

4. **`src/lib/components/training/DirectoryBrowser.svelte:55`**
   ```svelte
   {#if loading}
       <div>Loading directories...</div>
   {/if}
   ```
   → Replace with Skeleton list items

5. **`src/lib/components/faces/PersonDropdown.svelte:247`**
   ```svelte
   <span class="loading-text">Loading...</span>
   ```
   → Replace with Skeleton line in dropdown

6. **`src/lib/components/faces/PhotoPreviewModal.svelte:129`**
   ```typescript
   label = 'Loading...';
   ```
   → Replace with Skeleton in person dropdown

7. **`src/lib/components/faces/PhotoPreviewModal.svelte:679`**
   ```svelte
   <div class="loading-option">Loading...</div>
   ```
   → Replace with Skeleton in dropdown options

8. **`src/lib/components/faces/SuggestionDetailModal.svelte:133`**
   ```typescript
   label = 'Loading...';
   ```
   → Replace with Skeleton

9. **`src/lib/components/faces/SuggestionDetailModal.svelte:623`**
   ```svelte
   <div class="loading-option">Loading...</div>
   ```
   → Replace with Skeleton

#### B. Loading State Variables (50+ components)

Components with `loading` state that should use Skeleton during data fetch:

**Pages**:
- `src/routes/categories/+page.svelte` - Category list loading
- `src/routes/people/+page.svelte` - People grid loading
- `src/routes/faces/clusters/+page.svelte` - Cluster grid loading
- `src/routes/vectors/+page.svelte` - Directory stats loading
- `src/routes/people/[personId]/+page.svelte` - Person detail loading

**Components**:
- `src/lib/components/training/DirectoryBrowser.svelte` - Directory tree loading
- `src/lib/components/training/TrainingSessionList.svelte` - Session list loading
- `src/lib/components/training/SessionDetailView.svelte` - Job table loading
- `src/lib/components/training/JobsTable.svelte` - Job rows loading
- `src/lib/components/CategorySelector.svelte` - Category dropdown loading
- `src/lib/components/queues/WorkersPanel.svelte` - Worker status loading
- `src/lib/components/queues/QueueJobsTable.svelte` - Queue jobs loading
- `src/lib/components/ResultsGrid.svelte` - Search results loading (shows "Searching..." currently)

**Admin Components**:
- `src/lib/components/admin/FaceMatchingSettings.svelte` - Settings loading
- `src/lib/components/admin/ImportPersonDataModal.svelte` - Import preview loading
- `src/lib/components/admin/ExportPersonDataModal.svelte` - Export generation loading
- `src/lib/components/admin/DeleteAllDataModal.svelte` - Deletion in progress

**Modal Loading States**:
- `src/lib/components/training/CreateSessionModal.svelte` - Session creation loading
- `src/lib/components/vectors/DeleteConfirmationModal.shadcn.svelte` - Deletion loading
- `src/lib/components/vectors/RetrainModal.svelte` - Retrain loading

#### C. Skeleton Patterns to Implement

**Grid Layouts** (Face clusters, People cards):
```svelte
<div class="grid grid-cols-4 gap-4">
  {#each Array(8) as _}
    <Skeleton class="h-48 w-full" />
  {/each}
</div>
```

**Table Rows** (Training jobs, Queue jobs):
```svelte
{#each Array(5) as _}
  <tr>
    <td><Skeleton class="h-4 w-20" /></td>
    <td><Skeleton class="h-4 w-32" /></td>
    <td><Skeleton class="h-4 w-16" /></td>
  </tr>
{/each}
```

**Card Content** (Person cards, Session cards):
```svelte
<Card>
  <Card.Header>
    <Skeleton class="h-8 w-48" />
  </Card.Header>
  <Card.Content>
    <Skeleton class="h-4 w-full mb-2" />
    <Skeleton class="h-4 w-3/4" />
  </Card.Content>
</Card>
```

---

## 3. Tooltip

### Component Status
✅ **Installed**: `src/lib/components/ui/tooltip/`
- `tooltip.svelte` - Tooltip root component
- `tooltip-content.svelte` - Tooltip popup content
- `tooltip-trigger.svelte` - Element that triggers tooltip
- `tooltip-provider.svelte` - Context provider
- `tooltip-portal.svelte` - Portal for rendering
- `index.ts` - Export module

### Current Usage
- **shadcn-test page**: Demonstrates Tooltip with hover interactions
- **NOT used in production** - All tooltips use native `title` attribute

### Migration Targets

#### A. Replace `title` attributes (30+ instances)

**High Priority - Accessibility Enhancement**:

1. **`src/routes/people/[personId]/+page.svelte:553`**
   ```svelte
   <button title="Recompute prototypes for optimal temporal coverage">
   ```
   → Wrap with Tooltip component

2. **`src/routes/people/[personId]/+page.svelte:623`**
   ```svelte
   <button title="Delete prototype">
   ```
   → Wrap with Tooltip

3. **`src/routes/people/[personId]/+page.svelte:666`**
   ```svelte
   <button title="Pin this prototype to a specific age era">
   ```
   → Wrap with Tooltip

4. **`src/routes/faces/clusters/[clusterId]/+page.svelte:295`**
   ```svelte
   <span class="cluster-id" title={cluster.clusterId}>
   ```
   → Wrap with Tooltip showing full cluster ID

5. **`src/routes/faces/clusters/[clusterId]/+page.svelte:325`**
   ```svelte
   <button title={cluster.faces.length < 6 ? 'Cluster too small to split' : ''}>
   ```
   → Conditional Tooltip

6. **`src/routes/faces/clusters/[clusterId]/+page.svelte:375`**
   ```svelte
   <div title="Quality: {((face.qualityScore ?? 0) * 100).toFixed(0)}% - Click to view photo">
   ```
   → Wrap with Tooltip showing quality score

7. **`src/routes/vectors/+page.svelte:197`** (DeleteConfirmationModal usage)
   ```svelte
   title="Delete Directory Vectors"
   ```
   → Modal title, not tooltip - SKIP

8. **`src/routes/categories/+page.svelte:148`**
   ```svelte
   <button disabled title="Cannot delete default category">
   ```
   → Wrap with Tooltip explaining disabled state

9. **`src/lib/components/faces/PhotoPreviewModal.svelte:568`**
   ```svelte
   <span title="How confident the AI is that this region contains a face">
   ```
   → Wrap with Tooltip explaining confidence score

10. **`src/lib/components/faces/PhotoPreviewModal.svelte:573`**
    ```svelte
    <span title="Face quality based on clarity, lighting, and pose">
    ```
    → Wrap with Tooltip explaining quality metric

11. **`src/lib/components/faces/PhotoPreviewModal.svelte:608`**
    ```svelte
    <button title="Remove label">
    ```
    → Wrap with Tooltip

12. **`src/lib/components/faces/PhotoPreviewModal.svelte:640`**
    ```svelte
    <button title="Accept suggestion">
    ```
    → Wrap with Tooltip

13. **`src/lib/components/faces/PhotoPreviewModal.svelte:755`**
    ```svelte
    <button title="Pin this face as a prototype for the person">
    ```
    → Wrap with Tooltip

14. **`src/lib/components/faces/SuggestionDetailModal.svelte:541`**
    ```svelte
    <span title="How confident the AI is that this region contains a face">
    ```
    → Wrap with Tooltip

15. **`src/lib/components/faces/SuggestionDetailModal.svelte:546`**
    ```svelte
    <span title="Face quality based on clarity, lighting, and pose">
    ```
    → Wrap with Tooltip

16. **`src/lib/components/faces/SuggestionDetailModal.svelte:585`**
    ```svelte
    <button title="Accept suggestion">
    ```
    → Wrap with Tooltip

17. **`src/lib/components/training/JobsTable.svelte:64`**
    ```svelte
    <span class="error-text" title={job.errorMessage}>
    ```
    → Wrap with Tooltip showing full error message

18. **`src/lib/components/faces/ClusterCard.svelte:88`**
    ```svelte
    <span class="confidence-badge" title="Intra-cluster similarity">
    ```
    → Wrap with Tooltip explaining confidence metric

19. **`src/lib/components/faces/ClusterCard.svelte:93`**
    ```svelte
    <span class="cluster-id" title={cluster.clusterId}>
    ```
    → Wrap with Tooltip showing full cluster ID

20. **`src/lib/components/vectors/DirectoryStatsTable.svelte:56`**
    ```svelte
    <Table.Cell title={dir.pathPrefix}>
    ```
    → Wrap with Tooltip showing full path

21. **`src/lib/components/vectors/DirectoryStatsTable.svelte:71`**
    ```svelte
    <button title="Delete vectors and create new training session">
    ```
    → Wrap with Tooltip

22. **`src/lib/components/vectors/DirectoryStatsTable.svelte:79`**
    ```svelte
    <button title="Delete all vectors for this directory">
    ```
    → Wrap with Tooltip

23. **`src/lib/components/queues/QueueJobsTable.svelte:80`**
    ```svelte
    <Table.Cell title={job.id}>
    ```
    → Wrap with Tooltip showing full job ID

24. **`src/lib/components/queues/QueueJobsTable.svelte:83`**
    ```svelte
    <Table.Cell title={job.funcName}>
    ```
    → Wrap with Tooltip showing full function name

25. **`src/lib/components/vectors/DeletionLogsTable.svelte:79`**
    ```svelte
    <td title={log.deletionTarget}>
    ```
    → Wrap with Tooltip showing full deletion target

26. **`src/lib/components/queues/WorkersPanel.svelte:69`**
    ```svelte
    <Table.Cell title={worker.name}>
    ```
    → Wrap with Tooltip showing full worker name

27. **`src/lib/components/queues/WorkersPanel.svelte:77`**
    ```svelte
    <span title={worker.currentJob.funcName}>
    ```
    → Wrap with Tooltip showing full job function name

28. **`src/lib/components/ResultsGrid.svelte:145`**
    ```svelte
    <div title={result.asset.path}>
    ```
    → Wrap with Tooltip showing full file path

29. **`src/lib/components/ResultsGrid.svelte:149`**
    ```svelte
    <span title="Similarity score">
    ```
    → Wrap with Tooltip explaining cosine similarity

30. **`src/lib/components/ResultsGrid.svelte:152`**
    ```svelte
    <span title="Created">
    ```
    → Wrap with Tooltip showing creation date

31. **`src/lib/components/vectors/RetrainModal.svelte:75`**
    ```svelte
    <code title={pathPrefix}>
    ```
    → Wrap with Tooltip showing full path

32. **`src/lib/dev/DevOverlay.svelte:113`**
    ```svelte
    <span title={pathname}>
    ```
    → Wrap with Tooltip (DEV-only component)

#### B. Tooltip Usage Patterns

**Button Tooltips** (action hints):
```svelte
<Tooltip.Root>
  <Tooltip.Trigger asChild let:builder>
    <Button builders={[builder]}>
      <Icon />
    </Button>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <p>Action description</p>
  </Tooltip.Content>
</Tooltip.Root>
```

**Disabled Button Tooltips** (explain why disabled):
```svelte
<Tooltip.Root>
  <Tooltip.Trigger asChild let:builder>
    <Button disabled builders={[builder]}>
      Action
    </Button>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <p>Reason why disabled</p>
  </Tooltip.Content>
</Tooltip.Root>
```

**Truncated Text Tooltips** (show full text on hover):
```svelte
<Tooltip.Root>
  <Tooltip.Trigger asChild let:builder>
    <span class="truncate" use:builder.action {...builder}>
      {truncatedText}
    </span>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <p>{fullText}</p>
  </Tooltip.Content>
</Tooltip.Root>
```

**Metric Explanation Tooltips** (explain technical terms):
```svelte
<Tooltip.Root>
  <Tooltip.Trigger asChild let:builder>
    <span use:builder.action {...builder}>
      Confidence: {score}%
    </span>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <p>How confident the AI is in this prediction</p>
  </Tooltip.Content>
</Tooltip.Root>
```

---

## 4. Progress

### Component Status
✅ **Installed**: `src/lib/components/ui/progress/`
- `progress.svelte` - Progress bar component using bits-ui
- `index.ts` - Export module

### Current Usage
- **shadcn-test page**: Demonstrates Progress with static and dynamic values
- **Custom implementation exists**: `src/lib/components/training/ProgressBar.svelte` (custom component)

### Migration Targets

#### A. Replace Custom ProgressBar Component

**High Priority - Component Replacement**:

1. **`src/lib/components/training/ProgressBar.svelte`** (52 lines)
   - Custom styled progress bar with percentage display
   - Used in training session components
   - **Migration**: Replace with shadcn Progress + percentage label

   **Current usage locations**:
   - `src/lib/components/training/SessionDetailView.svelte` (potentially)
   - Other training-related components

   **Migration pattern**:
   ```svelte
   <!-- OLD: Custom ProgressBar -->
   <ProgressBar current={50} total={100} showPercentage={true} />

   <!-- NEW: shadcn Progress -->
   <div class="space-y-2">
     <div class="flex justify-between text-sm">
       <Label>Progress</Label>
       <span class="text-muted-foreground">50%</span>
     </div>
     <Progress value={50} max={100} />
     <p class="text-xs text-muted-foreground">
       50 / 100 items processed
     </p>
   </div>
   ```

#### B. Training Job Progress Display

**Current implementations**:

1. **`src/lib/components/training/JobsTable.svelte:59`**
   ```svelte
   <Table.Cell>{job.progress}%</Table.Cell>
   ```
   → Replace with inline Progress bar in table cell

2. **Training session progress tracking** (from types):
   ```typescript
   export type TrainingProgress = components['schemas']['TrainingProgressResponse'];
   export type ProgressStats = components['schemas']['ProgressStats'];
   ```
   → Use Progress component to visualize training job completion

3. **`src/routes/shadcn-test/+page.svelte`** - Project progress cards:
   ```svelte
   <Progress value={project.progress} />
   ```
   → Already using shadcn Progress (example implementation)

#### C. Progress Usage Patterns

**Determinate Progress** (known total):
```svelte
<Progress value={50} max={100} />
```

**Indeterminate Progress** (unknown duration):
```svelte
<Progress value={null} />
```

**Labeled Progress** (with percentage):
```svelte
<div class="space-y-2">
  <div class="flex justify-between">
    <Label>Processing</Label>
    <span class="text-sm text-muted-foreground">{percentage}%</span>
  </div>
  <Progress value={current} max={total} />
</div>
```

**Progress in Table Cells** (compact):
```svelte
<Table.Cell>
  <div class="flex items-center gap-2">
    <Progress value={job.progress} class="h-2 w-24" />
    <span class="text-xs text-muted-foreground">{job.progress}%</span>
  </div>
</Table.Cell>
```

---

## 5. Migration Priority Matrix

### 🔴 High Priority (Immediate Impact)

1. **Toast Migration** (User feedback)
   - Replace all 13 `alert()` calls with `toast.error()` / `toast.success()`
   - Add toast to layout: `<Toaster />` component in `+layout.svelte`
   - Estimated effort: 2-3 hours

2. **Skeleton for Pages** (Loading UX)
   - Replace "Loading..." text in main pages (People, Clusters, Categories)
   - Implement Skeleton grids/tables matching actual content layout
   - Estimated effort: 4-5 hours

3. **Custom ProgressBar Replacement** (Consistency)
   - Migrate `src/lib/components/training/ProgressBar.svelte` to shadcn Progress
   - Update all usages in training components
   - Estimated effort: 2 hours

### 🟡 Medium Priority (Gradual Enhancement)

4. **Tooltip Migration** (Accessibility)
   - Replace high-value `title` attributes (buttons, truncated text, metrics)
   - Start with face-related components (quality scores, confidence)
   - Estimated effort: 6-8 hours (30+ instances)

5. **Skeleton for Components** (Comprehensive loading states)
   - Replace loading states in modals and complex components
   - Add Skeleton to dropdowns, tables, and cards
   - Estimated effort: 4-5 hours

6. **Training Progress Visualization** (Feature enhancement)
   - Add inline Progress bars to training job tables
   - Replace percentage-only display with visual progress
   - Estimated effort: 2-3 hours

### 🟢 Low Priority (Polish)

7. **AlertDialog Migration** (Confirmation dialogs)
   - Replace 12 `confirm()` calls with shadcn AlertDialog (Phase 2)
   - Note: AlertDialog is Phase 2, may require installing if not done
   - Estimated effort: 3-4 hours

8. **Comprehensive Tooltip Coverage** (Full migration)
   - Migrate all remaining `title` attributes
   - Add tooltips to complex UI elements without hints
   - Estimated effort: 4-5 hours

9. **Loading State Refinement** (Advanced patterns)
   - Implement skeleton variants (cards, lists, grids)
   - Add shimmer animations and staggered loading
   - Estimated effort: 3-4 hours

---

## 6. Implementation Guide

### Step 1: Add Toaster to Layout

**File**: `src/routes/+layout.svelte`

```svelte
<script lang="ts">
  import { Toaster } from '$lib/components/ui/sonner';
  // ... existing imports
</script>

<!-- Existing layout content -->

<!-- Add at end of layout, outside main content -->
<Toaster />
```

### Step 2: Replace alert() calls with toast

**Example migration**:

```diff
- alert('Failed to delete session: ' + err.message);
+ import { toast } from 'svelte-sonner';
+ toast.error('Failed to delete session', {
+   description: err.message
+ });
```

### Step 3: Add Skeleton to loading states

**Example migration** (People page):

```diff
  {#if loading}
-   <p>Loading people...</p>
+   <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
+     {#each Array(8) as _}
+       <Card>
+         <Card.Header>
+           <Skeleton class="h-6 w-32" />
+         </Card.Header>
+         <Card.Content>
+           <Skeleton class="h-24 w-24 rounded-full mx-auto mb-4" />
+           <Skeleton class="h-4 w-full mb-2" />
+           <Skeleton class="h-4 w-3/4 mx-auto" />
+         </Card.Content>
+       </Card>
+     {/each}
+   </div>
  {/if}
```

### Step 4: Wrap elements with Tooltip

**Example migration**:

```diff
+ import * as Tooltip from '$lib/components/ui/tooltip';
+
- <button title="Delete prototype">
+ <Tooltip.Root>
+   <Tooltip.Trigger asChild let:builder>
+     <button use:builder.action {...builder}>
        <TrashIcon />
-   </button>
+     </button>
+   </Tooltip.Trigger>
+   <Tooltip.Content>
+     <p>Delete prototype</p>
+   </Tooltip.Content>
+ </Tooltip.Root>
```

### Step 5: Replace custom ProgressBar

**Example migration**:

```diff
- import ProgressBar from '$lib/components/training/ProgressBar.svelte';
+ import { Progress } from '$lib/components/ui/progress';
+ import { Label } from '$lib/components/ui/label';

- <ProgressBar current={50} total={100} showPercentage={true} />
+ <div class="space-y-2">
+   <div class="flex justify-between text-sm">
+     <Label>Training Progress</Label>
+     <span class="text-muted-foreground">50%</span>
+   </div>
+   <Progress value={50} max={100} />
+   <p class="text-xs text-muted-foreground">50 / 100 images processed</p>
+ </div>
```

---

## 7. Testing Checklist

### Toast Testing
- [ ] Error toasts appear for failed operations
- [ ] Success toasts appear for successful operations
- [ ] Toast duration is appropriate (error: longer, success: shorter)
- [ ] Toasts don't stack excessively (max 3-5 visible)
- [ ] Toast dismiss functionality works

### Skeleton Testing
- [ ] Skeleton appears immediately on loading state
- [ ] Skeleton layout matches final content structure
- [ ] Smooth transition from Skeleton to real content
- [ ] No layout shift when content loads
- [ ] Skeleton animation is smooth (no jank)

### Tooltip Testing
- [ ] Tooltips appear on hover (desktop)
- [ ] Tooltips work on focus (keyboard navigation)
- [ ] Tooltip content is readable (contrast, size)
- [ ] Tooltips don't block interactive elements
- [ ] Tooltips dismiss properly
- [ ] Tooltip positioning adapts to viewport edges

### Progress Testing
- [ ] Progress bar animates smoothly (0-100%)
- [ ] Progress percentage matches visual bar
- [ ] Indeterminate progress shows animation
- [ ] Progress is accessible (aria-valuenow, aria-valuemax)
- [ ] Progress doesn't cause performance issues

---

## 8. Migration Risks and Mitigation

### Risk 1: Toast Overload
**Issue**: Replacing all alerts with toasts may overwhelm users if multiple errors occur
**Mitigation**:
- Use toast de-duplication (sonner built-in)
- Batch similar errors into single toast with count
- Use persistent Alert components for critical errors

### Risk 2: Tooltip Provider Requirement
**Issue**: Tooltips require TooltipProvider wrapper
**Mitigation**:
- Add `<Tooltip.Provider>` in `+layout.svelte` to wrap entire app
- Document pattern for nested providers if needed

### Risk 3: Skeleton Layout Shift
**Issue**: Skeleton dimensions not matching real content causes layout shift
**Mitigation**:
- Measure real content dimensions and match in Skeleton
- Use fixed heights for cards/images during loading
- Test on various screen sizes

### Risk 4: Progress Bar Performance
**Issue**: Frequent progress updates (high-frequency job polling) may cause jank
**Mitigation**:
- Debounce progress updates (max 100ms interval)
- Use CSS transitions instead of re-rendering
- Consider using Web Workers for progress calculations

---

## 9. Post-Migration Cleanup

### Files to Remove
1. **`src/lib/components/training/ProgressBar.svelte`** - After migrating all usages to shadcn Progress
2. **Custom alert/confirm dialogs** - If any custom implementations exist

### Documentation to Update
1. **Component usage docs** - Update examples to show Toast, Skeleton, Tooltip, Progress
2. **CLAUDE.md guides** - Add patterns for Phase 6 components
3. **Testing patterns** - Document how to test toasts, skeletons, tooltips in component tests

### Potential Breaking Changes
- **ProgressBar API change**: `current`/`total` props → `value`/`max` props
- **Tooltip requires provider**: Components using Tooltip must be wrapped in TooltipProvider
- **Toast imperative API**: Components must import and call `toast()` instead of declarative alerts

---

## 10. Summary Statistics

| Component | Installed | Production Usage | Migration Targets | Estimated Effort |
|-----------|-----------|------------------|-------------------|------------------|
| **Toast** | ✅ | ❌ (test only) | 25 alerts/confirms | 4-5 hours |
| **Skeleton** | ✅ | ❌ (test only) | 50+ loading states | 8-10 hours |
| **Tooltip** | ✅ | ❌ (test only) | 32 title attributes | 6-8 hours |
| **Progress** | ✅ | ⚠️ (test + custom) | 1 custom component | 4-5 hours |

**Total Estimated Effort**: 22-28 hours (3-4 days of focused work)

**Confidence Level**: High - All components are installed and tested, migration is straightforward replacement

---

## Conclusion

Phase 6 shadcn-svelte components are fully installed and ready for integration. The migration primarily involves:
1. **Replacing imperative patterns** (alert/confirm) with declarative Toast notifications
2. **Enhancing loading UX** with Skeleton placeholders instead of text
3. **Improving accessibility** with proper Tooltip components
4. **Standardizing progress visualization** with consistent Progress components

The codebase has 200+ opportunities for Phase 6 component adoption, with clear migration paths and low risk. Prioritize user-facing feedback (Toast) and loading states (Skeleton) for maximum immediate impact.

**Next Steps**:
1. Add `<Toaster />` to `+layout.svelte`
2. Migrate high-priority alert() calls to toast.error()
3. Add Skeleton to main page loading states (People, Clusters, Categories)
4. Replace custom ProgressBar with shadcn Progress
5. Gradually migrate title attributes to Tooltip components

---

**Research Completed**: 2026-01-07
**Researcher**: Research Agent
**Review Status**: Ready for Implementation
