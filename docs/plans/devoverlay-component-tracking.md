# DevOverlay Component Tracking Enhancement

**Created:** 2026-01-10
**Implemented:** 2026-01-11
**Status:** ✅ Implemented
**Priority:** Medium
**Complexity:** Medium

## Problem Statement

The current `DevOverlay` component displays routing metadata (pathname, params, route ID) but doesn't reveal which actual Svelte components are rendering the current view. This makes it difficult for developers to:

- Identify which components are involved in rendering a page
- Debug component hierarchy issues
- Understand the component tree structure
- Navigate to the right files when fixing bugs

## Objective

Enhance the development overlay to display which Svelte components are currently rendering the active view, providing developers with better visibility into the component hierarchy.

## Architecture Overview

### 1. Component Registry System
Create a centralized tracking system that maintains the current component stack using Svelte's context API. This will be a lightweight, dev-only system with minimal performance overhead.

### 2. Automatic Registration System
Implement a Vite plugin that automatically instruments Svelte components during development to register themselves with the component tracking system. This provides zero-boilerplate tracking for all components.

### 3. Manual Registration Fallback
Provide explicit registration API for edge cases where automatic tracking needs customization or where the plugin cannot auto-detect component information.

### 4. DevOverlay Enhancement
Extend the existing overlay to display and visualize the component hierarchy with collapsible details and tree visualization.

## Technical Design

### Core Components

#### 1. Component Registry (`src/lib/dev/componentRegistry.ts`)

**Purpose:** Central registry for tracking active Svelte components in dev mode

**Type Definitions:**
```typescript
interface ComponentInfo {
  name: string;           // Component name (e.g., "SearchPage", "+page")
  id: string;             // Unique instance ID
  mountedAt: number;      // Timestamp when mounted
  props?: Record<string, unknown>; // Optional prop tracking
  filePath?: string;      // Source file path
}

interface ComponentStack {
  components: ComponentInfo[];
  lastUpdate: number;
}
```

**Key Functions:**
- `createComponentStack()`: Initialize the registry in root layout
  - Creates a writable store with component metadata
  - Sets up context for child components
  - Returns the store for subscription

- `registerComponent(name: string, options?: RegisterOptions)`: Register a component
  - Adds component to the stack
  - Generates unique ID
  - Records mount timestamp
  - Returns cleanup function for unmounting

- `getComponentStack()`: Access current stack from any component
  - Retrieves context from parent
  - Returns reactive store

- `getComponentHierarchy()`: Get nested tree structure
  - Analyzes flat stack to build parent-child relationships
  - Returns tree data structure for visualization

**Implementation Notes:**
- Uses Svelte's `getContext`/`setContext` for propagation
- All code wrapped in `if (import.meta.env.DEV)` guards
- Zero runtime cost in production builds
- Automatic cleanup when components unmount

#### 2. Vite Plugin for Automatic Registration (`src/lib/dev/autoTrack.ts`)

**Purpose:** Vite plugin to automatically inject tracking code into .svelte files during development

**Priority:** HIGH - This is the primary registration mechanism

**Approach:**
- Transform .svelte files at build time (dev only)
- Inject registration code into `<script>` blocks
- Extract component name and file path from the file being processed
- Add import and onMount hook automatically
- Preserve existing code and formatting

**Configuration:**
```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { vitePluginComponentTracking } from './src/lib/dev/autoTrack';

export default defineConfig({
  plugins: [
    sveltekit(),
    // Component tracking plugin (dev only)
    vitePluginComponentTracking({
      // Optional: exclude certain paths
      exclude: [
        '**/node_modules/**',
        '**/*.test.svelte',
        '**/ComponentTree.svelte', // Don't track the tracker
        '**/DevOverlay.svelte'     // Don't track the overlay
      ],
      // Optional: include only certain paths (leave empty for all)
      include: ['src/routes/**/*.svelte', 'src/lib/**/*.svelte'],
      // Extract component name from file path
      nameExtractor: (filePath: string) => {
        // Extract meaningful name from path
        // e.g., "src/routes/search/+page.svelte" -> "routes/search/+page"
        return filePath
          .replace(/^src\//, '')
          .replace(/\.svelte$/, '');
      }
    })
  ]
});
```

