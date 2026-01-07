# Face Suggestions Search Bar Implementation Research

**Date**: 2026-01-07
**Researcher**: Claude Code (Research Agent)
**Objective**: Understand the Face Suggestions page implementation to design a person search bar with typeahead filtering

---

## Executive Summary

The Face Suggestions page (`/routes/faces/suggestions/+page.svelte`) displays AI-generated suggestions for face-to-person assignments, grouped by target person. The page currently lacks a search/filter mechanism to find suggestions for specific people. This research identifies existing patterns and available APIs to implement a typeahead search bar for filtering suggestions by person name.

**Key Findings**:
1. **Page uses grouped suggestions API** - `listGroupedSuggestions()` returns suggestions grouped by person
2. **Person API available** - `listPersons()` from `src/lib/api/faces.ts` provides person list with filtering
3. **Existing typeahead pattern** - `PersonDropdown.svelte` implements comprehensive typeahead with keyboard navigation
4. **Existing search patterns** - `FiltersPanel.svelte` shows person search implementation for main dashboard

---

## 1. Current Page Structure

### Data Flow

```
Page Load
    ↓
getFaceSuggestionSettings() → Fetch pagination settings
    ↓
listGroupedSuggestions() → Fetch suggestions grouped by person
    ↓
thumbnailCache.fetchBatch() → Batch-load face thumbnails
    ↓
Display SuggestionGroupCard components
```

### State Management (Svelte 5 Runes)

```typescript
// Pagination and filtering
let groupedResponse = $state<GroupedSuggestionsResponse | null>(null);
let settings = $state<FaceSuggestionSettings>({ groupsPerPage: 10, itemsPerGroup: 20 });
let page = $state(1);
let statusFilter = $state<string>('pending');

// Selection state
let selectedIds = $state<Set<number>>(new Set());
let selectedSuggestion = $state<FaceSuggestion | null>(null);

// Loading/error state
let isLoading = $state(false);
let error = $state<string | null>(null);
let bulkLoading = $state(false);
```

### Key Functions

**`loadSuggestions()`** - Main data loading function:
```typescript
async function loadSuggestions() {
    isLoading = true;
    error = null;
    try {
        groupedResponse = await listGroupedSuggestions({
            page,
            groupsPerPage: settings.groupsPerPage,
            suggestionsPerGroup: settings.itemsPerGroup,
            status: statusFilter || undefined
        });
    } catch (e) {
        error = e instanceof Error ? e.message : 'Failed to load suggestions';
    } finally {
        isLoading = false;
    }
}
```

**Reactive Loading** - `$effect` triggers reload on filter/page changes:
```typescript
$effect(() => {
    // Reload when filter or page changes
    if (statusFilter !== undefined || page) {
        loadSuggestions();
    }
});
```

---

## 2. Person API Endpoints

### Available in `src/lib/api/faces.ts`

#### `listPersons()` - Fetch persons with pagination
```typescript
export async function listPersons(
    page: number = 1,
    pageSize: number = 20,
    status?: 'active' | 'merged' | 'hidden'
): Promise<PersonListResponse>
```

**Response Type**:
```typescript
export interface PersonListResponse {
    items: Person[];
    total: number;
    page: number;
    pageSize: number;
}

export interface Person {
    id: string;          // UUID
    name: string;
    status: 'active' | 'merged' | 'hidden';
    faceCount: number;
    prototypeCount: number;
    createdAt: string;
    updatedAt: string;
}
```

**Usage Pattern** (from FiltersPanel.svelte):
```typescript
async function loadPersons() {
    try {
        const response = await listPersons(1, 100, 'active');
        persons = response.items;
    } catch (err) {
        console.error('Failed to load persons:', err);
    } finally {
        personsLoading = false;
    }
}
```

#### `listGroupedSuggestions()` - Fetch grouped suggestions
```typescript
export async function listGroupedSuggestions(params?: {
    page?: number;
    groupsPerPage?: number;
    suggestionsPerGroup?: number;
    status?: string;
    personId?: string;  // 🎯 KEY FILTER PARAMETER
}): Promise<GroupedSuggestionsResponse>
```

