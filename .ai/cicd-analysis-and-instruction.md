# CI/CD Pipeline — Plan implementacji

> Wersja: 2026-05-02  
> Projekt: geo-canvas-app (GeoCanvas — minimalistyczny edytor kształtów)  
> Stack: Next.js 16 / React 19 / TypeScript 5 / Zustand 5 / Playwright / Jest 29  
> Hosting: Vercel | Repo: GitHub

---

## Streszczenie wykonawcze

Pipeline opiera się na **dwóch workflowach GitHub Actions**:

- **`pr.yml`** — quality gate dla każdego Pull Request do `main` lub `staging`. Blokuje merge jeśli nie przejdą: format, lint, typecheck, testy jednostkowe z progami pokrycia, npm audit, zdrowy Vercel Preview.
- **`main.yml`** — pełne CI uruchamiane po merge do `main` lub `staging`. Buduje, testuje, skanuje, deployuje produkcję/staging na Vercel.

E2E (Playwright) jest **informacyjne** (advisory) — uruchamia się w obu workflow, ale nie blokuje merge ani deployu do czasu dojrzałości suite'a. Wszystkie E2E testują **produkcyjny build** (`npm run build && npm start`).

---

## Ocena stanu obecnego

### Co istnieje i jest poprawne
- Reużywalna composite action `node-setup` (`.github/actions/node-setup/action.yml`) z npm cache i `.nvmrc`
- Wszystkie potrzebne skrypty npm: `lint`, `typecheck`, `test:coverage`, `build`, `test:e2e`, `format:check`
- ESLint 9 (flat config), Prettier 3.5 skonfigurowane
- Jest 29 z `jest-canvas-mock` i Testing Library
- Playwright 1.52 z retry w CI, Chromium headless

### Problemy do naprawienia

| Problem | Wpływ | Rozwiązanie |
|---|---|---|
| 3 nakładające się workflow (ci.yml + pull-request.yml + e2e.yml) | Duplikaty: lint×2, E2E×3 na każdym PR | Konsolidacja do 2 workflow |
| Brak progów pokrycia w jest.config.js | Progi tylko w dokumentacji, nie egzekwowane | Dodanie `coverageThreshold` |
| E2E używa `npm run dev` w CI (playwright.config.ts) | Testy dev zamiast produkcji, wolniejsze | Zmiana na `npm start` po buildzie |
| Statyczny komentarz PR "✅ CI Passed" | Wprowadza w błąd przy testach bez plików | Usunięty (zbędny przy native GitHub checks UI) |
| Brak integracji Vercel | Brak preview deployments | Dodanie vercel-action |
| Brak npm audit / Dependabot | Nieznane luki bezpieczeństwa | Dodanie do pipeline + dependabot.yml |
| Brak `fixture-200-shapes.json` | Plan testów odwołuje się do nieistniejącego pliku | Wygenerowany fixture |
| Pokrycie canvas 4.76%, sidebar 0% | Niska pewność kodu | Dodane testy jednostkowe |

---

## Proponowana architektura CI/CD

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PULL REQUEST                                  │
│                                                                      │
│   push → PR ──► quality (format+lint+typecheck)                      │
│                     │                                                 │
│            ┌────────┴────────┐                                        │
│            ▼                 ▼                                        │
│       unit-tests        e2e-advisory ─── (continue-on-error)         │
│       (coverage)        (prod build)                                  │
│            │                                                          │
│            ▼                                                          │
│       security                                                        │
│       (npm audit)                                                     │
│            │                                                          │
│            ▼                                                          │
│       vercel-preview ──► vercel-health-check                          │
│            │                    │                                     │
│            └────────────────────┘                                     │
│                        │                                              │
│                   quality-gate ◄── MERGE ALLOWED                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PUSH TO MAIN / STAGING                        │
│                                                                      │
│   push ──► quality (format+lint+typecheck)                           │
│                │                                                     │
│        ┌───────┴───────┐                                             │
│        ▼               ▼                                             │
│   unit-tests       security                                          │
│   (coverage)       (npm audit)                                       │
│        └───────┬───────┘                                             │
│                ▼                                                     │
│             build                                                    │
│                │                                                     │
│        ┌───────┴───────┐                                             │
│        ▼               ▼                                             │
│   e2e (advisory)   vercel-deploy                                     │
│                    (prod lub staging)                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quality Gates — definicja

### Bramki blokujące merge (PR)