**Implementation Strategy:**

1. **Plugin Hook Selection:**
   - Use `transform` hook to process .svelte files
   - Only activate in dev mode
   - Filter by file extension and exclude patterns

2. **Code Injection Approach:**
   ```typescript
   // What we inject into each .svelte file:
   import { onMount } from 'svelte';
   import { registerComponent } from '$lib/dev/componentRegistry';
   
   if (import.meta.env.DEV) {
     onMount(() => {
       return registerComponent('ComponentName', {
         filePath: 'src/routes/path/to/Component.svelte'
       });
     });
   }
   ```

3. **Script Block Detection:**
   - Parse .svelte file to find `<script>` or `<script lang="ts">` block
   - If no script block exists, create one
   - Insert imports at the top of the script
   - Append onMount registration code after existing script content
   - Handle both module and instance scripts (inject into instance script)

4. **Edge Cases to Handle:**
   - Files without script blocks → Create minimal script block
   - Files with `<script context="module">` → Skip or add instance script
   - Files that already import onMount → Don't duplicate import
   - Files that already import registerComponent → Skip injection
   - Preserve source maps for debugging

**Type Signature:**
```typescript
export interface ComponentTrackingOptions {
  include?: string[];
  exclude?: string[];
  nameExtractor?: (filePath: string) => string;
  enabled?: boolean; // Default: true in dev, false in prod
}

export function vitePluginComponentTracking(
  options?: ComponentTrackingOptions
): Plugin;
```

**Example Implementation Outline:**
```typescript
import type { Plugin } from 'vite';
import MagicString from 'magic-string';

export function vitePluginComponentTracking(
  options: ComponentTrackingOptions = {}
): Plugin {
  const {
    include = ['**/*.svelte'],
    exclude = ['**/node_modules/**', '**/DevOverlay.svelte'],
    nameExtractor = defaultNameExtractor,
    enabled = true
  } = options;

  return {
    name: 'vite-plugin-component-tracking',
    enforce: 'pre', // Run before other transformations
    
    transform(code: string, id: string) {
      // Only in dev mode
      if (!enabled || process.env.NODE_ENV !== 'development') {
        return null;
      }
      
      // Only for .svelte files
      if (!id.endsWith('.svelte')) return null;
      
      // Check include/exclude patterns
      if (shouldExclude(id, include, exclude)) return null;
      
      // Extract component name
      const componentName = nameExtractor(id);
      
      // Parse and inject tracking code
      const s = new MagicString(code);
      injectTrackingCode(s, code, componentName, id);
      
      return {
        code: s.toString(),
        map: s.generateMap({ hires: true })
      };
    }
  };
}

function injectTrackingCode(
  s: MagicString,
  code: string,
  componentName: string,
  filePath: string
) {
  // Find script block or create one
  const scriptMatch = code.match(/<script(?:\s+lang="ts")?\s*>/);
  const moduleScriptMatch = code.match(/<script\s+context="module"/);
  
  if (moduleScriptMatch && !scriptMatch) {
    // Only module script exists, add instance script
    const insertPos = code.indexOf('</script>') + '</script>'.length;
    s.appendRight(insertPos, `\n<script>\n${getTrackingCode(componentName, filePath)}\n</script>`);
  } else if (scriptMatch) {
    // Instance script exists, inject into it
    const scriptStart = scriptMatch.index + scriptMatch[0].length;
    s.appendRight(scriptStart, `\n${getTrackingCode(componentName, filePath)}`);
  } else {
    // No script block, add one at the start
    s.prepend(`<script>\n${getTrackingCode(componentName, filePath)}\n</script>\n\n`);
  }
}

function getTrackingCode(name: string, filePath: string): string {
  return `// Auto-generated component tracking (dev only)
import { onMount } from 'svelte';
import { registerComponent } from '$lib/dev/componentRegistry';

if (import.meta.env.DEV) {
  onMount(() => registerComponent('${name}', { filePath: '${filePath}' }));
}`;
}
```