**Response Type**:
```typescript
export interface GroupedSuggestionsResponse {
    groups: SuggestionGroup[];
    totalGroups: number;
    totalSuggestions: number;
    page: number;
    groupsPerPage: number;
    suggestionsPerGroup: number;
}

export interface SuggestionGroup {
    personId: string;
    personName: string | null;
    suggestionCount: number;
    maxConfidence: number;
    suggestions: FaceSuggestion[];
}
```

**🔑 Key Insight**: `listGroupedSuggestions()` **already supports `personId` filtering**! No backend changes needed.

---

## 3. Existing Typeahead Patterns

### Pattern A: PersonDropdown.svelte (Comprehensive)

**Location**: `src/lib/components/faces/PersonDropdown.svelte`

**Features**:
- ✅ Full typeahead with search input
- ✅ Keyboard navigation (Arrow Up/Down, Enter, Escape)
- ✅ Highlighted selection tracking
- ✅ Sections: "SUGGESTED" (with confidence scores) and "ALL PERSONS"
- ✅ "Create new person" option
- ✅ Click-outside detection
- ✅ Accessible (ARIA roles: combobox, listbox, option)

**State Management**:
```typescript
let isOpen = $state(false);
let searchQuery = $state('');
let highlightedIndex = $state(-1);
let dropdownRef = $state<HTMLDivElement | null>(null);
let triggerButtonRef = $state<HTMLButtonElement | null>(null);
```

**Search Logic** (client-side filtering):
```typescript
let filteredPersons = $derived(
    persons.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
);
```

**Keyboard Navigation**:
```typescript
function handleKeyDown(event: KeyboardEvent) {
    if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleDropdown();
        }
        return;
    }

    switch (event.key) {
        case 'Escape':
            closeDropdown();
            triggerButtonRef?.focus();
            break;
        case 'ArrowDown':
            highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
            break;
        case 'ArrowUp':
            highlightedIndex = Math.max(highlightedIndex - 1, -1);
            break;
        case 'Enter':
            if (highlightedIndex >= 0) {
                // Select highlighted option
            }
            break;
    }
}
```

**Pros**:
- Production-ready component
- Full keyboard accessibility
- Handles complex interactions (suggestions, create new)

**Cons**:
- Button-triggered dropdown (not inline search)
- Complex for simple search use case
- Tightly coupled to person selection workflow

---

### Pattern B: FiltersPanel.svelte (Simpler)

**Location**: `src/lib/components/FiltersPanel.svelte`

**Features**:
- ✅ Text input with typeahead dropdown
- ✅ Client-side search filtering
- ✅ Selected person display (badge with clear button)
- ✅ Focus/blur handling
- ⚠️ No keyboard navigation (mouse-only)
- ⚠️ Basic blur timing workaround

**State Management**:
```typescript
let selectedPersonId = $state<string | null>(null);
let persons = $state<Person[]>([]);
let personsLoading = $state(true);
let personSearchQuery = $state('');
let showPersonDropdown = $state(false);
```

**Search Logic**:
```typescript
let filteredPersons = $derived.by<Person[]>(() => {
    if (!personSearchQuery.trim()) return persons ?? [];
    const query = personSearchQuery.toLowerCase();
    return persons?.filter((p) => p.name.toLowerCase().includes(query)) ?? [];
});
```

**Focus Handling**:
```typescript
function handlePersonInputFocus() {
    showPersonDropdown = true;
}

function handlePersonInputBlur() {
    // Delay to allow click on dropdown items
    setTimeout(() => {
        showPersonDropdown = false;
        personSearchQuery = '';
    }, 200);
}
```

**Pros**:
- Simpler implementation
- Inline search input (no trigger button)
- Good for single-select filtering

**Cons**:
- No keyboard navigation
- Fragile blur timing workaround
- Not accessible (missing ARIA roles)

---

### Pattern C: SearchBar.svelte (Minimal)

**Location**: `src/lib/components/SearchBar.svelte`

**Features**:
- Simple text input with submit button
- Clear button when query present
- No dropdown or typeahead

**Use Case**: Global image search (not applicable to person filtering)

---

## 4. Recommended Implementation Approach

### Option 1: Reuse PersonDropdown (Recommended)

**Pros**:
- ✅ Battle-tested component with full accessibility
- ✅ Keyboard navigation included
- ✅ Professional UX with sections and confidence scores
- ✅ Minimal code duplication

**Cons**:
- ⚠️ Requires adaptation (remove "create new" option, adjust styling)
- ⚠️ Button-triggered UI might not fit inline search aesthetic

