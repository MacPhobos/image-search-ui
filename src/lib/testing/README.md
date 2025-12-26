# Test ID Convention

This document describes the `data-testid` naming convention for the Image Search UI.

## Why Use data-testid?

`data-testid` attributes provide stable selectors for automated testing that:

- Don't break when CSS classes or text content change
- Are explicit about their purpose (testing)
- Make test code more readable
- Are easy to search for in the codebase

## Naming Convention

### Base Pattern

```
{feature}[__{sub-element}][__{element-type}]
```

- **feature**: kebab-case name of the component/feature (e.g., `search-bar`, `results-grid`)
- **sub-element**: nested element within the feature (e.g., `header`, `item`)
- **element-type**: common suffix for element types (e.g., `btn-submit`, `input-query`)

### Examples

| Element                    | Test ID                             |
| -------------------------- | ----------------------------------- |
| Search bar root            | `search-bar`                        |
| Search input field         | `search-bar__input-query`           |
| Search submit button       | `search-bar__btn-submit`            |
| Results grid               | `results-grid`                      |
| Results grid item          | `results-grid__item`                |
| Results empty state        | `results-grid__empty`               |
| Category create modal root | `modal__category-create`            |
| Modal close button         | `modal__category-create__btn-close` |
| Route page root            | `page__home` or `page__photos-id`   |
| Layout root                | `layout__root`                      |

### Common Suffixes

| Suffix    | Usage                                  |
| --------- | -------------------------------------- |
| `btn-*`   | Buttons (btn-submit, btn-cancel)       |
| `input-*` | Input fields (input-query, input-name) |
| `list`    | List containers                        |
| `grid`    | Grid containers                        |
| `item`    | List/grid items                        |
| `card`    | Card components                        |
| `header`  | Header sections                        |
| `body`    | Body/content sections                  |
| `footer`  | Footer sections                        |
| `loading` | Loading states                         |
| `empty`   | Empty states                           |
| `error`   | Error states/messages                  |
| `dialog`  | Dialog/modal root                      |
| `overlay` | Overlay backgrounds                    |

## Using the tid() Helper

Import the helper from `$lib/testing/testid`:

```typescript
import { tid, scopedTid, testIdAttr, TID_SUFFIXES } from '$lib/testing/testid';

// Basic usage
tid('search-bar'); // 'search-bar'
tid('search-bar', 'input'); // 'search-bar__input'
tid('search-bar', 'btn', 'submit'); // 'search-bar__btn__submit'

// Auto-normalizes input
tid('Photo Detail', 'header'); // 'photo-detail__header'
tid('my_component', 'item'); // 'my-component__item'
```

### In Svelte Components

```svelte
<script lang="ts">
	import { tid } from '$lib/testing/testid';
</script>

<form data-testid={tid('search-bar')}>
	<input data-testid={tid('search-bar', 'input-query')} />
	<button data-testid={tid('search-bar', 'btn-submit')}>Search</button>
</form>
```

### Scoped Helper for Components

For components with many test IDs, use `scopedTid()`:

```svelte
<script lang="ts">
	import { scopedTid } from '$lib/testing/testid';

	const t = scopedTid('results-grid');
</script>

<div data-testid={t()}>
	<div data-testid={t('header')}>...</div>
	<div data-testid={t('list')}>
		{#each items as item}
			<div data-testid={t('item')}>...</div>
		{/each}
	</div>
	{#if items.length === 0}
		<div data-testid={t('empty')}>No results</div>
	{/if}
</div>
```

### Using testIdAttr() for Spreading

```svelte
<script lang="ts">
	import { testIdAttr, mergeAttrs } from '$lib/testing/testid';
</script>

<div {...testIdAttr('my-component')}>...</div>

<input {...mergeAttrs(testIdAttr('form', 'input'), { disabled: true })} />
```

## Modal/Dialog Convention

All modals should:

1. Accept an optional `testId` prop
2. Use `modal__{name}` pattern for the root
3. Apply consistent internal test IDs

```svelte
<script lang="ts">
	import { tid } from '$lib/testing/testid';

	interface Props {
		testId?: string;
		// ... other props
	}

	let { testId = 'modal__generic' }: Props = $props();
</script>

{#if open}
	<div data-testid={tid(testId, 'overlay')}>
		<div data-testid={testId} role="dialog">
			<header data-testid={tid(testId, 'header')}>
				<button data-testid={tid(testId, 'btn-close')}>×</button>
			</header>
			<div data-testid={tid(testId, 'body')}>...</div>
			<footer data-testid={tid(testId, 'footer')}>
				<button data-testid={tid(testId, 'btn-cancel')}>Cancel</button>
				<button data-testid={tid(testId, 'btn-submit')}>Submit</button>
			</footer>
		</div>
	</div>
{/if}
```

## Route Pages Convention

Route pages should have a test ID on their root element:

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { tid } from '$lib/testing/testid';
</script>

<div data-testid={tid('page', 'home')}>
	<!-- page content -->
</div>

<!-- src/routes/photos/[id]/+page.svelte -->
<div data-testid={tid('page', 'photos-id')}>
	<!-- page content -->
</div>
```

## Testing with Test IDs

In Vitest tests with Testing Library:

```typescript
import { render, screen } from '@testing-library/svelte';

test('search bar renders', () => {
	render(SearchBar);

	expect(screen.getByTestId('search-bar')).toBeInTheDocument();
	expect(screen.getByTestId('search-bar__input-query')).toBeInTheDocument();
	expect(screen.getByTestId('search-bar__btn-submit')).toBeInTheDocument();
});
```

**Note**: Prefer semantic queries (`getByRole`, `getByLabelText`) when possible.
Use `getByTestId` when:

- No semantic alternative exists
- Testing complex component structure
- Element has no accessible name/role

## Adding Test IDs - Checklist

When adding test IDs to a component:

- [ ] Root element has base test ID
- [ ] Interactive elements (buttons, inputs) have specific IDs
- [ ] List/grid containers have IDs
- [ ] Empty/loading/error states have IDs
- [ ] Modal roots have `modal__` prefix
- [ ] IDs follow kebab-case convention
- [ ] Use `__` separator for hierarchy