**Dependencies:**
- `magic-string` - For efficient code transformation with source maps
- `micromatch` or similar - For glob pattern matching (include/exclude)

**Testing Strategy:**
- Unit test the plugin with various .svelte file structures
- Test with files that have no script, instance script, module script
- Verify source maps are preserved
- Test that dev build works with plugin enabled
- Verify plugin is skipped in production builds

#### 3. Registration Wrapper (`src/lib/dev/withComponentTracking.ts`) - Optional Fallback

#### 3. Registration Wrapper (`src/lib/dev/withComponentTracking.ts`) - Optional Fallback

**Purpose:** Manual registration helper for edge cases where automatic tracking needs to be overridden or customized

**Priority:** LOW - Only needed for special cases since Vite plugin handles most components

**Usage Example:**
```typescript
// Manual override approach (rarely needed)
import { withComponentTracking } from '$lib/dev/withComponentTracking';
import MyComponent from './MyComponent.svelte';

export default withComponentTracking(MyComponent, 'CustomName');
```

**Features:**
- Wraps component in dev mode only (returns original in production)
- Automatically calls `registerComponent` in `onMount`
- Returns cleanup function from `onMount`
- Preserves TypeScript types and props
- Optional prop tracking for debugging

**Type Signature:**
```typescript
export function withComponentTracking<T extends Record<string, any>>(
  Component: ComponentType<T>,
  name?: string,
  options?: TrackingOptions
): ComponentType<T>;
```

**Note:** Most developers will never need to use this since the Vite plugin handles registration automatically.

### UI Components

#### 4. Enhanced DevOverlay (`src/lib/dev/DevOverlay.svelte`)

**Script Section Additions:**

```typescript
// Import component tracking
import { getComponentStack, type ComponentInfo } from './componentRegistry';
import ComponentTree from './ComponentTree.svelte';

// Add state for component tracking
let componentStack = $state<ComponentInfo[]>([]);
let showComponentDetails = $state(false);

// Subscribe to component stack in onMount
onMount(() => {
  // ...existing code...
  
  // Subscribe to component stack
  const stack = getComponentStack();
  if (stack) {
    $effect(() => {
      componentStack = $stack;
    });
  }
  
  // ...existing return...
});

// Helper functions
function formatComponentPath(stack: ComponentInfo[]): string {
  return stack.map(c => c.name).join(' → ');
}

function getUniqueComponents(stack: ComponentInfo[]): Map<string, number> {
  const counts = new Map<string, number>();
  stack.forEach(c => {
    counts.set(c.name, (counts.get(c.name) || 0) + 1);
  });
  return counts;
}

function formatMountTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 1000) return `${diff}ms ago`;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  return `${Math.floor(diff / 60000)}m ago`;
}
```

**Template Additions:**

Add after the `viewId` info row (around line 155):

```svelte
<!-- Component Stack -->
{#if componentStack.length > 0}
  <div class="info-row components-header">
    <span class="label">components:</span>
    <button 
      class="detail-toggle"
      onclick={() => showComponentDetails = !showComponentDetails}
      aria-label={showComponentDetails ? 'Hide component details' : 'Show component details'}
      data-testid={tid('dev-overlay', 'btn-components-toggle')}
    >
      {showComponentDetails ? '▼' : '▶'} {componentStack.length}
    </button>
  </div>
  
  {#if !showComponentDetails}
    <!-- Compact path view -->
    <div class="info-row">
      <span class="label"></span>
      <code class="value component-path">
        {formatComponentPath(componentStack)}
      </code>
    </div>
  {:else}
    <!-- Detailed tree view -->
    <ComponentTree components={componentStack} />
  {/if}
{/if}
```

**Style Additions:**

```css
.value.component-path {
  color: #fbbf24;
  font-size: 10px;
  line-height: 1.5;
  word-break: break-word;
}

.components-header {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 6px;
  margin-top: 4px;
}

.detail-toggle {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font: inherit;
  padding: 0;
  font-size: 11px;
}

.detail-toggle:hover {
  color: #e0e0e0;
}
```