**Implementation**:
```typescript
<PersonDropdown
    selectedPersonId={personFilter}
    persons={persons}
    loading={personsLoading}
    placeholder="Filter by person..."
    onSelect={(personId, personName) => {
        personFilter = personId;
        page = 1; // Reset to first page
    }}
    onCreate={(name) => {
        // Disable or redirect to person creation page
    }}
    suggestions={[]} // No AI suggestions in this context
/>
```

**Modifications Needed**:
1. Add prop to hide "Create new" option
2. Add prop to customize button appearance (or create inline variant)
3. Optional: Add `onClear` callback for filter reset

---

### Option 2: Create New PersonSearchBar Component (Hybrid Approach)

**Pros**:
- ✅ Tailored to Face Suggestions page needs
- ✅ Can combine best features from PersonDropdown (keyboard nav) and FiltersPanel (inline input)
- ✅ Full control over UX

**Cons**:
- ⚠️ Code duplication risk
- ⚠️ Need to reimplement keyboard navigation
- ⚠️ More testing required

**Component Structure**:
```svelte
<script lang="ts">
    import type { Person } from '$lib/api/faces';

    interface Props {
        persons: Person[];
        loading?: boolean;
        selectedPersonId: string | null;
        onSelect: (personId: string | null, personName: string | null) => void;
    }

    let { persons, loading = false, selectedPersonId, onSelect }: Props = $props();

    let searchQuery = $state('');
    let showDropdown = $state(false);
    let highlightedIndex = $state(-1);

    // Client-side filtering
    let filteredPersons = $derived(
        persons.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Selected person for display
    let selectedPerson = $derived(
        persons.find(p => p.id === selectedPersonId) ?? null
    );

    function handleSelect(person: Person) {
        onSelect(person.id, person.name);
        searchQuery = '';
        showDropdown = false;
    }

    function handleClear() {
        onSelect(null, null);
        searchQuery = '';
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Implement arrow navigation, Enter to select, Escape to close
    }
</script>

<div class="person-search-bar">
    <!-- Selected person badge (if any) -->
    {#if selectedPerson}
        <div class="selected-badge">
            <span>{selectedPerson.name}</span>
            <button onclick={handleClear}>×</button>
        </div>
    {/if}

    <!-- Search input -->
    <input
        type="text"
        bind:value={searchQuery}
        onfocus={() => showDropdown = true}
        onblur={() => setTimeout(() => showDropdown = false, 200)}
        onkeydown={handleKeyDown}
        placeholder="Search persons..."
        aria-label="Filter suggestions by person"
    />

    <!-- Dropdown -->
    {#if showDropdown && filteredPersons.length > 0}
        <ul class="dropdown">
            {#each filteredPersons as person, index (person.id)}
                <li>
                    <button
                        class:highlighted={index === highlightedIndex}
                        onmousedown={() => handleSelect(person)}
                    >
                        {person.name}
                        <span class="count">{person.faceCount} faces</span>
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>
```

---

### Option 3: Extend FiltersPanel Pattern (Simplest)

**Pros**:
- ✅ Minimal new code
- ✅ Familiar pattern from existing codebase
- ✅ Quick to implement

**Cons**:
- ⚠️ No keyboard navigation (accessibility gap)
- ⚠️ Blur timing workaround is fragile
- ⚠️ Not ideal for production quality

**Implementation**:
```typescript
// In +page.svelte, add state:
let personFilter = $state<string | null>(null);
let persons = $state<Person[]>([]);
let personsLoading = $state(false);
let personSearchQuery = $state('');
let showPersonDropdown = $state(false);

// Load persons on mount:
onMount(async () => {
    personsLoading = true;
    try {
        const response = await listPersons(1, 100, 'active');
        persons = response.items;
    } finally {
        personsLoading = false;
    }
    await loadSuggestions();
});

// Update loadSuggestions to use personFilter:
async function loadSuggestions() {
    groupedResponse = await listGroupedSuggestions({
        page,
        groupsPerPage: settings.groupsPerPage,
        suggestionsPerGroup: settings.itemsPerGroup,
        status: statusFilter || undefined,
        personId: personFilter || undefined  // 🎯 Add filter
    });
}

// Reactive reload on personFilter change:
$effect(() => {
    if (statusFilter !== undefined || page || personFilter !== undefined) {
        loadSuggestions();
    }
});
```

