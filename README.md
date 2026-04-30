# GeoCanvas

A minimalist, browser-based geometric shape editor built as an educational and portfolio project. Create, edit, and organize geometric shapes on an interactive canvas — no backend, no registration required.

Inspired by tools like tldraw and Excalidraw, GeoCanvas demonstrates non-trivial frontend architecture: a serializable state model, a custom command-pattern undo/redo system, a shape-centric module registry, and a multi-layer canvas — all in a clean, geometric UI.

![Build](https://img.shields.io/github/actions/workflow/status/mateuszhadrian/geo-canvas-app/ci.yml?branch=main)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20.9.0-brightgreen)

---

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

---

## Project Description

GeoCanvas is a Single Page Application that runs entirely in the browser. Users can:

- Draw **rectangles, circles, triangles, and polylines** on a zoomable, pannable canvas
- **Resize and rotate** shapes via a per-shape custom handle system
- **Multi-select** shapes with marquee selection or Ctrl+click
- Organise work across **multiple layers** with visibility, lock, and opacity controls
- **Undo / redo** any change (up to 50 steps) via a Command Pattern history
- Adjust **fill, stroke, opacity, and shape-specific properties** in a contextual sidebar
- **Import scenes** by pasting a JSON document into the on-screen textarea
- **Export scenes** as a versioned `CanvasDocument` JSON (via the developer JSON viewer)

There is no server. The only persistence mechanisms are the on-screen JSON import/export and (planned) `localStorage` autosave.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) | SPA; App Router chosen to ease future Supabase backend integration |
| Canvas | [Konva.js 10](https://konvajs.org) + [react-konva 19](https://github.com/konvajs/react-konva) | Hardware-accelerated HTML5 Canvas |
| Language | TypeScript 5+ (strict mode) | Fully typed throughout |
| State | [Zustand 5](https://zustand-demo.pmnd.rs) + [Immer 10](https://immerjs.github.io/immer/) | Six domain slices: shapes, selection, viewport, tool, history, layers |
| Undo / Redo | Custom Command Pattern history slice | JSON-serialisable commands; `zundo` was evaluated and rejected |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) | CSS-first config via `@theme`; no JS config file |
| Color picker | [@uiw/react-color](https://uiwjs.github.io/react-color/) | Sketch-style picker |
| Icons | [lucide-react](https://lucide.dev) | |
| Testing | [Jest 29](https://jestjs.io) + [Testing Library](https://testing-library.com) + [Playwright 1.52](https://playwright.dev) | Unit, component, and E2E tests |
| CI / CD | GitHub Actions | Lint → typecheck → Jest → Playwright on every push |
| Hosting | [Vercel](https://vercel.com) | Auto-deploys on push to `main`; PR preview deployments |

### Architectural highlights

**Shape-centric modules** — each shape type lives in `src/shapes/<type>/` and self-describes its geometry, rendering, handle math, and property panel via a `ShapeDefinition` interface. The central `SHAPE_REGISTRY` is the only place that knows about all shapes; the rest of the app is shape-agnostic.

**Command Pattern history** — every mutation produces a `HistoryCommand` with `before`/`after` snapshots. Commands are JSON-serialisable and designed for future OT-based collaboration or Supabase sync.

**`CanvasDocument` format** — the on-disk/in-memory document includes layers, shape data, sticky defaults, metadata, and a `schemaVersion` for forward-compatible migrations.

---

## Getting Started Locally

**Prerequisites:** Node.js ≥ 20.9.0

```bash
# 1. Clone the repository
git clone https://github.com/mateuszhadrian/geo-canvas-app.git
cd geo-canvas-app

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Start Next.js in development mode with hot reload |
| Production build | `npm run build` | Build for production |
| Production server | `npm run start` | Serve the production build |
| Lint | `npm run lint` | Run ESLint across the project |
| Type check | `npm run typecheck` | Run `tsc --noEmit` |
| Unit tests | `npm run test` | Run Jest test suite |
| Unit tests (watch) | `npm run test:watch` | Run Jest in watch mode |
| Coverage | `npm run test:coverage` | Run Jest with coverage report |
| E2E tests | `npm run test:e2e` | Run Playwright tests headlessly |
| E2E tests (UI) | `npm run test:e2e:ui` | Run Playwright tests with interactive UI |
| Format | `npm run format` | Format all files with Prettier |
| Format check | `npm run format:check` | Check formatting without writing files |

---

## Project Scope

### Implemented (MVP Core)

- **Shape creation** — rectangle, circle, triangle, line / polyline; shapes appear at the centre of the visible canvas with sticky per-type defaults
- **Manipulation** — drag, resize via 4 side handles, proportional scale via top-right handle, rotate via top-left handle; all per-shape logic lives inside `ShapeDefinition`
- **Multi-select** — marquee selection (active layer only) and Ctrl+click; shared bounding-box handles for multi-shape and multi-line selections
- **Polyline mode** — clicking on an empty canvas extends a selected line chain; clicking near the start point closes the polygon
- **Properties sidebar** — contextual panel for single selection: shape-specific fields (width, height, radius, corner radius, dashed toggle, etc.), opacity, fill, and stroke
- **Layer system** — add, rename, reorder, show/hide, lock/unlock, and set opacity per layer; shapes belong to a layer; locked/hidden layers block interaction and rendering
- **Undo / redo** — Command Pattern with 50-step limit; `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`
- **Z-ordering** — Bring Forward, Bring to Front, Send Backward, Send to Back via toolbar buttons; all operations are undoable
- **Navigation** — zoom (`Ctrl+scroll`), pan (hand tool or scroll without Ctrl), responsive canvas via `ResizeObserver`
- **Grid background** — scales with zoom level
- **Anchor point preview** — per-shape anchor markers on hover (groundwork for a future connector system)
- **JSON import** — paste a `CanvasDocument` JSON (or bare shapes array) into the bottom-left textarea and press Enter
- **JSON viewer** — collapsible developer panel showing the current document as JSON

### Pending (MVP Extended)

- Autosave and autoload from `localStorage`
- New Scene modal with confirmation
- `Ctrl+D` — duplicate selected shapes
- Export JSON as a downloadable file
- Import JSON via a file-picker dialog
- Export to PNG with padding and size options
- Rotation angle field in the Properties sidebar
- `]` / `[` keyboard shortcuts for z-ordering

### Out of scope (planned extensions)

Shape grouping (`Ctrl+G`), connector shapes with anchor binding, backend persistence via Supabase, real-time collaboration, and mobile / touch support are documented as planned extensions but are not part of the current implementation.

---

## Project Status

**MVP Core — complete.** All four shape types, the custom handle system, layers, undo/redo, z-ordering, and JSON import/export are implemented and working.

**MVP Extended — in progress.** The features listed in the Pending section above are next on the roadmap.

The architecture is intentionally designed to scale toward a Supabase backend (auth + PostgreSQL document storage) and domain-specific variants (e.g. welding diagrams, electrical schematics) without rewriting the core.

---

## License

[MIT](LICENSE)
