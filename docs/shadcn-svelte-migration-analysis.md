# shadcn-svelte Migration Analysis

**Project**: Image Search UI
**Framework**: SvelteKit 2 + Svelte 5 (runes) + Tailwind CSS v4
**Analysis Date**: 2026-01-06
**Total Custom Components**: 50+ components (~16,695 lines of code)

---

## Executive Summary

### Current State

The Image Search UI project has a comprehensive custom component library built with Svelte 5 runes and custom CSS. The application includes **50+ components** organized into domain-specific folders (admin, faces, queues, training, vectors) with consistent patterns for modals, cards, tables, forms, and badges.

### Migration Opportunity

**shadcn-svelte** offers a strong foundation for migrating custom UI components to a standardized, accessible, and maintainable component system. Based on analysis:

- **High-impact replacements**: 35+ components (70%) can benefit from shadcn-svelte
- **Code reduction potential**: Estimate 30-40% reduction in custom CSS/component code
- **Accessibility improvements**: Automatic ARIA attributes and keyboard navigation
- **Consistency gains**: Unified design system across all pages
- **Quick wins**: Dialog, Button, Badge, Table, Input, Select (25+ component instances)

### Recommendation

**Proceed with phased migration** starting with foundational components (Button, Badge, Input) followed by complex patterns (Dialog, Table, Select). Maintain custom components only for highly specialized features (face bounding boxes, temporal timeline, vector visualizations).

---

## Current Component Inventory

### Domain-Specific Organization

| Domain       | Component Count | Primary Patterns                             | Migration Priority |
| ------------ | --------------- | -------------------------------------------- | ------------------ |
| **Admin**    | 6 components    | Modals, settings panels, data management     | Medium             |
| **Faces**    | 14 components   | Cards, thumbnails, modals, timelines         | High               |
| **Queues**   | 6 components    | Tables, badges, status indicators            | Medium             |
| **Training** | 10 components   | Tables, progress bars, status badges, modals | High               |
| **Vectors**  | 5 components    | Tables, modals, danger zones                 | Medium             |
| **Core**     | 9 components    | Search, filters, categories, results, toast  | High               |

### Complete Component List

#### Admin Components (`src/lib/components/admin/`)

1. `AdminDataManagement.svelte` - Main admin panel container
2. `DeleteAllDataModal.svelte` - Confirmation modal for destructive actions
3. `ExportPersonDataModal.svelte` - Person data export dialog
4. `FaceMatchingSettings.svelte` - Face recognition configuration panel
5. `ImportPersonDataModal.svelte` - Person data import dialog
6. `PersonDataManagement.svelte` - Person-specific data operations

#### Faces Components (`src/lib/components/faces/`)

7. `ClusterCard.svelte` - Face cluster display card
8. `CoverageIndicator.svelte` - Visual coverage metric
9. `FaceDetectionSessionCard.svelte` - Session status card
10. `FaceThumbnail.svelte` - Face image thumbnail with loading states
11. `ImageWithFaceBoundingBoxes.svelte` - **Custom** - SVG face detection overlay
12. `LabelClusterModal.svelte` - Person assignment modal
13. `PersonCard.svelte` - Person summary card
14. `PersonDropdown.svelte` - Advanced person selector with search/suggestions
15. `PersonPhotosTab.svelte` - Photo grid for person view
16. `PersonPickerModal.svelte` - Person selection dialog
17. `PhotoPreviewModal.svelte` - Image preview dialog
18. `SuggestionDetailModal.svelte` - Face suggestion review modal
19. `SuggestionGroupCard.svelte` - Grouped face suggestions card
20. `SuggestionThumbnail.svelte` - Face suggestion thumbnail
21. `TemporalTimeline.svelte` - **Custom** - Age-based prototype timeline
22. `UnifiedPersonCard.svelte` - Enhanced person card with actions

#### Queues Components (`src/lib/components/queues/`)

23. `ConnectionIndicator.svelte` - Real-time connection status
24. `JobStatusBadge.svelte` - Job status badge (pending/running/completed/failed)
25. `QueueCard.svelte` - Queue summary card
26. `QueueJobsTable.svelte` - Job listing table with pagination
27. `WorkersPanel.svelte` - Worker status panel
28. `WorkerStatusBadge.svelte` - Worker status indicator

#### Training Components (`src/lib/components/training/`)

29. `CreateSessionModal.svelte` - Training session creation dialog
30. `DirectoryBrowser.svelte` - File system directory selector
31. `ETADisplay.svelte` - Estimated time remaining indicator
32. `JobsTable.svelte` - Training job table with pagination
33. `ProgressBar.svelte` - Progress indicator
34. `SessionDetailView.svelte` - Detailed session information
35. `StatusBadge.svelte` - Training status badge
36. `TrainingControlPanel.svelte` - Session control buttons
37. `TrainingSessionList.svelte` - Session list view
38. `TrainingStats.svelte` - Statistics dashboard

#### Vectors Components (`src/lib/components/vectors/`)

39. `DangerZone.svelte` - Destructive action panel
40. `DeleteConfirmationModal.svelte` - Deletion confirmation dialog
41. `DeletionLogsTable.svelte` - Deletion history table
42. `DirectoryStatsTable.svelte` - Directory-level statistics table
43. `RetrainModal.svelte` - Vector retraining dialog

#### Core Components (`src/lib/components/`)

44. `CategoryBadge.svelte` - Category label with color
45. `CategoryCreateModal.svelte` - Category creation dialog
46. `CategoryEditModal.svelte` - Category edit dialog
47. `CategorySelector.svelte` - Category dropdown selector
48. `FiltersPanel.svelte` - Search filters sidebar
49. `ResultsGrid.svelte` - Image search results grid
50. `SearchBar.svelte` - Main search input with clear button
51. `Toast.svelte` - Toast notification

---

## UI Pattern Analysis by Route

### Dashboard (`/`) - Main Search Page

**Components Used**:

- `SearchBar` - Text input + submit button
- `FiltersPanel` - Date inputs, select dropdowns, person search
- `ResultsGrid` - Image grid with loading states

**UI Patterns**:

- Form inputs (text, date)
- Select dropdowns (categories)
- Autocomplete dropdown (person filter)
- Loading states
- Empty states
- Error alerts

**shadcn-svelte Opportunities**:

- `Input` → Search bar text input
- `Calendar` → Date range picker (enhanced UX)
- `Select` → Category dropdown
- `Combobox` → Person search with autocomplete
- `Alert` → Error messages
- `Skeleton` → Loading states

---

### People Page (`/people`, `/people/[id]`)

**Components Used**:

- `UnifiedPersonCard` - Person summary cards
- `PersonPhotosTab` - Photo grid
- `TemporalTimeline` - Age-based prototype visualization
- Various modals for editing

**UI Patterns**:

- Card layouts
- Avatar placeholders
- Status badges
- Grid layouts
- Tabs (photos, prototypes)
- Modals

**shadcn-svelte Opportunities**:

- `Card` → Person cards
- `Avatar` → Person avatars (instead of custom gradient circles)
- `Badge` → Status badges (active, merged, hidden)
- `Tabs` → Photos/Prototypes tabs
- `Dialog` → Edit/delete modals
- `Button` → Action buttons

---

### Face Clusters (`/faces/clusters`, `/faces/clusters/[id]`)

**Components Used**:

- `ClusterCard` - Face cluster cards
- `LabelClusterModal` - Person assignment modal
- `FaceThumbnail` - Face thumbnails

**UI Patterns**:

- Image cards
- Modal dialogs
- Search within modals
- Person selection (autocomplete)
- Empty states

**shadcn-svelte Opportunities**:

- `Card` → Cluster cards
- `Dialog` → Label cluster modal
- `Combobox` → Person search in modal
- `Separator` → Section dividers

---

### Face Suggestions (`/faces/suggestions`)

**Components Used**:

- `SuggestionGroupCard` - Grouped face suggestions
- `SuggestionDetailModal` - Suggestion review modal
- `PersonDropdown` - Person selector

**UI Patterns**:

- Grouped card layouts
- Confidence scores
- Autocomplete dropdowns
- Accept/reject actions

**shadcn-svelte Opportunities**:

- `Card` → Suggestion cards
- `Badge` → Confidence indicators
- `Combobox` → Person dropdown (custom enhanced version)
- `Dialog` → Detail modal
- `Button` → Accept/reject buttons

---

### Training Sessions (`/training`, `/training/[id]`)

**Components Used**:

- `TrainingSessionList` - Session list
- `JobsTable` - Job listing table
- `StatusBadge` - Status indicators
- `ProgressBar` - Progress indicators
- `CreateSessionModal` - Session creation modal

**UI Patterns**:

- Data tables with pagination
- Progress bars
- Status badges
- Modals with forms
- Directory browser (file tree)

**shadcn-svelte Opportunities**:

- `Table` → Jobs table
- `Badge` → Status badges
- `Progress` → Progress bars
- `Dialog` → Create session modal
- `Form` → Session creation form (with Formsnap)
- `Pagination` → Table pagination

---

### Queues Dashboard (`/queues`, `/queues/[name]`)

**Components Used**:

- `QueueCard` - Queue summary cards
- `QueueJobsTable` - Job table
- `JobStatusBadge` - Job status badges
- `WorkersPanel` - Worker status panel
- `ConnectionIndicator` - Real-time status

**UI Patterns**:

