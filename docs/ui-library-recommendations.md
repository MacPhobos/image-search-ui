# Svelte UI Library Recommendations

> **Date**: 2026-01-06
> **Project**: Image Search UI (SvelteKit 2 + Svelte 5 + Tailwind CSS v4)
> **Purpose**: Enhance UI with richer widgets and components

---

## Executive Summary

Your current stack (SvelteKit 2, Svelte 5 runes, Tailwind CSS v4) is well-positioned to adopt modern Svelte UI libraries. The recommendations below are organized by category with **relevance scores** (🎯) specific to your image search application.

**Top 3 Immediate Recommendations:**
1. **shadcn-svelte** - Comprehensive component library (Svelte 5 + Tailwind v4 ready)
2. **Bigger Picture** - High-performance lightbox for image galleries
3. **LayerChart** - Data visualization for search analytics

---

## 1. Component Libraries

### shadcn-svelte ⭐ HIGHLY RECOMMENDED
**Relevance**: 🎯🎯🎯🎯🎯

An unofficial Svelte port of the popular React shadcn/ui. Generates actual component source code into your project, giving full control over markup and styling.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Full support with recent updates |
| **Tailwind v4** | ✅ Native support |
| **Components** | 40+ reusable components |
| **Customization** | Full control (code lives in your project) |
| **Charts** | Built-in via LayerChart integration |

**Why for Image Search:**
- Modal/dialog components for image detail views
- Card components for search results
- Badge/tag components for face labels
- Dropdown menus for bulk actions
- Form components with validation

**Install:** `npx shadcn-svelte@latest init`

