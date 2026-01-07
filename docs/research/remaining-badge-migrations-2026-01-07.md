# Remaining Badge Component Migration Analysis

**Date**: 2026-01-07
**Scope**: Find all remaining badge/status indicator components for shadcn-svelte Badge migration
**Status**: Phase 1 Complete (JobStatusBadge, WorkerStatusBadge, StatusBadge, CategoryBadge migrated)

---

## Executive Summary

After Phase 1 migration, **7 badge-like components** remain for conversion to shadcn-svelte Badge:

1. **UnifiedPersonCard** - Person type badge (3 variants: identified/unidentified/noise)
2. **FaceDetectionSessionCard** - Session status badge (5 states) + action buttons
3. **CoverageIndicator** - Compact coverage percentage badge
4. **SuggestionThumbnail** - Confidence badge + status badges
5. **ClusterCard** - Confidence match badge
6. **DevOverlay** - DEV badge (development-only)
7. **Person Detail Page** - Person status badge + face count badge

---

## Detailed Findings

### 1. UnifiedPersonCard - Person Type Badge

**File**: `src/lib/components/faces/UnifiedPersonCard.svelte`
**Lines**: 129-131, 290-317
**Current Implementation**:

```svelte
<span class="type-badge {getBadgeClass(person.type)}">
  {getBadgeLabel(person.type)}
</span>

<!-- CSS -->
.type-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  flex-shrink: 0;
}

.badge-success {  /* identified */
  background-color: #e8f5e9;
  color: #2e7d32;
}

.badge-warning {  /* unidentified */
  background-color: #fff3e0;
  color: #e65100;
}

.badge-error {  /* noise */
  background-color: #ffebee;
  color: #c62828;
}

.badge-neutral {  /* default */
  background-color: #f5f5f5;
  color: #666;
}
```

**Recommended Badge Variant**:

- **Identified** → `variant="default"` with custom green colors (or create `success` variant)
- **Unidentified** → `variant="secondary"` with amber/orange styling
- **Noise** → `variant="destructive"`
- **Default** → `variant="outline"`

**Migration Complexity**: **Medium**

- Need to map person.type → Badge variant
- 4 different color schemes
- Custom styling may require shadcn variant extension
- Text transformation (uppercase) may need CSS override

---

### 2. FaceDetectionSessionCard - Session Status Badge

**File**: `src/lib/components/faces/FaceDetectionSessionCard.svelte`
**Lines**: 122-124, 32-47, 244-265
**Current Implementation**:

**A) Status Badge (top-right corner)**:

```svelte
<span class="px-2 py-1 text-xs font-medium rounded-full {statusColor()}">
  {liveSession.status}
</span>

<!-- Computed status colors -->
let statusColor = $derived(() => {
  switch (liveSession.status) {
    case 'completed': return 'text-green-600 bg-green-100';
    case 'failed': return 'text-red-600 bg-red-100';
    case 'processing': return 'text-blue-600 bg-blue-100';
    case 'paused': return 'text-yellow-600 bg-yellow-100';
    case 'cancelled': return 'text-gray-600 bg-gray-100';
    default: return 'text-gray-600 bg-gray-100';
  }
});
```

**B) Action Buttons** (these are buttons, not badges, but use badge-like styling):

```svelte
<button
	class="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
>
	Pause
</button>
<button
	class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
>
	Resume
</button>
<button
	class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
>
	Cancel
</button>
```

**Recommended Badge Variant**:

- **Completed** → `variant="default"` with green colors (or `success` variant)
- **Failed** → `variant="destructive"`
- **Processing** → `variant="default"` (primary blue)
- **Paused** → `variant="secondary"` with yellow/amber styling
- **Cancelled** → `variant="outline"`
- **Pending** → `variant="secondary"` (default gray)

**Note**: Action buttons should remain `<Button>` components (already using shadcn Button).

**Migration Complexity**: **Simple**

- Clear 6-state mapping to Badge variants
- Badge is purely presentational (no interactions)
- May need custom `success` and `warning` variants for green/yellow

---

### 3. CoverageIndicator - Compact Coverage Badge

**File**: `src/lib/components/faces/CoverageIndicator.svelte`
**Lines**: 20-23, 39-60
**Current Implementation**:

```svelte
{#if compact}
  <span class="coverage-compact {coverageClass()}">
    {coverage.coveragePercentage.toFixed(0)}%
  </span>
{/if}

<!-- CSS -->
.coverage-compact {
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
}

.coverage-compact.high {  /* ≥80% */
  background: #c8e6c9;
  color: #2e7d32;
}

.coverage-compact.medium {  /* ≥50% */
  background: #fff3e0;
  color: #e65100;
}

.coverage-compact.low {  /* <50% */
  background: #ffcdd2;
  color: #c62828;
}
```

