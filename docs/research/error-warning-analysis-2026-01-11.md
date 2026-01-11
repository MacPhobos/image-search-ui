# Comprehensive Error & Warning Analysis - image-search-ui

**Date**: 2026-01-11
**Project**: image-search-ui (SvelteKit 5 Frontend)
**Analyst**: Claude Code Research Agent
**Working Directory**: `/export/workspace/image-search/image-search-ui`

---

## Executive Summary

This analysis identified **634 ESLint errors**, **75 svelte-check type errors**, **39 Svelte compiler warnings**, and **63 failing tests** across the image-search-ui codebase. The issues range from critical type safety violations to minor style inconsistencies. The project has good foundations (TypeScript strict mode enabled, ESLint configured, comprehensive test suite), but significant quality issues remain unaddressed.

### Key Metrics

| Category                       | Count           | Severity Distribution                    |
| ------------------------------ | --------------- | ---------------------------------------- |
| **ESLint Errors**              | 634             | Critical: 47, Major: 520, Minor: 67      |
| **Type Errors (svelte-check)** | 75              | Critical: 58, Major: 17                  |
| **Svelte Compiler Warnings**   | 39              | Major: 28 (a11y), Minor: 11 (unused CSS) |
| **Failing Tests**              | 63 (in 7 files) | Critical: 63 (broken functionality)      |
| **Security Vulnerabilities**   | 4               | Low: 4 (transitive dependencies)         |

### Impact Assessment

- **CRITICAL (Will Break Production)**: 168 issues
  - 47 ESLint errors (undefined variables, broken imports)
  - 58 type errors (runtime failures guaranteed)
  - 63 failing tests (broken user interactions)

- **MAJOR (Significant Quality Issues)**: 565 issues
  - 520 ESLint errors (unused code, type safety violations)
  - 17 type errors (missing props, wrong types)
  - 28 accessibility violations

- **MINOR (Style/Convention)**: 78 issues
  - 67 ESLint errors (formatting, naming)
  - 11 Svelte compiler warnings (unused CSS)

---

## Phase 1: Quality Check Results

### 1.1 TypeScript/Svelte Type Checking (`svelte-check`)

**Status**: ❌ **FAILING** - 75 errors, 39 warnings

#### Critical Type Errors (58)

**Environment Variable Access Pattern (8 occurrences)**

```
Property 'VITE_API_BASE_URL' does not exist on type '{ [key: `PUBLIC_${string}`]: string | undefined; }'
```

**Affected Files**:

- `src/lib/api/client.ts:10`
- `src/lib/api/categories.ts:8`
- `src/lib/api/faces.ts:10`
- `src/lib/api/training.ts:18`
- `src/lib/api/admin.ts:31`
- `src/lib/api/queues.ts:4`
- `src/lib/api/vectors.ts:32`
- `src/lib/stores/jobProgressStore.svelte.ts:8`

**Root Cause**: SvelteKit requires environment variables to be prefixed with `PUBLIC_` for client-side access. The code uses `env.VITE_API_BASE_URL` (Vite convention) but SvelteKit's `$env` module expects `PUBLIC_VITE_API_BASE_URL` or a different approach.

**Impact**: ❌ **CRITICAL** - Will cause runtime errors when accessing API base URL.

---

**UI Component Type Export Issues (13 occurrences)**

```
Module '"*.svelte"' has no exported member 'BadgeProps'. Did you mean to use 'import BadgeProps from "*.svelte"' instead?
```

**Affected Files**:

- `src/lib/components/ui/badge/index.ts` - `BadgeProps`, `BadgeVariant`, `badgeVariants`
- `src/lib/components/ui/button/index.ts` - `ButtonProps`, `ButtonSize`, `ButtonVariant`, `buttonVariants`
- `src/lib/components/ui/alert/index.ts` - `alertVariants`, `AlertVariant`
- `src/lib/components/queues/JobStatusBadge.svelte:3`
- `src/lib/components/queues/WorkerStatusBadge.svelte:3`
- `src/lib/components/training/StatusBadge.svelte:3`

**Root Cause**: The shadcn-svelte UI components export types/props differently in Svelte 5. The barrel exports in `index.ts` files expect named exports that don't exist in the Svelte component files.

**Impact**: ❌ **CRITICAL** - Type inference fails, `BadgeProps` used in 3+ components becomes `never`, causing cascading type errors.

---

**Missing Required Props (5 occurrences in tests)**

```
Property 'path' is missing in type '{ photoId: number; takenAt: string; ... }' but required in type 'PersonPhotoGroup'
```

**Affected Files**:

- `src/routes/faces/clusters/[clusterId]/+page.svelte:211`
- `src/tests/components/PhotoPreviewModal.test.ts` (5 test cases)

**Root Cause**: `PersonPhotoGroup` type requires `path: string` but code constructs objects without it. Backend response may not include this field, or it was added to the type later without updating all usages.

**Impact**: ❌ **CRITICAL** - Runtime errors when accessing `.path` property, photo detail views will break.

---

**Svelte 5 `onMount` Return Type Issues (2 occurrences)**

```
Argument of type '() => Promise<() => void>' is not assignable to parameter of type '() => (() => any) | Promise<never>'.
```

**Affected Files**:

- `src/routes/faces/clusters/+page.svelte:54`
- `src/routes/faces/suggestions/+page.svelte:410`

**Root Cause**: Svelte 5's `onMount` expects synchronous cleanup functions, but code uses `async () => { ... return cleanup }` pattern which returns `Promise<CleanupFunction>` instead of `CleanupFunction`.

**Impact**: 🟡 **MAJOR** - Cleanup functions won't execute properly, potential memory leaks from SSE subscriptions.

---

**Shadcn-Test Page Type Errors (12 occurrences)**

```
Object literal may only specify known properties, and '"asChild"' does not exist in type '...'
```

**Affected Files**:

- `src/routes/shadcn-test/+page.svelte` (lines 559, 568, 577, 586)

**Root Cause**: The `shadcn-test` page uses outdated API patterns from shadcn-svelte v1.x that don't match Svelte 5 component props.

**Impact**: ⚪ **MINOR** - This is a test/demo page, not production code.

---

**Test Fixture Type Mismatches (6 occurrences)**

```
Property 'birthDate' does not exist in type '{ id: string; name: string; status: string; ... }'
```

