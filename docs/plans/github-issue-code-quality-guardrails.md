# GitHub Issue: Code Quality Guard-Rails

> **Instructions**: Create this issue manually at https://github.com/MacPhobos/image-search-ui/issues/new
> or install the GitHub CLI (`gh`) and run the command at the bottom of this file.

---

## Issue Title

```
Implement Code Quality Guard-Rails from Codebase Analysis
```

## Labels

- `enhancement`
- `tech-debt`
- `code-quality`

## Issue Body

```markdown
## Summary
Implement the 9 code quality guard-rails identified in the codebase analysis to improve maintainability, reduce bugs, and establish consistent patterns.

## Background
Analysis identified several areas needing improvement:
- 9 components exceed 500 lines (largest: 1,107 lines)
- 97 catch blocks with 5 different error handling patterns
- 21% component test coverage
- `apiRequest()` duplicated across 7 API files
- Effect loop risks from missing `untrack()` usage

## Tasks

### 🔴 Critical (Phase 1)

- [ ] **Create centralized error handler** (`src/lib/utils/errorHandler.ts`)
  - Implement `handleError(error, context, strategy)` function
  - Support strategies: 'toast', 'inline', 'silent'
  - Migrate existing catch blocks (97 instances)

- [ ] **Consolidate apiRequest()**
  - Move to single export in `src/lib/api/client.ts`
  - Add 204 No Content handling
  - Update 7 API modules to import shared function
  - Delete duplicate implementations

- [ ] **Add complexity linting**
  - Create `make check-complexity` target
  - Fail on components >300 lines
  - Add to CI pipeline

- [ ] **Fix test coverage gaps**
  - Add tests for `AdminDataManagement.svelte`
  - Add tests for `DeleteAllDataModal.svelte`
  - Add tests for `ImportPersonDataModal.svelte`
  - Target: 50% component coverage

### 🟡 Important (Phase 2)

- [ ] **Audit $effect() usages** (21 instances)
  - Add `untrack()` where callbacks are called
  - Add cleanup functions for async effects
  - Convert state-update effects to `$derived()`

- [ ] **Document props mutability**
  - Audit 133 components using `$props()`
  - Add `$bindable()` where props are mutated
  - Add JSDoc comments documenting mutability

- [ ] **Refactor large components** (9 components >500 lines)
  - `SuggestionDetailModal.svelte` (1,107 lines) → Extract 4 sub-components
  - `ImportPersonDataModal.svelte` (884 lines) → Extract step components
  - `FaceMatchingSettings.svelte` (752 lines) → Extract settings hooks
  - `PhotoPreviewModal.svelte` (738 lines) → Extract assignment panel

### 🟢 Recommended (Phase 3)

- [ ] **Add localStorage validation**
  - Add optional Zod schema parameter to `localSettings.get()`
  - Add schemas for critical settings

- [ ] **Extract long derivations**
  - Extract `$derived.by()` blocks >10 lines to named functions
  - Add unit tests for extracted functions

## Acceptance Criteria
- [ ] Centralized error handler used in all new code
- [ ] Single `apiRequest()` export (no duplicates)
- [ ] `make check-complexity` passes in CI
- [ ] Component test coverage ≥50%
- [ ] No `$effect()` calling callbacks without `untrack()`

## Related Documents
- Guard-rails document: `docs/code-quality-guardrails.md`
- Analysis document: `docs/research/codebase-analysis-2026-01-10.md`
```

---

## CLI Command (if gh is installed)

```bash
gh issue create \
  --title "Implement Code Quality Guard-Rails from Codebase Analysis" \
  --label "enhancement" \
  --label "tech-debt" \
  --label "code-quality" \
  --body-file docs/plans/github-issue-code-quality-guardrails-body.md
```

## To install gh CLI

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Then authenticate
gh auth login
```