---

## 5. API Integration Details

### Filtering Flow

**Current**:
```
User selects status filter → loadSuggestions({ status: 'pending' })
    ↓
Backend returns filtered suggestions
```

**With Person Search**:
```
User types "John" → filteredPersons shows ["John Doe", "John Smith"]
    ↓
User selects "John Doe" → personFilter = "uuid-john-doe"
    ↓
loadSuggestions({ status: 'pending', personId: 'uuid-john-doe' })
    ↓
Backend returns suggestions ONLY for John Doe
```

### API Call Example

```typescript
// Without person filter
const response1 = await listGroupedSuggestions({
    page: 1,
    groupsPerPage: 10,
    suggestionsPerGroup: 20,
    status: 'pending'
});
// Returns: All pending suggestions grouped by person

// With person filter
const response2 = await listGroupedSuggestions({
    page: 1,
    groupsPerPage: 10,
    suggestionsPerGroup: 20,
    status: 'pending',
    personId: '550e8400-e29b-41d4-a716-446655440000'  // John Doe's UUID
});
// Returns: Only John Doe's pending suggestions (1 group)
```

### Data Fetching Strategy

**Option A: Load all persons once**
```typescript
onMount(async () => {
    const response = await listPersons(1, 100, 'active');
    persons = response.items;  // Cache in page state
});
```

**Pros**:
- Fast client-side filtering
- No API calls during typing
- Works well for <1000 persons

**Cons**:
- Initial page load includes extra API call
- Doesn't scale to 10,000+ persons

**Option B: Lazy load persons on search input focus**
```typescript
let personsLoaded = $state(false);

function handleSearchFocus() {
    if (!personsLoaded) {
        loadPersons();
    }
    showDropdown = true;
}
```

**Pros**:
- Faster initial page load
- Only loads when user actually searches

**Cons**:
- Slight delay on first search interaction

**Recommendation**: Use **Option A** for initial implementation. The Suggestions page is already loading other data, and person lists are typically small (<100 active persons).

---

## 6. UI/UX Considerations

### Placement

**Recommended Location**: Between "Filters and Bulk Actions" section and suggestion groups

```
┌─────────────────────────────────────────────────┐
│ Face Suggestions                                │
│ 152 total suggestions · 12 groups              │
├─────────────────────────────────────────────────┤
│ [Status: Pending ▼] [Select All] [Bulk Actions]│ ← Existing filters
├─────────────────────────────────────────────────┤
│ 🔍 [Search persons...]                          │ ← NEW SEARCH BAR
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ SuggestionGroupCard: John Doe (15)          │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ SuggestionGroupCard: Jane Smith (8)         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Visual Design

**Selected State** (show badge above/beside search):
```
┌─────────────────────────────────────────────────┐
│ Filtering by: [John Doe ×]                      │
│ 🔍 [Search persons...]                          │
└─────────────────────────────────────────────────┘
```

**Empty State** (no persons found):
```
┌─────────────────────────────────────────────────┐
│ 🔍 [john xyz______]                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ No persons found matching "john xyz"        │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Behavior

**Clear Filter** - Clicking × on person badge:
- Clears `personFilter`
- Resets to page 1
- Reloads all suggestions

**Reset on Status Change**:
```typescript
$effect(() => {
    // When status filter changes, keep person filter but reset page
    if (statusFilter !== previousStatus) {
        page = 1;
    }
});
```

---

## 7. Testing Strategy

### Unit Tests

**File**: `src/tests/routes/faces-suggestions.test.ts`

**Test Cases**:
1. ✅ Person search filters suggestions correctly
2. ✅ Clearing person filter shows all suggestions
3. ✅ Person filter persists across status changes
4. ✅ Person filter resets page to 1
5. ✅ Keyboard navigation works (if implemented)
6. ✅ Dropdown closes on selection
7. ✅ Loading state shows during person fetch
8. ✅ Error state shows if person fetch fails