- Status indicators
- Data tables
- Real-time updates (SSE)
- Badges

**shadcn-svelte Opportunities**:

- `Card` → Queue cards
- `Table` → Jobs table
- `Badge` → Status badges (with variant support)
- Custom connection indicator (keep as-is for SSE logic)

---

### Categories Page (`/categories`)

**Components Used**:

- `CategoryBadge` - Category labels
- `CategoryCreateModal` - Creation modal
- `CategoryEditModal` - Edit modal
- `CategorySelector` - Dropdown selector

**UI Patterns**:

- Badges with custom colors
- Modals with forms
- Dropdowns

**shadcn-svelte Opportunities**:

- `Badge` → Category badges (with color variants)
- `Dialog` → Create/edit modals
- `Select` → Category selector
- `Form` → Category forms (with Formsnap)
- `Input` → Form inputs
- `Label` → Form labels

---

### Admin Panel (`/admin`)

**Components Used**:

- `AdminDataManagement` - Main panel
- Various modals (delete, import, export)
- `FaceMatchingSettings` - Settings panel

**UI Patterns**:

- Danger zones (destructive actions)
- Confirmation modals
- File uploads
- Settings forms

**shadcn-svelte Opportunities**:

- `Alert` → Danger zone warnings
- `AlertDialog` → Destructive action confirmations
- `Dialog` → Import/export modals
- `Form` → Settings forms
- `Switch` → Toggle settings

---

### Vectors Page (`/vectors`)

**Components Used**:

- `DirectoryStatsTable` - Statistics table
- `DeletionLogsTable` - Deletion history table
- `DeleteConfirmationModal` - Confirmation modal
- `RetrainModal` - Retrain dialog
- `DangerZone` - Destructive actions panel

**UI Patterns**:

- Data tables
- Confirmation dialogs
- Warning panels

**shadcn-svelte Opportunities**:

- `Table` → Statistics and logs tables
- `AlertDialog` → Delete confirmation
- `Dialog` → Retrain modal
- `Alert` → Danger zone warnings
- `Button` → Destructive action buttons (with variant="destructive")

---

## shadcn-svelte Component Mapping

### Direct Replacements (High Confidence)

| Current Component                 | shadcn-svelte Component             | Migration Effort | Impact                     |
| --------------------------------- | ----------------------------------- | ---------------- | -------------------------- |
| `CategoryBadge`                   | `Badge`                             | Low              | High (used in 10+ places)  |
| `training/StatusBadge`            | `Badge`                             | Low              | High (used in 15+ places)  |
| `queues/JobStatusBadge`           | `Badge`                             | Low              | Medium (5+ places)         |
| `queues/WorkerStatusBadge`        | `Badge`                             | Low              | Medium (3+ places)         |
| `training/ProgressBar`            | `Progress`                          | Low              | Medium (5+ places)         |
| `Toast`                           | `Toast` + `Sonner`                  | Medium           | High (app-wide)            |
| `DeleteAllDataModal`              | `AlertDialog`                       | Low              | High (destructive actions) |
| `DeleteConfirmationModal`         | `AlertDialog`                       | Low              | Medium                     |
| Search input in `SearchBar`       | `Input`                             | Low              | High (main search)         |
| Date inputs in `FiltersPanel`     | `Input` (type="date") or `Calendar` | Medium           | Medium                     |
| Category select in `FiltersPanel` | `Select`                            | Medium           | Medium                     |
| Buttons across all components     | `Button`                            | Low              | Very High (50+ instances)  |

### Enhanced Replacements (Custom + shadcn-svelte)

| Current Component            | shadcn-svelte Base    | Custom Enhancements              | Migration Effort | Impact |
| ---------------------------- | --------------------- | -------------------------------- | ---------------- | ------ |
| `LabelClusterModal`          | `Dialog` + `Combobox` | Person search logic              | Medium           | High   |
| `PersonPickerModal`          | `Dialog` + `Combobox` | Multi-select, suggestions        | Medium           | Medium |
| `PersonDropdown`             | `Combobox`            | Suggestion scoring, keyboard nav | High             | High   |
| `CategorySelector`           | `Select`              | "Create new" option              | Low              | Medium |
| `FiltersPanel` person search | `Combobox`            | Selected person display          | Medium           | High   |
| `CreateSessionModal`         | `Dialog` + `Form`     | Directory browser integration    | Medium           | Medium |
| `CategoryCreateModal`        | `Dialog` + `Form`     | Color picker                     | Medium           | Low    |
| `CategoryEditModal`          | `Dialog` + `Form`     | Color picker                     | Medium           | Low    |
| `ExportPersonDataModal`      | `Dialog` + `Form`     | Export options                   | Low              | Low    |
| `ImportPersonDataModal`      | `Dialog` + `Form`     | File upload                      | Low              | Low    |
| `RetrainModal`               | `Dialog` + `Form`     | Directory selection              | Low              | Low    |

### Table Components (Medium Complexity)

| Current Component      | shadcn-svelte Base     | Custom Columns               | Migration Effort | Impact |
| ---------------------- | ---------------------- | ---------------------------- | ---------------- | ------ |
| `JobsTable` (training) | `Table` + `Pagination` | Status, duration, error      | Medium           | High   |
| `QueueJobsTable`       | `Table` + `Pagination` | Job ID, function, timestamps | Medium           | High   |
| `DeletionLogsTable`    | `Table`                | Deletion details             | Low              | Low    |
| `DirectoryStatsTable`  | `Table`                | Directory, vector counts     | Low              | Medium |

### Card Components (Low Complexity)

| Current Component          | shadcn-svelte Base          | Custom Content    | Migration Effort | Impact |
| -------------------------- | --------------------------- | ----------------- | ---------------- | ------ |
| `PersonCard`               | `Card` + `Avatar` + `Badge` | Stats display     | Low              | High   |
| `UnifiedPersonCard`        | `Card` + `Avatar` + `Badge` | Action buttons    | Low              | High   |
| `ClusterCard`              | `Card`                      | Thumbnail grid    | Low              | High   |
| `QueueCard`                | `Card` + `Badge`            | Queue stats       | Low              | Medium |
| `SuggestionGroupCard`      | `Card`                      | Confidence scores | Low              | Medium |
| `FaceDetectionSessionCard` | `Card` + `Badge`            | Session details   | Low              | Low    |

### Keep Custom (Highly Specialized)

| Component                    | Reason                         | Notes                                                     |
| ---------------------------- | ------------------------------ | --------------------------------------------------------- |
| `ImageWithFaceBoundingBoxes` | Custom SVG overlay logic       | Face detection visualization requires precise positioning |
| `TemporalTimeline`           | Complex timeline visualization | Age-based prototype timeline with custom rendering        |
| `FaceThumbnail`              | Face-specific loading states   | Batch loading, cache integration                          |
| `SuggestionThumbnail`        | Similar to FaceThumbnail       | Face-specific concerns                                    |
| `DirectoryBrowser`           | File tree navigation           | Custom file system interaction                            |
| `TrainingStats`              | Dashboard metrics              | Custom chart-like visualization                           |
| `CoverageIndicator`          | Visual metric display          | Custom progress-like indicator                            |
| `ConnectionIndicator`        | Real-time SSE status           | Custom WebSocket/SSE logic                                |
| `ETADisplay`                 | Time remaining calculation     | Simple, low complexity, keep as-is                        |
| `ResultsGrid`                | Image grid with lazy loading   | Custom grid logic, keep as-is                             |

---

## Migration Recommendations by Priority

### Phase 0: Installation & Setup (Critical First Step) - Week 0

**Goal**: Properly install and configure shadcn-svelte for SvelteKit 2 + Svelte 5 + Tailwind v4

#### Prerequisites Check

Before installation, verify current project state:

```bash
# Verify Node.js version (16.x or higher required)
node --version

# Verify current dependencies
cat package.json | grep -A 5 "dependencies"

# Check Tailwind v4 is installed
cat package.json | grep "@tailwindcss/vite"
```

**Required Dependencies** (already present in this project):

- ✅ `@tailwindcss/vite` - Tailwind CSS v4 Vite plugin
- ✅ `tailwindcss` ^4.x
- ✅ `svelte` ^5.x (Svelte 5 with runes)
- ✅ `@sveltejs/kit` ^2.x (SvelteKit 2)
- ✅ `typescript` ^5.x

#### Installation Steps

**1. Run shadcn-svelte init with Tailwind v4 support**

```bash
npx shadcn-svelte@latest init
```

**Configuration Prompts** (recommended answers for this project):