**Updated Copy Payload:**

Extend the `copyPayload` derived to include component info:

```typescript
let copyPayload = $derived(
  JSON.stringify(
    {
      pathname,
      search: search || undefined,
      params,
      routeId,
      components: componentStack.map(c => ({
        name: c.name,
        filePath: c.filePath,
        mountedAt: c.mountedAt
      }))
    },
    null,
    2
  )
);
```

#### 5. Component Tree Visualization (`src/lib/dev/ComponentTree.svelte`)

**Purpose:** Hierarchical visualization of component stack with drill-down details

**Features:**
- Tree-like indented display
- Show component names with file paths on hover
- Display mount times relative to now
- Optional prop inspection (collapsed by default)
- Color coding by component type (route, layout, component)
- Click to copy file path (for quick navigation)

**Props Interface:**
```typescript
interface Props {
  components: ComponentInfo[];
  maxDepth?: number;  // Optional depth limit for very nested trees
}
```

**Template Structure:**
```svelte
<script lang="ts">
  import type { ComponentInfo } from './componentRegistry';
  
  interface Props {
    components: ComponentInfo[];
    maxDepth?: number;
  }
  
  let { components, maxDepth = 10 }: Props = $props();
  
  // Determine nesting level by analyzing component names
  // Route components like +page, +layout indicate hierarchy
  function getDepth(component: ComponentInfo, index: number): number {
    // Simple heuristic: count based on order
    // Could be enhanced with actual parent tracking
    return Math.min(index, maxDepth);
  }
  
  function getComponentType(name: string): 'route' | 'layout' | 'component' {
    if (name.includes('+page')) return 'route';
    if (name.includes('+layout')) return 'layout';
    return 'component';
  }
  
  function formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    return `${Math.floor(diff / 60000)}m`;
  }
  
  async function copyPath(filePath?: string) {
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  }
</script>

<div class="component-tree">
  {#each components as component, i}
    {@const depth = getDepth(component, i)}
    {@const type = getComponentType(component.name)}
    
    <div 
      class="tree-node"
      class:route={type === 'route'}
      class:layout={type === 'layout'}
      class:component={type === 'component'}
      style="padding-left: {depth * 12}px"
      title={component.filePath}
    >
      <span class="node-icon">
        {#if type === 'route'}📄
        {:else if type === 'layout'}📐
        {:else}🧩
        {/if}
      </span>
      
      <span class="node-name">{component.name}</span>
      
      <span class="node-time">{formatTime(component.mountedAt)}</span>
      
      {#if component.filePath}
        <button
          class="node-copy"
          onclick={() => copyPath(component.filePath)}
          title="Copy file path"
        >
          📋
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .component-tree {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    padding: 6px 4px;
    font-size: 10px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .tree-node {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px;
    border-radius: 2px;
    margin: 1px 0;
  }
  
  .tree-node:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .node-icon {
    font-size: 10px;
    flex-shrink: 0;
  }
  
  .node-name {
    flex: 1;
    color: #fbbf24;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .tree-node.route .node-name {
    color: #93c5fd;
  }
  
  .tree-node.layout .node-name {
    color: #a78bfa;
  }
  
  .node-time {
    color: #9ca3af;
    font-size: 9px;
    flex-shrink: 0;
    opacity: 0.7;
  }
  
  .node-copy {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 0 2px;
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .tree-node:hover .node-copy {
    opacity: 1;
  }
  
  .node-copy:hover {
    color: #e0e0e0;
  }
</style>
```

### Integration Points

#### 6. Root Layout Integration (`src/routes/+layout.svelte`)

**Changes Required:**

```svelte
<script lang="ts">
  // ...existing imports...
  
  // Import component tracking (dev only)
  import { createComponentStack } from '$lib/dev/componentRegistry';
  
  // Initialize component tracking
  if (import.meta.env.DEV) {
    createComponentStack();
  }
  
  // ...rest of script...
</script>

<!-- ...existing template... -->

{#if import.meta.env.DEV}
  <DevOverlay />
{/if}

<slot />
```

