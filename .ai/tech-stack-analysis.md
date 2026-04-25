# Analiza Tech Stacku — GeoCanvas

> Dokument stanowi krytyczną, rzeczową ocenę stacku zdefiniowanego w PRD (`prd.md`).  
> Stan: kwiecień 2026.

---

## Stack zdefiniowany w PRD

| Warstwa | Technologia |
|---|---|
| Framework | Next.js (App Router) |
| Canvas | Konva.js + react-konva |
| Język | TypeScript |
| Stan | Zustand + Immer + zundo (temporal middleware) |
| Stylowanie | TailwindCSS |
| Color picker | react-colorful |
| Deploy | Vercel |

---

## Rekomendowane wersje (kwiecień 2026)

| Pakiet | Rekomendowana wersja | Status | Uwagi |
|---|---|---|---|
| `next` | `^16.2.0` | ✅ OK | Active LTS; wymaga Node.js >=20.9.0 |
| `react` / `react-dom` | `^19.2.0` | ✅ OK | Wymagane przez Next.js 16 App Router |
| `typescript` | `^5.9.0` | ✅ OK | Minimum 5.1 dla Next.js 16 |
| `konva` | `^10.2.5` | ✅ OK | Aktywny rozwój, brak zewnętrznych zależności |
| `react-konva` | `^19.2.3` | ✅ OK | peerDeps: react ^19.2.0 — pełna zgodność |
| `zustand` | `^5.0.12` | ✅ OK | 29M pobrań/tydzień, aktywny |
| `immer` | `^10.1.1` | ✅ OK | Wymagany przez zustand middleware (>=9.0.6) |
| `zundo` | `^2.3.0` | ⚠️ Uwaga | Ostatnia wersja: nov 2024; kompatybilny z zustand 5 |
| `tailwindcss` | `^4.2.3` | ⚠️ Uwaga | Breaking changes vs v3 (CSS-first config, brak tailwind.config.js) |
| `react-colorful` | `5.6.1` | 🔴 Problem | Ostatnia wersja: sie **2022**; brak wsparcia React 19 (PR otwarty, niezmergowany) |
| Node.js | `>=20.9.0` | ✅ OK | Wymagane przez Next.js 16 |
| `jest` + `jest-environment-jsdom` | `^29.x` | ✅ OK | Oficjalnie wspierany przez Next.js via `next/jest`; konfiguracja SWC out-of-the-box |
| `jest-canvas-mock` | `^2.x` | ✅ OK | Mock Canvas API dla jsdom; wymagany przy testach komponentów Konva |
| `@testing-library/react` | `^16.x` | ✅ OK | Standard dla testów komponentów React; wspiera React 19 |
| `@testing-library/user-event` | `^14.x` | ✅ OK | Symulacja interakcji użytkownika; zalecany nad `fireEvent` |
| `@testing-library/jest-dom` | `^6.x` | ✅ OK | Rozszerzone matchery Jest dla DOM (toBeInTheDocument itp.) |
| `@playwright/test` | `^1.x` | ✅ OK | E2E + visual regression; wbudowany `toHaveScreenshot` bez pluginów |

---

## Pytania krytyczne

### 1. Czy technologia pozwoli szybko dostarczyć MVP?

**Ocena: Tak, z zastrzeżeniami.**

Konva + react-konva, Zustand i TailwindCSS to szybkie, dobrze udokumentowane narzędzia. Główne ryzyka spowalniające:

- **Next.js App Router** — overhead dla czystego SPA; konfiguracja jest bardziej rozbudowana niż np. Vite.
- **react-colorful** — wymaga `--legacy-peer-deps` przy React 19, co może prowadzić do trudnych do debugowania błędów peer dependency.
- **TailwindCSS v4** — zmiana paradygmatu konfiguracji (CSS-first) wymaga nauki, jeśli developer przychodzi z v3.

Przy uwzględnieniu tych punktów MVP Core jest realistyczne w 1–2 tygodnie pracy.

---

### 2. Czy rozwiązanie będzie skalowalne w miarę wzrostu projektu?

**Ocena: Skalowalność jest tu nieistotna — i to jest świadoma decyzja.**

PRD definiuje GeoCanvas jako zamknięte SPA portfolio bez backendu. Brak backendu eliminuje całą klasę problemów skalowalności (baza danych, API, autoryzacja). Konva bez trudu obsługuje wymagane 200 kształtów w 60fps.

Jedyne potencjalne ograniczenie: localStorage — limitowany do ~5MB. Przy złożonych scenach z wieloma kształtami i historią (50 kroków zundo) można to limit osiągnąć. Rozwiązanie: `partialize` w zundo (snapshot tylko kluczowych pól stanu, z pominięciem danych tymczasowych).

---