**Example Test**:
```typescript
import { render, screen, waitFor } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import { mockResponse } from '../helpers/mockFetch';
import { createPerson } from '../helpers/fixtures';
import SuggestionsPage from '$routes/faces/suggestions/+page.svelte';

test('filters suggestions by selected person', async () => {
    const john = createPerson({ id: '123', name: 'John Doe' });
    const jane = createPerson({ id: '456', name: 'Jane Smith' });

    mockResponse('/api/v1/faces/persons', { items: [john, jane], total: 2 });
    mockResponse('/api/v1/faces/suggestions?grouped=true&status=pending', {
        groups: [
            { personId: '123', personName: 'John Doe', suggestionCount: 15, suggestions: [...] },
            { personId: '456', personName: 'Jane Smith', suggestionCount: 8, suggestions: [...] }
        ],
        totalGroups: 2
    });

    render(SuggestionsPage);

    await waitFor(() => {
        expect(screen.getByText('John Doe (15)')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith (8)')).toBeInTheDocument();
    });

    // Type to search
    const searchInput = screen.getByPlaceholderText('Search persons...');
    await userEvent.type(searchInput, 'john');

    // Select John Doe from dropdown
    const johnOption = screen.getByText('John Doe');
    await userEvent.click(johnOption);

    // Verify API called with personId filter
    await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('personId=123'),
            expect.any(Object)
        );
    });

    // Verify only John's group shown
    expect(screen.getByText('John Doe (15)')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith (8)')).not.toBeInTheDocument();
});
```

### Integration Tests

**Manual Testing Checklist**:
- [ ] Search filters persons by name (case-insensitive)
- [ ] Selecting person filters suggestions correctly
- [ ] Clearing person filter shows all suggestions
- [ ] Person filter + status filter work together
- [ ] Page resets to 1 when person filter applied
- [ ] Keyboard navigation (if implemented)
- [ ] Mobile responsive design
- [ ] Accessibility (screen reader friendly)

---

## 8. Performance Considerations

### Current Performance

**Existing API Calls** (on page load):
1. `getFaceSuggestionSettings()` - Settings fetch (~10ms)
2. `listGroupedSuggestions()` - Initial suggestions (~200-500ms depending on data)
3. `getBatchThumbnails()` - Thumbnail batch load (~100-300ms)

**Total Initial Load**: ~500-800ms

### With Person Search

**Additional API Calls**:
- `listPersons(1, 100, 'active')` - Person list fetch (~50-150ms)

**Total Initial Load**: ~550-950ms (+10-15% overhead)

**Runtime Performance**:
- **Client-side filtering**: O(n) where n = number of persons (typically <100, negligible)
- **Dropdown rendering**: Only visible persons (max 100 items, fast)
- **API filtering**: Backend handles filtering, frontend receives filtered results

**Optimization Opportunities**:
1. **Memoize filteredPersons**: Already using `$derived` (optimal)
2. **Debounce search input**: Not needed for client-side filtering (instant)
3. **Virtual scrolling**: Only needed if >1000 persons (unlikely)

---

## 9. Accessibility Requirements

### ARIA Attributes

**Search Input**:
```html
<input
    type="text"
    role="combobox"
    aria-expanded={showDropdown}
    aria-controls="person-dropdown"
    aria-autocomplete="list"
    aria-label="Filter suggestions by person"
/>
```

**Dropdown List**:
```html
<ul id="person-dropdown" role="listbox">
    <li>
        <button role="option" aria-selected={isSelected}>
            Person Name
        </button>
    </li>
</ul>
```

**Selected Person Badge**:
```html
<div role="status" aria-live="polite">
    Filtering by: John Doe
    <button aria-label="Clear person filter">×</button>
</div>
```

### Keyboard Navigation

**Required Keys**:
- `Arrow Down` - Move to next person in dropdown
- `Arrow Up` - Move to previous person
- `Enter` - Select highlighted person
- `Escape` - Close dropdown without selecting
- `Tab` - Move focus to next element (closes dropdown)

**Focus Management**:
- When dropdown opens, focus stays on input
- When person selected, focus returns to input
- When dropdown closed via Escape, focus returns to input

---

## 10. Implementation Roadmap

### Phase 1: Basic Filtering (MVP)

**Estimated Time**: 2-3 hours

**Tasks**:
1. Add person search state variables
2. Load persons on mount via `listPersons()`
3. Add search input with client-side filtering
4. Implement person selection handler
5. Update `loadSuggestions()` to use `personId` filter
6. Add selected person badge with clear button
7. Basic styling (match existing filters section)

**Deliverables**:
- Working person search with dropdown
- API filtering functional
- Basic visual design

