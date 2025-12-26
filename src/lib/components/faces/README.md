# Face Components

Svelte 5 components for face detection, person management, and photo review.

## PersonPhotosTab

A tabbed interface for reviewing and managing photos assigned to a person.

### Features

- Grid display of photos with face counts and mixed person indicators
- Multi-select with checkboxes
- Bulk operations (remove from person, move to another person)
- Pagination for large photo sets
- Loading, error, and empty states
- Optional photo click callback for lightbox integration

### Usage

```svelte
<script lang="ts">
	import PersonPhotosTab from '$lib/components/faces/PersonPhotosTab.svelte';

	let personId = 'person-uuid-123';
	let personName = 'John Doe';

	function handlePhotoClick(photoId: number) {
		// Open lightbox or navigate to photo detail
		console.log('Photo clicked:', photoId);
	}
</script>

<PersonPhotosTab {personId} {personName} onPhotoClick={handlePhotoClick} />
```

### Props

| Prop           | Type                        | Required | Description                                |
| -------------- | --------------------------- | -------- | ------------------------------------------ |
| `personId`     | `string`                    | Yes      | UUID of the person                         |
| `personName`   | `string`                    | Yes      | Name of the person (displayed in UI)       |
| `onPhotoClick` | `(photoId: number) => void` | No       | Callback when a photo thumbnail is clicked |

### API Dependency

Requires the following API endpoints to be available:

- `GET /api/v1/faces/persons/{personId}/photos` - Get paginated photos for person
- `POST /api/v1/faces/persons/{personId}/photos/bulk-remove` - Remove faces from person
- `POST /api/v1/faces/persons/{personId}/photos/bulk-move` - Move faces to another person

## PersonPickerModal

A modal dialog for selecting or creating a person when moving faces.

### Features

- Search existing persons by name
- Create new person on the fly
- Mode toggle between existing and new person
- Loading and error states
- Full keyboard navigation

### Usage

```svelte
<script lang="ts">
	import PersonPickerModal from '$lib/components/faces/PersonPickerModal.svelte';

	let showModal = $state(false);
	let excludePersonId = 'person-uuid-123';

	function handleSelect(destination: { toPersonId: string } | { toPersonName: string }) {
		console.log('Selected:', destination);
		showModal = false;
	}
</script>

{#if showModal}
	<PersonPickerModal
		onSelect={handleSelect}
		onClose={() => (showModal = false)}
		{excludePersonId}
	/>
{/if}
```

### Props

| Prop              | Type                           | Required | Description                                          |
| ----------------- | ------------------------------ | -------- | ---------------------------------------------------- |
| `onSelect`        | `(destination: {...}) => void` | Yes      | Callback with `{ toPersonId }` or `{ toPersonName }` |
| `onClose`         | `() => void`                   | Yes      | Callback when modal is dismissed                     |
| `excludePersonId` | `string`                       | No       | Person ID to exclude from selection list             |

### API Dependency

Requires:

- `GET /api/v1/faces/persons` - List all active persons

## Example: Person Detail Page with Photos Tab

```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { listPersons } from '$lib/api/faces';
	import PersonPhotosTab from '$lib/components/faces/PersonPhotosTab.svelte';
	import type { Person } from '$lib/types';
	import { onMount } from 'svelte';

	let personId = $derived($page.params.personId);
	let person = $state<Person | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(() => {
		loadPerson();
	});

	async function loadPerson() {
		loading = true;
		error = null;

		try {
			const response = await listPersons(1, 100, 'active');
			person = response.items.find((p) => p.id === personId) || null;

			if (!person) {
				error = 'Person not found';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load person';
		} finally {
			loading = false;
		}
	}

	function handlePhotoClick(photoId: number) {
		goto(`/photos/${photoId}`);
	}
</script>

{#if loading}
	<div class="loading">Loading...</div>
{:else if error}
	<div class="error">{error}</div>
{:else if person}
	<header>
		<h1>{person.name}</h1>
		<p>{person.faceCount} detected faces</p>
	</header>

	<PersonPhotosTab personId={person.id} personName={person.name} onPhotoClick={handlePhotoClick} />
{/if}
```

## Testing

See `src/tests/components/PersonPhotosTab.test.ts` for comprehensive test examples.

### Key Test Patterns

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { mockResponse } from '../helpers/mockFetch';
import PersonPhotosTab from './PersonPhotosTab.svelte';

// Mock API response
mockResponse('http://localhost:8000/api/v1/faces/persons/person-123/photos?page=1&page_size=20', {
  items: [...],
  total: 10,
  page: 1,
  pageSize: 20,
  personId: 'person-123',
  personName: 'John Doe'
});

// Render and test
render(PersonPhotosTab, {
  props: { personId: 'person-123', personName: 'John Doe' }
});

await waitFor(() => {
  expect(screen.getByText('10 photos')).toBeInTheDocument();
});
```