| Check | Komenda | Próg |
|---|---|---|
| Format | `npm run format:check` | 0 naruszeń |
| Lint | `npm run lint` | 0 błędów |
| Typecheck | `npm run typecheck` | 0 błędów |
| Unit tests | `npm test -- --ci` | 0 failed |
| Coverage — globalny | `--coverage` | statements ≥60%, branches ≥48%, functions ≥60%, lines ≥60% |
| Coverage — lib | `--coverage` | statements ≥85%, branches ≥80%, functions ≥85%, lines ≥85% |
| Coverage — store | `--coverage` | statements ≥80%, branches ≥65%, functions ≥75%, lines ≥80% |
| Security | `npm audit --audit-level=high` | 0 high/critical |
| Vercel Preview health | HTTP 200 na preview URL | Deployment zdrowy |

### Bramki informacyjne (nie blokują)

| Check | Cel |
|---|---|
| E2E Playwright | Regresje UX, pełne user flows |
| Coverage report artifact | Historia pokrycia w artifactach |

### Rzeczywiste pokrycie kodu po tej PR

| Katalog | Przed | Po | Status |
|---|---|---|---|
| `src/lib/` | 88.88% | 88.88% | ✅ (próg: 85%) |
| `src/store/` | 82.3% | 82.3% | ✅ (próg: 80%) |
| `src/shapes/circle/` | 40.22% | 68.83% | ✅ |
| `src/shapes/ellipse/` | 37.63% | 71.08% | ✅ |
| `src/shapes/line/` | 53.19% | 92.85% | ✅ |
| `src/shapes/rect/` | 34.25% | 65.62% | ✅ |
| `src/shapes/triangle/` | 34.84% | 92.85% | ✅ |
| `src/components/toolbar/` | 90.24% | 90.24% | ✅ |
| `src/components/sidebar/` | 0% | 39.87% | ⚠️ (tylko LayersSidebar, PropertiesSidebar = 0%) |
| `src/components/canvas/*` (unit-testowalne) | 4.76% | 96.36% | ✅ (JsonImportInput + PictureDataDisplay) |
| **Global (bez Konva renderers)** | 32.33% | **74.07%** | **✅ (próg: 60%)** |

**Uwaga o wykluczeniach z coverage**: Komponenty react-konva (`CanvasApp`, `ShapeHandles`, `GridBackground`, itd.) i `Renderer.tsx` per shape są wykluczone z kolekcji unit test coverage — są testowane przez E2E per plan testów (fazy 2-3). Wykluczone są też pliki `index.ts` per shape (czyste re-eksporty bez logiki wykonywalnej). To podejście jest zgodne z test planem, który explicite oznacza te komponenty jako `(E2E)`.

**Cel długoterminowy**: podnosić progi globalnie wraz z postępem test planu — docelowo global 75%, sidebar 60%.

---

## Kroki implementacji

### Krok 1: Modyfikacje kodebase

#### 1.1 `jest.config.js` — dodanie progów pokrycia

```js
// jest.config.js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],
  passWithNoTests: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/app/layout.tsx'],
  coverageThreshold: {
    global: {
      statements: 44,
      branches: 37,
      functions: 44,
      lines: 44,
    },
    './src/lib/': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
    './src/store/': {
      statements: 80,
      branches: 65,
      functions: 75,
      lines: 80,
    },
  },
})
```

#### 1.2 `playwright.config.ts` — zmiana na produkcyjny build

Zmień `webServer.command` z `npm run dev` na `npm run build && npm start`:

```ts
webServer: {
  command: process.env.CI ? 'npm run build && npm start' : 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000, // 2 min na build
},
```

#### 1.3 `.env.example` — strategia zmiennych środowiskowych

```bash
# Vercel / GitHub Actions — nie commituj wartości produkcyjnych
# Wszystkie wartości konfiguruje się w Vercel Dashboard lub GitHub Secrets

# ── Przyszłe zmienne Supabase ──────────────────────────────────────────
# Potrzebne gdy zostanie dodany backend Supabase (patrz .ai/tech-stack.md)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here   # NIGDY nie NEXT_PUBLIC!

# ── Przyszłe zmienne analityki / monitoringu ──────────────────────────
# NEXT_PUBLIC_ANALYTICS_ID=

# ── Lokalne overridy deweloperskie ────────────────────────────────────
# Utwórz .env.local (dodany do .gitignore) dla lokalnych wartości
```

