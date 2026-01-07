# Phase 2: Dialog & Modal Components - Migration Summary

## Installation Complete

### Components Installed
- ✅ Dialog (`src/lib/components/ui/dialog/`)
- ✅ AlertDialog (`src/lib/components/ui/alert-dialog/`)

### Verification Page
- **URL**: `/shadcn-test-dialogs`
- **File**: `src/routes/shadcn-test-dialogs/+page.svelte`
- **Status**: ✅ Type-check passing

## Demo Examples

### 1. Basic Dialog
Simple dialog with header, content, and footer sections.

```svelte
<Dialog.Root bind:open={showDialog}>
  <Dialog.Trigger>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
    </Dialog.Header>
    <div><!-- content --></div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => showDialog = false}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

### 2. Form Dialog
Dialog containing form inputs with state management and submission.

```svelte
<Dialog.Root bind:open={showFormDialog}>
  <Dialog.Trigger>
    <Button variant="secondary">Open Form</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit Profile</Dialog.Title>
      <Dialog.Description>Make changes here.</Dialog.Description>
    </Dialog.Header>
    <form onsubmit={handleSubmit}>
      <div style="display: grid; gap: 1rem;">
        <div>
          <Label for="name">Name</Label>
          <Input id="name" bind:value={name} />
        </div>
      </div>
      <Dialog.Footer>
        <Button type="submit">Save</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
```

### 3. AlertDialog (Confirmation)
For user confirmations with clear action buttons.

```svelte
<AlertDialog.Root bind:open={showConfirm}>
  <AlertDialog.Trigger>
    <Button variant="outline">Show Alert</Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action requires confirmation.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleConfirm}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
```

### 4. AlertDialog (Destructive)
For delete/destructive actions with warning styling.

```svelte
<AlertDialog.Root bind:open={showDelete}>
  <AlertDialog.Trigger>
    <Button variant="destructive">Delete</Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleDelete}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
```

## Migration Examples

### Example 1: DeleteConfirmationModal
**Original**: `src/lib/components/vectors/DeleteConfirmationModal.svelte`
**Migrated**: `src/lib/components/vectors/DeleteConfirmationModal.shadcn.svelte`

**Changes**:
- ✅ Replaced custom modal overlay/content with `AlertDialog`
- ✅ Replaced custom buttons with shadcn `Button` component
- ✅ Replaced custom inputs with shadcn `Input` component
- ✅ Replaced custom error div with shadcn `Alert` component
- ✅ Used `bind:open` for state management
- ✅ Maintained all existing functionality (requireInput, reason, loading, error handling)
- ✅ Reduced code from 265 lines to ~108 lines (59% reduction)
- ✅ Removed ~200 lines of custom CSS

**Key Migration Patterns**:
```svelte
// Before
<div class="modal-overlay" onclick={onCancel}>
  <div class="modal-content" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">...</div>
    <div class="modal-body">...</div>
    <div class="modal-footer">...</div>
  </div>
</div>

// After
<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>...</AlertDialog.Header>
    <!-- content -->
    <AlertDialog.Footer>...</AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