**Recommended Badge Variant**:

- **High (≥80%)** → Custom `success` variant (green)
- **Medium (≥50%)** → Custom `warning` variant (amber/orange)
- **Low (<50%)** → `variant="destructive"` (red)

**Migration Complexity**: **Simple**

- 3 states with clear color mappings
- Purely presentational
- May need custom `success` and `warning` variants

---

### 4. SuggestionThumbnail - Confidence + Status Badges

**File**: `src/lib/components/faces/SuggestionThumbnail.svelte`
**Lines**: 86-108, 157-196
**Current Implementation**:

**A) Confidence Badge (bottom-right corner)**:

```svelte
<div class="confidence-badge" style="background-color: {confidenceColor}">
  {confidencePercent}%
</div>

<!-- Computed colors -->
const confidenceColor = $derived(
  suggestion.confidence >= 0.9 ? '#22c55e'  // green-600
  : suggestion.confidence >= 0.8 ? '#eab308'  // yellow-500
  : '#f97316'  // orange-500
);

<!-- CSS -->
.confidence-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
```

**B) Status Badge (top-right corner, for non-pending suggestions)**:

```svelte
<div class="status-badge {suggestion.status === 'accepted' ? 'accepted'
  : suggestion.status === 'rejected' ? 'rejected' : 'expired'}">
  {#if suggestion.status === 'accepted'}
    ✓
  {:else if suggestion.status === 'rejected'}
    ✗
  {:else}
    !
  {/if}
</div>

<!-- CSS -->
.status-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;  /* Circular badge */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.status-badge.accepted {
  background-color: #22c55e;  /* green-500 */
}

.status-badge.rejected {
  background-color: #ef4444;  /* red-500 */
}

.status-badge.expired {
  background-color: #94a3b8;  /* slate-400 */
}
```

**Recommended Badge Variant**:

**Confidence Badge**:

- **High (≥90%)** → Custom `success` variant (green)
- **Medium (≥80%)** → Custom `warning` variant (yellow)
- **Low (<80%)** → `variant="secondary"` with orange styling

**Status Badge**:

- **Accepted** → `variant="default"` with green styling (or custom `success`)
- **Rejected** → `variant="destructive"`
- **Expired** → `variant="outline"` or `secondary`

**Migration Complexity**: **Medium**

- Two separate badges with different purposes
- Confidence badge uses inline color computation (dynamic styling)
- Status badge is circular (requires CSS override or custom variant)
- Absolutely positioned overlays (preserve positioning)
- Icon content (✓, ✗, !) needs to work with Badge component

**Special Considerations**:

- shadcn Badge is `rounded-full` by default (good for status badge)
- May need to extract color computation to separate function
- Absolute positioning should be handled by wrapper div, not Badge component

---

### 5. ClusterCard - Confidence Match Badge

**File**: `src/lib/components/faces/ClusterCard.svelte`
**Lines**: 87-91, 165-173
**Current Implementation**:

```svelte
{#if cluster.clusterConfidence}
  <span class="confidence-badge" title="Intra-cluster similarity">
    {(cluster.clusterConfidence * 100).toFixed(0)}% match
  </span>
{/if}

<!-- CSS -->
.confidence-badge {
  display: inline-block;
  background-color: #e3f2fd;  /* light blue */
  color: #1565c0;  /* dark blue */
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}
```

**Recommended Badge Variant**:

- `variant="secondary"` with blue color scheme
- Or `variant="outline"` with blue accent

**Migration Complexity**: **Simple**

- Single state, consistent styling
- Purely informational
- Standard badge use case

---

### 6. DevOverlay - DEV Badge

**File**: `src/lib/dev/DevOverlay.svelte`
**Lines**: 94, 233-241
**Current Implementation**:

```svelte
<span class="dev-badge">DEV</span>

<!-- CSS -->
.dev-badge {
  background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
  color: white;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
```

**Recommended Badge Variant**:

- Custom variant with purple-pink gradient
- Or `variant="default"` with custom gradient styling

**Migration Complexity**: **Simple**

- Development-only component
- Unique gradient styling (may require CSS override)
- Very small font size (9px)
- Low priority (only visible in DEV mode)

**Special Considerations**:

- DEV-only component (not user-facing in production)
- Unique visual identity (purple-pink gradient)
- May want to keep as custom badge to preserve distinctive styling

---

### 7. Person Detail Page - Status + Face Count Badges

**File**: `src/routes/people/[personId]/+page.svelte`
**Lines**: 442, 516-517, 944-979, 1069-1079