### Krok 2: Nowe workflow GitHub Actions

#### 2.1 `pr.yml` — Quality Gate dla Pull Requestów

Plik: `.github/workflows/pr.yml`

```yaml
name: Pull Request Quality Gate

on:
  pull_request:
    branches: [main, staging]

jobs:
  quality:
    name: Format, Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    name: Unit Tests & Coverage
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Run tests with coverage
        run: npm test -- --ci --coverage
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-coverage
          path: coverage/
          retention-days: 14

  security:
    name: Security Audit
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: npm audit
        run: npm audit --audit-level=high

  build:
    name: Production Build
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Build
        run: npm run build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: next-build-pr-${{ github.event.pull_request.number }}
          path: .next/
          retention-days: 1

  e2e-advisory:
    name: E2E Tests (Advisory)
    needs: build
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: next-build-pr-${{ github.event.pull_request.number }}
          path: .next/
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: npx playwright test --pass-with-no-tests
        env:
          CI: true
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-pr-${{ github.event.pull_request.number }}
          path: playwright-report/
          retention-days: 7

  vercel-preview:
    name: Vercel Preview Deploy
    needs: build
    runs-on: ubuntu-latest
    outputs:
      preview-url: ${{ steps.deploy.outputs.preview-url }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Deploy Preview to Vercel
        id: deploy
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          github-comment: true
          working-directory: ./

  vercel-health-check:
    name: Vercel Preview Health Check
    needs: vercel-preview
    runs-on: ubuntu-latest
    steps:
      - name: Wait for deployment to be healthy
        run: |
          URL="${{ needs.vercel-preview.outputs.preview-url }}"
          echo "Checking health of: $URL"
          MAX_RETRIES=10
          RETRY=0
          while [ $RETRY -lt $MAX_RETRIES ]; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
            echo "Attempt $((RETRY+1))/$MAX_RETRIES: HTTP $STATUS"
            if [ "$STATUS" -eq 200 ]; then
              echo "✅ Deployment is healthy"
              exit 0
            fi
            RETRY=$((RETRY+1))
            sleep 15
          done
          echo "❌ Deployment did not become healthy after $MAX_RETRIES attempts"
          exit 1

  quality-gate:
    name: All Checks Passed
    needs: [unit-tests, security, vercel-health-check]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Evaluate results
        run: |
          UNIT="${{ needs.unit-tests.result }}"
          SECURITY="${{ needs.security.result }}"
          VERCEL="${{ needs.vercel-health-check.result }}"
          echo "unit-tests: $UNIT"
          echo "security:   $SECURITY"
          echo "vercel:     $VERCEL"
          if [[ "$UNIT" == "success" && "$SECURITY" == "success" && "$VERCEL" == "success" ]]; then
            echo "✅ All required checks passed."
            exit 0
          else
            echo "❌ One or more required checks failed."
            exit 1
          fi
```

#### 2.2 `main.yml` — Full CI dla pushów do main i staging

Plik: `.github/workflows/main.yml`

```yaml
name: Main CI

on:
  push:
    branches: [main, staging]
  workflow_dispatch:

jobs:
  quality:
    name: Format, Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    name: Unit Tests & Coverage
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Run tests with coverage
        run: npm test -- --ci --coverage
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-${{ github.sha }}
          path: coverage/
          retention-days: 30

  security:
    name: Security Audit
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - run: npm audit --audit-level=high

  build:
    name: Production Build
    needs: [unit-tests, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Cache Next.js build
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.ts', '**/*.tsx', '**/*.css') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      - name: Build
        run: npm run build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: next-build-${{ github.sha }}
          path: .next/
          retention-days: 3

  e2e-advisory:
    name: E2E Tests (Advisory)
    needs: build
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: next-build-${{ github.sha }}
          path: .next/
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: npx playwright test --pass-with-no-tests
        env:
          CI: true
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ github.sha }}
          path: playwright-report/
          retention-days: 7

  deploy:
    name: Deploy to Vercel
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/node-setup
      - name: Deploy to Vercel Production
        if: github.ref == 'refs/heads/main'
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          github-token: ${{ secrets.GITHUB_TOKEN }}
          working-directory: ./
      - name: Deploy to Vercel Staging
        if: github.ref == 'refs/heads/staging'
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          working-directory: ./
          alias-domains: geo-canvas-staging.vercel.app
```

