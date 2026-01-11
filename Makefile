# Image Search UI - Development Makefile
# SvelteKit frontend for semantic image search

.PHONY: help install dev build preview test test-watch lint format typecheck gen-api clean all check

# Default target
help:
	@echo "Image Search UI - Available targets:"
	@echo ""
	@echo "  Development:"
	@echo "    install      Install dependencies (npm ci)"
	@echo "    dev          Start dev server (http://localhost:5173)"
	@echo "    build        Production build"
	@echo "    preview      Preview production build"
	@echo ""
	@echo "  Testing & Quality:"
	@echo "    test         Run tests once"
	@echo "    test-watch   Run tests in watch mode"
	@echo "    lint         Lint code (ESLint)"
	@echo "    format       Format code (Prettier)"
	@echo "    typecheck    Type check (svelte-check)"
	@echo "    check        Run all quality checks (lint + typecheck + test)"
	@echo ""
	@echo "  API Types:"
	@echo "    gen-api      Regenerate API types from backend OpenAPI spec"
	@echo ""
	@echo "  Utilities:"
	@echo "    clean        Remove build artifacts"
	@echo "    all          Install, check, and build"

# =============================================================================
# Development
# =============================================================================

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

# =============================================================================
# Testing & Quality
# =============================================================================

test:
	NODE_OPTIONS="--max-old-space-size=8192" npm run test

test-watch:
	npm run test:watch

lint:
	npm run lint -- --max-warnings=0

format:
	npm run format

typecheck:
	npx svelte-check --tsconfig ./tsconfig.json

# Run all quality checks
check: lint typecheck test

# =============================================================================
# API Types
# =============================================================================

# Regenerate TypeScript types from backend OpenAPI spec
# Requires backend running at VITE_API_BASE_URL (default: http://localhost:8000)
gen-api:
	npm run gen:api

# =============================================================================
# Utilities
# =============================================================================

clean:
	rm -rf .svelte-kit build node_modules/.vite

# Full workflow: install, quality checks, and build
all: install check build
