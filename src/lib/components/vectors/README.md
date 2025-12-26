# Vector Management Components

Svelte 5 components for managing vector embeddings in the image search system.

## Components

### DeleteConfirmationModal

A reusable confirmation modal for dangerous deletion operations with optional confirmation text requirement.

**Props:**

- `title: string` - Modal title
- `message: string` - Warning message to display
- `confirmText?: string` - Button text (default: "Delete")
- `requireInput?: string` - If set, user must type this exact text to confirm
- `onConfirm: (reason?: string) => Promise<void>` - Async handler for confirmation
- `onCancel: () => void` - Handler for cancellation

**Example:**

```svelte
<script>
	import { DeleteConfirmationModal } from '$lib/components/vectors';

	let showModal = $state(false);

	async function handleDelete(reason) {
		await deleteVectorsByDirectory(pathPrefix, reason);
		showModal = false;
	}
</script>

{#if showModal}
	<DeleteConfirmationModal
		title="Delete Directory Vectors"
		message="This will permanently delete all vectors for this directory."
		confirmText="Delete Vectors"
		requireInput="DELETE"
		onConfirm={handleDelete}
		onCancel={() => (showModal = false)}
	/>
{/if}
```

### DirectoryStatsTable

Display directory statistics with action buttons for deletion and retraining.

**Props:**

- `directories: DirectoryStats[]` - Array of directory statistics
- `loading?: boolean` - Show loading state (default: false)
- `onDelete: (pathPrefix: string) => void` - Handler for delete action
- `onRetrain: (pathPrefix: string) => void` - Handler for retrain action

**Example:**

```svelte
<script>
	import { DirectoryStatsTable } from '$lib/components/vectors';
	import { getDirectoryStats } from '$lib/api/vectors';

	let directories = $state([]);
	let loading = $state(true);

	async function loadStats() {
		const response = await getDirectoryStats();
		directories = response.directories;
		loading = false;
	}
</script>

<DirectoryStatsTable
	{directories}
	{loading}
	onDelete={(path) => handleDelete(path)}
	onRetrain={(path) => handleRetrain(path)}
/>
```

### DeletionLogsTable

Display historical deletion logs with color-coded type badges.

**Props:**

- `logs: DeletionLogEntry[]` - Array of deletion log entries
- `loading?: boolean` - Show loading state (default: false)

**Example:**

```svelte
<script>
	import { DeletionLogsTable } from '$lib/components/vectors';
	import { getDeletionLogs } from '$lib/api/vectors';

	let logs = $state([]);
	let loading = $state(true);

	async function loadLogs() {
		const response = await getDeletionLogs();
		logs = response.logs;
		loading = false;
	}
</script>

<DeletionLogsTable {logs} {loading} />
```

### DangerZone

Panel for dangerous operations (orphan cleanup, full reset) with clear warnings.

**Props:**

- `onOrphanCleanup: () => void` - Handler for orphan cleanup
- `onFullReset: () => void` - Handler for full collection reset

**Example:**

```svelte
<script>
	import { DangerZone } from '$lib/components/vectors';

	function handleOrphanCleanup() {
		// Show confirmation modal
	}

	function handleFullReset() {
		// Show confirmation modal with strict text input
	}
</script>

<DangerZone onOrphanCleanup={handleOrphanCleanup} onFullReset={handleFullReset} />
```

### RetrainModal

Modal for retraining a directory with category selection.

**Props:**

- `pathPrefix: string` - Directory path to retrain
- `onConfirm: (categoryId: number, reason?: string) => Promise<void>` - Handler for confirmation
- `onCancel: () => void` - Handler for cancellation

**Example:**

```svelte
<script>
	import { RetrainModal } from '$lib/components/vectors';
	import { retrainDirectory } from '$lib/api/vectors';

	let showModal = $state(false);
	let selectedPath = $state('');

	async function handleRetrain(categoryId, reason) {
		await retrainDirectory({
			pathPrefix: selectedPath,
			categoryId,
			deletionReason: reason
		});
		showModal = false;
	}
</script>

{#if showModal}
	<RetrainModal
		pathPrefix={selectedPath}
		onConfirm={handleRetrain}
		onCancel={() => (showModal = false)}
	/>
{/if}
```

## Type Definitions

See `src/lib/api/vectors.ts` for complete API type definitions:

- `DirectoryStats` - Directory vector statistics
- `DeletionLogEntry` - Deletion history record
- `DirectoryDeleteRequest` - Delete directory vectors request
- `RetrainRequest` - Retrain directory request
- `OrphanCleanupRequest` - Orphan cleanup request
- `ResetRequest` - Full reset request

## Styling

All components use consistent styling matching the existing project design:

- Modal overlays with backdrop blur
- Form inputs with focus states
- Color-coded action buttons (warning, danger)
- Responsive table layouts
- Accessible keyboard navigation
- Loading and empty states

## Accessibility

All components follow accessibility best practices:

- Semantic HTML elements
- ARIA roles and attributes
- Keyboard navigation support
- Focus management
- Screen reader friendly labels
- Error state announcements