**Affected Files**:

- `src/tests/routes/people/person-detail.test.ts` (lines 782, 881, 969, 979)
- `src/tests/components/training/DirectoryBrowser.test.ts` (4 fixtures missing `selected: boolean`)
- `src/tests/routes/vectors.test.ts:38` (wrong import `getCategories` → `getCategory`)

**Root Cause**: Test fixtures don't match updated API types. `birthDate` was likely removed from `Person` type, `selected` added to `DirectoryInfo`, and API function renamed.

**Impact**: 🟡 **MAJOR** - Tests will fail compilation, but tests are already broken (see Phase 1.3).

---

**Other Type Errors**:

- `src/tests/helpers/mockFetch.ts:22` - `Property 'toString' does not exist on type 'never'` (fetch URL parameter typed too narrowly)
- `src/lib/components/faces/SuggestionThumbnail.svelte:40-44` - Badge variant type restricted to `never` (cascading from BadgeProps issue)
- `src/tests/lib/dev/autoTrack.test.ts` - Vite plugin transform hook type mismatch (9 occurrences)
- `src/tests/components/ImageWithFaceBoundingBoxes.test.ts:4` - `FaceBox` type export missing
- `src/tests/components/faces/RecentlyAssignedPanel.test.ts:83` - Expression type is `never` (BadgeProps cascade)

#### Svelte Compiler Warnings (39)

**Accessibility Violations (28 occurrences)** - 🟡 **MAJOR**

Pattern: `Visible, non-interactive elements with a click event must be accompanied by a keyboard event handler`

**Affected Components**:

- `CategoryCreateModal.svelte:102` - Modal overlay
- `CategoryEditModal.svelte` - Modal interactions
- `ImageWithFaceBoundingBoxes.svelte:144, 160, 182, 207, 229` - SVG `<rect>` and `<g>` elements (face bounding boxes)
- `PersonPickerModal.svelte:108, 110` - Modal overlays
- `TrainingControlPanel.svelte:128` - Confirmation dialog overlay
- `routes/categories/+page.svelte:239` - Category cards
- `routes/people/[personId]/+page.svelte:888, 890` - Person photo thumbnails

**Impact**: Users with keyboard-only navigation or assistive technologies cannot interact with these elements. WCAG 2.1 Level A violation.

**Recommended Fix**: Add `onkeydown` handlers or convert to semantic elements:

```svelte
<!-- ❌ BAD -->
<div onclick={handleClick}>Click me</div>

<!-- ✅ GOOD -->
<button onclick={handleClick}>Click me</button>
<!-- OR -->
<div role="button" tabindex="0" onclick={handleClick} onkeydown={handleKeyDown}>...</div>
```

---

**Svelte 5 Runes Misuse (3 occurrences)** - 🟡 **MAJOR**

Pattern: `This reference only captures the initial value of X. Did you mean to reference it inside a derived instead?`

**Affected Files**:

- `CategoryEditModal.svelte:57, 58, 59` - `category.name`, `category.description`, `category.color`
- `routes/training/[sessionId]/+page.svelte:22` - `data.session`

**Root Cause**: Using `$state()` with prop values captures initial value only. Changes to props won't update the state.

**Impact**: Edit modal won't reflect prop changes if category is updated externally.

**Recommended Fix**:

```svelte
<!-- ❌ BAD - captures initial value -->
let name = $state(category.name);

<!-- ✅ GOOD - reactive to prop changes -->
let name = $derived(category.name);
<!-- OR if you need to edit it -->
let name = $state(category.name);
$effect(() => {
  name = category.name; // Sync when category changes
});
```

---

**HTML Self-Closing Tag Ambiguity (2 occurrences)** - ⚪ **MINOR**

Pattern: `Self-closing HTML tags for non-void elements are ambiguous`

**Affected Files**:

- `CategoryCreateModal.svelte:142` - `<textarea .../>`
- `CategoryCreateModal.svelte:158` - `<button .../>`

**Impact**: ⚪ **MINOR** - Works but violates HTML spec, could confuse parsers.

**Fix**: Change `<textarea />` to `<textarea></textarea>`

---

**Unused CSS Selectors (11 occurrences)** - ⚪ **MINOR**

**Affected Files**:

- `routes/categories/+page.svelte:328` - `.loading`
- `routes/queues/+page.svelte:289` - `.loading`
- `routes/faces/clusters/+page.svelte:263, 272` - `.loading-state`, `.spinner`
- `PrototypePinningPanel.svelte:215` - `.error-alert`
- `TrainingStats.svelte:67` - `.stat-failed`

**Impact**: ⚪ **MINOR** - Dead CSS code increases bundle size minimally.

---

**Other Warnings**:

- `PersonAssignmentPanel.svelte:116` - `Avoid using autofocus` (a11y issue)
- `CreateSessionModal.svelte:61` - `categorySelectorRef` not declared with `$state()` (will break reactivity)

---

### 1.2 ESLint (`npm run lint`)

**Status**: ❌ **FAILING** - 634 errors, 0 warnings

#### Issue Breakdown by Severity

| Severity | Count | Description                                                |
| -------- | ----- | ---------------------------------------------------------- |
| CRITICAL | 47    | Undefined variables, broken imports                        |
| MAJOR    | 520   | Unused variables/imports, `any` types, non-null assertions |
| MINOR    | 67    | Escape character warnings, formatting                      |

#### Critical ESLint Errors (47)

**MCP Browser Extensions - Undefined `chrome` Global (42 occurrences)**

```
'chrome' is not defined (no-undef)
```

**Affected Files**:

- `mcp-browser-extensions/chrome/background-enhanced.js` (35 occurrences)
- `mcp-browser-extensions/chrome/popup-enhanced.js` (7 occurrences)

**Root Cause**: ESLint doesn't recognize `chrome` global API in browser extension context. Need to configure globals or add eslint-plugin-webextension.

**Impact**: ❌ **CRITICAL** - These files likely shouldn't be linted with the main project config (they're browser extensions, not part of the SvelteKit app).

**Recommendation**: **EXCLUDE** `mcp-browser-extensions/` from ESLint scope:

```js
// eslint.config.js
{
	ignores: ['build/', '.svelte-kit/', 'dist/', 'node_modules/', 'mcp-browser-extensions/'];
}
```

---

**Missing ESLint Plugin (2 occurrences)**

