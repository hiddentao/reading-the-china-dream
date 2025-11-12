# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---
description: "Reading The China Dream" static site using Bun, React, TypeScript, and Shadcn/ui
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

## Project Overview

"Reading The China Dream" is a static site built with Bun runtime, React, TypeScript, and Shadcn/ui components. The project uses a unique HTML-first architecture with Bun's built-in bundler.

## Development Commands

```bash
bun install              # Install dependencies
bun dev                 # Start development server with HMR
bun start               # Run production server  
bun run build           # Build for production
```

## Architecture

This project uses a hybrid approach:
- **Server Entry**: `src/index.tsx` - Bun.serve() with routing and API endpoints
- **Frontend Entry**: `src/frontend.tsx` - React app mounted to DOM
- **HTML Entry**: `src/index.html` - Links to frontend.tsx with module script

### Key Features
- Bun.serve() handles both static files and API routes
- HTML imports directly reference .tsx files (no separate bundling step needed)
- HMR (Hot Module Reloading) in development
- Custom build system scans for HTML files as entry points

## File Structure

```
src/
├── index.html          # Main HTML entry point
├── index.tsx          # Server with Bun.serve() 
├── frontend.tsx       # React app entry point
├── App.tsx           # Main React component
├── components/ui/    # Shadcn/ui components
├── lib/
│   └── utils.ts      # Utility functions (cn helper)
└── index.css        # Global styles
```

## UI Components

Uses Shadcn/ui with:
- Path alias: `@/*` maps to `./src/*`
- Tailwind CSS with CSS variables
- Component library: Lucide icons
- Utils: `cn()` function combines clsx + tailwind-merge

## Bun Specifics

- Uses `Bun.serve()` instead of Express
- Built-in TypeScript support
- Module resolution: "bundler" mode  
- HTML files can directly import .tsx without build step
- Bun automatically loads .env files

## API Routes

Server defines routes in `src/index.tsx`:
- `/*` - Serves index.html (SPA fallback)
- `/api/hello` - GET/PUT example endpoint
- `/api/hello/:name` - Dynamic route example

## Build System

Custom build script (`build.ts`) with CLI options:
- Scans `src/**/*.html` as entry points
- Uses bun-plugin-tailwind for CSS processing
- Supports minification, sourcemaps, code splitting
- Run `bun run build.ts --help` for all options

## Bun Runtime Guidelines

Default to using Bun instead of Node.js:
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`

### Bun APIs
- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.