#### 7. Example Component Registration

**Note:** With the Vite plugin in place, components are automatically registered. The examples below are only needed for special cases where you want to override the default behavior.

**Manual Registration Example (rarely needed):**

For edge cases where you want custom component names or behavior:

```svelte
<!-- src/routes/search/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry';
  
  // ...existing code...
  
  // Manual override (only if you need custom behavior)
  if (import.meta.env.DEV) {
    onMount(() => {
      return registerComponent('CustomSearchPageName', {
        filePath: 'src/routes/search/+page.svelte',
        // Optional: add custom metadata
        customData: { ... }
      });
    });
  }
</script>
```

**Using the wrapper (also rarely needed):**

```typescript
// src/routes/search/+page.ts
import { withComponentTracking } from '$lib/dev/withComponentTracking';
import SearchPage from './+page.svelte';

// Only if you need to completely override auto-tracking
export default import.meta.env.DEV 
  ? withComponentTracking(SearchPage, 'CustomName')
  : SearchPage;
```

**Typical case - no manual code needed:**

Most components require no changes. The Vite plugin handles everything:

```svelte
<!-- src/lib/components/MyComponent.svelte -->
<!-- No tracking code needed - automatically tracked by plugin -->
<script lang="ts">
  // Your normal component code
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Count: {count}
</button>
```

## Implementation Strategy

### Phase 1: Core Infrastructure & Auto-Tracking (Day 1-3)
**Goal:** Get automatic tracking working with Vite plugin

1. ✅ Create `componentRegistry.ts`
   - Implement `ComponentInfo` type
   - Implement `createComponentStack()`
   - Implement `registerComponent()`
   - Implement `getComponentStack()`
   - Add comprehensive JSDoc comments

2. ✅ Implement `autoTrack.ts` Vite plugin
   - Set up plugin structure with transform hook
   - Implement script block detection logic
   - Implement code injection with MagicString
   - Add include/exclude pattern matching
   - Create default name extractor function
   - Preserve source maps
   - Add comprehensive error handling

3. ✅ Install required dependencies
   - `npm install -D magic-string`
   - `npm install -D micromatch @types/micromatch`

4. ✅ Configure Vite
   - Import and add plugin to `vite.config.ts`
   - Configure exclude patterns (DevOverlay, ComponentTree, tests)
   - Set up include patterns for routes and lib
   - Test plugin loads correctly

5. ✅ Update root `+layout.svelte`
   - Import and initialize component stack
   - Verify context propagates to children

6. ✅ Test automatic registration
   - Navigate to existing routes
   - Verify components automatically appear in store
   - Test mount/unmount lifecycle
   - Verify no duplicate registrations

**Success Criteria:**
- Registry tracks components correctly
- Vite plugin successfully injects tracking code
- All .svelte components auto-register (except excluded)
- Context propagates through component tree
- Cleanup happens on unmount
- No errors during dev server compilation

### Phase 2: Basic UI Display (Day 3-4)
**Goal:** Show component list in DevOverlay

1. ✅ Enhance `DevOverlay.svelte`
   - Import component registry
   - Subscribe to component stack
   - Add compact path display
   - Add collapsible section
   - Update styles

2. ✅ Test display
   - Verify automatically tracked components show in overlay
   - Test expand/collapse behavior
   - Test with 0, 1, and many components
   - Navigate between different routes to see component changes

3. ✅ Update copy-to-clipboard
   - Include component info in payload
   - Test clipboard functionality

**Success Criteria:**
- Component path visible in overlay
- All route components automatically appear
- Expand/collapse works smoothly
- Copy includes component data with file paths

### Phase 3: Tree Visualization (Day 4-5)
**Goal:** Rich component tree display

1. ✅ Create `ComponentTree.svelte`
   - Implement tree layout
   - Add color coding by type
   - Add time display
   - Add file path tooltip
   - Implement copy-path button

2. ✅ Integrate with DevOverlay
   - Show tree in expanded mode
   - Handle edge cases (empty, single component)