**A) Person Status Badge (header area)**:

```svelte
<span class="status-badge status-{person.status}">{person.status}</span>

<!-- CSS -->
.status-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
}

.status-active {
  background-color: #e8f5e9;  /* light green */
  color: #2e7d32;  /* dark green */
}

.status-merged {
  background-color: #e3f2fd;  /* light blue */
  color: #1565c0;  /* dark blue */
}

.status-hidden {
  background-color: #f5f5f5;  /* light gray */
  color: #666;  /* dark gray */
}
```

**B) Face Count Badge (photo cards, bottom-right overlay)**:

```svelte
<span class="face-count-badge">
  {photo.faceCount} {photo.faceCount === 1 ? 'face' : 'faces'}
</span>

<!-- CSS -->
.face-count-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.7);  /* semi-transparent dark */
  color: white;
  backdrop-filter: blur(4px);
}
```

**Recommended Badge Variant**:

**Person Status Badge**:

- **Active** → Custom `success` variant (green)
- **Merged** → `variant="secondary"` with blue styling
- **Hidden** → `variant="outline"` or secondary gray

**Face Count Badge**:

- Custom dark variant with semi-transparent background
- Or keep as custom styling (overlay badge on images)

**Migration Complexity**: **Medium**

- Status badge: 3 variants, needs uppercase text transformation
- Face count badge: Unique overlay styling with backdrop blur, may be better as custom component

---

## Migration Priority Matrix

| Component                     | Priority | Complexity | Impact                     | Estimated Effort |
| ----------------------------- | -------- | ---------- | -------------------------- | ---------------- |
| **UnifiedPersonCard**         | High     | Medium     | High (used in People page) | 2 hours          |
| **FaceDetectionSessionCard**  | High     | Simple     | Medium (Training tab)      | 1 hour           |
| **Person Detail Page Badges** | Medium   | Medium     | Medium (single page)       | 1.5 hours        |
| **SuggestionThumbnail**       | Medium   | Medium     | Medium (Suggestions page)  | 2 hours          |
| **ClusterCard**               | Low      | Simple     | Low (Clusters page)        | 30 min           |
| **CoverageIndicator**         | Low      | Simple     | Low (Prototypes tab)       | 30 min           |
| **DevOverlay**                | Very Low | Simple     | Very Low (DEV-only)        | 30 min           |

**Total Estimated Effort**: ~8 hours

---

## Recommended Migration Phases

### Phase 2A: High-Impact Person Components (3 hours)

1. **UnifiedPersonCard** - Person type badge (2 hours)
   - Used extensively in People page
   - Needs custom `success` variant for green "Identified" state
   - May need `warning` variant for "Unidentified" state

2. **FaceDetectionSessionCard** - Session status badge (1 hour)
   - Clear 6-state mapping
   - Already uses inline Tailwind classes
   - May need `success` and `warning` variants

### Phase 2B: Medium-Impact Detail Pages (3.5 hours)

3. **Person Detail Page** - Status + face count badges (1.5 hours)
   - Status badge similar to UnifiedPersonCard
   - Face count badge may stay custom (overlay styling)

4. **SuggestionThumbnail** - Confidence + status badges (2 hours)
   - Two separate badges (confidence + status)
   - Dynamic color computation for confidence
   - Circular status badge with icons

### Phase 2C: Low-Impact Components (1.5 hours)

5. **ClusterCard** - Confidence match badge (30 min)
   - Simple single-state badge
   - Standard Badge use case

6. **CoverageIndicator** - Compact coverage badge (30 min)
   - 3-state color mapping
   - Straightforward migration

7. **DevOverlay** - DEV badge (30 min)
   - DEV-only, lowest priority
   - Unique gradient styling (may keep custom)

---

## Custom Variant Requirements

Based on analysis, these custom Badge variants are needed:

### 1. Success Variant (Green)

```typescript
success: {
  background: 'bg-green-100 dark:bg-green-900/30',
  text: 'text-green-700 dark:text-green-400',
  border: 'border-green-200 dark:border-green-800',
  hover: 'hover:bg-green-200 dark:hover:bg-green-900/50'
}
```

**Used by**: UnifiedPersonCard (identified), FaceDetectionSessionCard (completed), Person status (active), CoverageIndicator (high), SuggestionThumbnail (high confidence)

### 2. Warning Variant (Amber/Orange)

```typescript
warning: {
  background: 'bg-amber-100 dark:bg-amber-900/30',
  text: 'text-amber-700 dark:text-amber-400',
  border: 'border-amber-200 dark:border-amber-800',
  hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50'
}
```

