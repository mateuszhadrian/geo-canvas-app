# Analiza setupu aplikacji — GeoCanvas

Data: 2026-04-24

---

## 1. Pliki konfiguracyjne

### Obowiązkowe

#### `tsconfig.json`

Next.js generuje domyślny `tsconfig.json` podczas `create-next-app`. Dla tego projektu wymagana jest konfiguracja:

- `"strict": true` — TypeScript strict mode zgodny z wymaganiami stacku
- `"paths": { "@/*": ["./src/*"] }` — alias ścieżek dla importów (`@/components/...`, `@/store/...`)
- `"target": "ES2017"` lub nowszy — kompatybilność z nowoczesnymi przeglądarkami
- `"lib": ["dom", "dom.iterable", "esnext"]` — dostęp do Canvas API w typach

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### `next.config.ts`

Minimalna konfiguracja. Kluczowa decyzja: `output: 'export'` NIE jest potrzebne — Vercel obsługuje Next.js natywnie bez eksportu statycznego. Konfiguracja powinna zawierać:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Żadne specjalne opcje nie są wymagane dla SPA
  // Konva jest importowana tylko po stronie klienta — nie wymaga specjalnej konfiguracji
}

export default nextConfig
```

**Uwaga:** Konva.js używa globalnych API przeglądarki (`window`, `document`, Canvas API). Import Konva po stronie serwera spowoduje błąd (`ReferenceError: window is not defined`). Rozwiązanie jest na poziomie komponentów (`'use client'` + `dynamic import` z `ssr: false`) — NIE na poziomie `next.config.ts`.

#### `globals.css` (w `src/app/`)

TailwindCSS v4 używa konfiguracji CSS-first. Brak `tailwind.config.js`. Struktura pliku:

```css
@import "tailwindcss";

@theme {
  /* Kolory marki GeoCanvas — opcjonalne rozszerzenie */
  --color-canvas-bg: #f8f9fa;
  --color-toolbar-bg: #1e1e2e;
  --color-sidebar-bg: #ffffff;
}
```

**Krytyczna różnica vs v3:**
- v3: `@tailwind base; @tailwind components; @tailwind utilities;`
- v4: `@import "tailwindcss";` — jednolinijkowy import
- v4: Brak `tailwind.config.js` — customizacja przez `@theme` w CSS

#### `jest.config.js`

Konfiguracja przez `next/jest` (transformer SWC, automatyczne aliasy `@/`):

```javascript
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.test.tsx',
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
  ],
})
```

#### `jest.setup.ts`

```typescript
import 'jest-canvas-mock'
import '@testing-library/jest-dom'
```

**Ważna kolejność:** `jest-canvas-mock` musi być w `setupFilesAfterFramework` (po inicjalizacji środowiska jsdom), nie w `setupFiles` (przed). W przeciwnym razie mock Canvas nie działa poprawnie.

#### `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  snapshotDir: './tests/e2e/__snapshots__',
})
```

### Opcjonalne (zalecane)

#### `.eslintrc.json`

Next.js generuje to automatycznie przez `create-next-app`. Domyślna konfiguracja (`next/core-web-vitals`) jest wystarczająca.

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"]
}
```

#### `.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

#### `.prettierignore`

```
.next/
node_modules/
coverage/
public/
```

#### `.vscode/settings.json`

Cursor jest forkiem VS Code i w pełni obsługuje katalog `.vscode/` — te same pliki konfiguracyjne działają w obu edytorach. Plik `.vscode/settings.json` jest preferowany nad `.cursor/settings.json`, bo działa zarówno w Cursor jak i w VS Code (np. dla innych kontrybutorów).

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

#### `.vscode/extensions.json`

Cursor wyświetla te rekomendacje w panelu rozszerzeń tak samo jak VS Code.

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

#### `.cursorignore`