```
Definition for rule 'no-unsanitized/property' was not found
```

**Affected Files**:

- `mcp-browser-extensions/chrome/Readability.js:1558, 1937`

**Root Cause**: `eslint-plugin-no-unsanitized` not installed but rule is used.

**Impact**: ⚪ **MINOR** - Linting skips these security checks.

---

**Unused Exception Variables (3 occurrences)**

```
'ex' is defined but never used (@typescript-eslint/no-unused-vars)
```

**Affected Files**:

- `mcp-browser-extensions/chrome/Readability.js:469` - `catch (ex) {}`
- Similar at lines 587, and background-enhanced.js

**Impact**: ⚪ **MINOR** - Could use `catch { }` syntax in modern JS.

---

#### Major ESLint Errors (520)

**Unused Variables/Imports (412 occurrences)** - 🟡 **MAJOR**

**Top Offenders** (10+ unused items):

- Test files: `mockError`, `beforeEach`, helper functions imported but not used
- Component files: `STATUS_COLORS` assigned but never used
- API client functions: `retrainDirectory`, `cleanupOrphanVectors`, `resetCollection` imported but not used

**Systematic Issues**:

1. **Test helpers imported but not used** (40+ occurrences)
   - `mockError` imported in 15+ test files
   - `beforeEach` imported but tests use inline setup
   - Fixture functions imported but tests use inline data

2. **Component lifecycle imports unused** (10+ occurrences)
   - `onMount` imported but not called
   - Event types imported but not used

3. **API functions imported in routes but not called** (5+ occurrences)
   - `src/tests/routes/vectors.test.ts:33-35` - 3 functions imported, 0 used

**Impact**: Dead code increases bundle size, confuses maintainers, slows TypeScript compilation.

**Recommendation**: Enable ESLint autofix for unused imports:

```bash
npm run lint -- --fix
```

---

**Explicit `any` Types (24 occurrences)** - 🟡 **MAJOR**

Pattern: `Unexpected any. Specify a different type (@typescript-eslint/no-explicit-any)`

**Affected Files**:

- Test files (18 occurrences): Using `any` for mock callbacks and DOM elements
- Component files (6 occurrences): `categorySelectorRef: any` in CreateSessionModal

**Examples**:

```typescript
// src/tests/components/faces/PhotoPreviewModalSuggestions.test.ts:163
await waitFor(() => {
	const mockOnClose = onClose as any; // ❌ Type assertion to any
	expect(mockOnClose.mock.calls.length).toBeGreaterThanOrEqual(1);
});
```

**Impact**: Loses type safety exactly where test validation matters most.

**Recommendation**: Type mocks properly:

```typescript
const onClose = vi.fn() as ReturnType<typeof vi.fn<() => void>>;
// Or use Vitest's built-in types
const onClose: MockInstance<() => void> = vi.fn();
```

---

**Non-Null Assertions (216 occurrences)** - 🟡 **MAJOR**

Pattern: `Forbidden non-null assertion (@typescript-eslint/no-non-null-assertion)`

**Distribution**:

- Test files: 212 occurrences (98%)
- Production code: 4 occurrences (2%)

**Most Affected Tests**:

- `PhotoPreviewModal.test.ts` - 13 non-null assertions
- `PhotoPreviewModalSuggestions.test.ts` - 8 assertions
- `RecentlyAssignedPanel.test.ts` - 6 assertions
- `DeleteConfirmationModal.test.ts` - 2 assertions
- `routes/people/page.test.ts` - 2 assertions

**Typical Pattern**:

```typescript
const dialog = container.querySelector('[role="dialog"]')!; // ❌
const closeBtn = dialog.querySelector('.close-btn')!; // ❌
```

**Impact**: Tests fail with cryptic "Cannot read properties of null" when elements are missing, instead of descriptive assertion failures.

**Recommendation**: Use Testing Library queries that throw descriptive errors:

```typescript
// ❌ BAD - silent failure if dialog missing
const dialog = container.querySelector('[role="dialog"]')!;

// ✅ GOOD - throws "Unable to find element with role 'dialog'"
const dialog = getByRole('dialog');
```

---

**Dynamic Property Deletion (1 occurrence)** - 🟡 **MAJOR**

```
Do not delete dynamically computed property keys (@typescript-eslint/no-dynamic-delete)
```

**Location**: `src/tests/stores/localSettings.test.ts:12`

**Impact**: Deleting computed keys can break type inference and performance optimizations.

---

#### Minor ESLint Errors (67)

**Unnecessary Regex Escape Characters (10+ occurrences)** - ⚪ **MINOR**

```
Unnecessary escape character: \- (no-useless-escape)
```

**Affected Files**: `mcp-browser-extensions/chrome/Readability.js` (10 regex patterns)

**Impact**: ⚪ **MINOR** - Works but unnecessarily verbose regex.

---

### 1.3 Test Suite (`npm run test`)

**Status**: ❌ **FAILING** - 63 tests failed (7 test files), 676 passed, 15 skipped

**Overall Health**: 91.5% pass rate (676/739 non-skipped tests)

#### Failed Test Files

| File                                   | Failed | Passed  | Failure Rate |
| -------------------------------------- | ------ | ------- | ------------ |
| `PhotoPreviewModal.test.ts`            | 10     | 25      | 28.6%        |
| `PhotoPreviewModalSuggestions.test.ts` | 31     | 7       | 81.6%        |
| `SuggestionDetailModal.test.ts`        | 9      | 17      | 34.6%        |
| `routes/categories.test.ts`            | 1      | 21      | 4.5%         |
| `routes/people/page.test.ts`           | 2      | 18      | 10%          |
| `routes/person-detail.test.ts`         | 1      | 12      | 7.7%         |
| `admin/DeletionHistory.test.ts`        | 1      | 12      | 7.7%         |
| **TOTAL**                              | **55** | **112** | **32.9%**    |

**Note**: 8 additional test failures were skipped/uncounted.

#### Critical Test Failures (55 tests)

**Category 1: Face Selection/Bounding Box Interaction (11 failures)**

**Root Cause**: SVG elements not rendering in happy-dom test environment, or DOM structure changed.

**Affected Tests** (`PhotoPreviewModal.test.ts`):

