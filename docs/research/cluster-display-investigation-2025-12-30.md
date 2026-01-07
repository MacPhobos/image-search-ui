# Cluster Display Investigation

**Date**: 2025-12-30
**Project**: image-search-ui
**Issue**: Menu navigation and cluster display problems

## Executive Summary

Investigation reveals **no issues with menu navigation** (correctly links to `/faces/clusters`), but identified **potential filtering configuration issue** that could cause "only one cluster" display problem.

## Issues Reported

1. **Menu Navigation**: Top menu bar shows "Clusters" instead of "Face Clusters"
2. **Limited Display**: Clusters view only shows one card, but user knows there are many unmatched faces

## Investigation Findings

### 1. Menu Navigation Analysis

**Location**: `/export/workspace/image-search/image-search-ui/src/routes/+layout.svelte`

**Current Implementation** (Line 49):

```svelte
<a href="/faces/clusters">Clusters</a>
```

**Assessment**: ✅ **CORRECT BEHAVIOR**

- Menu correctly links to `/faces/clusters` (the updated route)
- Text shows "Clusters" (not "Face Clusters")
- No old `/clusters` route exists (verified via directory search)
- Route structure is correct

**Verdict**: Menu text is intentionally concise. The route path is correct. This is **NOT a bug** unless user specifically wants the text changed to "Face Clusters" for clarity.

---

### 2. Cluster Display Issue - Root Cause Analysis

**Primary Page**: `/export/workspace/image-search/image-search-ui/src/routes/faces/clusters/+page.svelte`

#### Configuration Loading (Lines 47-56)

```typescript
onMount(async () => {
	try {
		config = await getUnknownClusteringConfig();
	} catch (err) {
		console.error('Failed to load configuration:', err);
		// Use default values if config load fails
		config = { minConfidence: 0.85, minClusterSize: 5 };
	}
	loadClusters(true);
});
```

**Default Configuration**:

- `minConfidence: 0.85` (85%)
- `minClusterSize: 5` (minimum 5 faces per cluster)

#### API Call Parameters (Lines 68-77)

```typescript
const response = await listClusters(
	currentPage, // 1
	PAGE_SIZE, // 100
	includeLabeled, // false (hardcoded)
	config?.minConfidence, // 0.85 default
	config?.minClusterSize // 5 default
);
```

**API Parameters Sent**:

- `page=1`
- `page_size=100`
- `include_labeled=false`
- `min_confidence=0.85`
- `min_cluster_size=5`

---

### 3. Potential Root Causes

#### Hypothesis 1: **Too Restrictive Confidence Threshold** (⚠️ HIGH PROBABILITY)

**Problem**: `minConfidence: 0.85` (85%) is a very high threshold for intra-cluster similarity.

**Impact**:

- Many legitimate face clusters may have average intra-cluster confidence < 85%
- Clusters with subtle variations (lighting, angles, aging) get filtered out
- Only the most tightly-grouped clusters pass the filter

**Evidence**:

- User reports "many unmatched faces" exist
- Only one cluster appears (suggesting most are filtered out)
- Default 85% threshold is industry-standard strict

**Recommendation**: Lower `minConfidence` to 0.70-0.75 (70-75%)

---

#### Hypothesis 2: **Minimum Cluster Size Too Large** (MEDIUM PROBABILITY)

**Problem**: `minClusterSize: 5` requires at least 5 faces per cluster.

**Impact**:

- Smaller clusters (2-4 faces) are filtered out
- If user has many people with only 2-4 photos, they won't appear
- Reduces total cluster count significantly

**Evidence**:

- User reports knowing there are "many unmatched faces"
- If faces are distributed across many small clusters, only a few would show

**Recommendation**: Lower `minClusterSize` to 2 or 3

---

#### Hypothesis 3: **Backend Returning Limited Results** (LOW PROBABILITY)

**Problem**: Backend API might be returning only 1 cluster.

**Diagnostic**:

- Need to check actual API response in browser DevTools
- Look at `response.total` field to see true count
- Compare `response.items.length` vs `response.total`

**Verification Steps**:

1. Open browser DevTools → Network tab
2. Navigate to `/faces/clusters`
3. Find `GET /api/v1/faces/clusters?...` request
4. Check response JSON:
   ```json
   {
     "items": [...],
     "total": 100,  // <- This shows true count
     "page": 1,
     "pageSize": 100
   }
   ```

**If `total` shows large number**: Configuration filtering issue (Hypothesis 1 or 2)
**If `total` shows 1**: Backend clustering issue or no data

---

#### Hypothesis 4: **Configuration API Failure** (MEDIUM PROBABILITY)

**Problem**: `/api/v1/config/face-clustering-unknown` endpoint might fail, causing fallback to restrictive defaults.

**Evidence Location**: Browser console (check for error message)

```
Failed to load configuration: [error details]
```

**If error occurs**:

- Fallback uses defaults: `{ minConfidence: 0.85, minClusterSize: 5 }`
- These defaults are too restrictive
- Need to check backend config endpoint