Cursor indeksuje cały projekt do kontekstu AI. Bez `.cursorignore` zindeksuje też `node_modules` i `.next`, co spowalnia działanie i zanieczyszcza kontekst. Plik działa analogicznie do `.gitignore`:

```
.next/
node_modules/
coverage/
playwright-report/
tests/e2e/__snapshots__/
```

#### `.cursor/rules` (opcjonalne)

Cursor obsługuje plik `.cursor/rules` (Markdown) z instrukcjami dla AI — odpowiednik `CLAUDE.md` dla Cursor. W tym projekcie `CLAUDE.md` jest już skonfigurowany; można skopiować kluczowe zasady do `.cursor/rules` jeśli chcesz mieć spójne instrukcje w obu narzędziach. Nie jest to wymagane.

---

## 2. Struktura `package.json`

### Skrypty

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### `dependencies` (runtime)

```json
{
  "dependencies": {
    "next": "^16.2.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "konva": "^10.2.5",
    "react-konva": "^19.2.3",
    "zustand": "^5.0.12",
    "immer": "^10.1.1",
    "zundo": "^2.3.0",
    "tailwindcss": "^4.2.3",
    "@uiw/react-color": "^2.x"
  }
}
```

**Kluczowa zmiana vs PRD:** `react-colorful` → `@uiw/react-color`. Uzasadnienie w `.ai/tech-stack-analysis.md`.

### `devDependencies`

```json
{
  "devDependencies": {
    "typescript": "^5.9.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@types/node": "^22.0.0",
    "jest": "^29.x",
    "jest-environment-jsdom": "^29.x",
    "jest-canvas-mock": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/user-event": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@playwright/test": "^1.x",
    "prettier": "^3.x",
    "@tailwindcss/postcss": "^4.x"
  }
}
```

**Uwaga: `@tailwindcss/postcss`** — TailwindCSS v4 używa własnego PostCSS pluginu. Jest to wymagane do działania z Next.js (który używa PostCSS wewnętrznie).

### `engines`

```json
{
  "engines": {
    "node": ">=20.9.0"
  }
}
```

---

## 3. Narzędzia deweloperskie

### TypeScript

- `tsc --noEmit` jako osobny krok w CI (nie tylko przy buildzie)
- Strict mode — wymagane przez architekturę (Zustand + Immer mają pełne typy TS)
- Nie używać `any` — zdefiniować typy dla kształtów Konva (`KonvaShape`, `ShapeConfig` itp.)

### ESLint

- `next/core-web-vitals` — domyślne reguły Next.js, wystarczające
- Reguła `'use client'` — Next.js ESLint automatycznie wykrywa brakujące dyrektywy
- Nie dodawać dodatkowych pluginów ESLint bez konkretnej potrzeby (YAGNI)

### Prettier

- Formatowanie kodu — spójność stylu w repozytorium
- Integracja z ESLint przez `eslint-config-prettier` (opcjonalnie, eliminuje konflikty reguł formatowania)

### TypeScript strict checks w pipeline CI

```bash
npm run typecheck  # tsc --noEmit — NIE ignoruje błędów jak next build
npm run lint       # next lint
npm test           # jest
```

---

## 4. Struktura katalogów