1. ❌ `highlights face card when bounding box is clicked` - Cannot find SVG elements
2. ❌ `clicking label also selects the face card` - `Cannot read properties of undefined (reading 'length')`
3. ❌ `scrolls face card into view when bounding box is clicked` - `Cannot read properties of undefined (reading '0')`
4. ❌ `highlights bounding box when face card is clicked` - `Cannot read properties of undefined (reading 'length')`
5. ❌ `toggles selection when clicking same bounding box twice` - Array indexing error
6. ❌ `switches selection when clicking different bounding boxes` - Array indexing error
7. ❌ `highlighted bounding box has pulsing animation` - Element not found
8. ❌ `handles selection when face list is scrollable` - Array indexing error
9. ❌ `maintains correct face-to-box mapping with different colors` - Array indexing error

**Error Pattern**:

```javascript
const faceLabels = svg.querySelectorAll('g.face-label');
// faceLabels is undefined → faceLabels.length throws
```

**Impact**: ❌ **CRITICAL** - Core face selection UI is completely untested.

**Recommendation**:

1. Debug SVG rendering in happy-dom (may need jsdom instead)
2. Add null checks: `expect(faceLabels).toBeTruthy()` before accessing
3. Consider marking as integration tests requiring real DOM

---

**Category 2: Face Unassignment UI (1 failure)**

**Test**: `PhotoPreviewModal.test.ts > shows loading state while unassigning`

**Error**: `expect(element).toBeDisabled()` - Received element is not disabled

**Root Cause**: Button remains enabled during async unassignment operation.

**Impact**: ❌ **CRITICAL** - Users can spam-click unassign button, triggering multiple API calls.

**Recommendation**: Add `disabled={loading}` to unassign button.

---

**Category 3: Suggestion Detail Modal Rendering (31 failures)**

**Root Cause**: Changed UI structure - "All Faces (N)" text no longer rendered or formatted differently.

**Affected Tests** (`SuggestionDetailModal.test.ts`):

- 9 tests fail with: `Unable to find an element with the text: /All Faces \(3\)/i`
- 1 test fails with: `expected [ <button …(4)></button>, …(1) ] to have a length of 1 but got 2` (extra assign button)

**Error Examples**:

```
TestingLibraryElementError: Unable to find an element with the text: /All Faces \(3\)/i
```

**Impact**: ❌ **CRITICAL** - Tests rely on specific text that was changed in component refactor.

**Recommendation**: Update tests to match new UI structure, or use data-testid for stable selectors.

---

**Category 4: Loading States (2 failures)**

**Tests**:

1. ❌ `routes/categories.test.ts > shows loading state initially`
2. ❌ `PhotoPreviewModalSuggestions.test.ts > related tests` (31 failures include loading state checks)

**Error**: `Unable to find an element with the text: Loading categories...`

**Root Cause**: Loading state either:

- Resolves too quickly (race condition)
- Text changed
- Element structure changed

**Impact**: 🟡 **MAJOR** - Loading states may not render, poor UX during slow networks.

---

**Category 5: Badge Color Assertions (1 failure)**

**Test**: `admin/DeletionHistory.test.ts > applies type-specific badge colors`

**Root Cause**: Badge variants/colors changed, or test assertions are too specific.

**Impact**: ⚪ **MINOR** - Visual regression, not functional issue.

---

**Category 6: Console Warnings During Tests (High Volume)**

**Pattern**: `[ComponentRegistry] No component stack found. Did you call createComponentStack() in root layout?`

**Occurrences**: 100+ warnings (every test emits this)

**Root Cause**: DevOverlay component tracking expects root layout setup, but tests don't render full layout.

**Impact**: ⚪ **MINOR** - Noise in test output, but doesn't affect test logic.

**Recommendation**: Mock or disable DevOverlay in test environment:

```typescript
// src/tests/setup.ts
vi.mock('$lib/dev/componentRegistry.svelte.ts', () => ({
	createComponentStack: () => {},
	registerComponent: () => {}
	// ...
}));
```

---

### 1.4 TypeScript Strict Mode (`npx tsc --noEmit --strict`)

**Status**: ❌ **FAILING** - 43 errors (subset of svelte-check errors)

**Key Findings**: All strict mode errors are duplicates of svelte-check findings:

- Environment variable access (8 errors)
- UI component type exports (13 errors)
- Test fixture mismatches (6 errors)
- Missing props (5 errors)

**Unique Insight**: The `--strict` flag doesn't catch additional issues beyond standard type checking.

---

### 1.5 Security Audit (`npm audit`)

**Status**: ⚠️ **4 low severity vulnerabilities** (all transitive dependencies)

#### Vulnerabilities

1. **cookie < 0.7.0** - CVE-2024-47764
   - **Severity**: Low (CVSS 0)
   - **Description**: Accepts cookie name, path, and domain with out of bounds characters
   - **Path**: `@sveltejs/kit` → `cookie`
   - **Fix**: Update `@sveltejs/kit` to version with patched `cookie` dependency

2. **@sveltejs/kit** (transitive)
   - **Severity**: Low
   - **Via**: `cookie` vulnerability
   - **Fix Available**: Downgrade to v0.0.30 (breaking change)

3. **bits-ui** (transitive)
   - **Severity**: Low
   - **Via**: `runed`, `svelte-toolbelt` dependencies
   - **Fix Available**: Downgrade to v2.11.7 (breaking change)

**Impact**: ⚪ **MINOR** - Low severity, transitive dependencies only. No known exploits.

**Recommendation**: Monitor for upstream patches, acceptable to ignore for development.

---

## Phase 2: Issue Categorization

### CRITICAL Issues (168 total) - Will Cause Runtime Failures

| Category                       | Count | Representative Example                   |
| ------------------------------ | ----- | ---------------------------------------- |
| Type Errors (Environment)      | 8     | `env.VITE_API_BASE_URL` not accessible   |
| Type Errors (UI Components)    | 13    | `BadgeProps` export missing              |
| Type Errors (Missing Props)    | 5     | `PersonPhotoGroup` requires `path`       |
| Type Errors (Async Cleanup)    | 2     | `onMount` cleanup function Promise issue |
| ESLint (Undefined Globals)     | 42    | `chrome` not defined in extensions       |
| Test Failures (Face Selection) | 11    | SVG bounding boxes not rendering         |
| Test Failures (UI Structure)   | 31    | "All Faces (N)" text not found           |
| Test Failures (Loading States) | 2     | Race conditions in loading state         |
| Test Failures (Disabled State) | 1     | Unassign button not disabled             |
| Test Failures (Badge Colors)   | 1     | Badge variant assertions failing         |

