# Image Search UI

## Why

- You might have accumulated hundreds of thousands of images over time. Finding the right one is a pain.
- You also might not care to use expensive cloud services for image storage and search.
- You might want to keep your images private.
- Do all of this on your local machine without using any external LLMs or other services.
- Be able to:
  - Do semantic search on images using natural language queries like: "Sunset over the ocean"
  - Detect faces and assign them to a specific person
  - Do a search by person name and semantic query at the same time: "Mac + Sunset over the ocean"

## Why

Managing a large personal photo library is hard: filenames, folders, and timestamps don’t describe what’s \*in\* an image. Once you have tens (or hundreds) of thousands of photos, finding “that one shot” becomes slow and frustrating.

This project provides a local\-first UI for exploring and searching your image collection without paying for cloud services or sending your data to third parties.

It lets you:

- Run semantic image search using natural language queries (e\.g\. `Sunset over the ocean`)
- Filter results by detected people (face grouping / person assignment)
- Combine filters (e\.g\. `Mac + Sunset over the ocean`)
- Keep everything on your own machine for privacy and offline use
- Use a simple SvelteKit dashboard that talks to a backend API (configured via `VITE_API_BASE_URL`)
- Avoid external LLMs or hosted services for core functionality

## Stack

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

## Google Drive Integration

Optional integration that lets users upload person photos to Google Drive from the UI. Requires a Google Cloud service account and a shared Drive folder.

### Prerequisites

1. Create a Google Cloud project (or use an existing one)
2. Enable the **Google Drive API** in the Google Cloud Console
3. Create a **service account** and download its JSON key file
4. Create a folder in Google Drive for uploads
5. Share that folder with the service account email as **Editor**
6. Copy the folder ID from the URL (`https://drive.google.com/drive/folders/<FOLDER_ID>`)

### Environment Variables

Required:

- `GOOGLE_DRIVE_ENABLED` - Enable Google Drive integration (default: `false`)
- `GOOGLE_DRIVE_SA_JSON` - Path to service account JSON key file
- `GOOGLE_DRIVE_ROOT_ID` - Google Drive folder ID shared with the service account

Optional:

- `GOOGLE_DRIVE_UPLOAD_BATCH_SIZE` - Photos per upload chunk (default: `10`, range: 1-50)
- `GOOGLE_DRIVE_PATH_CACHE_TTL` - Path cache TTL in seconds (default: `300`)
- `GOOGLE_DRIVE_PATH_CACHE_MAXSIZE` - Max path cache entries (default: `1024`)

### Example Configuration

```bash
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_SA_JSON=/path/to/service-account-key.json
GOOGLE_DRIVE_ROOT_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

### Security

- Never commit the service account key file
- Set file permissions: `chmod 600 /path/to/service-account-key.json`
- Add the key file path to `.gitignore`

### Verification

```bash
curl http://localhost:8000/api/v1/gdrive/health
```

Or check the Admin panel in the UI — the Drive Settings section shows connection status.

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