```
geo-canvas-app/
├── .ai/                               # Dokumentacja projektu (nie trafia do buildu)
│   ├── prd.md
│   ├── tech-stack.md
│   ├── tech-stack-analysis.md
│   └── application-setup-analysis.md
├── .github/
│   └── workflows/
│       ├── ci.yml                     # lint + typecheck + unit tests
│       └── e2e.yml                    # testy Playwright (opcjonalnie osobny workflow)
├── .vscode/
│   ├── settings.json
│   └── extensions.json
├── docs/
│   ├── geocanvas-editor-high-level.md
│   └── geocanvas-prd-summary.md
├── public/
│   └── favicon.svg                    # REQ-063: favicon geometryczny w SVG
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout: meta tagi (REQ-064), font, html lang="en"
│   │   ├── page.tsx                   # Root page: dynamic import CanvasApp z ssr: false
│   │   └── globals.css                # TailwindCSS v4: @import "tailwindcss"; + @theme {}
│   ├── components/
│   │   ├── canvas/                    # Komponenty Konva (wyłącznie 'use client')
│   │   │   ├── CanvasApp.tsx          # Root komponent canvas (dynamic import target)
│   │   │   ├── CanvasStage.tsx        # Konva Stage + Layer + ResizeObserver
│   │   │   ├── ShapeRenderer.tsx      # Switch: Rect | Circle | RegularPolygon | Line
│   │   │   ├── TransformerWrapper.tsx # Konva Transformer dla zaznaczonych kształtów
│   │   │   └── MarqueeRect.tsx        # Prostokąt marquee selection
│   │   ├── toolbar/
│   │   │   ├── Toolbar.tsx            # Pionowy toolbar lewy
│   │   │   └── ToolButton.tsx         # Pojedynczy przycisk narzędzia
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx            # Kontener sidebara prawego
│   │   │   ├── ShapeProperties.tsx    # Właściwości zaznaczonego kształtu
│   │   │   ├── EmptyState.tsx         # Placeholder + lista skrótów (REQ-025)
│   │   │   └── ColorPickerField.tsx   # Wrapper @uiw/react-color
│   │   └── ui/                        # Ogólne komponenty UI
│   │       ├── Modal.tsx              # Modal (New Scene, Export PNG)
│   │       └── Toast.tsx              # Toast/snackbar (błędy localStorage, JSON)
│   ├── hooks/
│   │   ├── useCanvas.ts               # Konva Stage setup, zoom/pan, event routing
│   │   ├── useKeyboard.ts             # Globalne skróty klawiaturowe
│   │   └── useAutoSave.ts             # Autosave/autoload localStorage
│   ├── store/
│   │   ├── useCanvasStore.ts          # Zustand + Immer + zundo store
│   │   └── types.ts                   # ShapeType, Shape, CanvasState, StickyDefaults
│   ├── lib/
│   │   ├── shapes.ts                  # Fabryki kształtów, domyślne właściwości per typ
│   │   ├── serialization.ts           # JSON export/import + walidacja (REQ-043–045)
│   │   └── exportPng.ts               # Eksport PNG z Konva (REQ-046–050)
│   └── types/
│       └── index.ts                   # Re-eksport typów publicznych
├── tests/
│   ├── unit/
│   │   ├── store/
│   │   │   └── canvasStore.test.ts    # addShape, deleteShape, undo/redo
│   │   └── lib/
│   │       └── serialization.test.ts  # JSON round-trip, walidacja błędów
│   └── e2e/
│       ├── __snapshots__/             # Playwright screenshot snapshots
│       └── canvas.spec.ts             # Golden path: dodaj → zaznacz → edytuj → eksport
├── .gitignore
├── .nvmrc
├── jest.config.js
├── jest.setup.ts
├── next.config.ts
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── CLAUDE.md
└── README.md
```

### Kluczowe decyzje strukturalne

**`src/app/page.tsx` z dynamic import:**

```typescript
// src/app/page.tsx
import dynamic from 'next/dynamic'

const CanvasApp = dynamic(() => import('@/components/canvas/CanvasApp'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
})

export default function Home() {
  return <CanvasApp />
}
```

To jest kluczowy wzorzec dla Next.js + Konva. Bez `ssr: false` Next.js próbuje renderować komponent Konva na serwerze, co kończy się błędem `ReferenceError: window is not defined`.

**`'use client'` w komponentach canvas:**

Wszystkie komponenty w `src/components/canvas/`, `src/components/toolbar/`, `src/components/sidebar/` oraz wszystkie hooki muszą mieć dyrektywę `'use client'` na początku pliku. Są to komponenty interaktywne używające Konva, Zustand i event listenerów.