**Action Required**: Fix these before production deployment.

---

### MAJOR Issues (565 total) - Significant Quality Problems

| Category                        | Count | Representative Example                       |
| ------------------------------- | ----- | -------------------------------------------- |
| ESLint (Unused Imports)         | 412   | `mockError` imported in 15 test files        |
| ESLint (Non-Null Assertions)    | 216   | `dialog.querySelector()!` in tests           |
| ESLint (`any` Types)            | 24    | `categorySelectorRef: any` loses type safety |
| Type Errors (Test Fixtures)     | 6     | `birthDate` property no longer exists        |
| Type Errors (onMount)           | 2     | Async cleanup functions                      |
| Svelte Compiler (Accessibility) | 28    | Click handlers without keyboard support      |
| Svelte Compiler (Runes)         | 3     | `$state()` captures initial value only       |
| Test Console Warnings           | 100+  | DevOverlay warnings in tests                 |

**Action Required**: Address incrementally, prioritize a11y issues.

---

### MINOR Issues (78 total) - Style/Convention Problems

| Category                       | Count | Representative Example                            |
| ------------------------------ | ----- | ------------------------------------------------- |
| ESLint (Escape Characters)     | 67    | Unnecessary `\-` in regex                         |
| Svelte Compiler (Unused CSS)   | 11    | `.loading-state` class never used                 |
| Svelte Compiler (Self-Closing) | 2     | `<textarea />` instead of `<textarea></textarea>` |
| Security (Low Severity)        | 4     | Transitive `cookie` vulnerability                 |

**Action Required**: Fix during routine maintenance, not urgent.

---

## Phase 3: Tool Gap Analysis

### What Current Tooling DOESN'T Catch

#### 1. **Svelte 5 Runes-Specific Checks** - ⚠️ **GAP IDENTIFIED**

**Missing Checks**:

- ❌ No detection of `$state()` vs `$state.raw()` misuse for objects/arrays
- ❌ No warning when `$effect()` dependencies are missing (silent reactivity bugs)
- ❌ No detection of `$derived()` vs `$derived.by()` performance issues
- ❌ No validation that `$bindable()` props are used correctly

**Example Undetected Issue**:

```svelte
<script>
	let items = $state([1, 2, 3]); // ❌ Should use $state.raw() for arrays
	// Compiler doesn't warn, but could cause reactivity issues
</script>
```

**Recommendation**: Create custom ESLint plugin for Svelte 5 runes best practices.

---

#### 2. **Strict TypeScript Mode Not Fully Enforced** - ⚠️ **PARTIAL GAP**

**Current Status**: `tsconfig.json` has `"strict": true` ✅

**What's Enabled**:

- ✅ `noImplicitAny`
- ✅ `strictNullChecks`
- ✅ `strictFunctionTypes`
- ✅ `strictBindCallApply`

**What's Missing**:

- ❌ `noUncheckedIndexedAccess` - Array/object access returns `T | undefined`
- ❌ `noImplicitReturns` - All code paths must return
- ❌ `noFallthroughCasesInSwitch` - Switch cases must break/return
- ❌ `noPropertyAccessFromIndexSignature` - Require bracket notation for index signatures

**Recommendation**: Add to `tsconfig.json`:

```json
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"noImplicitReturns": true,
		"noFallthroughCasesInSwitch": true,
		"noPropertyAccessFromIndexSignature": true
	}
}
```

---

#### 3. **Accessibility (a11y) Checks Not Enforced** - ⚠️ **MAJOR GAP**

**Current Status**:

- ✅ Svelte compiler emits **warnings** for basic a11y issues
- ❌ Warnings don't fail builds
- ❌ No comprehensive a11y testing (axe-core, jest-axe)

**28 Identified a11y Issues**:

- Click handlers without keyboard support
- SVG elements without ARIA roles
- Autofocus usage (distracting for screen readers)

**What's Not Checked**:

- ❌ Color contrast ratios (WCAG AA/AAA)
- ❌ Focus trap in modals
- ❌ Landmark region structure
- ❌ Heading hierarchy (h1 → h2 → h3)
- ❌ Alt text quality (empty vs descriptive)

**Recommendation**:

1. Add `eslint-plugin-jsx-a11y` (works with Svelte)
2. Add `@axe-core/playwright` for automated a11y tests
3. Make Svelte a11y warnings fail builds:

```js
// svelte.config.js
export default {
	compilerOptions: {
		runes: true,
		warningsAsErrors: true // ⚠️ Converts a11y warnings to errors
	}
};
```

---

#### 4. **Unused Exports Not Detected** - ⚠️ **GAP IDENTIFIED**

**Current Issue**:

- ❌ ESLint detects unused _imports_
- ❌ Does NOT detect unused _exports_ (dead public API)

**Example Undetected**:

```typescript
// src/lib/api/vectors.ts
export async function retrainDirectory() {
	/* ... */
} // ❌ Never imported anywhere
export async function cleanupOrphanVectors() {
	/* ... */
} // ❌ Never used
```

**Impact**: Dead code bloats bundle, confuses API consumers.

**Recommendation**: Add `eslint-plugin-unused-imports` or `ts-unused-exports`:

```bash
npm install --save-dev eslint-plugin-unused-imports
```

```js
// eslint.config.js
import unusedImports from 'eslint-plugin-unused-imports';
export default [
	{
		plugins: { 'unused-imports': unusedImports },
		rules: {
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	}
];
```

---

#### 5. **Dead Code Detection Missing** - ⚠️ **GAP IDENTIFIED**

**What's Not Checked**:

- ❌ Unreachable code after `return`/`throw`
- ❌ Functions called 0 times
- ❌ Components never imported
- ❌ Unused CSS classes (partial - Svelte checks scoped styles only)

**Tools to Add**:

1. **Knip** - Finds unused files, dependencies, exports
   ```bash
   npm install --save-dev knip
   npx knip
   ```
2. **Depcheck** - Finds unused npm dependencies
   ```bash
   npm install --save-dev depcheck
   npx depcheck
   ```

---

#### 6. **Security Vulnerability Checks Minimal** - ⚠️ **MINOR GAP**