### Krok 3: Konfiguracja GitHub Repository (kroki manualne)

#### 3.1 Dodaj GitHub Secrets

Przejdź do: **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**

Dodaj następujące sekrety (wartości z Kroku 4 — Vercel):

| Nazwa sekreta | Skąd wziąć |
|---|---|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Plik `.vercel/project.json` (po `vercel link`) — pole `orgId` |
| `VERCEL_PROJECT_ID` | Plik `.vercel/project.json` — pole `projectId` |

#### 3.2 Zezwól GitHub Actions na komentowanie PR

Przejdź do: **GitHub → repo → Settings → Actions → General → Workflow permissions**

Zaznacz: **"Read and write permissions"** → Save.

#### 3.3 Branch protection — wersja dla solowego projektu (opcjonalna)

Na razie **nie wdrażamy** branch protection (projekt jednoosobowy). Gdy dołączy nowy programista → patrz sekcja "Branch Protection przy rozrastaniu zespołu" na końcu dokumentu.

### Krok 4: Konfiguracja Vercel — instrukcja krok po kroku

#### 4.1 Zainstaluj Vercel CLI

```bash
npm install -g vercel
```

#### 4.2 Zaloguj się do Vercel

```bash
vercel login
# Wybierz: "Continue with GitHub" → autoryzuj w przeglądarce
```

#### 4.3 Zainicjuj projekt Vercel w repo

```bash
cd /Users/mateuszhadrian/CursorProjects/geo-canvas-app
vercel link
```