**Used by**: UnifiedPersonCard (unidentified), FaceDetectionSessionCard (paused), CoverageIndicator (medium), SuggestionThumbnail (medium confidence)

### 3. Consider Adding to shadcn Badge Component

Create `src/lib/components/ui/badge/badge.svelte` variants:

```typescript
const variants = {
	default: '...',
	secondary: '...',
	destructive: '...',
	outline: '...',
	success: '...', // NEW
	warning: '...' // NEW
};
```

---

## Migration Guidelines

### 1. Pattern: Dynamic Color Mapping

For components with runtime color computation (e.g., SuggestionThumbnail confidence):

**Before**:

```svelte
<div class="confidence-badge" style="background-color: {confidenceColor}">
```

**After**:

```svelte
<script>
	function getConfidenceVariant(confidence: number): 'success' | 'warning' | 'secondary' {
		if (confidence >= 0.9) return 'success';
		if (confidence >= 0.8) return 'warning';
		return 'secondary';
	}
</script>

<Badge variant={getConfidenceVariant(suggestion.confidence)}>
	{confidencePercent}%
</Badge>
```

### 2. Pattern: Positioned Overlay Badges

For absolutely positioned badges (e.g., face count on photo cards):

**Keep wrapper div for positioning**:

```svelte
<div class="absolute bottom-2 right-2">
	<Badge variant="secondary" class="backdrop-blur-md bg-black/70 text-white">
		{photo.faceCount}
		{photo.faceCount === 1 ? 'face' : 'faces'}
	</Badge>
</div>
```

### 3. Pattern: Icon Badges

For badges with icon content (e.g., status badges with ✓, ✗):

```svelte
<Badge variant={suggestion.status === 'accepted' ? 'success' : 'destructive'}>
	{suggestion.status === 'accepted' ? '✓' : '✗'}
</Badge>
```

### 4. Pattern: Text Transformation

For uppercase badges:

```svelte
<Badge variant="secondary" class="uppercase">
	{person.status}
</Badge>
```

---

## Testing Checklist

For each migrated component:

- [ ] Visual regression test (screenshot before/after)
- [ ] Verify color contrast meets WCAG AA standards
- [ ] Test dark mode (if applicable)
- [ ] Verify responsive behavior
- [ ] Check accessibility (screen reader, keyboard nav)
- [ ] Update component tests to use Badge test selectors
- [ ] Verify no layout shifts from size changes

---

## Open Questions

1. **Should face count overlay badges be migrated?**
   - They have unique styling (backdrop-blur, semi-transparent)
   - May be better to keep as custom overlay component

2. **Should DevOverlay badge be migrated?**
   - DEV-only, low priority
   - Unique gradient styling
   - Low ROI for migration effort

3. **Do we need a "neutral/info" variant?**
   - For unassigned/pending states
   - Currently using gray colors

4. **Should circular badges use a separate component?**
   - Status badges in SuggestionThumbnail are circular (border-radius: 50%)
   - shadcn Badge is `rounded-full` (pill shape, not circular)
   - May need `shape="circle"` prop or separate component

---

## Implementation Notes

### Custom Variant Extension

Extend `src/lib/components/ui/badge/badge.svelte`:

```typescript
const variants = cva(
	// ... base classes
	{
		variants: {
			variant: {
				default: '...',
				secondary: '...',
				destructive: '...',
				outline: '...',
				success: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
				warning: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
			}
		}
	}
);
```

### Dark Mode Support

Ensure custom variants have dark mode variants:

```typescript
success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
```

---

## Conclusion

**7 badge-like components** remain for migration, with total estimated effort of **~8 hours** across 3 phases:

- **Phase 2A (High Priority)**: UnifiedPersonCard, FaceDetectionSessionCard (3 hours)
- **Phase 2B (Medium Priority)**: Person Detail badges, SuggestionThumbnail (3.5 hours)
- **Phase 2C (Low Priority)**: ClusterCard, CoverageIndicator, DevOverlay (1.5 hours)

**Key Requirements**:

- Add `success` and `warning` variants to shadcn Badge component
- Preserve absolute positioning with wrapper divs
- Handle dynamic color mapping with variant functions
- Consider keeping some overlay badges as custom components

**Next Steps**:

1. Extend Badge component with `success` and `warning` variants
2. Create migration branch: `feat/shadcn-phase2-badges`
3. Start with high-priority components (UnifiedPersonCard, FaceDetectionSessionCard)
4. Add visual regression tests
5. Update migration tracking document

---

**Research Completed**: 2026-01-07
**Researcher**: Claude Code (Research Agent)
**Total Components Found**: 7 badge-like components
**Estimated Total Effort**: ~8 hours