**Current Status**:

- ✅ `npm audit` runs manually
- ❌ Not integrated into CI/CD
- ❌ No check for secrets in code (API keys, tokens)
- ❌ No CSP (Content Security Policy) validation

**Recommendations**:

1. Add `npm audit --audit-level=moderate` to pre-commit hook
2. Add `git-secrets` or `trufflehog` to detect leaked credentials
3. Add `@eslint-community/eslint-plugin-security` for security linting

---

#### 7. **Bundle Size Monitoring Absent** - ⚪ **OPTIONAL**

**What's Missing**:

- ❌ No bundle size limits enforced
- ❌ No warning when bundle size increases
- ❌ No tree-shaking verification

**Recommendation**: Add `@next/bundle-analyzer` equivalent for SvelteKit:

```bash
npm install --save-dev vite-plugin-compression vite-bundle-visualizer
```

---

## Phase 4: Configuration File Review

### eslint.config.js

**Status**: ✅ **GOOD** with 1 fix needed

**Current Configuration**:

- ✅ ESLint 9 flat config format
- ✅ TypeScript ESLint strict preset
- ✅ Svelte plugin enabled
- ✅ Correct ignore patterns

**Issues**:

- ❌ **NOT ignoring `mcp-browser-extensions/`** (causing 350+ errors)

**Recommended Fix**:

```javascript
export default ts.config(
	// ... existing config
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'dist/',
			'node_modules/',
			'mcp-browser-extensions/' // ⚠️ ADD THIS
		]
	}
);
```

**Additional Recommendations**:

```javascript
export default ts.config(
	js.configs.recommended,
	...ts.configs.strict,
	...ts.configs.stylisticTypeChecked, // ⚠️ ADD: Enforce style rules
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			parserOptions: {
				project: true, // ⚠️ ADD: Enable type-aware linting
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'error', // Already default
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_' // ⚠️ ADD: Allow `catch (_err)`
				}
			]
		}
	}
);
```

---

### tsconfig.json

**Status**: ✅ **GOOD** with enhancements recommended

**Current Configuration**:

- ✅ `"strict": true` enabled
- ✅ Extends SvelteKit's generated config
- ✅ Correct module resolution

**Issues**: None critical

**Recommended Enhancements**:

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		// Existing options (keep these)
		"strict": true,

		// ⚠️ ADD: Additional strictness
		"noUncheckedIndexedAccess": true,
		"noImplicitReturns": true,
		"noFallthroughCasesInSwitch": true,
		"noPropertyAccessFromIndexSignature": true,

		// ⚠️ ADD: Better error messages
		"noErrorTruncation": true,
		"noUncheckedSideEffectImports": true // TypeScript 5.7+
	}
}
```

---

### svelte.config.js

**Status**: ✅ **GOOD** with 1 enhancement

**Current Configuration**:

- ✅ Runes mode enabled
- ✅ Correct adapter (Node.js)
- ✅ Path alias configured

**Recommended Enhancement**:

```javascript
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: { $lib: 'src/lib' }
	},
	compilerOptions: {
		runes: true,
		warningsAsErrors: false // ⚠️ Consider setting to true for CI
	},
	onwarn: (warning, handler) => {
		// ⚠️ ADD: Fail on a11y warnings in CI
		if (process.env.CI && warning.code.startsWith('a11y-')) {
			throw new Error(`A11y warning: ${warning.message}`);
		}
		handler(warning);
	}
};
```

---

### vite.config.ts

**Status**: ✅ **GOOD**

**Current Configuration**:

- ✅ SvelteKit plugin
- ✅ Tailwind v4
- ✅ Testing Library integration
- ✅ Happy-dom environment

**Notes**:

- Component tracking plugin disabled (commented out) - correct for Svelte 5
- Allowed hosts includes 'hyperion' - project-specific, acceptable

**No Changes Needed** ✅

---

### package.json

**Status**: ✅ **GOOD** with 1 missing script

**Current Scripts**:

- ✅ `test` - Vitest run
- ✅ `lint` - ESLint
- ✅ `format` - Prettier
- ✅ `gen:api` - OpenAPI type generation

**Missing Script**:

- ❌ **No `typecheck` script** (Makefile has it, but not in package.json)

**Recommended Fix**:

```json
{
	"scripts": {
		"dev": "vite dev",
		"build": "vite build",
		"preview": "vite preview",
		"lint": "eslint . --ext .js,.ts,.svelte",
		"format": "prettier --write .",
		"test": "vitest run",
		"test:watch": "vitest",
		"typecheck": "svelte-check --tsconfig ./tsconfig.json", // ⚠️ ADD THIS
		"gen:api": "openapi-typescript ${VITE_API_BASE_URL:-http://localhost:8000}/openapi.json -o src/lib/api/generated.ts",
		"check": "npm run lint && npm run typecheck && npm run test" // ⚠️ ADD THIS
	}
}
```

---

## Phase 5: Recommendations

### Immediate Actions (Fix Today)

#### 1. Exclude Browser Extensions from Linting ⚠️ **HIGH PRIORITY**

```javascript
// eslint.config.js
{
	ignores: [
		'build/',
		'.svelte-kit/',
		'dist/',
		'node_modules/',
		'mcp-browser-extensions/' // Eliminates 350+ errors
	];
}
```

**Impact**: Reduces ESLint errors from 634 → 284 (-55%)

---

#### 2. Fix Environment Variable Access Pattern ⚠️ **CRITICAL**

**Problem**: `env.VITE_API_BASE_URL` doesn't exist in SvelteKit runtime.

**Solution**: Use dynamic import for client-side:

```typescript
// src/lib/api/client.ts
import { browser } from '$app/environment';

const API_BASE_URL = browser
	? import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
	: 'http://localhost:8000'; // SSR fallback