**Links:** [GitHub](https://www.shadcn-svelte.com/) | [Docs](https://www.shadcn-svelte.com/docs)

---

### Skeleton v3.0
**Relevance**: 🎯🎯🎯🎯

A design system built on Tailwind CSS with native Svelte components built on Zag.js primitives.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ v3.0 supports Svelte 5 |
| **Tailwind v4** | ✅ Supported |
| **Theming** | Built-in theme generator |
| **Components** | Modals, tables, avatars, pagination |

**Why for Image Search:**
- Avatar components for person faces
- Table components for session/queue management
- Pagination for search results
- Toast notifications

**Install:** `npm i @skeletonlabs/skeleton @skeletonlabs/tw-plugin`

**Links:** [Website](https://www.skeleton.dev/) | [GitHub](https://github.com/skeletonlabs/skeleton)

---

### Flowbite Svelte
**Relevance**: 🎯🎯🎯

Official Svelte version of Flowbite with 60+ UI components.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Compatible |
| **Tailwind** | ✅ Built on Tailwind |
| **Dark Mode** | ✅ Built-in |
| **Components** | 60+ components |

**Why for Image Search:**
- Gallery grid components
- Timeline components (for training sessions)
- Progress bars (for job queues)
- Tooltips and popovers

**Install:** `npm i flowbite-svelte flowbite`

**Links:** [Website](https://flowbite-svelte.com/) | [GitHub](https://github.com/themesberg/flowbite-svelte)

---

### Bits UI (Headless)
**Relevance**: 🎯🎯🎯

Headless component primitives for Svelte 5 - bring your own styles.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Built for Svelte 5 runes |
| **Styling** | Works with Tailwind/any CSS |
| **Accessibility** | Full a11y support |
| **Foundation** | Used by shadcn-svelte |

**Why for Image Search:**
- Custom-styled components matching your design
- Accessible dialogs, menus, popovers
- Maximum flexibility

**Install:** `npm i bits-ui`

**Links:** [Website](https://www.bits-ui.com/) | [GitHub](https://github.com/huntabyte/bits-ui)

---

## 2. Image & Media Components

### Bigger Picture ⭐ HIGHLY RECOMMENDED
**Relevance**: 🎯🎯🎯🎯🎯

High-performance JavaScript lightbox gallery built with Svelte. Under 10 kB gzipped.

| Aspect | Details |
|--------|---------|
| **Performance** | Half the size of PhotoSwipe |
| **Zoom** | Click, wheel, or pinch to zoom |
| **Media Support** | Images, video, audio, iframes, HTML |
| **Accessibility** | Alt text, captions, keyboard nav |
| **Responsive** | Built-in srcset support |

**Why for Image Search:**
- Perfect for viewing full-resolution search results
- Zoom capability for face detection review
- Lightweight won't impact bundle size
- Video support for future features

**Install:** `npm install bigger-picture`

**Links:** [GitHub](https://github.com/henrygd/bigger-picture) | [Demo](https://biggerpicture.henrygd.me)

---

### svelte-lightbox
**Relevance**: 🎯🎯🎯🎯

Pure Svelte lightbox component with gallery support.

| Aspect | Details |
|--------|---------|
| **Size** | Minimal, tree-shakeable |
| **Customization** | Build custom lightbox with building blocks |
| **Mobile** | Full mobile support |

**Why for Image Search:**
- Simple integration with existing Svelte components
- Gallery mode for browsing search results
- Customizable to show face bounding boxes

**Install:** `npm i svelte-lightbox -D`

**Links:** [GitHub](https://github.com/Hejtmus/svelte-lightbox) | [Docs](https://svelte-lightbox.js.org/)

---

## 3. Data Tables & Grids

### SVAR Svelte DataGrid ⭐ RECOMMENDED
**Relevance**: 🎯🎯🎯🎯

High-performance data grid built 100% in Svelte with Svelte 5 support.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Version 2.x for Svelte 5 |
| **Virtual Scroll** | ✅ For large datasets |
| **Features** | Sorting, filtering, tree-data, inline editing |
| **License** | MIT (free) |
| **Bundle Size** | 155 KB |

**Why for Image Search:**
- Display large search result sets efficiently
- Virtual scrolling for thousands of images
- Inline editing for face labels
- Tree-data for cluster hierarchies

**Install:** `npm install @svar-ui/svelte-grid`

**Links:** [Website](https://svar.dev/svelte/datagrid/) | [GitHub](https://github.com/svar-widgets/grid)

---

### Svelte TableCN (TanStack Table)
**Relevance**: 🎯🎯🎯

Feature-rich data table built on TanStack Table with Svelte 5 runes.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Requires Svelte 5 runes |
| **Features** | Cell editing, selection, copy/paste, search |
| **Virtualization** | Row virtualization support |

**Why for Image Search:**
- TanStack Table is battle-tested
- Row selection for bulk face operations
- Search/filter built-in

**Links:** [Demo](https://next.jqueryscript.net/svelte/data-grid-tanstack-table/)

---

### Tzezar's Datagrid
**Relevance**: 🎯🎯🎯

Headless datagrid built with shadcn-svelte for flexible styling.

| Aspect | Details |
|--------|---------|
| **Foundation** | Built on shadcn-svelte |
| **Virtual Scroll** | ✅ Div-based for performance |
| **Flexibility** | Highly customizable |

**Why for Image Search:**
- Integrates with shadcn-svelte if adopted
- Good for complex data management interfaces

**Links:** [Demo](https://next.jqueryscript.net/svelte/data-table-tzezar-datagrid/)

---

## 4. Charts & Visualization

### LayerChart ⭐ HIGHLY RECOMMENDED
**Relevance**: 🎯🎯🎯🎯🎯

Composable Svelte charting library built on D3 and Layer Cake.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Seamless integration |
| **Chart Types** | Bar, Area, Scatter, Pie, Arc, Sunburst, Treemap, and more |
| **Interactivity** | Tooltips, legends, pan/zoom, motion effects |
| **Geo** | Map visualizations |
| **License** | Free and open-source |

**Why for Image Search:**
- Visualize search analytics (queries over time)
- Face cluster distribution charts
- Training session progress graphs
- Queue throughput monitoring

**Install:** `npm install layerchart`

**Links:** [Website](https://www.layerchart.com/) | [GitHub](https://github.com/techniq/layerchart)

---

### Svelte UX (Companion to LayerChart)
**Relevance**: 🎯🎯🎯

Component library from the LayerChart team for interactive applications.

| Aspect | Details |
|--------|---------|
| **Integration** | Works seamlessly with LayerChart |
| **Components** | Interactive UI utilities |

**Links:** [GitHub](https://github.com/techniq/svelte-ux)

---

## 5. Drag & Drop

### svelte-dnd-action ⭐ RECOMMENDED
**Relevance**: 🎯🎯🎯🎯

Feature-complete drag and drop implementation with Svelte 5 support.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Works with onconsider/onfinalize |
| **Features** | Sorting, multi-container, accessibility |
| **Maturity** | Production-ready, actively maintained |

**Why for Image Search:**
- Reorder images in training sets
- Drag faces between person groups
- Kanban-style cluster organization

**Install:** `npm i svelte-dnd-action`

**Links:** [GitHub](https://github.com/isaacHagoel/svelte-dnd-action) | [npm](https://www.npmjs.com/package/svelte-dnd-action)

---

### @thisux/sveltednd
**Relevance**: 🎯🎯🎯

Lightweight drag and drop library built specifically for Svelte 5 runes.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Built for runes system |
| **TypeScript** | ✅ Full support |
| **Examples** | Sortable, grid, kanban |

**Install:** `npm i @thisux/sveltednd@latest`

**Links:** [GitHub](https://github.com/thisuxhq/sveltednd)

---

### dnd-kit-svelte
**Relevance**: 🎯🎯🎯

Port of dnd-kit (popular React library) to Svelte.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Adapted for Svelte reactivity |
| **Feature Parity** | Maintains dnd-kit features |

**Links:** [GitHub](https://github.com/hanielu/dnd-kit-svelte) | [Demo](https://dnd-kit-svelte.vercel.app/)

---

## 6. Forms & Validation

### Superforms ⭐ HIGHLY RECOMMENDED
**Relevance**: 🎯🎯🎯🎯

Comprehensive SvelteKit form library with multi-validator support.

| Aspect | Details |
|--------|---------|
| **Validators** | Zod 3/4, Arktype, Joi, Valibot, and more |
| **Features** | Auto-coercion, tainted detection, file upload |
| **Progressive** | Works without JavaScript |
| **TypeScript** | Strong typing |

**Why for Image Search:**
- Form validation for person creation/editing
- File upload for image ingestion
- Complex filter forms
- Settings/configuration forms

**Install:** `npm i -D sveltekit-superforms zod`

**Links:** [Website](https://superforms.rocks/) | [GitHub](https://github.com/ciscoheat/sveltekit-superforms)

---

### Formsnap (shadcn-svelte)
**Relevance**: 🎯🎯🎯

Form abstraction built on Superforms, integrated with shadcn-svelte.

| Aspect | Details |
|--------|---------|
| **Integration** | Part of shadcn-svelte ecosystem |
| **Foundation** | Built on Superforms |

**Links:** [Docs](https://www.shadcn-svelte.com/docs/components/form)

---

## 7. Toast & Notifications

### svelte-sonner
**Relevance**: 🎯🎯🎯🎯

Port of Sonner toast library with beautiful default styling.

| Aspect | Details |
|--------|---------|
| **Styling** | Beautiful out of the box |
| **Animation** | Smooth transitions |
| **Types** | Success, error, warning, loading |

**Why for Image Search:**
- Notify on job completion
- Error feedback for failed operations
- Success messages for face assignments

**Install:** `npm install svelte-sonner`

**Links:** [npm](https://www.npmjs.com/package/svelte-sonner)

---

### svelte-french-toast
**Relevance**: 🎯🎯🎯

Lightweight toast library inspired by react-hot-toast.

| Aspect | Details |
|--------|---------|
| **Size** | Lightweight |
| **API** | Simple, familiar |
| **Customization** | Flexible styling |

**Install:** `npm install svelte-french-toast`

**Links:** [npm](https://www.npmjs.com/package/svelte-french-toast)

---

## 8. Specialty Components

### Virtual Scrolling - svelte-virtual-list
**Relevance**: 🎯🎯🎯🎯

Official Svelte virtual list component for large datasets.

| Aspect | Details |
|--------|---------|
| **Maintainer** | Svelte team |
| **Use Case** | Long lists without DOM bloat |

**Why for Image Search:**
- Efficiently render thousands of search results
- Face list scrolling
- Queue/session history

**Links:** [GitHub](https://github.com/sveltejs/svelte-virtual-list)

---

### Motion (Animation)
**Relevance**: 🎯🎯🎯

Svelte 5 motion library for animations.

| Aspect | Details |
|--------|---------|
| **Svelte 5** | ✅ Native support |
| **Features** | Tweens, springs, transitions |

**Links:** Built into Svelte (`svelte/motion`)

---

## Implementation Priority

### Phase 1: Core Experience (Immediate)
| Library | Purpose | Effort |
|---------|---------|--------|
| **shadcn-svelte** | Component foundation | Medium |
| **Bigger Picture** | Image lightbox | Low |
| **svelte-sonner** | Toast notifications | Low |

### Phase 2: Enhanced Features (Short-term)
| Library | Purpose | Effort |
|---------|---------|--------|
| **LayerChart** | Analytics visualization | Medium |
| **svelte-dnd-action** | Drag & drop organization | Medium |
| **Superforms** | Form validation | Medium |

### Phase 3: Performance & Polish (Medium-term)
| Library | Purpose | Effort |
|---------|---------|--------|
| **SVAR DataGrid** | Large dataset tables | Medium |
| **svelte-virtual-list** | Infinite scroll lists | Low |

---

## Compatibility Matrix

| Library | Svelte 5 | Tailwind v4 | TypeScript | Bundle Size |
|---------|----------|-------------|------------|-------------|
| shadcn-svelte | ✅ | ✅ | ✅ | ~varies |
| Bigger Picture | ✅ | N/A | ✅ | <10 KB |
| LayerChart | ✅ | ✅ | ✅ | ~moderate |
| svelte-dnd-action | ✅ | N/A | ✅ | ~small |
| Superforms | ✅ | N/A | ✅ | ~moderate |
| SVAR DataGrid | ✅ | N/A | ✅ | 155 KB |
| svelte-sonner | ✅ | ✅ | ✅ | ~small |
| Skeleton v3 | ✅ | ✅ | ✅ | ~moderate |
| Flowbite Svelte | ✅ | ✅ | ✅ | ~varies |

---

## Sources

- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Bigger Picture](https://github.com/henrygd/bigger-picture)
- [LayerChart](https://www.layerchart.com/)
- [svelte-dnd-action](https://github.com/isaacHagoel/svelte-dnd-action)
- [Superforms](https://superforms.rocks/)
- [SVAR DataGrid](https://svar.dev/svelte/datagrid/)
- [Skeleton](https://www.skeleton.dev/)
- [Flowbite Svelte](https://flowbite-svelte.com/)
- [Bits UI](https://www.bits-ui.com/)
- [svelte-lightbox](https://svelte-lightbox.js.org/)
- [How to Choose Svelte Library (SVAR Blog)](https://svar.dev/blog/how-to-choose-svelte-library/)
- [Top Svelte UI Libraries 2025 (WeAreDevelopers)](https://www.wearedevelopers.com/en/magazine/250/top-svelte-ui-libraries)
- [Awesome Svelte (GitHub)](https://github.com/TheComputerM/awesome-svelte)

---

## Next Steps

1. **Review this document** and identify priority libraries
2. **Prototype integration** with top picks (shadcn-svelte recommended as foundation)
3. **Test Svelte 5 compatibility** in isolated branch
4. **Evaluate bundle size impact** before committing to library
5. **Consider design system** - shadcn-svelte + LayerChart work well together
