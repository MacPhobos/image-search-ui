# useFaceAssignment Hook - Usage Examples

## Basic Usage in a Modal Component

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { useFaceAssignment } from '$lib/hooks/useFaceAssignment.svelte';
  import type { FaceInPhoto } from '$lib/api/faces';

  interface Props {
    face: FaceInPhoto;
    onAssigned: (faceId: string, personId: string, personName: string) => void;
    onClose: () => void;
  }

  let { face, onAssigned, onClose }: Props = $props();

  // Initialize hook
  const assignment = useFaceAssignment();

  // Load persons on mount
  onMount(() => {
    assignment.loadPersons();
  });

  // Handle assign to existing person
  async function handleSelectPerson(personId: string) {
    try {
      const result = await assignment.assignToExisting(face.faceInstanceId, personId);
      onAssigned(result.faceId, result.personId, result.personName);
      onClose();
    } catch (err) {
      // Error is already set in assignment.error, display it
      console.error('Assignment failed:', err);
    }
  }

  // Handle create new person
  async function handleCreateNew(name: string) {
    try {
      const result = await assignment.createAndAssign(face.faceInstanceId, name);
      onAssigned(result.faceId, result.personId, result.personName);
      onClose();
    } catch (err) {
      // Error is already set in assignment.error, display it
      console.error('Create and assign failed:', err);
    }
  }
</script>

<!-- UI rendering -->
{#if assignment.personsLoading}
  <p>Loading persons...</p>
{:else if assignment.error}
  <div class="error">
    {assignment.error}
    <button onclick={() => assignment.reset()}>Dismiss</button>
  </div>
{:else}
  <select onchange={(e) => handleSelectPerson(e.currentTarget.value)}>
    <option value="">Select person...</option>
    {#each assignment.persons as person}
      <option value={person.id}>{person.name}</option>
    {/each}
  </select>

  <input
    type="text"
    placeholder="Or create new..."
    onchange={(e) => handleCreateNew(e.currentTarget.value)}
  />

  {#if assignment.submitting}
    <p>Assigning...</p>
  {/if}
{/if}
```

## With MRU (Most Recently Used) Support

```svelte
<script lang="ts">
  import { useFaceAssignment } from '$lib/hooks/useFaceAssignment.svelte';

  const assignment = useFaceAssignment();

  // Get recent person IDs for suggested picks
  let recentPersonIds = $derived(assignment.getRecentPersonIds());
  let recentPersons = $derived(
    recentPersonIds
      .map((id) => assignment.persons.find((p) => p.id === id))
      .filter((p) => p !== undefined)
  );

  onMount(() => {
    assignment.loadPersons();
  });
</script>

<!-- Show recent persons first for quick selection -->
{#if recentPersons.length > 0}
  <section>
    <h3>Recent</h3>
    {#each recentPersons as person}
      <button onclick={() => handleSelectPerson(person.id)}>
        {person.name}
      </button>
    {/each}
  </section>
{/if}

<!-- Full persons list -->
<section>
  <h3>All Persons</h3>
  <!-- ... full list ... -->
</section>
```

## Error Handling Patterns

```svelte
<script lang="ts">
  const assignment = useFaceAssignment();

  async function assignWithValidation(faceId: string, personId: string) {
    // Clear previous error
    assignment.reset();

    // Validate before submission
    if (!faceId || !personId) {
      console.error('Face ID and Person ID are required');
      return;
    }

    try {
      const result = await assignment.assignToExisting(faceId, personId);
      console.log('Success:', result);
    } catch (err) {
      // Error already set in assignment.error
      // Display to user via UI
    }
  }
</script>

{#if assignment.error}
  <div role="alert" class="alert-error">
    <strong>Error:</strong> {assignment.error}
    <button onclick={() => assignment.reset()}>×</button>
  </div>
{/if}
```

## Loading State UX

```svelte
<script lang="ts">
  const assignment = useFaceAssignment();

  onMount(() => {
    assignment.loadPersons();
  });
</script>

<!-- Disable interactions during submission -->
<fieldset disabled={assignment.submitting}>
  <select>
    {#if assignment.personsLoading}
      <option>Loading...</option>
    {:else}
      {#each assignment.persons as person}
        <option value={person.id}>{person.name}</option>
      {/each}
    {/if}
  </select>

  <button type="submit">
    {assignment.submitting ? 'Assigning...' : 'Assign'}
  </button>
</fieldset>
```

## Benefits

- **Centralized Logic**: All person loading and assignment logic in one place
- **Reactive State**: Svelte 5 runes provide fine-grained reactivity
- **MRU Tracking**: Automatically tracks recent persons for quick access
- **Error Handling**: Consistent error state management
- **Type Safety**: Full TypeScript support with proper types
- **Reusable**: Share between PhotoPreviewModal, SuggestionDetailModal, and other face UIs