3. ✅ Polish UI
   - Refine spacing and colors
   - Add hover states
   - Test scrolling for deep trees

**Success Criteria:**
- Tree displays with proper nesting
- Colors and icons clarify component types
- Copy-path works for quick navigation

### Phase 4: Polish & Enhancement (Day 5-6)
**Goal:** Refine tracking and add advanced features

1. ✅ Enhance component metadata
   - Improve name extraction for better readability
   - Add component type detection (route vs layout vs component)
   - Add optional prop tracking capability

2. ✅ Performance optimization
   - Profile registration overhead
   - Optimize store updates for large component trees
   - Add debouncing if needed

3. ✅ Plugin refinements
   - Handle edge cases discovered during testing
   - Improve error messages for debugging
   - Add configuration validation

4. ✅ Documentation
   - Document how to disable tracking for specific components
   - Document configuration options
   - Add troubleshooting guide

**Success Criteria:**
- Component names are readable and meaningful
- Performance overhead is minimal (< 1ms per component)
- Plugin handles all edge cases gracefully
- Documentation is comprehensive

## Testing Strategy

### Unit Tests

**File:** `src/lib/dev/componentRegistry.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentStack, registerComponent } from './componentRegistry';

describe('componentRegistry', () => {
  beforeEach(() => {
    // Reset any global state
  });

  it('should create empty component stack', () => {
    const stack = createComponentStack();
    expect(stack).toBeDefined();
  });

  it('should register and unregister components', () => {
    const stack = createComponentStack();
    const cleanup = registerComponent('TestComponent');
    
    // Assert component in stack
    
    cleanup();
    
    // Assert component removed from stack
  });

  it('should handle multiple registrations', () => {
    // Test concurrent registrations
  });

  it('should auto-generate unique IDs', () => {
    // Test ID generation
  });
});
```

**File:** `src/lib/dev/autoTrack.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { vitePluginComponentTracking } from './autoTrack';

describe('vitePluginComponentTracking', () => {
  it('should inject tracking code into component with script block', () => {
    const input = `<script lang="ts">
  let count = 0;
</script>

<button>Click</button>`;
    
    const plugin = vitePluginComponentTracking();
    const result = plugin.transform(input, '/src/routes/test.svelte');
    
    expect(result.code).toContain('registerComponent');
    expect(result.code).toContain('onMount');
  });

  it('should create script block if none exists', () => {
    const input = `<button>Click</button>`;
    
    const plugin = vitePluginComponentTracking();
    const result = plugin.transform(input, '/src/routes/test.svelte');
    
    expect(result.code).toContain('<script>');
    expect(result.code).toContain('registerComponent');
  });

  it('should handle module context script', () => {
    const input = `<script context="module">
  export const prerender = true;
</script>

<button>Click</button>`;
    
    const plugin = vitePluginComponentTracking();
    const result = plugin.transform(input, '/src/routes/test.svelte');
    
    // Should add instance script after module script
    expect(result.code).toMatch(/<script>\s*\/\/ Auto-generated/);
  });

  it('should respect exclude patterns', () => {
    const plugin = vitePluginComponentTracking({
      exclude: ['**/DevOverlay.svelte']
    });
    
    const result = plugin.transform('<button>Click</button>', '/src/lib/dev/DevOverlay.svelte');
    
    expect(result).toBeNull();
  });

  it('should extract component name from file path', () => {
    const plugin = vitePluginComponentTracking({
      nameExtractor: (path) => path.replace(/^.*\//, '').replace(/\.svelte$/, '')
    });
    
    const result = plugin.transform('<button>Click</button>', '/src/routes/search/+page.svelte');
    
    expect(result.code).toContain("'+page'");
  });
});
```

### Integration Tests

**File:** `src/lib/dev/DevOverlay.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DevOverlay from './DevOverlay.svelte';

describe('DevOverlay with component tracking', () => {
  it('should display component path', async () => {
    // Mock component stack
    // Render DevOverlay
    // Expand overlay
    // Assert component path visible
  });

  it('should toggle component details', async () => {
    // Test expand/collapse of component details
  });

  it('should include components in copy payload', async () => {
    // Test clipboard copy includes component data
  });
});
```