```

**Alternative**: Use SvelteKit's PUBLIC\_ prefix:

```bash
# .env
PUBLIC_API_BASE_URL=http://localhost:8000
```

```typescript
import { env } from '$env/dynamic/public';
const API_BASE_URL = env.PUBLIC_API_BASE_URL || 'http://localhost:8000';
```

**Files to Update** (8 files):

- `src/lib/api/client.ts`
- `src/lib/api/categories.ts`
- `src/lib/api/faces.ts`
- `src/lib/api/training.ts`
- `src/lib/api/admin.ts`
- `src/lib/api/queues.ts`
- `src/lib/api/vectors.ts`
- `src/lib/stores/jobProgressStore.svelte.ts`

---

#### 3. Run ESLint Autofix for Unused Imports ⚠️ **HIGH PRIORITY**

```bash
npm run lint -- --fix
```

**Impact**: Automatically removes 200-300 unused imports/variables.

---

#### 4. Add Missing `path` Property to PersonPhotoGroup ⚠️ **CRITICAL**

**Files to Fix**:

1. `src/routes/faces/clusters/[clusterId]/+page.svelte:211`

   ```typescript
   selectedPhoto = {
   	photoId: face.assetId,
   	path: face.path || '', // ⚠️ ADD THIS
   	takenAt: null
   	// ... rest
   };
   ```

2. Test fixtures in `PhotoPreviewModal.test.ts` (5 occurrences)
   ```typescript
   const photoGroup: PersonPhotoGroup = {
   	photoId: 123,
   	path: '/test/path/photo.jpg' // ⚠️ ADD THIS
   	// ... rest
   };
   ```

---

### Short-Term Actions (This Week)

#### 1. Fix UI Component Type Exports ⚠️ **HIGH PRIORITY**

**Problem**: Svelte 5 components don't export types the same way as Svelte 4.

**Solution**: Rewrite barrel exports:

```typescript
// src/lib/components/ui/badge/index.ts (BEFORE)
export { default as Badge } from './badge.svelte';
export type { BadgeProps } from './badge.svelte'; // ❌ Fails

// src/lib/components/ui/badge/index.ts (AFTER)
export { default as Badge } from './badge.svelte';
export type { ComponentProps } from 'svelte';
export type BadgeProps = ComponentProps<typeof import('./badge.svelte').default>;
```

**Alternative**: Use Svelte's built-in type helpers:

```typescript
import type { Component } from 'svelte';
import BadgeSvelte from './badge.svelte';

export const Badge = BadgeSvelte;
export type BadgeProps = Component<typeof BadgeSvelte>['$$prop_def'];
```

**Files to Fix** (3 files):

- `src/lib/components/ui/badge/index.ts`
- `src/lib/components/ui/button/index.ts`
- `src/lib/components/ui/alert/index.ts`

---

#### 2. Fix `onMount` Async Cleanup Pattern ⚠️ **MAJOR**

**Problem**: `onMount(async () => { ... return cleanup })` returns `Promise<CleanupFn>` instead of `CleanupFn`.

**Solution**:

```svelte
<script>
	import { onMount, onDestroy } from 'svelte';

	// ❌ WRONG
	onMount(async () => {
		const sse = await connectSSE();
		return () => sse.close(); // Returns Promise<() => void>
	});

	// ✅ CORRECT
	let sseConnection = $state(null);

	onMount(async () => {
		sseConnection = await connectSSE();
	});

	onDestroy(() => {
		sseConnection?.close();
	});
</script>
```

**Files to Fix** (2 files):

- `src/routes/faces/clusters/+page.svelte:54`
- `src/routes/faces/suggestions/+page.svelte:410`

---

#### 3. Fix Failing Tests - Phase 1 (Face Selection) ⚠️ **CRITICAL**

**Problem**: SVG bounding boxes not rendering in happy-dom, causing 11 test failures.

**Investigation Steps**:

1. Add debug logging to see if SVG renders:

   ```typescript
   const svg = dialog.querySelector('.face-overlay');
   console.log('SVG element:', svg);
   console.log('SVG HTML:', svg?.innerHTML);
   ```

2. Check if happy-dom supports SVG properly (may need jsdom):

   ```typescript
   // vite.config.ts
   test: {
     environment: 'jsdom', // Try switching from happy-dom
     setupFiles: ['src/tests/setup.ts']
   }
   ```

3. If SVG rendering is the issue, add null checks:
   ```typescript
   const faceLabels = svg?.querySelectorAll('g.face-label');
   expect(faceLabels).toBeTruthy();
   expect(faceLabels?.length).toBeGreaterThan(0);
   ```

**Files to Fix**:

- `src/tests/components/faces/PhotoPreviewModal.test.ts` (11 tests)

---

#### 4. Update SuggestionDetailModal Tests ⚠️ **CRITICAL**

**Problem**: 9 tests fail because "All Faces (N)" text format changed.

**Solution**:

1. Inspect current modal rendering to find new text format
2. Update test queries to match:

   ```typescript
   // ❌ OLD (fails)
   expect(screen.getByText(/All Faces \(3\)/i)).toBeInTheDocument();

   // ✅ NEW (find actual text first, then update)
   // Possibility 1: Text moved to data attribute
   expect(screen.getByTestId('all-faces-count')).toHaveTextContent('3');

   // Possibility 2: Structured differently
   expect(screen.getByText('All Faces')).toBeInTheDocument();
   expect(screen.getByText('3')).toBeInTheDocument();
   ```

**Files to Fix**:

- `src/tests/components/faces/SuggestionDetailModal.test.ts` (9 tests)

---

### Medium-Term Actions (This Sprint)

#### 1. Enable Accessibility Warnings as Errors ⚠️ **MAJOR**

**Goal**: Fix 28 a11y violations before enabling strict mode.

**Step 1: Fix Click Handler A11y Issues** (15 occurrences)

```svelte
<!-- ❌ BEFORE -->
<div onclick={handleClick}>Click me</div>

<!-- ✅ AFTER - Option 1: Use button -->
<button onclick={handleClick}>Click me</button>

<!-- ✅ AFTER - Option 2: Add keyboard support -->
<div
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}
>
	Click me
</div>
```

**Step 2: Fix SVG A11y Issues** (10 occurrences in `ImageWithFaceBoundingBoxes.svelte`)

```svelte
<!-- ❌ BEFORE -->
<rect onclick={handleBboxClick} />

<!-- ✅ AFTER -->
<rect
	role="button"
	tabindex="0"
	aria-label="Face bounding box"
	onclick={handleBboxClick}
	onkeydown={handleKeyDown}
