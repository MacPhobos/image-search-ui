# Face UI Documentation

This document describes the Face UI feature in the Image Search application, which enables users to browse face clusters, label people, and filter search results by detected faces.

## Overview

The Face UI provides:

- **Face Clusters**: Browse groups of similar faces detected in your photos
- **Person Labeling**: Assign names to face clusters to identify people
- **People Management**: View and manage identified people
- **Search Filtering**: Filter photo search results by selected people

## Routes

| Route                         | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `/faces/clusters`             | Browse all face clusters (unlabeled and labeled) |
| `/faces/clusters/[clusterId]` | View and label a specific cluster                |
| `/people`                     | Browse all identified people                     |
| `/people/[personId]`          | View a person's profile and photos               |

## Features

### Face Clusters Page (`/faces/clusters`)

Browse face clusters with the following features:

- **Tabs**: Switch between "Unlabeled" (default) and "All Clusters"
- **Pagination**: Load more clusters with "Load More" button
- **Cluster Cards**: Show face count, quality score, and sample faces
- **Quick Navigation**: Click a cluster card to view details

### Cluster Detail Page (`/faces/clusters/[clusterId]`)

View and manage a specific cluster:

- **Face Grid**: View all faces in the cluster with quality scores
- **Quality Distribution**: See breakdown of face quality (Excellent/Good/Fair/Poor)
- **Label Button**: Assign a person name to the cluster
- **Split Button**: Split mixed clusters into sub-clusters
- **Pagination**: Load more faces with "Load More" button

### Label Cluster Modal

When labeling a cluster:

1. Search for existing persons or type a new name
2. Click a person to select them, or click "Create [name]" to create new
3. Click "Label Cluster" to assign the person

### People Page (`/people`)

Browse identified people:

- **Search**: Filter by person name
- **Status Filter**: Filter by Active, Merged, or Hidden status
- **Person Cards**: Show face count, prototype count, and creation date
- **Quick Navigation**: Click to view person details

### Person Detail Page (`/people/[personId]`)

View a person's profile:

- **Profile Header**: Avatar, name, stats, and status
- **Photos Section**: Grid of photos containing this person
- **Merge Button**: Merge this person into another

### Search Integration

The main search page now includes:

- **People Filter**: Multi-select dropdown in the Filters panel
- **Selected Chips**: Visual display of selected people with remove button
- **Quick Links**: Direct links to Faces and People pages

## API Endpoints

The Face UI consumes these backend endpoints:

### Clusters

```
GET  /api/v1/faces/clusters?page=&page_size=&include_labeled=
GET  /api/v1/faces/clusters/{clusterId}
POST /api/v1/faces/clusters/{clusterId}/label  { name: string }
POST /api/v1/faces/clusters/{clusterId}/split  { minClusterSize: number }
```

### Persons

```
GET  /api/v1/faces/persons?page=&page_size=&status=
POST /api/v1/faces/persons/{personId}/merge  { intoPersonId: string }
```

## Components

### Face Components (`src/lib/components/faces/`)

| Component                  | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `FaceThumbnail.svelte`     | Displays a face with optional bbox cropping    |
| `ClusterCard.svelte`       | Card showing cluster summary with sample faces |
| `PersonCard.svelte`        | Card showing person info                       |
| `LabelClusterModal.svelte` | Modal for labeling clusters with person names  |

### API Client (`src/lib/api/faces.ts`)

Functions available:

```typescript
// Clusters
listClusters(page, pageSize, includeLabeled);
getCluster(clusterId);
labelCluster(clusterId, name);
splitCluster(clusterId, minClusterSize);

// Persons
listPersons(page, pageSize, status);
mergePersons(personId, intoPersonId);

// Face Detection
detectFaces(assetId, minConfidence, minFaceSize);
triggerClustering(qualityThreshold, maxFaces, minClusterSize);
getFacesForAsset(assetId);
```

## Configuration

### Backend API URL

Set the backend API URL via environment variable:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

### Development

```bash
# Start the development server
npm run dev

# The UI will be available at http://localhost:5173
```

## Workflow Examples

### Labeling a New Person

1. Navigate to `/faces/clusters`
2. Click on an unlabeled cluster
3. Click "Label as Person"
4. Type the person's name and click "Create [name]"
5. Click "Label Cluster"

### Filtering Search by Person

1. Navigate to the main search page (`/`)
2. In the Filters panel, click the "People Filter" search box
3. Select one or more people from the dropdown
4. The search results will filter to show only photos containing selected people

### Merging Duplicate People

1. Navigate to `/people`
2. Click on the person you want to merge (source)
3. Click "Merge into Another Person"
4. Select the target person
5. Click "Merge Person"

## Troubleshooting

### No clusters appear

- Ensure face detection has been run on your photos
- Check that clustering has been triggered
- Verify the backend is running and accessible

### Photos not loading in person detail

- Check that the backend can serve image thumbnails
- Verify the `VITE_API_BASE_URL` is correctly configured
- Check browser console for CORS errors

### Person filter shows "No people identified"

- This means no face clusters have been labeled yet
- Navigate to `/faces/clusters` and label some clusters first

## Architecture Notes

### Face Thumbnails

The `FaceThumbnail` component can display faces in two modes:

1. **With bbox**: Uses CSS object-position to center on the face
2. **Without bbox**: Shows the full photo thumbnail

For best results, ensure the backend provides bounding box coordinates with face instances.

### State Management

Face UI uses Svelte 5 runes for local state management:

- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects

No global stores are used; each page manages its own state.

### Error Handling

All API calls include error handling with:

- Loading states while fetching
- Error banners for failures
- Retry buttons where appropriate
- Graceful fallbacks for missing data