### Visual/Manual Testing

1. **Automatic Tracking Test**
   - Start dev server with plugin enabled
   - Navigate to various routes
   - Verify all components automatically appear in overlay
   - Check that component names are meaningful
   - Verify file paths are correct

2. **Plugin Edge Cases**
   - Test routes with no script blocks
   - Test routes with module context scripts
   - Test components in lib directory
   - Verify excluded components don't appear (DevOverlay, ComponentTree)

3. **Interaction Test**
   - Expand/collapse component section
   - Copy to clipboard
   - Hover over components in tree
   - Copy file paths from tree view

4. **Edge Cases**
   - Very deep component tree (>10 levels)
   - Rapid navigation between routes
   - Hot module replacement (HMR) during development

5. **Performance Test**
   - Measure dev server startup time with plugin
   - Test with 50+ components in a single page
   - Check for memory leaks during navigation
   - Profile HMR performance

### Performance Benchmarks

**Acceptance Criteria:**
- Vite plugin transform time: < 5ms per .svelte file
- Registration overhead: < 1ms per component
- Store update latency: < 5ms
- DevOverlay render time: < 50ms with 20 components
- Memory: < 100KB for tracking data
- Dev server startup: < 200ms overhead from plugin
- HMR time: No noticeable increase

## Rollback Plan

### Feature Flag Approach

Add environment variable for gradual rollout:

```typescript
// .env.development
DEV_OVERLAY_COMPONENTS=true
```

```typescript
// componentRegistry.ts
export function registerComponent(name: string, options?: RegisterOptions) {
  if (!import.meta.env.DEV) return () => {};
  if (!import.meta.env.DEV_OVERLAY_COMPONENTS) return () => {};
  
  // ... registration logic ...
}
```

### Disable Steps

If issues arise:
1. Set `DEV_OVERLAY_COMPONENTS=false` in `.env.development`
2. Restart dev server
3. All tracking disabled immediately
4. No code changes required

### Complete Removal

If feature needs to be removed:
1. Remove registration calls from components
2. Remove component tracking section from DevOverlay
3. Delete `componentRegistry.ts`, `ComponentTree.svelte`, etc.
4. No impact on production builds (already guarded)

## Future Enhancements

### Short-term (Next Sprint)

1. **DOM Highlighting**
   - Click component name to highlight in DOM
   - Use `getBoundingClientRect()` to draw overlay
   - Useful for debugging layout issues

2. **Component Props Inspector**
   - Show current prop values
   - Expand/collapse per component
   - Format complex objects

3. **Performance Metrics**
   - Track render time per component
   - Show re-render count
   - Identify performance bottlenecks

### Medium-term (Next Quarter)

4. **State Inspection**
   - Show Svelte `$state` variables
   - Track state changes over time
   - Export state snapshots

5. **Browser DevTools Integration**
   - Custom panel in browser DevTools
   - Better debugging experience
   - Integration with Chrome/Firefox DevTools API

6. **Component Search/Filter**
   - Search components by name
   - Filter by type (route/layout/component)
   - Quick navigation

### Long-term (Future)

7. **Time-Travel Debugging**
   - Record component mount/unmount history
   - Replay navigation sequences
   - Export debugging sessions

8. **Dependency Graph**
   - Visualize component dependencies
   - Show prop flow between components
   - Identify tightly coupled components

9. **Export and Analysis**
   - Export component tree as JSON
   - Generate performance reports
   - Compare between sessions

## Documentation Updates

### Files to Update

1. **README.md**
   - Add section on development tools
   - Mention component tracking in DevOverlay
   - Link to this plan

2. **COMPONENT_USAGE.md**
   - Document how to register components
   - Show examples of manual registration
   - Explain when/why to track components

3. **New: docs/dev-tools.md**
   - Comprehensive guide to DevOverlay
   - Component tracking tutorial
   - Troubleshooting section

### Example Documentation Snippet