- **TypeScript**: ✅ Yes (project already uses TypeScript)
- **Style**: `new-york` (shadcn-svelte default, modern look)
- **Base Color**: `slate` (neutral, professional appearance)
- **CSS file location**: `src/app.css` (create new global CSS file)
- **Tailwind config**: Leave BLANK (Tailwind v4 doesn't use tailwind.config.js)
- **Component alias**: `$lib/components/ui` (SvelteKit convention)
- **Utils alias**: `$lib/utils` (SvelteKit convention)
- **React Server Components**: No (not applicable to Svelte)
- **Write to components.json**: ✅ Yes

**2. Update vite.config.ts for Tailwind v4**

The Tailwind team recommends using the Vite plugin instead of PostCSS. Update:

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';
import tailwindcss from '@tailwindcss/vite'; // ADD THIS

export default defineConfig({
	plugins: [
		tailwindcss(), // ADD BEFORE sveltekit()
		sveltekit(),
		svelteTesting()
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['src/tests/setup.ts']
	}
});
```

**3. Create src/app.css with Tailwind v4 imports**

Create `src/app.css` (shadcn-svelte will generate most of this):

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

@theme {
	/* shadcn-svelte will populate color variables here using OKLCH */
	/* Base colors in OKLCH format for better color accuracy */
	--color-background: oklch(100% 0 0);
	--color-foreground: oklch(15% 0 0);
	/* ... additional theme variables ... */
}

/* Component-specific styles can be added here */
```

**4. Update src/routes/+layout.svelte to import app.css**

Add global CSS import at the top of the script section:

```svelte
<script lang="ts">
	import '../app.css'; // ADD THIS LINE

	// ... existing imports and code ...
</script>

<!-- Keep existing layout template -->
```

**5. Verify components.json was created**

Check that `components.json` exists in project root:

```bash
cat components.json
```

Expected structure:

```json
{
	"$schema": "https://shadcn-svelte.com/schema.json",
	"style": "new-york",
	"tailwind": {
		"config": "",
		"css": "src/app.css",
		"baseColor": "slate"
	},
	"aliases": {
		"components": "$lib/components/ui",
		"utils": "$lib/utils"
	}
}
```

#### Test Installation with Sample Component

**6. Add a test button component**

```bash
npx shadcn-svelte@latest add button
```

This creates `src/lib/components/ui/button/` directory with:

- `button.svelte` - Button component
- `index.ts` - Type exports

**7. Create test page to verify shadcn-svelte works**

Create `src/routes/shadcn-test/+page.svelte`:

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<div style="padding: 2rem;">
	<h1>shadcn-svelte Installation Test</h1>

	<div style="display: flex; gap: 1rem; margin-top: 1rem;">
		<Button>Default</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="destructive">Destructive</Button>
		<Button variant="outline">Outline</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="link">Link</Button>
	</div>

	<div style="margin-top: 1rem;">
		<Button size="sm">Small</Button>
		<Button size="default">Default</Button>
		<Button size="lg">Large</Button>
		<Button size="icon">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M5 12h14" />
				<path d="m12 5 7 7-7 7" />
			</svg>
		</Button>
	</div>
</div>
```

**8. Run dev server and verify buttons render correctly**

```bash
make dev
# Or: npm run dev
```

Visit `http://localhost:5173/shadcn-test` and verify:

- ✅ All button variants render with correct styling
- ✅ Buttons have proper hover/focus states
- ✅ No console errors related to Tailwind or shadcn-svelte
- ✅ Styles are applied (not unstyled buttons)

#### Post-Installation Cleanup

**9. Install additional shadcn-svelte dependencies**

```bash
# Required for animations (replaces tailwindcss-animate)
npm install tw-animate-css

# Useful utilities for future components
npm install clsx tailwind-merge
```

**10. Create utility helper for className merging**

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
```

This utility is used by shadcn-svelte components for conditional class application.

#### Verification Checklist

Before proceeding to Phase 1:

- [ ] `npx shadcn-svelte@latest init` completed successfully
- [ ] `components.json` exists in project root
- [ ] `src/app.css` created with Tailwind v4 imports
- [ ] `vite.config.ts` updated with `@tailwindcss/vite` plugin
- [ ] `src/routes/+layout.svelte` imports `../app.css`
- [ ] `src/lib/utils.ts` created with `cn()` utility
- [ ] Test button component added (`npx shadcn-svelte@latest add button`)
- [ ] Dev server runs without Tailwind errors (`make dev`)
- [ ] Test page `/shadcn-test` renders buttons with correct styling
- [ ] No TypeScript errors in `src/lib/components/ui/button/`
- [ ] All existing tests still pass (`make test`)

#### Test Cases - Phase 0

**Automated Tests**:

Create `src/tests/shadcn/installation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { Button } from '$lib/components/ui/button';

describe('shadcn-svelte Installation', () => {
	it('Button component renders correctly', () => {
		render(Button, { props: { children: 'Test Button' } });
		const button = screen.getByRole('button', { name: 'Test Button' });
		expect(button).toBeInTheDocument();
	});

	it('Button accepts variant prop', () => {
		const { container } = render(Button, {
			props: { children: 'Destructive', variant: 'destructive' }
		});
		const button = container.querySelector('button');
		expect(button).toHaveClass('destructive');
	});

	it('Button accepts size prop', () => {
		const { container } = render(Button, {
			props: { children: 'Large', size: 'lg' }
		});
		const button = container.querySelector('button');
		expect(button).toHaveClass('lg');
	});
});
```

Run tests:

```bash
make test
# Or: npm run test
```

**Manual Verification Tests**:

1. **Visual Test**: Visit `/shadcn-test` and verify all button variants render correctly
2. **TypeScript Test**: Run `make typecheck` and ensure no errors in `ui/button/`
3. **Build Test**: Run `make build` and verify production build succeeds
4. **No Regression Test**: Verify existing pages still render (no Tailwind conflicts)

#### Rollback Criteria

If any of the following occur, rollback Phase 0 changes:

- ❌ Existing pages show styling regressions
- ❌ Dev server fails to start due to Tailwind errors
- ❌ More than 5 TypeScript errors introduced
- ❌ Test suite fails (more than 10% of tests broken)
- ❌ Build process fails

**Rollback Steps**:

```bash
# Revert vite.config.ts
git checkout vite.config.ts

# Remove shadcn-svelte files
rm -rf src/lib/components/ui
rm src/app.css
rm components.json
rm src/lib/utils.ts

# Revert package.json changes
git checkout package.json
npm ci

# Verify rollback successful
make dev
make test
```

#### Estimated Duration

- Installation: 30 minutes
- Configuration: 30 minutes
- Testing and verification: 1 hour
- **Total: 2 hours**

#### Success Criteria

✅ **Phase 0 Complete When**:

1. All verification checklist items are complete
2. Test button component renders correctly
3. No TypeScript errors introduced
4. Existing tests still pass (100% pass rate)
5. Dev server runs without errors
6. Team reviews test page and approves styling

---

### Phase 1: Foundation (High Impact, Low Effort) - Week 1-2

**Goal**: Replace 80% of button, badge, and input usage

**Prerequisites**: ✅ Phase 0 completed successfully

1. **Add Core Components**

   ```bash
   npx shadcn-svelte@latest add badge
   npx shadcn-svelte@latest add input
   npx shadcn-svelte@latest add label
   npx shadcn-svelte@latest add alert
   ```

2. **Replace Custom Badges** (Est. 30+ instances)
   - Migrate `CategoryBadge` → Use `Badge` with color variants
   - Migrate `training/StatusBadge` → Use `Badge` with status-based variants
   - Migrate `queues/JobStatusBadge` → Use `Badge`
   - Migrate `queues/WorkerStatusBadge` → Use `Badge`
   - **Outcome**: Consistent badge styling, 200+ lines of CSS removed

3. **Replace Buttons** (Est. 50+ instances)
   - Update all `<button>` elements to use shadcn `<Button>`
   - Apply variants: `default`, `destructive`, `outline`, `ghost`, `link`
   - **Outcome**: Consistent button styling, 150+ lines of CSS removed

4. **Standardize Inputs** (Est. 20+ instances)
   - Replace search inputs with shadcn `<Input>`
   - Replace form inputs in modals
   - Pair with `<Label>` for accessibility
   - **Outcome**: Consistent input styling, ARIA improvements

5. **Add Alert Component** (Est. 5+ instances)
   - Replace error message divs with `<Alert variant="destructive">`
   - **Outcome**: Consistent error display

**Estimated Impact**:

- **Code Reduction**: ~400 lines of custom CSS removed
- **Consistency**: Unified styling for 100+ UI elements
- **Accessibility**: Automatic ARIA attributes for inputs

#### Test Cases - Phase 1

**Unit Tests for Migrated Components**:

Create `src/tests/shadcn/phase1-badge.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { Badge } from '$lib/components/ui/badge';
import { createCategory } from '../helpers/fixtures';

describe('Badge Migration - CategoryBadge', () => {
	it('renders category name in badge', () => {
		const category = createCategory({ name: 'Vacation' });
		const { container } = render(Badge, {
			props: {
				children: category.name,
				variant: 'default'
			}
		});

		expect(screen.getByText('Vacation')).toBeInTheDocument();
		expect(container.querySelector('[data-badge]')).toBeInTheDocument();
	});

	it('supports destructive variant for status badges', () => {
		const { container } = render(Badge, {
			props: { children: 'Failed', variant: 'destructive' }
		});

		const badge = container.querySelector('[data-badge]');
		expect(badge).toHaveClass('destructive');
	});

	it('supports secondary variant for status badges', () => {
		const { container } = render(Badge, {
			props: { children: 'Pending', variant: 'secondary' }
		});

		const badge = container.querySelector('[data-badge]');
		expect(badge).toHaveClass('secondary');
	});
});
```

Create `src/tests/shadcn/phase1-button.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { Button } from '$lib/components/ui/button';

describe('Button Migration', () => {
	it('renders button with text', () => {
		render(Button, { props: { children: 'Click Me' } });
		expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
	});

	it('handles click events', async () => {
		const handleClick = vi.fn();
		render(Button, { props: { children: 'Submit', onclick: handleClick } });

		const button = screen.getByRole('button', { name: 'Submit' });
		await fireEvent.click(button);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it('supports destructive variant for delete actions', () => {
		const { container } = render(Button, {
			props: { children: 'Delete', variant: 'destructive' }
		});

		const button = container.querySelector('button');
		expect(button).toHaveClass('destructive');
	});

	it('supports disabled state', () => {
		render(Button, { props: { children: 'Disabled', disabled: true } });
		const button = screen.getByRole('button', { name: 'Disabled' });
		expect(button).toBeDisabled();
	});
});
```

Create `src/tests/shadcn/phase1-input.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';

describe('Input Migration', () => {
	it('renders input with label', () => {
		const { container } = render(Label, {
			props: { children: 'Search', for: 'search-input' }
		});
		render(Input, { props: { id: 'search-input', placeholder: 'Enter query...' } });

		expect(screen.getByLabelText('Search')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Enter query...')).toBeInTheDocument();
	});

	it('handles input changes', async () => {
		render(Input, { props: { placeholder: 'Type here' } });
		const input = screen.getByPlaceholderText('Type here') as HTMLInputElement;

		await fireEvent.input(input, { target: { value: 'test query' } });
		expect(input.value).toBe('test query');
	});

	it('supports type="date" for date inputs', () => {
		render(Input, { props: { type: 'date', id: 'date-input' } });
		const input = document.getElementById('date-input') as HTMLInputElement;
		expect(input.type).toBe('date');
	});
});
```

**Integration Tests for Key Pages**:

Update `src/tests/routes/page.test.ts` (dashboard search page):

```typescript
// Add test after migrating SearchBar to use shadcn Button
it('search bar uses shadcn Button component', () => {
	mockResponse('http://localhost:8000/api/v1/search', createSearchResponse([]));
	render(DashboardPage);

	const searchButton = screen.getByRole('button', { name: /search/i });
	// Verify shadcn button classes are present
	expect(searchButton).toHaveClass('inline-flex'); // shadcn button base class
});
```

**Visual Regression Tests** (Manual):

After migration, verify on these pages:

1. **Dashboard** (`/`): Search button, clear button, category badges
2. **Training** (`/training`): Status badges (pending, running, completed, failed)
3. **Queues** (`/queues`): Job status badges, worker status badges
4. **People** (`/people`): Person card buttons (view, edit, merge)
5. **Categories** (`/categories`): Category badges with custom colors

**Accessibility Tests**:

Run Lighthouse accessibility audit on:

- Dashboard search interface (keyboard navigation for search)
- Training page (status badges have sufficient color contrast)
- Any page with form inputs (labels properly associated)

Target: **Accessibility score ≥ 95** (maintain or improve from current)

**Acceptance Criteria**:

- [ ] All badge instances use shadcn `Badge` component
- [ ] All buttons use shadcn `Button` component with correct variants
- [ ] All form inputs use shadcn `Input` + `Label`
- [ ] Error messages use shadcn `Alert` component
- [ ] Unit tests pass for all migrated components
- [ ] Integration tests pass for dashboard and training pages
- [ ] Visual inspection confirms no styling regressions
- [ ] Accessibility audit shows ≥95 score
- [ ] TypeScript has no errors related to component props
- [ ] `make test` passes 100% of tests

**How to Run Tests**:

```bash
# Run all tests
make test

# Run Phase 1 tests only
npm run test -- src/tests/shadcn/phase1

# Run tests in watch mode during migration
make test-watch

# Type check
make typecheck

# Visual inspection
make dev
# Then visit each page listed above
```

**Rollback Criteria**:

If Phase 1 migration causes:

- ❌ More than 3 visual regressions on key pages
- ❌ Accessibility score drops below 90
- ❌ More than 10% of existing tests fail
- ❌ Any critical user workflow breaks (search, create session, etc.)

Then rollback by:

```bash
git checkout src/lib/components/  # Revert component changes
make test                         # Verify tests pass again
```

---

### Phase 2: Dialogs & Modals (High Impact, Medium Effort) - Week 3-4

**Goal**: Replace all modal dialogs with shadcn Dialog/AlertDialog

1. **Add Dialog Components**

   ```bash
   npx shadcn-svelte@latest add dialog
   npx shadcn-svelte@latest add alert-dialog
   ```

2. **Replace Confirmation Modals** (Est. 5 modals)
   - `DeleteAllDataModal` → `AlertDialog`
   - `DeleteConfirmationModal` → `AlertDialog`
   - **Pattern**: Destructive actions use `AlertDialog`
   - **Outcome**: Accessibility, keyboard navigation, backdrop click handling

3. **Replace Form Modals** (Est. 10 modals)
   - `CategoryCreateModal` → `Dialog` + `Form`
   - `CategoryEditModal` → `Dialog` + `Form`
   - `CreateSessionModal` → `Dialog` + `Form`
   - `ExportPersonDataModal` → `Dialog` + `Form`
   - `ImportPersonDataModal` → `Dialog` + `Form`
   - `RetrainModal` → `Dialog` + `Form`
   - **Outcome**: Consistent modal structure, 600+ lines of custom CSS removed

4. **Replace Complex Modals** (Est. 5 modals)
   - `LabelClusterModal` → `Dialog` + `Combobox` (Phase 3 dependency)
   - `PersonPickerModal` → `Dialog` + `Combobox` (Phase 3 dependency)
   - `PhotoPreviewModal` → `Dialog` (image preview)
   - `SuggestionDetailModal` → `Dialog` (face suggestion review)
   - **Outcome**: Enhanced UX with better focus management

**Estimated Impact**:

- **Code Reduction**: ~800 lines of modal CSS/structure removed
- **Accessibility**: Focus trapping, ESC key handling, ARIA attributes
- **Consistency**: All modals follow same interaction pattern

#### Test Cases - Phase 2

**Unit Tests for Dialog Components**:

Create `src/tests/shadcn/phase2-dialog.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';

describe('Dialog Migration', () => {
	it('renders dialog with title', async () => {
		const { component } = render(Dialog, {
			props: {
				open: true,
				children: DialogContent({
					children: [
						DialogHeader({ children: DialogTitle({ children: 'Test Modal' }) }),
						'Modal content here'
					]
				})
			}
		});

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Test Modal')).toBeInTheDocument();
	});

	it('closes dialog when ESC pressed', async () => {
		const handleOpenChange = vi.fn();
		render(Dialog, {
			props: { open: true, onOpenChange: handleOpenChange }
		});

		const dialog = screen.getByRole('dialog');
		await fireEvent.keyDown(dialog, { key: 'Escape' });

		expect(handleOpenChange).toHaveBeenCalledWith(false);
	});

	it('closes dialog when backdrop clicked', async () => {
		const handleOpenChange = vi.fn();
		const { container } = render(Dialog, {
			props: { open: true, onOpenChange: handleOpenChange }
		});

		const backdrop = container.querySelector('[data-dialog-overlay]');
		await fireEvent.click(backdrop!);

		expect(handleOpenChange).toHaveBeenCalledWith(false);
	});
});
```

Create `src/tests/shadcn/phase2-alert-dialog.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction
} from '$lib/components/ui/alert-dialog';

describe('AlertDialog Migration - Destructive Actions', () => {
	it('renders alert dialog with title and description', () => {
		render(AlertDialog, {
			props: {
				open: true,
				children: AlertDialogContent({
					children: [
						AlertDialogHeader({
							children: [
								AlertDialogTitle({ children: 'Delete All Data' }),
								AlertDialogDescription({ children: 'This action cannot be undone.' })
							]
						})
					]
				})
			}
		});

		expect(screen.getByText('Delete All Data')).toBeInTheDocument();
		expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
	});

	it('triggers action on confirm button click', async () => {
		const handleConfirm = vi.fn();
		render(AlertDialog, {
			props: {
				open: true,
				children: AlertDialogContent({
					children: [
						AlertDialogFooter({
							children: [
								AlertDialogCancel({ children: 'Cancel' }),
								AlertDialogAction({ children: 'Delete', onclick: handleConfirm })
							]
						})
					]
				})
			}
		});

		const confirmButton = screen.getByRole('button', { name: 'Delete' });
		await fireEvent.click(confirmButton);

		expect(handleConfirm).toHaveBeenCalledTimes(1);
	});
});
```

**Integration Tests**:

Update `src/tests/components/CategoryCreateModal.test.ts`:

```typescript
// After migrating to shadcn Dialog
it('modal uses shadcn Dialog component', () => {
	const handleClose = vi.fn();
	render(CategoryCreateModal, { props: { open: true, onClose: handleClose } });

	// Verify dialog role exists (shadcn Dialog provides this)
	expect(screen.getByRole('dialog')).toBeInTheDocument();
	expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
});
```

**Accessibility Tests**:

Focus management verification:

1. **Tab trapping**: When modal opens, tab cycles within modal only
2. **Focus restoration**: When modal closes, focus returns to trigger element
3. **ARIA attributes**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
4. **Keyboard navigation**: ESC closes modal, Enter submits forms

**Acceptance Criteria**:

- [ ] All confirmation modals use `AlertDialog`
- [ ] All form modals use `Dialog`
- [ ] Modal focus is trapped within dialog
- [ ] ESC key closes modals
- [ ] Backdrop click closes modals (except destructive actions)
- [ ] Focus returns to trigger element on close
- [ ] All modal tests pass (unit + integration)
- [ ] Accessibility audit shows ≥95 score
- [ ] No modal-related visual regressions

**How to Run Tests**:

```bash
# Phase 2 tests
npm run test -- src/tests/shadcn/phase2

# Modal component tests
npm run test -- src/tests/components/*Modal.test.ts

# Keyboard navigation manual test
make dev
# Open any modal, verify Tab/ESC/Enter behavior
```

**Rollback Criteria**:

If Phase 2 causes:

- ❌ Focus trapping breaks (focus escapes modal)
- ❌ More than 5 modal-related test failures
- ❌ Critical modal workflows break (delete, create, edit)
- ❌ Accessibility score drops below 90

---

### Phase 3: Forms & Selects (Medium Impact, Medium Effort) - Week 5-6

**Goal**: Standardize all form controls and dropdowns

1. **Add Form Components**

   ```bash
   npx shadcn-svelte@latest add form
   npx shadcn-svelte@latest add select
   npx shadcn-svelte@latest add combobox
   npx shadcn-svelte@latest add checkbox
   npx shadcn-svelte@latest add switch
   npx shadcn-svelte@latest add calendar
   ```

2. **Integrate Formsnap** (Svelte 5 form library)

   ```bash
   npm install formsnap sveltekit-superforms zod
   ```

   - Use for category create/edit forms
   - Use for training session creation
   - Use for admin settings

3. **Replace Selects** (Est. 10 instances)
   - `CategorySelector` → `Select` (keep "Create new" custom option)
   - Category filter in `FiltersPanel` → `Select`
   - **Outcome**: Keyboard navigation, consistent styling

4. **Replace Comboboxes** (Est. 5 instances)
   - Person search in `FiltersPanel` → `Combobox`
   - Person search in `LabelClusterModal` → `Combobox`
   - **Note**: `PersonDropdown` may need custom wrapper due to suggestions feature
   - **Outcome**: Autocomplete with keyboard navigation

5. **Enhance Date Inputs** (Est. 2 instances)
   - Date filters in `FiltersPanel` → `Calendar` component (optional enhancement)
   - **Outcome**: Better UX than native date input

**Estimated Impact**:

- **Code Reduction**: ~400 lines of custom select/dropdown code
- **UX Improvement**: Better keyboard navigation, search-as-you-type
- **Type Safety**: Formsnap + Zod validation

#### Test Cases - Phase 3

**Unit Tests for Form Components**:

Create `src/tests/shadcn/phase3-select.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';

describe('Select Migration', () => {
	it('renders select with options', async () => {
		render(Select, {
			props: {
				children: [
					SelectTrigger({ children: 'Select category' }),
					SelectContent({
						children: [
							SelectItem({ value: '1', children: 'Vacation' }),
							SelectItem({ value: '2', children: 'Work' })
						]
					})
				]
			}
		});

		const trigger = screen.getByText('Select category');
		await fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.getByRole('option', { name: 'Vacation' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
		});
	});

	it('handles keyboard navigation with arrow keys', async () => {
		const handleChange = vi.fn();
		render(Select, {
			props: {
				onValueChange: handleChange,
				children: [
					SelectTrigger({ children: 'Select' }),
					SelectContent({
						children: [
							SelectItem({ value: '1', children: 'Option 1' }),
							SelectItem({ value: '2', children: 'Option 2' })
						]
					})
				]
			}
		});

		const trigger = screen.getByText('Select');
		await fireEvent.keyDown(trigger, { key: 'ArrowDown' });

		// Should open dropdown and focus first option
		await waitFor(() => {
			expect(screen.getByRole('option', { name: 'Option 1' })).toHaveFocus();
		});
	});
});
```

Create `src/tests/shadcn/phase3-combobox.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { Combobox } from '$lib/components/ui/combobox';
import { createMultiplePersons } from '../helpers/fixtures';

describe('Combobox Migration - Person Filter', () => {
	it('filters options based on search query', async () => {
		const persons = createMultiplePersons(3, 1); // Alice, Bob, Charlie
		render(Combobox, {
			props: {
				items: persons.map((p) => ({ value: p.id, label: p.name })),
				placeholder: 'Search people...'
			}
		});

		const input = screen.getByPlaceholderText('Search people...');
		await fireEvent.input(input, { target: { value: 'Bob' } });

		await waitFor(() => {
			expect(screen.getByText('Bob')).toBeInTheDocument();
			expect(screen.queryByText('Alice')).not.toBeInTheDocument();
		});
	});

	it('allows keyboard navigation through filtered results', async () => {
		const persons = createMultiplePersons(2, 1);
		render(Combobox, {
			props: {
				items: persons.map((p) => ({ value: p.id, label: p.name })),
				placeholder: 'Search...'
			}
		});

		const input = screen.getByPlaceholderText('Search...');
		await fireEvent.focus(input);
		await fireEvent.keyDown(input, { key: 'ArrowDown' });

		// First item should be focused
		await waitFor(() => {
			expect(screen.getByText('Alice')).toHaveFocus();
		});
	});
});
```

**Integration Tests**:

Update `src/tests/components/FiltersPanel.test.ts`:

```typescript
// After migrating person filter to Combobox
it('person filter uses shadcn Combobox component', async () => {
	mockResponse(
		'http://localhost:8000/api/v1/faces/persons?page=1&page_size=100&status=active',
		createPersonResponse(createMultiplePersons(3, 1))
	);

	render(FiltersPanel, { props: { onFilterChange: vi.fn() } });

	await waitFor(() => {
		const input = screen.getByPlaceholderText('Search people to add...');
		expect(input).toBeInTheDocument();
		// Verify combobox data attributes
		expect(input.closest('[data-combobox-root]')).toBeInTheDocument();
	});
});
```

**Formsnap Integration Tests**:

Create `src/tests/shadcn/phase3-form-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { z } from 'zod';

// Example: CategoryCreateModal with Formsnap validation
describe('Form Validation with Formsnap + Zod', () => {
	it('shows validation error for empty required field', async () => {
		// Render form modal with Formsnap + Zod schema
		render(CategoryCreateModal, { props: { open: true, onClose: vi.fn() } });

		const submitButton = screen.getByRole('button', { name: /create/i });
		await fireEvent.click(submitButton);

		// Validation error should appear
		await waitFor(() => {
			expect(screen.getByText('Category name is required')).toBeInTheDocument();
		});
	});

	it('validates color field format', async () => {
		render(CategoryCreateModal, { props: { open: true, onClose: vi.fn() } });

		const colorInput = screen.getByLabelText('Color');
		await fireEvent.input(colorInput, { target: { value: 'invalid-color' } });

		const submitButton = screen.getByRole('button', { name: /create/i });
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Invalid color format')).toBeInTheDocument();
		});
	});
});
```

**Acceptance Criteria**:

- [ ] All select dropdowns use shadcn `Select`
- [ ] Person filter uses shadcn `Combobox`
- [ ] Date inputs optionally enhanced with `Calendar`
- [ ] Form validation uses Formsnap + Zod
- [ ] Keyboard navigation works (Arrow keys, Enter, ESC)
- [ ] Search-as-you-type works in comboboxes
- [ ] All form tests pass
- [ ] Accessibility audit shows ≥95 score

**Rollback Criteria**:

If Phase 3 causes:

- ❌ Select/Combobox keyboard navigation breaks
- ❌ Form validation fails to show errors
- ❌ Person filter search breaks
- ❌ More than 10% of form tests fail

---

### Phase 4: Tables & Data Display (Medium Impact, High Effort) - Week 7-8

**Goal**: Standardize all data tables with pagination

1. **Add Table Component**

   ```bash
   npx shadcn-svelte@latest add table
   npx shadcn-svelte@latest add pagination
   ```

2. **Migrate Training Tables** (2 tables)
   - `JobsTable` → `Table` + custom columns
   - Keep custom pagination logic (backend-driven)
   - **Outcome**: Consistent table styling, sortable columns

3. **Migrate Queue Tables** (1 table)
   - `QueueJobsTable` → `Table` + custom columns
   - **Outcome**: Consistent with training tables

4. **Migrate Vector Tables** (2 tables)
   - `DirectoryStatsTable` → `Table`
   - `DeletionLogsTable` → `Table`
   - **Outcome**: Minimal custom code

**Estimated Impact**:

- **Code Reduction**: ~300 lines of table CSS removed
- **Consistency**: All tables have same look/feel
- **Features**: Built-in sorting, better responsive design

#### Test Cases - Phase 4

**Unit Tests for Table Components**:

Create `src/tests/shadcn/phase4-table.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell
} from '$lib/components/ui/table';

describe('Table Migration', () => {
	it('renders table with headers and rows', () => {
		render(Table, {
			props: {
				children: [
					TableHeader({
						children: TableRow({
							children: [
								TableHead({ children: 'Job ID' }),
								TableHead({ children: 'Status' }),
								TableHead({ children: 'Duration' })
							]
						})
					}),
					TableBody({
						children: [
							TableRow({
								children: [
									TableCell({ children: 'job-123' }),
									TableCell({ children: 'Running' }),
									TableCell({ children: '2m 30s' })
								]
							})
						]
					})
				]
			}
		});

		expect(screen.getByRole('table')).toBeInTheDocument();
		expect(screen.getByText('Job ID')).toBeInTheDocument();
		expect(screen.getByText('job-123')).toBeInTheDocument();
	});

	it('applies correct semantic HTML roles', () => {
		const { container } = render(Table, {
			props: {
				children: [
					TableHeader({
						children: TableRow({
							children: TableHead({ children: 'Column' })
						})
					})
				]
			}
		});

		expect(container.querySelector('thead')).toBeInTheDocument();
		expect(container.querySelector('th')).toBeInTheDocument();
	});
});
```

**Integration Tests**:

Update `src/tests/components/training/JobsTable.test.ts`:

```typescript
// After migrating to shadcn Table
it('table uses shadcn Table component', () => {
	const jobs = createMultipleJobs(3);
	mockResponse('http://localhost:8000/api/v1/training/jobs?page=1&page_size=20', {
		jobs,
		total: 3
	});

	render(JobsTable);

	// Verify semantic table structure
	expect(screen.getByRole('table')).toBeInTheDocument();
	expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
	expect(screen.getByRole('columnheader', { name: 'Duration' })).toBeInTheDocument();
});

it('displays pagination controls', () => {
	const jobs = createMultipleJobs(25); // More than one page
	mockResponse('http://localhost:8000/api/v1/training/jobs?page=1&page_size=20', {
		jobs: jobs.slice(0, 20),
		total: 25
	});

	render(JobsTable);

	expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
});
```

**Acceptance Criteria**:

- [ ] All data tables use shadcn `Table`
- [ ] Pagination uses shadcn `Pagination`
- [ ] Tables render with correct semantic HTML
- [ ] Sortable columns work (if implemented)
- [ ] Responsive design works on mobile
- [ ] All table tests pass
- [ ] Accessibility audit shows ≥95 score

**Rollback Criteria**:

If Phase 4 causes:

- ❌ Table pagination breaks
- ❌ More than 15% of table tests fail
- ❌ Tables don't render data correctly
- ❌ Accessibility score drops below 90

---

### Phase 5: Cards & Complex Components (Low-Medium Impact, Medium Effort) - Week 9-10

**Goal**: Replace card layouts and enhance with Avatar

1. **Add Remaining Components**

   ```bash
   npx shadcn-svelte@latest add card
   npx shadcn-svelte@latest add avatar
   npx shadcn-svelte@latest add separator
   npx shadcn-svelte@latest add tabs
   npx shadcn-svelte@latest add progress
   ```

2. **Migrate Person Cards** (2 card types)
   - `PersonCard` → `Card` + `Avatar` + `Badge`
   - `UnifiedPersonCard` → `Card` + `Avatar` + `Badge`
   - **Outcome**: Remove custom avatar gradient CSS, use Avatar component

3. **Migrate Other Cards** (6 card types)
   - `ClusterCard` → `Card`
   - `QueueCard` → `Card`
   - `SuggestionGroupCard` → `Card`
   - `FaceDetectionSessionCard` → `Card`
   - **Outcome**: Consistent card padding, borders, shadows

4. **Replace Progress Bars** (5+ instances)
   - `training/ProgressBar` → `Progress`
   - **Outcome**: Consistent progress styling

5. **Add Tabs** (2 instances)
   - Person detail page (Photos/Prototypes tabs) → `Tabs`
   - Training page (Sessions/Face Sessions tabs) → `Tabs`
   - **Outcome**: Better keyboard navigation, ARIA support

**Estimated Impact**:

- **Code Reduction**: ~350 lines of card/avatar CSS removed
- **Consistency**: Unified card design across app
- **Accessibility**: Better tab navigation

#### Test Cases - Phase 5

**Unit Tests for Card Components**:

Create `src/tests/shadcn/phase5-card.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter
} from '$lib/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';

describe('Card Migration', () => {
	it('renders card with header, content, and footer', () => {
		render(Card, {
			props: {
				children: [
					CardHeader({
						children: [
							CardTitle({ children: 'Person Name' }),
							CardDescription({ children: '15 faces detected' })
						]
					}),
					CardContent({ children: 'Card content here' }),
					CardFooter({ children: 'Footer actions' })
				]
			}
		});

		expect(screen.getByText('Person Name')).toBeInTheDocument();
		expect(screen.getByText('15 faces detected')).toBeInTheDocument();
		expect(screen.getByText('Card content here')).toBeInTheDocument();
	});
});

describe('Avatar Migration', () => {
	it('renders avatar with image', () => {
		render(Avatar, {
			props: {
				children: [
					AvatarImage({ src: '/thumbnail.jpg', alt: 'Person' }),
					AvatarFallback({ children: 'PN' })
				]
			}
		});

		const img = screen.getByAltText('Person');
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute('src', '/thumbnail.jpg');
	});

	it('shows fallback when image fails to load', async () => {
		render(Avatar, {
			props: {
				children: [
					AvatarImage({ src: '/invalid.jpg', alt: 'Person' }),
					AvatarFallback({ children: 'PN' })
				]
			}
		});

		// Fallback should be visible
		expect(screen.getByText('PN')).toBeInTheDocument();
	});
});
```

**Integration Tests**:

Update `src/tests/components/faces/PersonCard.test.ts`:

```typescript
// After migrating to shadcn Card + Avatar
it('person card uses shadcn Card and Avatar components', () => {
	const person = createPerson({ name: 'Alice', faceCount: 10 });
	render(PersonCard, { props: { person } });

	// Verify Card structure
	expect(screen.getByText('Alice')).toBeInTheDocument();
	expect(screen.getByText('10 faces')).toBeInTheDocument();

	// Verify Avatar (or fallback initials)
	const avatar = screen.getByText('AL'); // Fallback for "Alice"
	expect(avatar).toBeInTheDocument();
});
```

Create `src/tests/shadcn/phase5-tabs.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';

describe('Tabs Migration - Person Detail Page', () => {
	it('renders tabs with Photos and Prototypes', () => {
		render(Tabs, {
			props: {
				value: 'photos',
				children: [
					TabsList({
						children: [
							TabsTrigger({ value: 'photos', children: 'Photos' }),
							TabsTrigger({ value: 'prototypes', children: 'Prototypes' })
						]
					}),
					TabsContent({ value: 'photos', children: 'Photos content' }),
					TabsContent({ value: 'prototypes', children: 'Prototypes content' })
				]
			}
		});

		expect(screen.getByRole('tab', { name: 'Photos' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Prototypes' })).toBeInTheDocument();
	});

	it('switches tabs on click', async () => {
		const handleChange = vi.fn();
		render(Tabs, {
			props: {
				value: 'photos',
				onValueChange: handleChange,
				children: [
					TabsList({
						children: [
							TabsTrigger({ value: 'photos', children: 'Photos' }),
							TabsTrigger({ value: 'prototypes', children: 'Prototypes' })
						]
					})
				]
			}
		});

		const prototypesTab = screen.getByRole('tab', { name: 'Prototypes' });
		await fireEvent.click(prototypesTab);

		expect(handleChange).toHaveBeenCalledWith('prototypes');
	});

	it('supports keyboard navigation with arrow keys', async () => {
		render(Tabs, {
			props: {
				value: 'photos',
				children: [
					TabsList({
						children: [
							TabsTrigger({ value: 'photos', children: 'Photos' }),
							TabsTrigger({ value: 'prototypes', children: 'Prototypes' })
						]
					})
				]
			}
		});

		const photosTab = screen.getByRole('tab', { name: 'Photos' });
		photosTab.focus();
		await fireEvent.keyDown(photosTab, { key: 'ArrowRight' });

		// Prototypes tab should be focused
		expect(screen.getByRole('tab', { name: 'Prototypes' })).toHaveFocus();
	});
});
```

**Acceptance Criteria**:

- [ ] All card components use shadcn `Card`
- [ ] Person avatars use shadcn `Avatar` (with fallback initials)
- [ ] Progress bars use shadcn `Progress`
- [ ] Tabs use shadcn `Tabs` with keyboard navigation
- [ ] All card/avatar tests pass
- [ ] Accessibility audit shows ≥95 score

**Rollback Criteria**:

If Phase 5 causes:

- ❌ Card layouts break visually
- ❌ Avatar fallbacks don't work
- ❌ Tab keyboard navigation breaks
- ❌ More than 10% of component tests fail

---

### Phase 6: Advanced Enhancements (Low Impact, Low-Medium Effort) - Week 11-12

**Goal**: Optional enhancements and refinements

1. **Add Advanced Components**

   ```bash
   npx shadcn-svelte@latest add toast
   npx shadcn-svelte@latest add sonner
   npx shadcn-svelte@latest add skeleton
   npx shadcn-svelte@latest add tooltip
   ```

2. **Replace Toast System**
   - Replace custom `Toast` component with Sonner
   - **Outcome**: Better toast stacking, animations

3. **Add Loading States**
   - Use `Skeleton` for table/card loading states
   - **Outcome**: Better perceived performance

4. **Add Tooltips**
   - Add tooltips to icons, truncated text
   - **Outcome**: Better discoverability

5. **Final Refinements**
   - Review all components for consistency
   - Remove unused custom CSS
   - Update tests to match new component structure

**Estimated Impact**:

- **UX Improvement**: Better loading states, tooltips
- **Polish**: Consistent animations, transitions

#### Test Cases - Phase 6

**Unit Tests for Advanced Components**:

Create `src/tests/shadcn/phase6-toast.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { toast } from '$lib/components/ui/sonner';

describe('Toast Migration - Sonner', () => {
	it('displays toast notification', () => {
		toast.success('Operation completed successfully');

		expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
	});

	it('supports different toast variants', () => {
		toast.error('An error occurred');
		toast.warning('Warning message');
		toast.info('Information');

		expect(screen.getByText('An error occurred')).toBeInTheDocument();
		expect(screen.getByText('Warning message')).toBeInTheDocument();
		expect(screen.getByText('Information')).toBeInTheDocument();
	});

	it('auto-dismisses toasts after timeout', async () => {
		toast('Temporary message', { duration: 1000 });

		expect(screen.getByText('Temporary message')).toBeInTheDocument();

		// Wait for auto-dismiss
		await new Promise((resolve) => setTimeout(resolve, 1100));

		expect(screen.queryByText('Temporary message')).not.toBeInTheDocument();
	});
});
```

Create `src/tests/shadcn/phase6-skeleton.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { Skeleton } from '$lib/components/ui/skeleton';

describe('Skeleton Migration - Loading States', () => {
	it('renders skeleton placeholder', () => {
		const { container } = render(Skeleton, {
			props: { className: 'h-12 w-48' }
		});

		const skeleton = container.querySelector('[data-skeleton]');
		expect(skeleton).toBeInTheDocument();
		expect(skeleton).toHaveClass('h-12', 'w-48');
	});

	it('applies pulse animation', () => {
		const { container } = render(Skeleton);

		const skeleton = container.querySelector('[data-skeleton]');
		expect(skeleton).toHaveClass('animate-pulse');
	});
});
```

Create `src/tests/shadcn/phase6-tooltip.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { Tooltip, TooltipTrigger, TooltipContent } from '$lib/components/ui/tooltip';
import { Button } from '$lib/components/ui/button';

describe('Tooltip Migration', () => {
	it('shows tooltip on hover', async () => {
		render(Tooltip, {
			props: {
				children: [
					TooltipTrigger({
						children: Button({ children: 'Hover me' })
					}),
					TooltipContent({ children: 'Helpful tooltip text' })
				]
			}
		});

		const button = screen.getByRole('button', { name: 'Hover me' });
		await fireEvent.mouseEnter(button);

		await waitFor(() => {
			expect(screen.getByText('Helpful tooltip text')).toBeInTheDocument();
			expect(screen.getByRole('tooltip')).toBeInTheDocument();
		});
	});

	it('hides tooltip on mouse leave', async () => {
		render(Tooltip, {
			props: {
				children: [
					TooltipTrigger({ children: Button({ children: 'Button' }) }),
					TooltipContent({ children: 'Tooltip' })
				]
			}
		});

		const button = screen.getByRole('button');
		await fireEvent.mouseEnter(button);
		await fireEvent.mouseLeave(button);

		await waitFor(() => {
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
		});
	});
});
```

**Integration Tests**:

Update existing component tests to use Skeleton for loading states:

```typescript
// Example: PersonPhotosTab.test.ts
it('shows skeleton loading state while fetching photos', () => {
	render(PersonPhotosTab, { props: { personId: 'person-1' } });

	// Verify skeletons are shown during loading
	const skeletons = screen.getAllByTestId('photo-skeleton');
	expect(skeletons.length).toBeGreaterThan(0);
});
```

**Acceptance Criteria**:

- [ ] Toast system uses Sonner (better stacking and animations)
- [ ] Loading states use `Skeleton` component
- [ ] Tooltips use shadcn `Tooltip` with proper positioning
- [ ] All enhancements tested (unit + integration)
- [ ] No performance regressions
- [ ] All tests pass (100% pass rate)
- [ ] Accessibility audit shows ≥95 score
- [ ] Bundle size increase < 10KB

**How to Run Tests**:

```bash
# Phase 6 tests
npm run test -- src/tests/shadcn/phase6

# All shadcn tests (Phase 0-6)
npm run test -- src/tests/shadcn/

# Final regression test suite
make test

# Bundle size analysis
npm run build
du -h build/
```

**Rollback Criteria**:

If Phase 6 causes:

- ❌ Bundle size increases >10KB
- ❌ Toast notifications don't appear
- ❌ Skeleton loading states break layout
- ❌ Performance regressions (slower page loads)

---

## Testing Strategy Overview

### Test Organization

```
src/tests/shadcn/
├── installation.test.ts          # Phase 0: Installation verification
├── phase1-badge.test.ts           # Badge migration tests
├── phase1-button.test.ts          # Button migration tests
├── phase1-input.test.ts           # Input + Label migration tests
├── phase2-dialog.test.ts          # Dialog migration tests
├── phase2-alert-dialog.test.ts    # AlertDialog migration tests
├── phase3-select.test.ts          # Select migration tests
├── phase3-combobox.test.ts        # Combobox migration tests
├── phase3-form-validation.test.ts # Formsnap + Zod integration tests
├── phase4-table.test.ts           # Table migration tests
├── phase5-card.test.ts            # Card + Avatar migration tests
├── phase5-tabs.test.ts            # Tabs migration tests
├── phase6-toast.test.ts           # Toast/Sonner migration tests
├── phase6-skeleton.test.ts        # Skeleton loading state tests
└── phase6-tooltip.test.ts         # Tooltip migration tests
```

### Test Execution Commands

```bash
# Run all shadcn migration tests
npm run test -- src/tests/shadcn/

# Run phase-specific tests
npm run test -- src/tests/shadcn/phase1  # Foundation
npm run test -- src/tests/shadcn/phase2  # Dialogs
npm run test -- src/tests/shadcn/phase3  # Forms
npm run test -- src/tests/shadcn/phase4  # Tables
npm run test -- src/tests/shadcn/phase5  # Cards
npm run test -- src/tests/shadcn/phase6  # Advanced

# Run integration tests for specific components
npm run test -- src/tests/components/CategoryBadge.test.ts
npm run test -- src/tests/components/*Modal.test.ts
npm run test -- src/tests/routes/page.test.ts

# Watch mode during active migration
npm run test:watch -- src/tests/shadcn/phase1

# Full test suite (regression check)
make test

# Type checking
make typecheck

# Lint check
make lint
```

### Manual Testing Checklist

After each phase, manually verify:

**Visual Tests**:

- [ ] No visual regressions on key pages
- [ ] All variants render correctly (primary, secondary, destructive, etc.)
- [ ] Hover/focus states work properly
- [ ] Responsive design works on mobile (test at 375px, 768px, 1024px)

**Accessibility Tests**:

- [ ] Keyboard navigation works (Tab, Enter, ESC, Arrow keys)
- [ ] Screen reader announces elements correctly
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Lighthouse accessibility score ≥95

**Browser Compatibility**:

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest - macOS/iOS)

---

## Implementation Roadmap

### Timeline Overview

| Phase       | Duration      | Focus Area                        | Components Migrated      | Code Reduction   | Test Files        |
| ----------- | ------------- | --------------------------------- | ------------------------ | ---------------- | ----------------- |
| **Phase 0** | 2 hours       | Installation & Setup              | 1 test component         | 0 lines          | 1 test file       |
| **Phase 1** | 2 weeks       | Foundation (Button, Badge, Input) | 25+ instances            | ~400 lines       | 3 test files      |
| **Phase 2** | 2 weeks       | Dialogs & Modals                  | 15 modals                | ~800 lines       | 2 test files      |
| **Phase 3** | 2 weeks       | Forms & Selects                   | 10+ form controls        | ~400 lines       | 3 test files      |
| **Phase 4** | 2 weeks       | Tables & Data Display             | 5 tables                 | ~300 lines       | 1 test file       |
| **Phase 5** | 2 weeks       | Cards & Complex Components        | 10+ cards                | ~350 lines       | 2 test files      |
| **Phase 6** | 2 weeks       | Advanced Enhancements             | Toast, Skeleton, Tooltip | ~150 lines       | 3 test files      |
| **Total**   | **~12 weeks** | Full migration                    | **65+ components**       | **~2,400 lines** | **15 test files** |

### Migration Strategy

**Approach**: **Incremental Replacement**

- Migrate one domain at a time (e.g., start with Training, then Queues)
- Keep old components alongside new until fully tested
- Update tests incrementally
- Use feature flags for gradual rollout

**Testing Strategy**:

- Update component tests to use shadcn-svelte components
- Verify accessibility with screen readers
- Test keyboard navigation thoroughly
- Ensure no visual regressions

**Rollback Plan**:

- Keep custom components in `src/lib/components/legacy/` during transition
- Use import aliases to switch between old/new easily
- Each phase can be reverted independently

---

## Risk Assessment

### Low Risk

- **Button, Badge, Input replacements**: Straightforward, well-documented
- **AlertDialog for confirmations**: Direct pattern match
- **Progress bars**: Simple prop mapping

### Medium Risk

- **Table migrations**: May need custom column renderers
- **Form migrations with Formsnap**: Learning curve for new form library
- **Select/Combobox**: Backend data loading patterns need preserved

### High Risk

- **PersonDropdown**: Complex suggestion logic, may need wrapper component
- **DirectoryBrowser**: File tree may be too custom for shadcn components
- **Temporal timeline**: Highly specialized, unlikely to benefit from migration

### Mitigation Strategies

1. **Start with low-risk components** to build confidence
2. **Create custom wrapper components** for complex patterns (PersonDropdown)
3. **Keep specialized components custom** (timeline, bounding boxes, directory browser)
4. **Incremental testing** after each component migration
5. **A/B testing** for critical UX components (search, filters)

---

## Benefits Summary

### Developer Experience

- **Reduced maintenance**: Less custom CSS to maintain
- **Faster development**: Pre-built components for new features
- **Better documentation**: shadcn-svelte docs + examples
- **Type safety**: TypeScript-first components

### User Experience

- **Accessibility**: Automatic ARIA attributes, keyboard navigation
- **Consistency**: Unified design system
- **Performance**: Optimized animations, focus management
- **Mobile-friendly**: Better responsive defaults

### Code Quality

- **Less code**: ~2,400 lines of custom CSS/components removed
- **Better tests**: Easier to test with standard patterns
- **Svelte 5 runes**: Modern reactivity patterns
- **Tailwind CSS v4**: Modern styling approach

---

## Next Steps

### Immediate Actions (Pre-Migration)

1. **Review shadcn-svelte documentation**: Familiarize team with component APIs
2. **Audit current component usage**: Confirm inventory with code search
3. **Set up testing environment**: Ensure component tests work with shadcn-svelte
4. **Create migration branch**: `feature/shadcn-svelte-migration`

### Week 1 Kickoff

1. **Install shadcn-svelte**: Run init command, configure Tailwind
2. **Add Button, Badge, Input**: First three components
3. **Create demo page**: Test new components in isolation
4. **Update 5 components**: Quick wins (StatusBadge, simple buttons)
5. **Team review**: Gather feedback before proceeding

### Success Criteria

- [ ] All existing tests pass with new components
- [ ] No visual regressions (screenshot comparison)
- [ ] Accessibility score maintained or improved (Lighthouse)
- [ ] Component bundle size does not increase significantly
- [ ] Developer velocity increases (faster to add new UI features)

---

## Appendix: Component Complexity Matrix

### Complexity Scoring

- **Low** (1-2 points): Simple prop passing, minimal logic
- **Medium** (3-5 points): State management, event handling, moderate logic
- **High** (6+ points): Complex state, animations, custom rendering

| Component                    | Complexity | Lines of Code | Migration Effort  | Priority |
| ---------------------------- | ---------- | ------------- | ----------------- | -------- |
| `CategoryBadge`              | Low (1)    | 69            | Low               | High     |
| `training/StatusBadge`       | Low (1)    | 86            | Low               | High     |
| `training/ProgressBar`       | Low (2)    | 53            | Low               | Medium   |
| `Toast`                      | Low (2)    | 79            | Low               | High     |
| `SearchBar`                  | Low (2)    | 127           | Low               | High     |
| `DeleteConfirmationModal`    | Medium (3) | ~200          | Low               | Medium   |
| `CategorySelector`           | Medium (3) | 143           | Medium            | Medium   |
| `PersonCard`                 | Medium (3) | 207           | Low               | High     |
| `ClusterCard`                | Medium (4) | ~250          | Low               | High     |
| `LabelClusterModal`          | Medium (4) | 480           | Medium            | High     |
| `JobsTable`                  | Medium (4) | 191           | Medium            | High     |
| `QueueJobsTable`             | Medium (4) | 211           | Medium            | High     |
| `PersonDropdown`             | High (7)   | 653           | High              | High     |
| `FiltersPanel`               | High (6)   | 577           | High              | High     |
| `TemporalTimeline`           | High (8)   | ~400          | N/A (keep custom) | N/A      |
| `ImageWithFaceBoundingBoxes` | High (7)   | ~300          | N/A (keep custom) | N/A      |
| `DirectoryBrowser`           | High (6)   | ~250          | N/A (keep custom) | N/A      |

---

## Conclusion

The migration to shadcn-svelte represents a **high-value, medium-effort investment** that will:

1. **Reduce custom code** by ~2,400 lines (15% of component codebase)
2. **Improve accessibility** with automatic ARIA attributes and keyboard navigation
3. **Accelerate development** with pre-built, well-documented components
4. **Enhance consistency** across the entire application
5. **Future-proof the UI** with modern Svelte 5 patterns

**Recommendation**: **Proceed with phased migration starting immediately.** Begin with Phase 1 (Foundation) to validate approach, then continue through Phase 5. Phase 6 (Advanced Enhancements) can be evaluated based on Phase 1-5 outcomes.

**Expected Total Duration**: **~12 weeks** (Phase 0: 2 hours + Phases 1-6: 12 weeks)

**Risk Level**: **Low-Medium** (mostly low-risk replacements with a few medium-risk complex components)

**ROI**: **High** (long-term maintenance savings + improved UX + faster feature development)

---

## Summary of Changes in This Amendment

### Phase 0: Installation & Setup (NEW)

**Added comprehensive installation phase** before Phase 1 migration work begins:

1. **Prerequisites Check**: Verify Node.js, dependencies, Tailwind v4 setup
2. **Installation Steps**:
   - Run `shadcn-svelte init` with Tailwind v4 support
   - Update `vite.config.ts` with `@tailwindcss/vite` plugin
   - Create `src/app.css` with Tailwind v4 imports (`@import "tailwindcss"`)
   - Update `+layout.svelte` to import global CSS
   - Install utilities (`clsx`, `tailwind-merge`, `tw-animate-css`)
3. **Verification Checklist**: 11-point checklist before proceeding to Phase 1
4. **Test Cases**:
   - Unit tests for Button component
   - Manual visual verification tests
   - Build and regression tests
5. **Rollback Plan**: Clear steps to revert if installation fails
6. **Success Criteria**: 6 checkpoints to confirm Phase 0 completion

**Duration**: 2 hours (30min install + 30min config + 1hr testing)

### Test Cases Added to Each Phase

**Phase 1: Foundation**

- Badge migration tests (3 test cases)
- Button migration tests (4 test cases)
- Input + Label migration tests (3 test cases)
- Integration tests for search page
- Accessibility audit requirements
- **15 test files total across all phases**

**Phase 2: Dialogs & Modals**

- Dialog migration tests (ESC, backdrop, focus management)
- AlertDialog tests (destructive actions)
- Integration tests for CategoryCreateModal
- Focus trapping verification
- Keyboard navigation tests

**Phase 3: Forms & Selects**

- Select migration tests (options, keyboard nav)
- Combobox tests (filtering, search-as-you-type)
- Formsnap + Zod validation tests
- Integration tests for FiltersPanel

**Phase 4: Tables & Data Display**

- Table component tests (semantic HTML)
- Pagination tests
- Integration tests for JobsTable
- Responsive design verification

**Phase 5: Cards & Complex Components**

- Card component tests (header, content, footer)
- Avatar tests (image, fallback)
- Tabs tests (keyboard navigation, arrow keys)
- Integration tests for PersonCard

**Phase 6: Advanced Enhancements**

- Toast/Sonner tests (auto-dismiss, variants)
- Skeleton loading state tests
- Tooltip tests (hover, positioning)
- Bundle size analysis

### Testing Strategy Overview (NEW)

Added comprehensive testing strategy section:

- **Test Organization**: 15 test files in `src/tests/shadcn/` directory
- **Test Execution Commands**: Phase-specific and full suite commands
- **Manual Testing Checklist**: Visual, accessibility, browser compatibility
- **Acceptance Criteria**: Phase-specific completion checkpoints
- **Rollback Criteria**: Clear triggers for reverting each phase

### Updated Timeline

| Phase   | Duration | Test Files | Acceptance Criteria                    |
| ------- | -------- | ---------- | -------------------------------------- |
| Phase 0 | 2 hours  | 1          | 11-point checklist, 6 success criteria |
| Phase 1 | 2 weeks  | 3          | 10-point checklist                     |
| Phase 2 | 2 weeks  | 2          | 9-point checklist                      |
| Phase 3 | 2 weeks  | 3          | 8-point checklist                      |
| Phase 4 | 2 weeks  | 1          | 7-point checklist                      |
| Phase 5 | 2 weeks  | 2          | 6-point checklist                      |
| Phase 6 | 2 weeks  | 3          | 8-point checklist                      |

**Total**: ~12 weeks + 2 hours initial setup

### Key Improvements

1. **Phase 0 prevents migration failures** by ensuring shadcn-svelte is properly installed before any component work begins
2. **Test cases ensure quality** at each phase with specific unit, integration, and accessibility tests
3. **Clear acceptance criteria** define when each phase is truly complete
4. **Rollback criteria** provide safety nets if issues arise
5. **Testing strategy** provides systematic approach to verification

### Next Steps

To begin migration:

1. **Review Phase 0** - Understand installation requirements
2. **Schedule Installation** - Allocate 2 hours for Phase 0
3. **Run Installation** - Follow Phase 0 step-by-step guide
4. **Verify Completion** - Check all 11 items in verification checklist
5. **Proceed to Phase 1** - Only after Phase 0 success criteria met

---

## Document Metadata

**Last Updated**: 2026-01-06
**Version**: 2.0 (Amended with Phase 0 and Test Cases)
**Changes**:

- Added Phase 0: Installation & Setup
- Added test cases for all phases (Phases 1-6)
- Added Testing Strategy Overview section
- Updated Timeline Overview with test file counts
- Added acceptance criteria and rollback criteria for each phase

**Original Analysis Date**: 2026-01-06
**Amendment Date**: 2026-01-06
**Maintained By**: AI Assistants + Human Developers