---

### Phase 2: UX Enhancements (Polish)

**Estimated Time**: 2-4 hours

**Tasks**:
1. Add keyboard navigation (Arrow keys, Enter, Escape)
2. Improve dropdown styling (match PersonDropdown aesthetic)
3. Add loading state during person fetch
4. Add empty state ("No persons found")
5. Add person face count in dropdown
6. Improve focus/blur handling (remove setTimeout hack)

**Deliverables**:
- Fully keyboard-accessible
- Professional UI polish
- Robust error handling

---

### Phase 3: Testing & Accessibility (Quality)

**Estimated Time**: 2-3 hours

**Tasks**:
1. Write unit tests for search filtering
2. Write unit tests for keyboard navigation
3. Add ARIA attributes
4. Test with screen reader
5. Mobile responsive testing
6. Cross-browser testing

**Deliverables**:
- Full test coverage
- WCAG 2.1 AA compliance
- Mobile-friendly design

---

## 11. Alternative Solutions Considered

### Alternative A: Server-Side Search

**Concept**: Type-ahead search that queries backend for person matches

**Implementation**:
```typescript
// Debounced API call
async function searchPersons(query: string) {
    const response = await fetch(`/api/v1/faces/persons/search?q=${query}`);
    return response.json();
}

let debouncedSearch = debounce(searchPersons, 300);
```

**Pros**:
- Scales to 10,000+ persons
- Supports fuzzy matching (backend can use ILIKE, trigrams)

**Cons**:
- Requires new backend endpoint
- Added latency (300ms debounce + network)
- More complex implementation

**Verdict**: ❌ **Not recommended** - Overkill for typical use case (<100 persons)

---

### Alternative B: Multi-Select Person Filter

**Concept**: Allow filtering by multiple persons simultaneously

**Implementation**:
```typescript
let selectedPersonIds = $state<Set<string>>(new Set());

// API call
await listGroupedSuggestions({
    personId: [...selectedPersonIds].join(',')  // Requires backend support
});
```

**Pros**:
- More flexible filtering
- Compare suggestions across multiple people

**Cons**:
- Requires backend API changes
- More complex UI (tags/chips)
- Unclear use case (why view multiple people at once?)

**Verdict**: ⚪ **Consider for future** - Nice-to-have, not MVP requirement

---

### Alternative C: Integrated Filters Dropdown

**Concept**: Combine status + person filters into single dropdown

**Implementation**:
```
┌─────────────────────────────────────┐
│ Filters ▼                           │
├─────────────────────────────────────┤
│ Status: [Pending ▼]                 │
│ Person: [John Doe ▼]                │
│ [Clear] [Apply]                     │
└─────────────────────────────────────┘
```

**Pros**:
- Cleaner top-level UI
- Grouped filter controls

**Cons**:
- Extra clicks to access filters
- Less discoverable
- Deviates from existing page patterns

**Verdict**: ❌ **Not recommended** - Current flat filter design is more usable

---

## 12. Conclusion and Recommendation

### Recommended Solution: **Option 2 (Create New PersonSearchBar Component)**

**Rationale**:
1. **Balance of Reusability and Customization** - Borrows best patterns from existing components while tailored to page needs
2. **Full Accessibility** - Implements keyboard navigation and ARIA roles from the start
3. **No Breaking Changes** - Doesn't modify existing PersonDropdown component
4. **Test Coverage** - Easier to test in isolation
5. **Future-Proof** - Can be reused in other pages (e.g., Face Clusters, People)

### Component API Design

```typescript
interface Props {
    persons: Person[];
    loading?: boolean;
    selectedPersonId: string | null;
    onSelect: (personId: string | null, personName: string | null) => void;
    placeholder?: string;
    testId?: string;
}
```

### Integration Example

```svelte
<script lang="ts">
    // In +page.svelte
    import PersonSearchBar from '$lib/components/faces/PersonSearchBar.svelte';

    let personFilter = $state<string | null>(null);
    let persons = $state<Person[]>([]);

    onMount(async () => {
        const response = await listPersons(1, 100, 'active');
        persons = response.items;
    });

    function handlePersonSelect(personId: string | null, personName: string | null) {
        personFilter = personId;
        page = 1; // Reset pagination
    }
</script>

<div class="filters-row">
    <select bind:value={statusFilter}>...</select>

    <PersonSearchBar
        {persons}
        loading={personsLoading}
        selectedPersonId={personFilter}
        onSelect={handlePersonSelect}
        placeholder="Filter by person..."
    />
</div>
```

