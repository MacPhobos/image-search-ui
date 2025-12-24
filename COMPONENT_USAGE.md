# CategorySelector and CategoryBadge Components

This document provides usage examples for the newly created category components.

## CategorySelector

A dropdown component for selecting categories with loading states, error handling, and optional "Create New" functionality.

### Basic Usage

```svelte
<script lang="ts">
	import CategorySelector from '$lib/components/CategorySelector.svelte';

	let selectedCategoryId = $state<number | null>(null);

	function handleCategorySelect(categoryId: number | null) {
		selectedCategoryId = categoryId;
		console.log('Selected category:', categoryId);
	}
</script>

<CategorySelector selectedId={selectedCategoryId} onSelect={handleCategorySelect} />
```

### With "Create New" Option

```svelte
<script lang="ts">
	import CategorySelector from '$lib/components/CategorySelector.svelte';

	let selectedCategoryId = $state<number | null>(null);
	let showCreateModal = $state(false);

	function handleCategorySelect(categoryId: number | null) {
		selectedCategoryId = categoryId;
	}

	function handleCreateNew() {
		showCreateModal = true;
	}
</script>

<CategorySelector
	selectedId={selectedCategoryId}
	onSelect={handleCategorySelect}
	onCreateNew={handleCreateNew}
	showCreateOption={true}
/>
```

### Custom Label and Disabled State

```svelte
<CategorySelector
	selectedId={selectedCategoryId}
	onSelect={handleCategorySelect}
	label="Choose a category"
	disabled={isLoading}
/>
```

### Props

| Prop               | Type                                   | Default      | Description                               |
| ------------------ | -------------------------------------- | ------------ | ----------------------------------------- |
| `selectedId`       | `number \| null`                       | required     | Currently selected category ID            |
| `onSelect`         | `(categoryId: number \| null) => void` | required     | Callback when category is selected        |
| `onCreateNew`      | `() => void`                           | `undefined`  | Optional callback for "Create New" action |
| `disabled`         | `boolean`                              | `false`      | Disable the selector                      |
| `showCreateOption` | `boolean`                              | `true`       | Show "Create New Category..." option      |
| `label`            | `string`                               | `'Category'` | Label text for the selector               |

### States

- **Loading**: Shows "Loading categories..." while fetching
- **Error**: Displays error message with red alert styling
- **Loaded**: Shows all categories with optional "No category" and "Create New..." options

## CategoryBadge

A small badge component for displaying category names with color-coded backgrounds.

### Basic Usage

```svelte
<script lang="ts">
	import CategoryBadge from '$lib/components/CategoryBadge.svelte';
	import type { Category } from '$lib/api/categories';

	const category: Category = {
		id: 1,
		name: 'Vacation Photos',
		description: null,
		color: '#3B82F6',
		isDefault: false,
		createdAt: '2024-12-19T10:00:00Z',
		updatedAt: '2024-12-19T10:00:00Z',
		sessionCount: 5
	};
</script>

<CategoryBadge {category} />
```

### Different Sizes

```svelte
<!-- Small (default) -->
<CategoryBadge {category} size="small" />

<!-- Medium -->
<CategoryBadge {category} size="medium" />
```

### Default Category Display

```svelte
<script lang="ts">
	const defaultCategory: Category = {
		id: 1,
		name: 'Uncategorized',
		color: '#6B7280',
		isDefault: true
		// ... other fields
	};
</script>

<!-- Shows: "Uncategorized (Default)" -->
<CategoryBadge category={defaultCategory} />
```

### Props

| Prop       | Type                  | Default   | Description                |
| ---------- | --------------------- | --------- | -------------------------- |
| `category` | `Category`            | required  | Category object to display |
| `size`     | `'small' \| 'medium'` | `'small'` | Badge size                 |

### Features

- **Automatic Text Color**: Calculates contrast color (white or dark gray) based on background color for accessibility
- **Default Indicator**: Shows "(Default)" suffix for default categories
- **Custom Colors**: Uses category's color if provided, otherwise defaults to light gray
- **WCAG Compliant**: Text color is automatically adjusted for sufficient contrast

## Test Files

Both components have comprehensive test coverage:

- `src/tests/components/CategorySelector.test.ts` - 14 tests covering all functionality
- `src/tests/components/CategoryBadge.test.ts` - 11 tests covering rendering and styling

## Fixtures

Category fixtures are available in `src/tests/helpers/fixtures.ts`:

```typescript
import {
	createCategory,
	createDefaultCategory,
	createCategoryResponse,
	createMultipleCategories
} from '../helpers/fixtures';

// Single category
const category = createCategory({ name: 'Custom Name', color: '#FF5733' });

// Default category
const defaultCat = createDefaultCategory();

// Multiple categories
const categories = createMultipleCategories(5); // Creates 5 categories

// API response
const response = createCategoryResponse(categories, 1, 50);
```