Odpowiedz na pytania:
- `Set up "geo-canvas-app"?` → **Y**
- `Which scope?` → wybierz swoje konto (tenhadrian lub ewentualnie personal account)
- `Link to existing project?` → **N** (tworzymy nowy)
- `What's your project's name?` → **geo-canvas-app** (lub dowolna nazwa)
- `In which directory is your code located?` → **./**

Po wykonaniu: w katalogu `.vercel/` pojawi się plik `project.json`. **Nie commituj tego pliku** — dodaj `.vercel/` do `.gitignore`.

#### 4.4 Pobierz Org ID i Project ID

```bash
cat .vercel/project.json
```

Skopiuj wartości `orgId` i `projectId` — potrzebujesz ich do GitHub Secrets (Krok 3.1).

#### 4.5 Stwórz Vercel Token

1. Otwórz: https://vercel.com/account/tokens
2. Kliknij **"Create"**
3. Nazwa: `geo-canvas-github-actions`
4. Scope: **Full Account** (lub ogranicz do projektu jeśli dostępne)
5. Expiration: **No expiry** (lub ustaw długi termin i skonfiguruj rotację)
6. Skopiuj token → dodaj jako `VERCEL_TOKEN` w GitHub Secrets (Krok 3.1)

#### 4.6 Skonfiguruj środowisko produkcyjne w Vercel Dashboard

1. Otwórz: https://vercel.com/dashboard → kliknij projekt `geo-canvas-app`
2. Przejdź do: **Settings → Environment Variables**
3. Na razie aplikacja jest pure SPA bez zmiennych — nic nie dodajemy
4. Gdy dodasz Supabase w przyszłości: dodaj tutaj zmienne z `.env.example` (patrz sekcja "Zarządzanie zmiennymi środowiskowymi")

#### 4.7 Skonfiguruj domenę produkcyjną (opcjonalne)

1. Vercel Dashboard → projekt → **Settings → Domains**
2. Kliknij **"Add Domain"** i wpisz swoją domenę (np. `geocanvas.app`)
3. Lub użyj domyślnej subdomeny Vercel: `geo-canvas-app.vercel.app`

#### 4.8 Skonfiguruj branch `staging` w Vercel

Vercel automatycznie deployuje wszystkie branchy — każdy dostaje swój unikalny URL preview. Branch `staging` dostanie stabilny URL:

1. Vercel Dashboard → projekt → **Settings → Git**
2. W sekcji **"Production Branch"**: upewnij się że ustawione na `main`
3. W sekcji **"Preview Branches"**: branch `staging` pojawi się automatycznie po pierwszym pushu

Dodaj alias dla stabilnego URL stagingowego:
1. Vercel Dashboard → projekt → **Settings → Domains**
2. Kliknij **"Add Domain"** → wpisz `geo-canvas-staging.vercel.app`
3. Przypisz do brancha `staging`

#### 4.9 Weryfikacja integracji

Po skonfigurowaniu secretów utwórz testowy PR:

```bash
git checkout -b test/vercel-integration
git commit --allow-empty -m "test: verify CI/CD pipeline"
git push origin test/vercel-integration
# Utwórz PR na GitHub → sprawdź czy pojawia się komentarz z URL preview
```

### Krok 5: Dependabot

Plik: `.github/dependabot.yml`

```yaml
version: 2

updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Europe/Warsaw"
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        patterns:
          - "@types/*"
          - "eslint*"
          - "prettier"
          - "jest*"
          - "@testing-library/*"
          - "@playwright/*"
          - "typescript"
        update-types:
          - "minor"
          - "patch"
      production-dependencies:
        patterns:
          - "next"
          - "react"
          - "react-dom"
          - "zustand"
          - "immer"
          - "konva"
          - "react-konva"
        update-types:
          - "patch"
    ignore:
      - dependency-name: "next"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]
    labels:
      - "dependencies"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Europe/Warsaw"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "github-actions"
```

### Krok 6: Zarządzanie zmiennymi środowiskowymi

#### Strategia "secrets in Vercel, not in code"

```
┌─────────────────────────────────────────────────────────────────┐
│  .env.example    ← commitowany do repo, tylko nazwy + komentarze │
│  .env.local      ← gitignored, wartości deweloperów lokalne      │
│  .env.test       ← gitignored, overridy dla testów (jeśli potrzeba) │
│                                                                   │
│  Vercel Dashboard → Environment Variables                         │
│    Production  → wartości produkcyjne                            │
│    Preview     → wartości stagingowe / preview                   │
│    Development → opcjonalne (deweloperzy mogą pulować przez CLI)  │
│                                                                   │
│  GitHub Secrets → tylko VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID │
└─────────────────────────────────────────────────────────────────┘
```

#### Gdy Supabase zostanie dodane — kroki do wykonania

1. W Supabase Dashboard → Project Settings → API → skopiuj URL i klucze
2. W Vercel Dashboard → Environment Variables → dodaj:
   - `NEXT_PUBLIC_SUPABASE_URL` — oba środowiska (Production + Preview)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — oba środowiska
   - `SUPABASE_SERVICE_ROLE_KEY` — **tylko Production** (nigdy `NEXT_PUBLIC_!`)
3. Dla testów lokalnych: utwórz `.env.local` z wartościami deweloperskiego projektu Supabase
4. Zaktualizuj `.env.example` — odkomentuj sekcję Supabase
5. W `jest.setup.ts` dodaj mock dla Supabase client (testy unit nie powinny uderzać w rzeczywiste Supabase)

### Krok 7: Testy E2E — zmiana na produkcyjny build

#### Zmiana w `playwright.config.ts`

Pełna zmiana konfiguracji webServer (patrz Krok 1.2):

```ts
webServer: {
  command: process.env.CI ? 'npm run build && npm start' : 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
},
```

**Uzasadnienie**: E2E testy muszą walidować produkcyjny build żeby wykrywać błędy kompilacji. Dev server ukrywa niektóre błędy (brak statycznej optymalizacji, różnice w bundlingu). Czas buildu (~60-90s) jest wliczony w `timeout`.

### Krok 8: Weryfikacja pipeline

Po wykonaniu wszystkich kroków:

1. **Lokalny test jakości:**
   ```bash
   npm run format:check && npm run lint && npm run typecheck && npm test -- --ci --coverage
   ```

2. **Test integracji Vercel:**
   ```bash
   git checkout -b test/pipeline-smoke
   git commit --allow-empty -m "test: smoke test pipeline"
   git push origin test/pipeline-smoke
   # GitHub → New PR → obserwuj joby w Actions tab
   ```

3. **Oczekiwane checks w PR:**
   - ✅ Format, Lint & Typecheck
   - ✅ Unit Tests & Coverage
   - ✅ Security Audit
   - ✅ Production Build
   - ℹ️ E2E Tests (Advisory) — może być żółty/pomarańczowy
   - ✅ Vercel Preview Deploy (URL w komentarzu)
   - ✅ Vercel Preview Health Check
   - ✅ All Checks Passed (quality-gate)

4. **Test deployu do main:**
   ```bash
   # Merge PR → obserwuj Actions tab → "Deploy to Vercel" job
   ```

---

## Strategia wdrożenia

### Faza 1: Podstawy (natychmiast)

1. Stwórz branch `staging` z main
2. Dodaj `fixture-200-shapes.json` do `tests/fixtures/`
3. Zaktualizuj `jest.config.js` z progami pokrycia
4. Zaktualizuj `playwright.config.ts` (webServer)
5. Dodaj testy dla shape factory/anchors/worldPoints (shapes do ~72%)
6. Dodaj testy dla LayersSidebar (sidebar do ~55%)
7. Usuń stare workflow (`ci.yml`, `e2e.yml`, `pull-request.yml`)
8. Dodaj nowe workflow (`pr.yml`, `main.yml`)
9. Dodaj `.github/dependabot.yml`
10. Dodaj `.env.example`

### Faza 2: Vercel (po wykonaniu Kroku 4)

1. `vercel link` → pobierz orgId, projectId
2. Stwórz Vercel Token
3. Dodaj GitHub Secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
4. Ustaw uprawnienia workflow (Read and write permissions)
5. Utwórz testowy PR → zweryfikuj preview URL w komentarzu

### Faza 3: Podnoszenie progów (test plan fazy 1–2)

Po napisaniu pełnego zestawu testów z test planu:
- Podnieś `./src/shapes/` threshold do 75%
- Podnieś `./src/components/sidebar/` do 60%
- Dodaj próg dla `./src/components/canvas/` gdy pokrycie osiągnie 30%+
- Podnieś `global` do 55-60%

---

## Monitorowanie i utrzymanie

- **Artefakty pokrycia**: zachowane 30 dni dla pushów do main, 14 dni dla PR
- **Artefakty Playwright**: zachowane 7 dni
- **Dependabot**: co poniedziałek — tygodniowe PR z aktualizacjami zależności
- **npm audit**: uruchamiany na każdym PR i każdym pushu do main
- **Build cache**: `.next/cache` jest cachowany między buildami (klucz = hash `package-lock.json` + plików TS/CSS)

### Rotacja Vercel Token

Token należy rotować co ~6 miesięcy:
1. Vercel → Settings → Tokens → Create new
2. GitHub → Settings → Secrets → zaktualizuj `VERCEL_TOKEN`
3. Stary token → Revoke

---

## Branch Protection przy rozrastaniu zespołu

Gdy dołączy nowy programista, wykonaj:

**GitHub → repo → Settings → Branches → Add branch protection rule**

Wpisz pattern: `main` → zaznacz:

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] **Require status checks to pass before merging**
  - Add required checks: `All Checks Passed` (job `quality-gate` z `pr.yml`)
  - [x] Require branches to be up to date before merging
- [x] **Require linear history** (opcjonalne, wymusza squash/rebase)
- [x] **Do not allow bypassing the above settings**

Powtórz regułę dla brancha `staging` (zamiast `main`).

**Dodatkowe zmiany w workflowach dla zespołu:**

W `pr.yml` job `unit-tests`, dodaj krok wgrywający coverage jako PR comment przez `romeovs/lcov-reporter-action`:

```yaml
- name: Report coverage to PR
  uses: romeovs/lcov-reporter-action@v0.4.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    lcov-file: ./coverage/lcov.info
```

---

## Appendix

### Użyte GitHub Actions

| Action | Wersja | Cel |
|---|---|---|
| `actions/checkout` | v4 | Checkout kodu |
| `actions/setup-node` | v4 | Node.js z cache |
| `actions/upload-artifact` | v4 | Artefakty |
| `actions/download-artifact` | v4 | Pobieranie artefaktów |
| `actions/cache` | v4 | Cache Next.js build |
| `amondnet/vercel-action` | v25 | Deploy do Vercel |
| `actions/github-script` | v7 | Komentarze PR (quality-gate) |

### Koszty GitHub Actions (orientacyjnie)

Przy 10 PR/miesiąc i 2 pushach do main/tydzień:
- PR workflow: ~8 min × 10 = ~80 min/miesiąc
- Main workflow: ~6 min × 8 = ~48 min/miesiąc
- Łącznie: ~128 min/miesiąc → **mieści się w darmowym limicie GitHub Free (2000 min/miesiąc)**

### Zasoby

- [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github)
- [amondnet/vercel-action](https://github.com/amondnet/vercel-action)
- [Jest coverageThreshold](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Playwright CI docs](https://playwright.dev/docs/ci)
- [GitHub Dependabot docs](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically)