### 3. Czy koszt utrzymania i rozwoju będzie akceptowalny?

**Ocena: Tak — ale react-colorful generuje dług techniczny.**

Wszystkie pakiety są MIT. Vercel free tier w zupełności wystarczy dla projektu portfolio. Koszt hostingu = 0.

Ryzyko:
- **react-colorful** nie był aktualizowany od sierpnia 2022. PR z poprawką dla React 19 istnieje od marca 2025 i nie jest zmergowany. Biblioteka może być de facto porzucona przez autora.
- **zundo** — ostatnia wersja to november 2024. Repozytorium aktywne (ostatni commit styczeń 2026), ale wolniejszy cykl release'ów.

---

### 4. Czy potrzebujemy aż tak złożonego rozwiązania?

**Ocena: Next.js App Router jest nadmiernie złożony dla wymagań PRD.**

PRD jednoznacznie stwierdza:
> _"Aplikacja jest wyłącznie SPA (Single Page Application) bez backendu."_

Next.js App Router jest zaprojektowany pod:
- Server-Side Rendering (SSR)
- React Server Components (RSC)
- Edge functions i middleware
- Streaming HTML

**Żadna z tych funkcji nie jest potrzebna.** Konsekwencje użycia App Router w czystym SPA:
- Większy bundle (Next.js runtime vs Vite output)
- Wolniejszy cold start (nawet bez SSR, Next.js wykonuje więcej pracy)
- Dodatkowa złożoność konfiguracji (app/ directory, layout.tsx, page.tsx)
- Potencjalne „hydration warnings" jeśli stan klienta różni się od serwera

Reszta stacku (Konva, Zustand, Immer, zundo) jest dobrze dobrana i nie jest zbyt złożona — każda warstwa ma wyraźne uzasadnienie w wymaganiach.

---

### 5. Czy nie istnieje prostsze podejście, które spełni wymagania?

**Ocena: Tak — Vite + React zamiast Next.js.**

Dla SPA bez backendu naturalnym, aktualnie rekomendowanym przez Reacta wyborem jest Vite:

```bash
npm create vite@latest geo-canvas-app -- --template react-ts
```

**Korzyści Vite vs Next.js App Router dla tego projektu:**
- HMR < 50ms (vs ~200ms Next.js)
- Prostszy setup — zero konfiguracji dla czystego SPA
- Mniejszy bundle produkcyjny
- Deploy na Vercel działa identycznie (Vite build → statyczne pliki)

**Kiedy Next.js jest uzasadniony:**  
Jeśli celem jest **demonstracja znajomości Next.js** jako dodatkowej umiejętności portfolio — wybór jest świadomy i uzasadniony. Należy to odnotować w README jako decyzję architektoniczną (REQ-066).

---

### 6. Czy technologie pozwolą zadbać o odpowiednie bezpieczeństwo?

**Ocena: Tak — minimalna powierzchnia ataku, właściwie zaadresowana.**

Brak backendu, brak uwierzytelniania, brak bazy danych = brak typowych wektorów ataku (SQL injection, XSS z persystencją, CSRF, nieautoryzowany dostęp).

Pozostałe punkty bezpieczeństwa:

| Wektor | Status |
|---|---|
| Import JSON z zewnętrznego pliku | ⚠️ Ryzyko — PRD poprawnie wymaga obsługi błędów (REQ-045). Należy parsować `try/catch` i walidować strukturę. |
| localStorage | ✅ Standardowe bezpieczeństwo przeglądarki; dane nie wychodzą poza domenę. |
| XSS | ✅ React domyślnie escapuje output. Brak `dangerouslySetInnerHTML` w projekcie. |
| TLS / HTTPS | ✅ Vercel wymusza HTTPS automatycznie. |
| Zależności z podatnościami | ✅ `npm audit` jako część rutyny development. |

---

### 7. Najlepsze kompatybilne wersje narzędzi

Poniżej rekomendowany fragment `package.json` z wersjami spiętymi pod wzajemną kompatybilność:

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
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}
```

> **Uwaga:** `react-colorful` zastąpiony przez `@uiw/react-color` — patrz sekcja poniżej.

---

## Kluczowe problemy i rekomendacje

### 🔴 Problem krytyczny: react-colorful

**Sytuacja:** Biblioteka nie była aktualizowana od sierpnia 2022 (ponad 3 lata). PR z poprawką dla React 19 (`#221`) był otwarty w marcu 2025, ale do kwietnia 2026 nie został zmergowany. Instalacja z React 19.2 wymaga `--legacy-peer-deps`, co maskuje konflikty wersji i jest złą praktyką.

**Rekomendacje (wybierz jedno):**

