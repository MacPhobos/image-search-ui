# People Page Search Implementation Analysis

**Date**: 2026-01-18
**Purpose**: Investigate current /people page implementation to plan search functionality
**Status**: Complete

---

## Executive Summary

The `/people` page currently displays all persons (identified, unidentified, and noise) with client-side filtering by type and sorting. **No server-side search is currently supported by the backend API**. Recommendation: **Implement client-side search** for immediate functionality, with optional backend search as a future enhancement.

---

## 1. Current Page Structure

### File Location

- **Path**: `src/routes/people/+page.svelte`
- **Lines**: 636 lines (within complexity limits)
- **Component**: `UnifiedPersonCard.svelte` (208 lines)

### Current Features

1. **Data Loading**
   - API: `listUnifiedPeople()` from `src/lib/api/faces.ts`
   - Endpoint: `GET /api/v1/faces/people`
   - Returns all people in a single request (no pagination)

2. **Filters** (Client-side using `$derived`)
   - Type filters (checkboxes):
     - Show Identified (default: ON)
     - Show Unidentified (default: OFF)
     - Show Unknown Faces/Noise (default: OFF)
   - Sort by: Face Count (default) or Name
   - Sort order: Ascending or Descending

3. **State Management** (Svelte 5 runes)

   ```typescript
   let loading = $state(true);
   let error = $state<string | null>(null);
   let data = $state<UnifiedPeopleListResponse | null>(null);

   // Filters
   let showIdentified = $state(true);
   let showUnidentified = $state(false);
   let showNoise = $state(false);
   let sortBySelection = $state<string>('faceCount');
   let sortOrderSelection = $state<string>('desc');

   // Derived filters
   let identifiedPeople = $derived(data?.people.filter((p) => p.type === 'identified') ?? []);
   let unidentifiedPeople = $derived(data?.people.filter((p) => p.type === 'unidentified') ?? []);
   let noisePeople = $derived(data?.people.filter((p) => p.type === 'noise') ?? []);
   ```

4. **Effects**
   - Reloads data when filters change (lines 129-137)
   - Batch-loads thumbnails when data changes (lines 140-147)

---

## 2. Person Data Model

### UnifiedPersonResponse (from `src/lib/api/faces.ts`)

```typescript
export interface UnifiedPersonResponse {
	id: string; // UUID (person ID or cluster ID)
	name: string; // Person name or "Unknown Cluster #N"
	type: PersonType; // 'identified' | 'unidentified' | 'noise'
	faceCount: number; // Number of faces detected
	thumbnailUrl?: string | null; // Representative face thumbnail
	confidence?: number | null; // Cluster confidence (0.0-1.0) for unidentified
}
```

### Searchable Fields

From the data model, the following fields could be searched:

1. **name** (string) - Primary search target
2. **type** (enum) - Already filtered via checkboxes
3. **faceCount** (number) - Could support "more than X faces"
4. **confidence** (number) - For unidentified clusters only

**Recommendation**: Focus on **name** search as primary use case.

---

## 3. API Structure

### Current API Function

```typescript
export async function listUnifiedPeople(
	params?: ListUnifiedPeopleParams
): Promise<UnifiedPeopleListResponse>;
```

**Parameters** (all optional):

- `includeIdentified?: boolean`
- `includeUnidentified?: boolean`
- `includeNoise?: boolean`
- `sortBy?: 'faceCount' | 'name'`
- `sortOrder?: 'asc' | 'desc'`

**Response**:

```typescript
export interface UnifiedPeopleListResponse {
	people: UnifiedPersonResponse[]; // Array of all people
	total: number;
	identifiedCount: number;
	unidentifiedCount: number;
	noiseCount: number;
}
```

### Backend Search Support

**Status**: ❌ **No server-side search is currently implemented**

**Evidence**:

- No `search`, `query`, or `filter` parameters in `listUnifiedPeople()` API
- No matching OpenAPI endpoint for person search
- Backend returns all results in one call (no pagination)

**Implications**:

- Client-side search is the only option without backend changes
- Performance is acceptable for typical use cases (100-1000 people)
- If dataset grows to 10k+ people, backend search would be needed

---

## 4. Component Structure

### UnifiedPersonCard.svelte

**Location**: `src/lib/components/faces/UnifiedPersonCard.svelte`
**Size**: 208 lines (within limits)

**Props**:

```typescript
interface Props {
	person: UnifiedPersonResponse;
	showAssignButton?: boolean;
	onClick?: (person: UnifiedPersonResponse) => void;
	onAssign?: (person: UnifiedPersonResponse) => void;
	selected?: boolean;
}
```

**Features**:

- Displays person avatar (thumbnail or initials)
- Shows name, type badge (Identified/Needs Name/Review)
- Face count display
- Confidence score (for unidentified clusters)
- "Assign Name" button (for unidentified clusters)
- Clickable for navigation (except noise faces)
- Uses `thumbnailCache` for optimized loading

**Rendering Sections**:

```svelte
{#if showIdentified && identifiedPeople.length > 0}
	<section class="people-section">
		{#each identifiedPeople as person (person.id)}
			<UnifiedPersonCard {person} onClick={() => handlePersonClick(person)} />
		{/each}
	</section>
{/if}

{#if showUnidentified && unidentifiedPeople.length > 0}
	<section class="people-section">
		{#each unidentifiedPeople as person (person.id)}
			<UnifiedPersonCard {person} showAssignButton={true} ... />
		{/each}
	</section>
{/if}

{#if showNoise && noisePeople.length > 0}
	<section class="people-section">
		{#each noisePeople as person (person.id)}
			<UnifiedPersonCard {person} showAssignButton={true} ... />
		{/each}
	</section>
{/if}
```

---

## 5. Recommendation: Client-Side vs Server-Side Search

### Option A: Client-Side Search (RECOMMENDED)

**Approach**:

1. Add search input field to filters bar
2. Use `$state` for search query
3. Use `$derived` to filter people based on search query
4. Apply search across all types (identified, unidentified, noise)

**Advantages**:

- ✅ No backend changes required
- ✅ Instant search feedback (no network delay)
- ✅ Works with existing API
- ✅ Simpler implementation (1 file change)
- ✅ Sufficient for typical datasets (100-1000 people)

**Disadvantages**:

- ❌ Must load all people into memory
- ❌ Performance degrades with 10k+ people
- ❌ No fuzzy matching (unless using Fuse.js)

**Implementation Complexity**: 🟢 Low (30-50 lines)

---

### Option B: Server-Side Search (FUTURE)

**Approach**:

1. Add backend API endpoint: `GET /api/v1/faces/people?search=query`
2. Update `listUnifiedPeople()` to accept `search` param
3. Backend performs SQL `ILIKE '%query%'` or full-text search
4. Add pagination support for large result sets

**Advantages**:

- ✅ Scales to unlimited people count
- ✅ Can support fuzzy matching via PostgreSQL extensions
- ✅ Offloads filtering to database (better performance)
- ✅ Can return partial results (pagination)

**Disadvantages**:

- ❌ Requires backend API changes (out of scope for UI-only work)
- ❌ Network latency on each keystroke (needs debouncing)
- ❌ More complex error handling

**Implementation Complexity**: 🔴 High (backend + frontend changes)

---

## 6. Recommended Search Implementation (Client-Side)

### UI Placement

Add search field to filters bar (line 182 in `+page.svelte`):

```svelte
<section class="filters-bar">
	<!-- NEW: Search input -->
	<div class="search-group">
		<Input type="text" placeholder="Search by name..." bind:value={searchQuery} class="w-64" />
	</div>

	<Separator orientation="vertical" class="h-8" />

	<!-- Existing filters -->
	<div class="filter-group">...</div>
	...
</section>
```

### State & Filtering Logic

```typescript
// Add search state
let searchQuery = $state('');

// Normalize search query (case-insensitive, trim whitespace)
let normalizedQuery = $derived(searchQuery.trim().toLowerCase());

// Filter function
function matchesSearch(person: UnifiedPersonResponse): boolean {
	if (!normalizedQuery) return true; // No search = show all
	return person.name.toLowerCase().includes(normalizedQuery);
}

// Update derived filters to include search
let identifiedPeople = $derived(
	data?.people.filter((p) => p.type === 'identified' && matchesSearch(p)) ?? []
);
let unidentifiedPeople = $derived(
	data?.people.filter((p) => p.type === 'unidentified' && matchesSearch(p)) ?? []
);
let noisePeople = $derived(
	data?.people.filter((p) => p.type === 'noise' && matchesSearch(p)) ?? []
);
```

### Display Logic

Update section headers to show filtered counts:

```svelte
<h2 class="section-title">
	<Badge variant="default">Identified</Badge>
	<span class="section-count">{identifiedPeople.length} people</span>
</h2>
```

### Empty State

Add "No results" state when search has no matches:

```svelte
{#if normalizedQuery && identifiedPeople.length === 0 && unidentifiedPeople.length === 0 && noisePeople.length === 0}
	<div class="empty-state">
		<p>No people found matching "{searchQuery}"</p>
		<button onclick={() => (searchQuery = '')}>Clear search</button>
	</div>
{/if}
```

---

## 7. Performance Considerations

### Current Dataset Size

- Typical use case: 10-100 identified persons, 20-50 unidentified clusters
- Edge case: 500+ persons (still manageable with client-side filtering)
- Breaking point: 5000+ persons (would need backend search + pagination)

### Client-Side Performance

- **Filtering cost**: O(n) per keystroke, where n = total people count
- **Acceptable**: n < 1000 (sub-millisecond filtering)
- **Optimization**: Use `$derived` (reactive) instead of `$effect` (imperative)

### Future Optimization (if needed)

- Add debouncing to search input (wait 300ms after typing stops)
- Use virtual scrolling for large result sets (svelte-virtual)
- Implement backend search when dataset exceeds 1000 people

---

## 8. Testing Strategy

### Test Coverage Required

- **File**: `src/tests/routes/people.test.ts` (create if not exists)

**Test Cases**:

1. Search input renders correctly
2. Typing in search filters results
3. Search is case-insensitive
4. Search works across all person types (identified, unidentified, noise)
5. Empty search shows all results
6. No matches shows empty state
7. Clearing search restores all results
8. Search works with type filters (identified/unidentified checkboxes)

**Mock Data**:

```typescript
const mockPeople: UnifiedPersonResponse[] = [
	{ id: '1', name: 'John Doe', type: 'identified', faceCount: 5, thumbnailUrl: null },
	{ id: '2', name: 'Jane Smith', type: 'identified', faceCount: 3, thumbnailUrl: null },
	{ id: '3', name: 'Unknown Cluster #1', type: 'unidentified', faceCount: 8, confidence: 0.85 }
];
```

---

## 9. Implementation Checklist

### Phase 1: Client-Side Search (Recommended)

- [ ] Add `searchQuery` state variable
- [ ] Add `<Input>` component to filters bar
- [ ] Create `matchesSearch()` filter function
- [ ] Update `$derived` filters to include search
- [ ] Update section counts to show filtered results
- [ ] Add "No results" empty state
- [ ] Style search input to match existing UI
- [ ] Test search functionality (unit + manual)
- [ ] Verify accessibility (label, aria-label)
- [ ] Document search behavior in component comments

### Phase 2: Backend Search (Future, Optional)

- [ ] Add `search` parameter to backend API (backend team)
- [ ] Update `listUnifiedPeople()` to accept `search` param
- [ ] Add debouncing to search input (300ms delay)
- [ ] Add loading indicator during search
- [ ] Handle search errors gracefully
- [ ] Add pagination support for large result sets
- [ ] Update tests to mock search API responses

---

## 10. Related Files

### Frontend

- `src/routes/people/+page.svelte` (636 lines) - Main page
- `src/lib/components/faces/UnifiedPersonCard.svelte` (208 lines) - Card component
- `src/lib/api/faces.ts` - API client with `listUnifiedPeople()`
- `src/lib/stores/thumbnailCache.svelte.ts` - Thumbnail caching

### Backend (for reference)

- `image-search-service/docs/api-contract.md` - API contract
- `/api/v1/faces/people` - Unified people endpoint (no search support)

---

## 11. Decision

**Recommended Approach**: **Client-Side Search**

**Rationale**:

1. No backend changes required (immediate implementation)
2. Sufficient performance for typical use cases (100-1000 people)
3. Simpler testing and maintenance
4. Instant user feedback (no network latency)
5. Backend search can be added later if dataset grows

**Next Steps**:

1. Implement client-side search using `$derived` filtering
2. Add tests for search functionality
3. Monitor usage to determine if backend search is needed
4. If dataset exceeds 1000 people, consider backend search

---

## Appendix A: Code Snippets

### Current Filter Implementation (for reference)

```typescript
// Lines 48-51: Derived filters (current)
let identifiedPeople = $derived(data?.people.filter((p) => p.type === 'identified') ?? []);
let unidentifiedPeople = $derived(data?.people.filter((p) => p.type === 'unidentified') ?? []);
let noisePeople = $derived(data?.people.filter((p) => p.type === 'noise') ?? []);

// Lines 129-137: Effect for reloading on filter changes
$effect(() => {
	void showIdentified;
	void showUnidentified;
	void showNoise;
	void sortBy;
	void sortOrder;
	loadPeople();
});
```

### Proposed Search State (with search)

```typescript
// Add search state
let searchQuery = $state('');
let normalizedQuery = $derived(searchQuery.trim().toLowerCase());

// Helper function
function matchesSearch(person: UnifiedPersonResponse): boolean {
	if (!normalizedQuery) return true;
	return person.name.toLowerCase().includes(normalizedQuery);
}

// Updated derived filters
let identifiedPeople = $derived(
	data?.people.filter((p) => p.type === 'identified' && matchesSearch(p)) ?? []
);
let unidentifiedPeople = $derived(
	data?.people.filter((p) => p.type === 'unidentified' && matchesSearch(p)) ?? []
);
let noisePeople = $derived(
	data?.people.filter((p) => p.type === 'noise' && matchesSearch(p)) ?? []
);
```

---

## Appendix B: API Response Example

```json
{
	"people": [
		{
			"id": "uuid-person-1",
			"name": "John Doe",
			"type": "identified",
			"faceCount": 42,
			"thumbnailUrl": "/images/12345/thumbnail",
			"confidence": null
		},
		{
			"id": "cluster-123",
			"name": "Unknown Cluster #123",
			"type": "unidentified",
			"faceCount": 8,
			"thumbnailUrl": "/images/67890/thumbnail",
			"confidence": 0.85
		},
		{
			"id": "-1",
			"name": "Ungrouped Faces",
			"type": "noise",
			"faceCount": 15,
			"thumbnailUrl": null,
			"confidence": null
		}
	],
	"total": 3,
	"identifiedCount": 1,
	"unidentifiedCount": 1,
	"noiseCount": 15
}
```

---

**Research Complete**: 2026-01-18
**Recommended Implementation**: Client-side search using Svelte 5 `$derived` filtering
**Estimated Effort**: 1-2 hours (implementation + tests)