### Next Steps

1. **Create Component**: `src/lib/components/faces/PersonSearchBar.svelte`
2. **Integrate in Page**: Modify `src/routes/faces/suggestions/+page.svelte`
3. **Add Tests**: Create `src/tests/components/PersonSearchBar.test.ts`
4. **Documentation**: Update CLAUDE.md with new component patterns

---

## Appendix A: Code Snippets

### Full PersonSearchBar Component Template

```svelte
<script lang="ts">
    import type { Person } from '$lib/api/faces';
    import { tid } from '$lib/testing/testid';

    interface Props {
        persons: Person[];
        loading?: boolean;
        selectedPersonId: string | null;
        onSelect: (personId: string | null, personName: string | null) => void;
        placeholder?: string;
        testId?: string;
    }

    let {
        persons,
        loading = false,
        selectedPersonId,
        onSelect,
        placeholder = 'Search persons...',
        testId = 'person-search-bar'
    }: Props = $props();

    // Scoped test ID generator
    const t = $derived((...segments: string[]) =>
        segments.length === 0 ? testId : tid(testId, ...segments)
    );

    // State
    let searchQuery = $state('');
    let showDropdown = $state(false);
    let highlightedIndex = $state(-1);
    let inputRef = $state<HTMLInputElement | null>(null);
    let dropdownRef = $state<HTMLUListElement | null>(null);

    // Derived state
    let filteredPersons = $derived(
        persons.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    let selectedPerson = $derived(
        persons.find(p => p.id === selectedPersonId) ?? null
    );

    // Event handlers
    function handleSelect(person: Person) {
        onSelect(person.id, person.name);
        searchQuery = '';
        showDropdown = false;
        highlightedIndex = -1;
    }

    function handleClear() {
        onSelect(null, null);
        searchQuery = '';
    }

    function handleFocus() {
        showDropdown = true;
    }

    function handleBlur() {
        // Delay to allow dropdown click
        setTimeout(() => {
            showDropdown = false;
            searchQuery = '';
            highlightedIndex = -1;
        }, 200);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (!showDropdown) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                highlightedIndex = Math.min(highlightedIndex + 1, filteredPersons.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, -1);
                break;
            case 'Enter':
                event.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredPersons.length) {
                    handleSelect(filteredPersons[highlightedIndex]);
                }
                break;
            case 'Escape':
                event.preventDefault();
                showDropdown = false;
                searchQuery = '';
                highlightedIndex = -1;
                inputRef?.blur();
                break;
        }
    }

    // Click outside detection
    $effect(() => {
        if (!showDropdown) return;

        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (
                inputRef && !inputRef.contains(target) &&
                dropdownRef && !dropdownRef.contains(target)
            ) {
                showDropdown = false;
                searchQuery = '';
                highlightedIndex = -1;
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    });
</script>

<div class="person-search-bar" data-testid={t()}>
    {#if selectedPerson}
        <div class="selected-badge" data-testid={t('selected-badge')}>
            <span class="badge-text">{selectedPerson.name}</span>
            <button
                type="button"
                class="clear-btn"
                onclick={handleClear}
                aria-label="Clear person filter"
                data-testid={t('btn-clear')}
            >
                ×
            </button>
        </div>
    {/if}

    <div class="input-container">
        <input
            type="text"
            bind:value={searchQuery}
            bind:this={inputRef}
            onfocus={handleFocus}
            onblur={handleBlur}
            onkeydown={handleKeyDown}
            {placeholder}
            disabled={loading}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="person-dropdown"
            aria-autocomplete="list"
            aria-label="Filter suggestions by person"
            data-testid={t('input-search')}
        />

        {#if showDropdown && filteredPersons.length > 0}
            <ul
                id="person-dropdown"
                class="dropdown"
                bind:this={dropdownRef}
                role="listbox"
                data-testid={t('dropdown')}
            >
                {#each filteredPersons as person, index (person.id)}
                    <li>
                        <button
                            type="button"
                            class="dropdown-option"
                            class:highlighted={index === highlightedIndex}
                            onmousedown={() => handleSelect(person)}
                            role="option"
                            aria-selected={index === highlightedIndex}
                            data-testid={t('option', person.id)}
                        >
                            <span class="person-name">{person.name}</span>
                            <span class="person-count">{person.faceCount} faces</span>
                        </button>
                    </li>
                {/each}
            </ul>
        {:else if showDropdown && searchQuery && filteredPersons.length === 0}
            <div class="empty-state" data-testid={t('empty-state')}>
                No persons found matching "{searchQuery}"
            </div>
        {/if}
    </div>
</div>

<style>
    .person-search-bar {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
        max-width: 400px;
    }

    .selected-badge {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background-color: #e8f4fd;
        color: #1565c0;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .badge-text {
        flex: 1;
    }

    .clear-btn {
        width: 20px;
        height: 20px;
        padding: 0;
        border: none;
        background: none;
        color: #1565c0;
        font-size: 1.25rem;
        line-height: 1;
        cursor: pointer;
        border-radius: 50%;
        transition: background-color 0.2s;
    }

    .clear-btn:hover {
        background-color: rgba(21, 101, 192, 0.2);
    }

    .input-container {
        position: relative;
    }

    input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.95rem;
        background-color: white;
        transition: border-color 0.2s;
    }

    input:focus {
        outline: none;
        border-color: #4a90e2;
    }

    input:disabled {
        background-color: #f5f5f5;
        color: #999;
        cursor: not-allowed;
    }

    .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin: 0;
        padding: 0;
        list-style: none;
        background-color: white;
        border: 1px solid #4a90e2;
        border-top: none;
        border-radius: 0 0 6px 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-height: 300px;
        overflow-y: auto;
        z-index: 100;
    }

    .dropdown-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
        padding: 0.75rem 1rem;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .dropdown-option:hover,
    .dropdown-option.highlighted {
        background-color: #f5f5f5;
    }

    .dropdown-option.highlighted {
        background-color: #e8f4fd;
    }

    .person-name {
        flex: 1;
        font-weight: 500;
        color: #333;
    }

    .person-count {
        font-size: 0.75rem;
        color: #999;
    }

    .empty-state {
        padding: 1rem;
        text-align: center;
        color: #999;
        font-size: 0.9rem;
        background-color: white;
        border: 1px solid #4a90e2;
        border-top: none;
        border-radius: 0 0 6px 6px;
    }
</style>
```

