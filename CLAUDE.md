# Claude Code Context

This file contains project-specific context for Claude Code to improve assistance quality.

## Project Overview

Image search UI built with SvelteKit and TypeScript. Connects to a backend API for image search functionality.

## Key Decisions

- **Svelte 5 Runes**: Using modern reactive state with `$state`, `$derived`, `$effect`
- **Adapter**: Node.js adapter for server-side rendering
- **Testing**: Vitest with Testing Library (no Playwright)
- **API Integration**: Environment-based API URL configuration

## Architecture Notes

- Component-based architecture with minimal shared state
- API client abstracts fetch logic
- Tests mock network calls to avoid external dependencies

## Development Workflow

1. Start dev server: `npm run dev`
2. Run tests in watch mode during development: `npm run test:watch`
3. Format before committing: `npm run format`
4. Ensure tests pass: `npm test`

## Future Enhancements

- [ ] Add state management for complex search filters
- [ ] Implement image preview modal
- [ ] Add pagination for results
- [ ] Add loading states and error boundaries
- [ ] Implement responsive design for mobile
