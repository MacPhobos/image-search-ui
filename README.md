# Image Search UI

SvelteKit + TypeScript dashboard for image search.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

Visit http://localhost:5173

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests with Vitest
- `npm run test:watch` - Run tests in watch mode

## Project Structure

```
src/
├── lib/
│   ├── api/
│   │   └── client.ts          # API client with fetch wrapper
│   ├── components/
│   │   ├── FiltersPanel.svelte
│   │   ├── ResultsGrid.svelte
│   │   └── SearchBar.svelte
│   └── types.ts               # TypeScript interfaces
├── routes/
│   ├── +layout.svelte         # Root layout
│   └── +page.svelte           # Dashboard page
└── tests/
    ├── setup.ts               # Test setup
    ├── SearchBar.test.ts
    └── page.test.ts
```

## Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:8000)

## Tech Stack

- **Framework**: SvelteKit with Svelte 5 Runes
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint
- **Formatting**: Prettier
- **Deployment**: Node.js adapter

## Contract Change Checklist (8 bullets)

When the API contract (docs/api-contract.md) changes:

1. Bump version in api-contract.md header and changelog
2. Update backend Pydantic models in image-search-service
3. Verify OpenAPI generation - hit http://localhost:8000/openapi.json
4. Run UI type generation - cd image-search-ui && npm run gen:api
5. Update UI code if generated types changed breaking interfaces
6. Copy updated api-contract.md to both repos (keep identical)
7. Run tests in both repos before merging
8. Tag release with matching versions in both repos

## License

GPLv3