---

## Appendix B: API Response Examples

### listPersons Response
```json
{
    "items": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe",
            "status": "active",
            "faceCount": 127,
            "prototypeCount": 5,
            "createdAt": "2025-01-01T10:00:00Z",
            "updatedAt": "2025-01-05T15:30:00Z"
        },
        {
            "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            "name": "Jane Smith",
            "status": "active",
            "faceCount": 89,
            "prototypeCount": 3,
            "createdAt": "2025-01-02T12:00:00Z",
            "updatedAt": "2025-01-06T09:15:00Z"
        }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 100
}
```

### listGroupedSuggestions Response (Filtered)
```json
{
    "groups": [
        {
            "personId": "550e8400-e29b-41d4-a716-446655440000",
            "personName": "John Doe",
            "suggestionCount": 15,
            "maxConfidence": 0.92,
            "suggestions": [
                {
                    "id": 1234,
                    "faceInstanceId": "abc-123",
                    "suggestedPersonId": "550e8400-e29b-41d4-a716-446655440000",
                    "confidence": 0.92,
                    "sourceFaceId": "def-456",
                    "status": "pending",
                    "createdAt": "2025-01-07T08:00:00Z",
                    "reviewedAt": null,
                    "faceThumbnailUrl": "/api/v1/images/5678/thumbnail",
                    "personName": "John Doe",
                    "fullImageUrl": "/api/v1/images/5678/full",
                    "bboxX": 100,
                    "bboxY": 200,
                    "bboxW": 150,
                    "bboxH": 180,
                    "detectionConfidence": 0.95,
                    "qualityScore": 0.88
                }
                // ... 14 more suggestions
            ]
        }
    ],
    "totalGroups": 1,
    "totalSuggestions": 15,
    "page": 1,
    "groupsPerPage": 10,
    "suggestionsPerGroup": 20
}
```

---

**End of Research Document**

**Next Action**: Proceed with implementation of PersonSearchBar component per recommended approach.