1. **`@uiw/react-color`** (preferowana) — aktywnie utrzymywana, wspiera React 19, bogaty zestaw komponentów (HexColorPicker, ChromePicker itp.), MIT.
2. **Natywny `<input type="color">`** — zero zależności, wystarczające dla podstawowych wymagań PRD (fill/stroke kolor). Ograniczenie: brak kontroli nad opacity w tym samym komponencie.
3. **`react-colorful` z forkiem** — fork `CatOfJupit3r/react-colorful-19` istnieje ale jest nieoficjalny.

---

### ⚠️ Ostrzeżenie: Next.js App Router vs Vite

Jeśli Next.js pozostaje (decyzja portfolio), należy:
- Używać `'use client'` we wszystkich komponentach canvas i stanu (cały kod to klient)
- Upewnić się, że Konva nie jest importowana po stronie serwera (SSR + Canvas API = błąd)
- Rozważyć dodanie `dynamic(() => import('./CanvasApp'), { ssr: false })` dla komponentu root canvas

Jeśli zmiana na Vite — deploy na Vercel identyczny: `vite build` → katalog `dist` → Vercel automatycznie wykrywa.

---

### ⚠️ Ostrzeżenie: TailwindCSS v4

TailwindCSS v4 to kompletne przepisanie silnika. Kluczowe zmiany względem v3:
- Brak `tailwind.config.js` (lub uproszczony) — konfiguracja przez `@theme` w CSS
- Import: `@import "tailwindcss"` zamiast `@tailwind base/components/utilities`
- Nowy plugin dla Next.js: `@tailwindcss/next` lub PostCSS plugin

Jeśli developer zna v3 — należy przejrzeć [oficjalny upgrade guide](https://tailwindcss.com/docs/upgrade-guide) przed startem.

---

## Strategia testowania

### Wybór: Jest zamiast Vitest

Mimo że Vitest jest szybszy w watch mode, dla projektu Next.js naturalnym wyborem jest **Jest z `next/jest`**. Powody:

- `next/jest` automatycznie konfiguruje transformy SWC, aliasy ścieżek (`@/`) i obsługę CSS/assets — zero ręcznej konfiguracji
- Vitest wymaga osobnego `vite.config.ts`, który duplicuje konfigurację Next.js i może desynchronizować się przy update'ach frameworka
- Cel projektu to nauka stacku (w tym Next.js) — `next/jest` to część ekosystemu Next.js, którą warto poznać

```js
// jest.config.js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
})
```

```ts
// jest.setup.ts
import 'jest-canvas-mock'
import '@testing-library/jest-dom'
```

### Co i jak testować

| Warstwa | Narzędzie | Priorytet |
|---|---|---|
| Zustand store (addShape, deleteShape, undo/redo) | Jest — czysty JS, bez jsdom | Wysoki — core logika biznesowa |
| Serializacja / deserializacja JSON | Jest — czysty JS | Wysoki — REQ-045 wymaga walidacji |
| Komponenty sidebar, toolbar | Jest + RTL | Średni — czysty React bez Konva |
| Komponenty Konva | Jest + `jest-canvas-mock` | Niski — canvas mock ogranicza wartość |
| Golden path (add → select → edit → export) | Playwright | Wysoki — jedyne testy weryfikujące realne zachowanie canvas |
| Visual regression (stan zaznaczenia, Transformer) | Playwright `toHaveScreenshot` | Średni — łapie regresje wizualne |

### Uwaga: ograniczenia testowania Konva

`jsdom` nie implementuje Canvas API — `jest-canvas-mock` mockuje je, ale testy komponentów Konva weryfikują tylko czy metody zostały wywołane, nie jak wygląda wyrenderowany kształt. Dla weryfikacji poprawności wizualnej jedynym narzędziem jest Playwright z screenshot comparison.

---

## Ogólna ocena

Stack jest **solidny i przemyślany** dla projektu portfolio/edukacyjnego. Wybory technologiczne są spójne, nowoczesne i mają uzasadnienie w wymaganiach PRD.

**Cztery działania przed startem projektu:**

1. **Zastąp `react-colorful`** aktywnie utrzymywaną alternatywą (`@uiw/react-color` lub natywny `<input type="color">`).
2. **Udokumentuj decyzję Next.js App Router** w README (REQ-066) — wybór świadomy, cel: nauka wzorców Next.js do przyszłych projektów z backendem.
3. **Zaakceptuj TailwindCSS v4 workflow** (CSS-first config, nie v3) i upewnij się, że konfiguracja startowa jest poprawna.
4. **Skonfiguruj Jest przez `next/jest`** z `jest-canvas-mock` zanim napiszesz pierwszy test — canvas mock musi być w `setupFiles`, nie w `setupFilesAfterFramework`.

Po uwzględnieniu powyższych stack w pełni adresuje wymagania PRD i umożliwia dostarczenie MVP Core w 1–2 tygodnie pracy.