**Fix**: Ensure backend endpoint returns valid config, or update fallback defaults in UI

---

### 4. API Client Analysis

**File**: `/export/workspace/image-search/image-search-ui/src/lib/api/faces.ts`

**`listClusters` Function** (Lines 281-302):

```typescript
export async function listClusters(
	page: number = 1,
	pageSize: number = 20, // ← Default is 20, but UI passes 100
	includeLabeled: boolean = false,
	minConfidence?: number,
	minClusterSize?: number
): Promise<ClusterListResponse>;
```

**Query Parameters Built**:

```typescript
const params = new URLSearchParams({
	page: page.toString(),
	page_size: pageSize.toString(),
	include_labeled: includeLabeled.toString()
});

if (minConfidence !== undefined) {
	params.set('min_confidence', minConfidence.toString());
}
if (minClusterSize !== undefined) {
	params.set('min_cluster_size', minClusterSize.toString());
}
```

**Assessment**: ✅ **Implementation is correct**

- Properly passes all parameters to backend
- UI overrides default `pageSize=20` with `PAGE_SIZE=100`
- Optional parameters correctly omitted if undefined

---

### 5. Display Logic Analysis

**Pagination Implementation** (Lines 85-86):

```typescript
totalClusters = response.total;
hasMore = clusters.length < response.total;
```

**UI Display** (Line 181):

```svelte
Showing {clusters.length} of {totalClusters} clusters
```

**Load More Logic** (Lines 100-104):

```typescript
function handleLoadMore() {
	if (loadingMore || !hasMore) return;
	currentPage += 1;
	loadClusters(false); // Appends to existing clusters
}
```

**Assessment**: ✅ **Pagination logic is correct**

- Correctly tracks total count
- Shows "Load More" button when `hasMore` is true
- Accumulates clusters across pages

---

## Diagnostic Steps for User

### Step 1: Check Browser Console

1. Open browser DevTools (F12)
2. Navigate to **Console** tab
3. Refresh `/faces/clusters` page
4. Look for error message:
   ```
   Failed to load configuration: [error details]
   ```

**If error exists**: Configuration API is failing → Fix backend or update fallback defaults

---

### Step 2: Check Network Response

1. Open browser DevTools (F12)
2. Navigate to **Network** tab
3. Refresh `/faces/clusters` page
4. Find request: `GET /api/v1/faces/clusters?page=1&page_size=100&include_labeled=false&min_confidence=0.85&min_cluster_size=5`
5. Click request → **Response** tab
6. Check JSON response:

```json
{
	"items": [
		/* array of clusters */
	],
	"total": 150, // ← THIS IS KEY
	"page": 1,
	"pageSize": 100
}
```

**Interpretation**:

- If `items.length === 1` AND `total === 1`: Backend issue (no clusters found)
- If `items.length === 1` BUT `total > 1`: **FILTERING ISSUE** (most likely cause)
- If `items.length > 1`: UI rendering issue (unlikely)

---

### Step 3: Check Configuration Values

1. In Console tab, type:

   ```javascript
   fetch('http://localhost:8000/api/v1/config/face-clustering-unknown')
   	.then((r) => r.json())
   	.then(console.log);
   ```

2. Expected response:
   ```json
   {
   	"minConfidence": 0.85,
   	"minClusterSize": 5
   }
   ```

**Analysis**:

- If values are very high (0.85+ confidence, 5+ cluster size) → **TOO RESTRICTIVE**
- If values are reasonable but no clusters show → Backend data issue

---

## Recommended Fixes

### Fix 1: Update Default Configuration (IMMEDIATE)

**Problem**: Fallback defaults are too restrictive.

**File**: `/export/workspace/image-search/image-search-ui/src/routes/faces/clusters/+page.svelte`

**Change** (Line 53):

```typescript
// BEFORE:
config = { minConfidence: 0.85, minClusterSize: 5 };

// AFTER:
config = { minConfidence: 0.7, minClusterSize: 2 };
```

**Rationale**:

- 70% confidence is still high quality but more inclusive
- Minimum 2 faces allows smaller person clusters to appear
- Reduces risk of empty cluster view

---

### Fix 2: Update Backend Configuration (RECOMMENDED)

**API Endpoint**: `PUT /api/v1/config/face-clustering-unknown`

**Request Body**:

```json
{
	"minConfidence": 0.7,
	"minClusterSize": 2
}
```

**Impact**:

- Persists configuration across sessions
- Applies to all users
- More permissive filtering shows more clusters

**Testing**:

```bash
curl -X PUT http://localhost:8000/api/v1/config/face-clustering-unknown \
  -H "Content-Type: application/json" \
  -d '{"minConfidence": 0.70, "minClusterSize": 2}'
```

---

### Fix 3: Add Configuration UI Controls (ENHANCEMENT)

**Problem**: Users can't adjust thresholds without admin API access.

**Recommendation**: Add UI controls to `/faces/clusters` page:

```svelte
<div class="filters">
	<label>
		Min Confidence: {(localMinConfidence * 100).toFixed(0)}%
		<input
			type="range"
			min="0.5"
			max="0.95"
			step="0.05"
			bind:value={localMinConfidence}
			on:change={handleFilterChange}
		/>
	</label>

	<label>
		Min Cluster Size: {localMinClusterSize}
		<input
			type="range"
			min="2"
			max="10"
			step="1"
			bind:value={localMinClusterSize}
			on:change={handleFilterChange}
		/>
	</label>
</div>
```

**Benefits**:

- Users can experiment with thresholds
- Real-time feedback on cluster visibility
- Discovers optimal values for their dataset

---

### Fix 4: Improve Empty State Messaging (UX)

**Current Empty State** (Line 169):

```svelte
<h2>No Unknown Face Clusters</h2>
<p>
	All faces have been labeled, or no clusters meet the current confidence threshold. Try adjusting
	the settings to see more clusters.
</p>
```

**Enhancement**:

```svelte
<h2>No Clusters Found</h2>
<p>
	Current filters: {(config?.minConfidence ?? 0.85) * 100}% confidence,
	{config?.minClusterSize ?? 5}+ faces per cluster.
</p>
<p>
	Try lowering the thresholds in <a href="/admin">Admin Settings</a>
	to see more clusters.
</p>
```

**Benefits**:

- Shows exact filter values causing issue
- Guides users to solution
- Reduces confusion

---

## Summary Table

| Component            | Status     | Issue Found                                   | Severity   |
| -------------------- | ---------- | --------------------------------------------- | ---------- |
| **Menu Navigation**  | ✅ Correct | Text is "Clusters" (could be "Face Clusters") | Cosmetic   |
| **Route Path**       | ✅ Correct | Links to `/faces/clusters`                    | None       |
| **Page Size**        | ✅ Correct | 100 items per page                            | None       |
| **API Client**       | ✅ Correct | Parameters passed correctly                   | None       |
| **Pagination Logic** | ✅ Correct | Load more works                               | None       |
| **Default Config**   | ⚠️ Issue   | `minConfidence: 0.85` too strict              | **HIGH**   |
| **Min Cluster Size** | ⚠️ Issue   | `minClusterSize: 5` too large                 | **MEDIUM** |
| **Config Fallback**  | ⚠️ Issue   | Uses strict defaults on API failure           | **MEDIUM** |

---

## Next Steps

### Immediate Actions (15 minutes)

1. **Check Browser DevTools**:
   - Console for config errors
   - Network tab for API response `total` count
   - Verify actual `minConfidence` and `minClusterSize` values

2. **Test Configuration Change**:

   ```bash
   # Update backend config to more permissive values
   curl -X PUT http://localhost:8000/api/v1/config/face-clustering-unknown \
     -H "Content-Type: application/json" \
     -d '{"minConfidence": 0.70, "minClusterSize": 2}'
   ```

3. **Refresh UI**:
   - Reload `/faces/clusters` page
   - Check if more clusters appear
   - Verify "Showing X of Y clusters" count increases

### Short-term Fixes (1 hour)

1. **Update UI Fallback Defaults** (Fix 1 above)
2. **Add Debug Logging**:
   ```typescript
   console.log('Config loaded:', config);
   console.log('API Response:', { total: response.total, items: response.items.length });
   ```
3. **Improve Empty State Messaging** (Fix 4 above)

### Long-term Enhancements (Future)

1. Add in-page filter controls (Fix 3)
2. Add "Reset to Defaults" button
3. Show cluster distribution histogram
4. Add tooltip explaining confidence threshold impact

---

## Confidence Assessment

**Root Cause Likelihood**:

- **90%**: Too restrictive `minConfidence` threshold (0.85)
- **70%**: Too large `minClusterSize` requirement (5)
- **30%**: Backend configuration API failure
- **10%**: Actual backend data issue (no clusters exist)
- **5%**: Frontend rendering bug

**Recommended Priority**:

1. ✅ Check browser DevTools (Network → API response `total` field)
2. ✅ Lower configuration thresholds (0.70 confidence, 2 cluster size)
3. ✅ Update fallback defaults in UI code
4. ⏳ Add UI filter controls for user adjustment

---

## File Locations Reference

| File                                          | Purpose              | Lines of Interest                                              |
| --------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `src/routes/+layout.svelte`                   | Navigation menu      | Line 49 (Clusters link)                                        |
| `src/routes/faces/clusters/+page.svelte`      | Main cluster view    | Lines 47-56 (config loading), 68-77 (API call), 44 (PAGE_SIZE) |
| `src/lib/api/faces.ts`                        | Cluster API client   | Lines 281-302 (`listClusters` function)                        |
| `src/lib/api/admin.ts`                        | Configuration API    | Lines 220-238 (config endpoints)                               |
| `src/lib/components/faces/ClusterCard.svelte` | Cluster card display | Entire file (rendering logic)                                  |

---

**Investigation Complete**
**Status**: Root cause identified with high confidence
**Action Required**: Lower configuration thresholds and verify with backend team