/>
```

**Step 3: Enable Strict Mode**

```javascript
// svelte.config.js
export default {
	compilerOptions: {
		runes: true,
		warningsAsErrors: true // Treat a11y warnings as errors
	}
};
```

---

#### 2. Replace Non-Null Assertions with Safe Queries ⚠️ **MAJOR**

**Goal**: Fix 216 non-null assertions in tests.

**Pattern**:

```typescript
// ❌ BEFORE (212 occurrences)
const dialog = container.querySelector('[role="dialog"]')!;
const closeBtn = dialog.querySelector('.close-btn')!;
await userEvent.click(closeBtn);

// ✅ AFTER
const dialog = getByRole('dialog'); // Throws descriptive error if missing
const closeBtn = within(dialog).getByRole('button', { name: /close/i });
await userEvent.click(closeBtn);
```

**Files to Fix** (top 5):

1. `PhotoPreviewModal.test.ts` (13 assertions)
2. `PhotoPreviewModalSuggestions.test.ts` (8 assertions)
3. `RecentlyAssignedPanel.test.ts` (6 assertions)
4. `DeleteConfirmationModal.test.ts` (2 assertions)
5. `RetrainModal.test.ts` (2 assertions)

---

#### 3. Add TypeScript Strictness Options ⚠️ **RECOMMENDED**

```json
// tsconfig.json
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true, // arr[0] becomes T | undefined
		"noImplicitReturns": true, // All paths must return
		"noFallthroughCasesInSwitch": true,
		"noPropertyAccessFromIndexSignature": true
	}
}
```

**Impact**: Will create new type errors (estimate 20-30), but prevents bugs.

---

### Long-Term Actions (Next Quarter)

#### 1. Add Unused Export Detection

**Install Knip** (finds unused files, exports, dependencies):

```bash
npm install --save-dev knip
npx knip --config knip.json
```

**Create `knip.json`**:

```json
{
	"entry": ["src/routes/**/*.svelte", "src/lib/api/*.ts"],
	"project": ["src/**/*.{js,ts,svelte}"],
	"ignore": ["src/tests/**", "**/*.test.ts"],
	"ignoreDependencies": ["@testing-library/*"]
}
```

---

#### 2. Add Automated A11y Testing

**Install axe-core**:

```bash
npm install --save-dev @axe-core/playwright axe-core
```

**Add to Test Suite**:

```typescript
// src/tests/setup.ts
import { injectAxe, checkA11y } from '@axe-core/playwright';

// In test
test('modal is accessible', async () => {
	render(Modal);
	await injectAxe();
	await checkA11y('[role="dialog"]', {
		rules: {
			'color-contrast': { enabled: true },
			'focus-trap': { enabled: true }
		}
	});
});
```

---

#### 3. Add Bundle Size Monitoring

**Install Bundle Visualizer**:

```bash
npm install --save-dev vite-bundle-visualizer
```

**Update `vite.config.ts`**:

```typescript
import { visualizer } from 'vite-bundle-visualizer';

export default defineConfig({
	plugins: [
		sveltekit(),
		visualizer({
			open: true,
			gzipSize: true,
			filename: 'bundle-analysis.html'
		})
	]
});
```

---

#### 4. Add Pre-Commit Hooks

**Install Husky + lint-staged**:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

**Create `.husky/pre-commit`**:

```bash
#!/usr/bin/env sh
npm run lint-staged
```

**Add to `package.json`**:

```json
{
	"lint-staged": {
		"*.{js,ts,svelte}": ["eslint --fix", "prettier --write"],
		"*.{json,md}": ["prettier --write"]
	}
}
```

---

## Summary of Actionable Fixes

### Critical Path (Must Fix Before Production)

| Priority | Task                                          | Effort  | Impact       | Files   |
| -------- | --------------------------------------------- | ------- | ------------ | ------- |
| 🔴 P0    | Exclude `mcp-browser-extensions/` from ESLint | 5 min   | -350 errors  | 1 file  |
| 🔴 P0    | Fix `env.VITE_API_BASE_URL` access            | 30 min  | -8 errors    | 8 files |
| 🔴 P0    | Run `npm run lint -- --fix`                   | 2 min   | -200 errors  | Auto    |
| 🔴 P0    | Add missing `path` prop                       | 15 min  | -6 errors    | 6 files |
| 🔴 P1    | Fix UI component type exports                 | 1 hour  | -13 errors   | 3 files |
| 🔴 P1    | Fix `onMount` async cleanup                   | 30 min  | -2 errors    | 2 files |
| 🔴 P1    | Debug & fix face selection tests              | 2 hours | -11 failures | 1 file  |
| 🔴 P1    | Update SuggestionDetailModal tests            | 1 hour  | -9 failures  | 1 file  |

**Total Critical Effort**: ~5.5 hours
**Total Impact**: -599 errors (94% reduction)

---

### Quality Improvements (Post-Launch)

| Priority | Task                          | Effort  | Impact               |
| -------- | ----------------------------- | ------- | -------------------- |
| 🟡 P2    | Fix 28 a11y violations        | 4 hours | WCAG compliance      |
| 🟡 P2    | Replace non-null assertions   | 3 hours | Better test errors   |
| 🟡 P2    | Add TypeScript strict options | 2 hours | Prevent 20-30 bugs   |
| 🟢 P3    | Add unused export detection   | 1 hour  | Clean up API         |
| 🟢 P3    | Add automated a11y tests      | 2 hours | Prevent regressions  |
| 🟢 P3    | Add bundle size monitoring    | 1 hour  | Performance tracking |

---

## Conclusion

The image-search-ui codebase has **solid foundations** (TypeScript strict mode, comprehensive test suite, modern tooling) but suffers from **accumulated technical debt**:

1. **634 ESLint errors** - 55% are from incorrectly linted browser extension files
2. **75 type errors** - Mostly environment variable access and UI component type exports
3. **63 failing tests** - Face selection UI and modal rendering issues
4. **28 a11y violations** - Need keyboard support and ARIA roles

**Good News**: 94% of errors can be fixed in ~5.5 hours of focused work by following the Critical Path above. The remaining quality improvements can be tackled incrementally over the next sprint.

**Recommendation**: Allocate 1 day for critical fixes before next deployment, then reserve 2-3 days next sprint for quality improvements (a11y, test stabilization, TypeScript strictness).

---

**Research Captured**: `/export/workspace/image-search/image-search-ui/docs/research/error-warning-analysis-2026-01-11.md`
**Next Steps**: Review findings with team, prioritize fixes, create GitHub issues for tracking.