```markdown
## Development Tools

### DevOverlay

The development overlay shows routing and component information while developing.

#### Component Tracking

Components are automatically tracked in development mode via a Vite plugin. No manual registration is needed - all .svelte files are automatically instrumented to register themselves when they mount.

**Viewing Component Hierarchy:**

1. Open the DevOverlay (press `Ctrl+Shift+D` or click the dev icon)
2. Look for the "components" section
3. Click the arrow to expand and see the full component tree
4. Click the copy icon next to any component to copy its file path

**Excluding Components from Tracking:**

To exclude specific components from tracking, update `vite.config.ts`:

```typescript
vitePluginComponentTracking({
  exclude: [
    '**/node_modules/**',
    '**/MySpecialComponent.svelte', // Add your exclusions here
  ]
})
```

**Manual Registration (Advanced):**

For special cases where you need custom component names or metadata:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { registerComponent } from '$lib/dev/componentRegistry';
  
  if (import.meta.env.DEV) {
    onMount(() => {
      return registerComponent('CustomComponentName', {
        filePath: 'src/lib/components/MyComponent.svelte',
        customData: { /* optional metadata */ }
      });
    });
  }
</script>
```

Note: Manual registration is rarely needed since the plugin handles everything automatically.
```

## Success Metrics

### Quantitative

- **Adoption:** 100% of components tracked automatically via Vite plugin
- **Performance:** < 5ms plugin transform overhead per .svelte file
- **Reliability:** Zero production impact (100% dev-only)
- **Coverage:** All routes and library components tracked by default

### Qualitative

- **Developer Feedback:** Positive feedback from 80% of team
- **Debugging Time:** Reduce time to identify relevant components by 50%
- **Usability:** No training required, self-explanatory UI
- **Maintenance:** Minimal ongoing maintenance required

## Dependencies

### External Libraries
- `magic-string` - For efficient code transformation with source maps (dev dependency)
- `micromatch` - For glob pattern matching in include/exclude (dev dependency)

### Internal Dependencies
- Existing `DevOverlay.svelte` component
- Svelte 5 context API
- SvelteKit environment detection
- Vite plugin API

### Browser Requirements
- Clipboard API for copy-to-clipboard (graceful degradation)
- Modern browser with dev tools support

## Risk Assessment

### Low Risk ✅
- **No production impact:** All code is dev-only
- **Non-breaking:** Additive changes only
- **Reversible:** Easy to disable or remove
- **Isolated:** Self-contained feature

### Medium Risk ⚠️
- **Performance:** Could slow down dev mode if poorly implemented
  - *Mitigation:* Profile early, optimize registration and plugin transform
- **Memory:** Could leak memory if cleanup isn't correct
  - *Mitigation:* Test lifecycle thoroughly, use WeakMap where appropriate
- **Vite Plugin Complexity:** Auto-tracking plugin could have edge cases
  - *Mitigation:* Comprehensive testing, good error handling, easy to disable
- **Build Time:** Plugin could slow down HMR and initial build
  - *Mitigation:* Optimize transform logic, cache when possible

## Open Questions

1. **Q:** Should we track all components or only specific ones?
   - **A:** Track all by default via Vite plugin, use exclude patterns for exceptions

2. **Q:** How deep should the component tree go?
   - **A:** Track all levels, but UI can collapse/limit display depth

3. **Q:** Should we track component props?
   - **A:** Optional for Phase 4, behind a toggle to avoid noise

4. **Q:** How to handle large component names/paths in the UI?
   - **A:** Truncate with ellipsis, show full path on hover or in tree view

5. **Q:** Should this integrate with browser DevTools?
   - **A:** Future enhancement, start with in-page overlay

## Approval & Sign-off

- [ ] Technical Lead Review
- [ ] UX Review (for overlay design)
- [ ] Security Review (ensure no prod impact)
- [ ] Team Feedback Session

## References

- [Svelte 5 Context API](https://svelte.dev/docs/svelte/context)
- [SvelteKit Environment Detection](https://kit.svelte.dev/docs/modules#$app-environment)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- Existing `DevOverlay.svelte` implementation

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-10  
**Author:** Development Team  
**Status:** Ready for Implementation