```

### Example 2: CategoryCreateModal
**Original**: `src/lib/components/CategoryCreateModal.svelte`
**Migrated**: `src/lib/components/CategoryCreateModal.shadcn.svelte`

**Changes**:
- ✅ Replaced custom modal with `Dialog` (not AlertDialog since it's a form)
- ✅ Replaced custom buttons with shadcn `Button` component
- ✅ Replaced custom inputs with shadcn `Input` and `Label` components
- ✅ Used shadcn Alert for error messages
- ✅ Maintained color picker functionality with inline styles (no shadcn equivalent)
- ✅ Maintained test ID support for existing tests
- ✅ Reduced code from 386 lines to ~171 lines (56% reduction)
- ✅ Removed ~240 lines of custom CSS

**Key Migration Patterns**:
```svelte
// Before
{#if open}
  <div class="modal-overlay" onclick={handleClose}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <!-- content -->
    </div>
  </div>
{/if}

// After
<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
  <Dialog.Content>
    <!-- content -->
  </Dialog.Content>
</Dialog.Root>
```

## Migration Checklist

When migrating a modal component to shadcn Dialog/AlertDialog:

### Choose Component Type
- [ ] **Dialog** - For forms, content display, general purpose
- [ ] **AlertDialog** - For confirmations, destructive actions

### Update Props Interface
- [ ] Change `open: boolean` to `open = $bindable(false)` if parent needs two-way binding
- [ ] Keep `onClose` callback for cleanup logic
- [ ] Add `onOpenChange` handler if needed for close cleanup

### Replace Structure
- [ ] Remove `{#if open}` wrapper (Dialog handles this)
- [ ] Remove `.modal-overlay` div
- [ ] Remove `.modal-content` div
- [ ] Replace with `<Dialog.Root>` or `<AlertDialog.Root>`
- [ ] Use `bind:open` for state management

### Replace Components
- [ ] Replace header with `<Dialog.Header>` / `<AlertDialog.Header>`
- [ ] Replace title with `<Dialog.Title>` / `<AlertDialog.Title>`
- [ ] Add `<Dialog.Description>` / `<AlertDialog.Description>` if helpful
- [ ] Replace footer with `<Dialog.Footer>` / `<AlertDialog.Footer>`
- [ ] Replace buttons with shadcn `Button` component
- [ ] Replace form inputs with shadcn `Input`, `Label`, etc.
- [ ] Replace error divs with shadcn `Alert` component

### Handle Special Cases
- [ ] **Textarea**: Use shadcn textarea classes (no dedicated component yet)
- [ ] **Custom inputs**: Keep inline if no shadcn equivalent (e.g., color picker)
- [ ] **Test IDs**: Maintain `data-testid` attributes for existing tests
- [ ] **Loading states**: Use `disabled` prop on buttons/inputs
- [ ] **Error handling**: Use `Alert` variant="destructive" for errors

### Remove Old Code
- [ ] Delete custom modal CSS (overlay, content, header, footer, buttons, etc.)
- [ ] Remove manual event handlers (onclick overlay, stopPropagation, etc.)
- [ ] Remove manual focus management (handled by Dialog primitives)
- [ ] Remove manual escape key handling (handled by Dialog primitives)

### Test
- [ ] Verify open/close behavior works
- [ ] Test form submission if applicable
- [ ] Verify error states display correctly
- [ ] Check loading states work
- [ ] Ensure existing tests still pass (if using test IDs)
- [ ] Run typecheck: `make typecheck`

## Remaining Migration Targets

### High Priority (Simple Confirmations → AlertDialog)
1. `src/lib/components/admin/DeleteAllDataModal.svelte` - Delete confirmation with input verification
2. `src/lib/components/vectors/DeleteConfirmationModal.svelte` - **MIGRATED** ✅

### Medium Priority (Forms → Dialog)
3. `src/lib/components/CategoryCreateModal.svelte` - **MIGRATED** ✅
4. `src/lib/components/CategoryEditModal.svelte` - Edit form modal
5. `src/lib/components/training/CreateSessionModal.svelte` - Training session creation
6. `src/lib/components/admin/ImportPersonDataModal.svelte` - File import modal
7. `src/lib/components/admin/ExportPersonDataModal.svelte` - Export configuration modal

### Complex (Large Forms/Pickers → Dialog)
8. `src/lib/components/faces/PersonPickerModal.svelte` - Person selection UI
9. `src/lib/components/faces/LabelClusterModal.svelte` - Cluster labeling
10. `src/lib/components/vectors/RetrainModal.svelte` - Retrain configuration

### Large Detail Views (Might need custom dialog sizing)
11. `src/lib/components/faces/SuggestionDetailModal.svelte` - Detailed suggestion view
12. `src/lib/components/faces/PhotoPreviewModal.svelte` - Full photo preview

## Key Patterns & Best Practices

### When to use Dialog vs AlertDialog
- **Dialog**: Forms, content display, multi-step flows, detail views
- **AlertDialog**: Confirmations, yes/no decisions, destructive actions

### State Management
```svelte
// Parent component
let showDialog = $state(false);

// If parent needs to control open state
<MyDialog bind:open={showDialog} />

// If modal manages its own state
<MyDialog open={someCondition} onClose={() => {}} />
```

### Cleanup on Close
```svelte
<Dialog.Root
  bind:open
  onOpenChange={(isOpen) => {
    if (!isOpen) {
      resetForm();
      onClose();
    }
  }}
>
```

### Form Submission in Dialog
```svelte
<Dialog.Content>
  <form onsubmit={(e) => {
    e.preventDefault();
    handleSubmit();
  }}>
    <!-- form fields -->
    <Dialog.Footer>
      <Button type="submit">Submit</Button>
    </Dialog.Footer>
  </form>
</Dialog.Content>
```

### Error Display
```svelte
{#if error}
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
{/if}
```

### Loading States
```svelte
<Button onclick={handleAction} disabled={loading}>
  {loading ? 'Processing...' : 'Submit'}
</Button>
```

## Benefits of Migration

1. **Less Code**: 50-60% reduction in lines of code
2. **No Custom CSS**: Eliminates 200-300 lines of modal styling per component
3. **Consistent UI**: All modals have same look/feel automatically
4. **Accessibility**: Built-in keyboard navigation, focus management, ARIA attributes
5. **Mobile-Ready**: Responsive dialog sizing out of the box
6. **Type-Safe**: Full TypeScript support with proper types
7. **Maintainability**: Updates to dialog styling happen in one place (tailwind config)

## Next Steps

1. **Migrate remaining modals** using checklist above
2. **Update tests** if modal APIs changed (unlikely with proper testId preservation)
3. **Delete old modal CSS** from global styles if no longer needed
4. **Document custom patterns** that emerge during migration
5. **Consider Dialog sizing** - may need `class` prop on Dialog.Content for large modals

## Resources

- [shadcn-svelte Dialog Docs](https://www.shadcn-svelte.com/docs/components/dialog)
- [shadcn-svelte AlertDialog Docs](https://www.shadcn-svelte.com/docs/components/alert-dialog)
- [Bits UI Dialog Primitive](https://www.bits-ui.com/docs/components/dialog) (underlying primitive)