**`src/store/types.ts` — typy bazowe:**

```typescript
export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'triangle' | 'line'

export interface BaseShape {
  id: string
  type: ShapeType
  x: number
  y: number
  rotation: number
  opacity: number
  stroke: string
  strokeWidth: number
}

export interface RectShape extends BaseShape {
  type: 'rect'
  width: number
  height: number
  fill: string
  cornerRadius: number
}

// ... Circle, Triangle, Line
```

---

## 5. Zarządzanie wersją Node.js — `.nvmrc`

### Analiza środowiska

- System ma zainstalowany Node.js **v25.9.0**
- Node 25 jest wersją **unstable** (numery nieparzyste = dev channel; numery parzyste = stabilne)
- Projekt wymaga `node >= 20.9.0` (engines w `package.json`)
- Środowisko CI/CD (GitHub Actions) potrzebuje stabilnej, przewidywalnej wersji

### Rekomendacja: `.nvmrc` z Node 22

```
22
```

**Uzasadnienie:**
- Node 22 (`Jod`) to aktualny **Active LTS** (Long Term Support) od października 2024
- Spełnia wymaganie `>=20.9.0` z marginesem
- Stabilny, powszechnie używany w CI/CD
- GitHub Actions `actions/setup-node@v4` wspiera `node-version-file: '.nvmrc'`
- System z Node 25.9.0 może nadal uruchamiać projekt na wersji 22 przez nvm (`nvm use`)

**Dlaczego nie Node 20:**
- Node 20 wchodzi w fazę Maintenance LTS (mniej aktualizacji), a Node 22 jest aktualnym Active LTS

**Dlaczego nie Node 24/25:**
- Node 24 to nowy Active LTS (od kwietnia 2026), ale mniej sprawdzony w ekosystemie CI
- Node 25 jest unstable — nie do użytku w produkcji ani CI

**Dlaczego nie bieżąca wersja systemowa (25.9.0):**
- Wersje nieparzyste Node.js (23, 25) to wersje deweloperskie bez gwarancji kompatybilności wstecznej między patchami
- Używanie wersji unstable w CI to zła praktyka

---

## 6. CI/CD — GitHub Actions

### Workflow CI: `.github/workflows/ci.yml`

Uruchamia się przy każdym pushu do `main` i każdym Pull Request. Wykonuje: lint, typecheck, testy jednostkowe.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint, Typecheck & Unit Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Unit tests
        run: npm test -- --ci --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
          retention-days: 7
```

### Workflow E2E: `.github/workflows/e2e.yml`

Uruchamia się tylko przy PR (koszt czasowy ~3–5 min). Testy Playwright wymagają działającego serwera dev lub buildu produkcyjnego.

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    name: Playwright E2E Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Deploy: Vercel Integration

Vercel Integration (nie GitHub Actions) obsługuje deploy. Konfiguracja:

1. **Połączenie repozytorium** — przez panel Vercel (Import Project z GitHub)
2. **Framework preset** — Vercel automatycznie wykrywa Next.js
3. **Build command** — `next build` (domyślne Vercel)
4. **Output directory** — `.next` (domyślne dla Next.js)
5. **Environment variables** — brak (aplikacja nie ma backendu ani zewnętrznych API)

**Brak `vercel.json`** — nie jest potrzebny dla standardowego Next.js projektu. Vercel wykrywa Next.js automatycznie i stosuje optymalne defaults.

**Preview deployments** — każdy PR automatycznie otrzymuje preview URL od Vercel. Testowanie manualne jest możliwe przed mergem.

### Kolejność zdarzeń przy PR

```
Developer tworzy PR
      ↓
GitHub Actions: CI workflow (lint + typecheck + unit tests) — ~2 min
GitHub Actions: E2E workflow (Playwright) — ~4 min
      ↓ (równolegle)
Vercel: Preview deployment — ~1–2 min
      ↓
Code review + manualna weryfikacja na Preview URL
      ↓
Merge do main → Vercel: Production deployment
```

---

## 7. Cel: gotowość do pracy po `npm install`

Po wykonaniu kroków inicjalizacji developer powinien móc:

1. Uruchomić `npm run dev` → aplikacja dostępna na `http://localhost:3000`
2. Uruchomić `npm run typecheck` → zero błędów TS
3. Uruchomić `npm run lint` → zero błędów ESLint
4. Uruchomić `npm test` → zero nieudanych testów (pusty runner = OK)

### Kroki inicjalizacji projektu

```bash
# 1. Inicjalizacja Next.js (NIE używaj --tailwind — v4 wymaga ręcznej konfiguracji)
npx create-next-app@latest . \
  --typescript \
  --app \
  --src-dir \
  --no-tailwind \
  --eslint \
  --import-alias "@/*"

# 2. Instalacja zależności runtime
npm install konva react-konva zustand immer zundo @uiw/react-color

# 3. Instalacja TailwindCSS v4
npm install tailwindcss @tailwindcss/postcss

# 4. Instalacja devDependencies dla testów
npm install -D jest jest-environment-jsdom jest-canvas-mock \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test

# 5. Instalacja przeglądarek Playwright
npx playwright install chromium

# 6. Inicjalizacja Prettier (opcjonalne)
npm install -D prettier
```

### Weryfikacja po instalacji

```bash
npm run dev       # Musi uruchomić się bez błędów
npm run typecheck # Musi zwrócić 0 błędów
npm run lint      # Musi zwrócić 0 błędów
npm test          # Musi wykonać się (0 testów = OK na starcie)
```

---

## 8. Podsumowanie — lista plików do stworzenia przy inicjalizacji

| Plik | Źródło | Uwagi |
|---|---|---|
| `tsconfig.json` | `create-next-app` + modyfikacja | Dodać `"strict": true`, alias `@/*` |
| `next.config.ts` | `create-next-app` | Zostawić minimalny |
| `src/app/globals.css` | Ręcznie | TailwindCSS v4: `@import "tailwindcss"` |
| `src/app/layout.tsx` | `create-next-app` + modyfikacja | Meta tagi (REQ-064), `lang="en"` |
| `src/app/page.tsx` | Ręcznie | `dynamic(() => import(CanvasApp), { ssr: false })` |
| `jest.config.js` | Ręcznie | `next/jest` transformer |
| `jest.setup.ts` | Ręcznie | `jest-canvas-mock` + `@testing-library/jest-dom` |
| `playwright.config.ts` | Ręcznie | baseURL + webServer |
| `.nvmrc` | Ręcznie | `22` |
| `.eslintrc.json` | `create-next-app` | Domyślne + `next/typescript` |
| `.prettierrc` | Ręcznie | Opcjonalne, zalecane |
| `public/favicon.svg` | Ręcznie | REQ-063: geometryczny motyw |
| `.github/workflows/ci.yml` | Ręcznie | lint + typecheck + testy jednostkowe |
| `.github/workflows/e2e.yml` | Ręcznie | Playwright, tylko na PR |
| `.vscode/settings.json` | Ręcznie | Cursor + VS Code: format on save, ESLint, TS SDK |
| `.cursorignore` | Ręcznie | Wyklucza node_modules/.next z indeksu AI Cursora |
| `postcss.config.mjs` | Modyfikacja | `@tailwindcss/postcss` plugin |

### Plik `postcss.config.mjs` dla TailwindCSS v4

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

**Krytyczna uwaga:** `create-next-app` z opcją `--tailwind` zainstaluje TailwindCSS v3 z `tailwind.config.ts`. Należy użyć flagi `--no-tailwind` i zainstalować v4 ręcznie przez `npm install tailwindcss @tailwindcss/postcss`.
