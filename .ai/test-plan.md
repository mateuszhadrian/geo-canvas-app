# Plan testów — GeoCanvas

> Wersja: 2026-04-28
> Projekt: geo-canvas-app (minimalistyczny edytor kształtów geometrycznych)
> Stack: Next.js 16 / React 19 / Konva.js / Zustand 5 / Immer / TypeScript 5 (strict)

---

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu

Dokument definiuje strategię, zakres i scenariusze testowe dla aplikacji GeoCanvas — przeglądarkoewgo edytora kształtów geometrycznych. Jest punktem wejścia dla każdego, kto chce zrozumieć, co i jak jest weryfikowane, oraz podstawą do oceny gotowości każdego kolejnego przyrostu funkcjonalności.

### 1.2 Cele testowania

- **Poprawność logiki domenowej** — algorytmy historii zmian (Command Pattern), kodek dokumentu JSON, geometria kształtów i system uchwytów muszą działać bezbłędnie.
- **Integralność stanu** — store Zustand z sześcioma slice'ami (shapes, selection, viewport, tool, history, layers) musi zachowywać spójność przy każdej operacji.
- **Trwałość danych** — enkodowanie i dekodowanie dokumentu musi być wzajemnie odwracalne (round-trip) bez utraty informacji.
- **Poprawność interakcji użytkownika** — klawiatura (Delete, Escape, Ctrl+Z/Y), mysz (klik, marquee, drag, zoom), tooltipy i ikony muszą działać zgodnie z PRD.
- **Wydajność przy dużej liczbie kształtów** — cel: płynna interakcja przy 200+ kształtach (REQ PRD).
- **Brak regresji** — każda zmiana kodu przechodzi przez testy automatyczne w CI przed mergem.

### 1.3 Zakres dokumentu

Plan obejmuje aplikację działającą lokalnie na desktopie (Chromium). Nie obejmuje backendów, autoryzacji ani mobilnych środowisk uruchomieniowych — aplikacja jest pure SPA bez serwera.

---

## 2. Zakres testów

### 2.1 Co będzie testowane

| Obszar | Moduły / pliki |
|---|---|
| Logika historii zmian | `src/store/use-canvas-store.ts` — `applyForward`, `applyInverse`, `pushCmd`, `undo`, `redo` |
| Kodek dokumentu | `src/lib/documentCodec.ts` — `encodeDocument`, `decodeDocument`, `parseDocument`, `serializeDocument` |
| Granice bounding boxów | `src/lib/shapeBounds.ts` — `getShapeBoundingBox`, `intersectsBoundingBox` |
| Przechwytywanie geometrii | `src/lib/captureGeometry.ts` |
| Factory kształtów | `src/shapes/*/factory.ts` — wszystkie pięć typów |
| Uchwyty kształtów | `src/shapes/*/handles.ts` — `applyHandleDrag`, `getHandles`, minimalne wymiary |
| Punkty kotwic | `src/shapes/*/anchors.ts` |
| Store — warstwy | `src/store/use-canvas-store.ts` — slice `layers` |
| Store — selekcja | `src/store/use-canvas-store.ts` — slice `selection` |
| Store — kształty z-order | `src/store/use-canvas-store.ts` — `bringForward/ToFront`, `sendBackward/ToBack` |
| Polilinia | `src/shapes/line/useMultilineDrawing.ts` |
| Komponent JsonImportInput | `src/components/canvas/JsonImportInput.tsx` |
| Komponent LayersSidebar | `src/components/sidebar/LayersSidebar.tsx` |
| Interakcje canvasa | `src/components/canvas/CanvasApp.tsx` (E2E) |
| Toolbar | `src/components/toolbar/Toolbar.tsx` (E2E) |
| PropertiesSidebar | `src/components/sidebar/PropertiesSidebar.tsx` (E2E) |
| Skróty klawiaturowe | Zintegrowane w CanvasApp (E2E) |

### 2.2 Co nie będzie testowane (z uzasadnieniem)

| Wykluczone | Uzasadnienie |
|---|---|
| Autosave do localStorage | REQ-029 oznaczony jako `[PENDING]` — nie zaimplementowane |
| Ctrl+D (duplikacja) | REQ-012 `[PENDING]` — nie zaimplementowane |
| Kąt rotacji w sidebar | REQ-028 `[PENDING]` — nie zaimplementowane |
| Elipsa w toolbarze | Typ zaimplementowany, ale niedostępny z UI |
| Rendering WebGL / GPU | Konva.js zarządza canvas API; testy E2E weryfikują widoczne efekty, nie wywołania WebGL |
| Responsywność mobilna | Aplikacja desktop-only; brak breakpointów mobilnych |
| Tryb ciemny / jasny | Brak przełącznika motywu; stały schemat kolorów |
| Środowisko CI/CD (GitHub Actions) | Konfiguracja pipeline leży poza zakresem tego dokumentu |

---

## 3. Typy testów

### 3.1 Testy jednostkowe (unit tests)

Uruchamiane przez `npm run test` (Jest 29 + jsdom). Katalog: `tests/unit/`.

Cel: weryfikacja każdej czystej funkcji i hooka w izolacji, z mockami Canvas API (`jest-canvas-mock`) i store Zustand.

**Priorytety:**
1. `documentCodec` — najbardziej złożona logika parsowania
2. Historia (undo/redo) — applyForward / applyInverse muszą być ściśle odwrotne
3. Handles — matematyka drag dla każdego kształtu
4. shapeBounds — precyzyjna geometria

### 3.2 Testy integracyjne komponentów

Uruchamiane przez `npm run test` (Testing Library). Katalog: `tests/unit/components/`.

Cel: weryfikacja, że React komponenty poprawnie czytają i zapisują stan w Zustand store, renderują oczekiwane elementy i reagują na zdarzenia użytkownika (click, keydown, change).

### 3.3 Testy End-to-End (E2E)

Uruchamiane przez `npm run test:e2e` (Playwright 1.52, Chromium). Katalog: `tests/e2e/`.

Cel: weryfikacja kompletnych ścieżek użytkownika w żywej przeglądarce: tworzenie kształtów, edycja, undo/redo, import JSON, zarządzanie warstwami.

### 3.4 Testy wydajnościowe

Nie są oddzielnym typem — wbudowane w testy E2E jako scenariusze z 200+ kształtami z pomiarem czasu frame rate.

### 3.5 Testy bezpieczeństwa i danych wejściowych

Objęte testami jednostkowymi `parseDocument` — weryfikacja obsługi złośliwego lub malformatowanego JSON.

---

## 4. Scenariusze testowe

### 4.1 Kodek dokumentu (`documentCodec.ts`)

#### Parsowanie JSON — `parseDocument`

| ID | Scenariusz | Dane wejściowe | Oczekiwany wynik |
|---|---|---|---|
| DC-001 | Format pełny (CanvasDocument) | Obiekt z `meta`, `canvas`, `layers`, `stickyDefaults` | Zwraca obiekt 1:1 z wejściem |
| DC-002 | Format częściowy — tylko `layers` | `{ layers: [...] }` | Meta i canvas uzupełnione wartościami domyślnymi |
| DC-003 | Format bare array | `[{type:'rect',...}]` | Jeden layer z `DEFAULT_LAYER_ID`, kształty przekazane bez zmian |
| DC-004 | Niepoprawny JSON | `"not json {"` | Rzuca `Error('Invalid document: not valid JSON.')` |
| DC-005 | Root nie jest obiektem ani tablicą | `42` lub `null` | Rzuca `Error('Invalid document: root must be...')` |
| DC-006 | Brak tablicy `layers` | `{ meta: {...} }` | Rzuca `Error('Invalid document: "layers" must be an array.')` |
| DC-007 | Pusty JSON string | `""` | Rzuca błąd parsowania |
| DC-008 | Bardzo duży plik (1000 kształtów) | Tablica 1000 kształtów | Parsuje bez błędów w < 100 ms |

#### Kodowanie i dekodowanie — round-trip

| ID | Scenariusz | Oczekiwany wynik |
|---|---|---|
| DC-010 | encode → serialize → parse → decode | `shapes` i `layers` identyczne z wejściem |
| DC-011 | Kształt bez `layerId` | `orphans` trafiają do pierwszego layera |
| DC-012 | Pusty canvas (brak kształtów) | Enkoduje i dekoduje bez błędów; `layers` ma co najmniej 1 layer |
| DC-013 | `decodeDocument` bez warstw | Zwraca `layers: [INITIAL_LAYER]` |
| DC-014 | `encodeDocument` zachowuje `meta.id` i `meta.createdAt` gdy `existingMeta` podany | Pola nie nadpisywane |

### 4.2 Historia zmian (undo/redo)

#### applyForward / applyInverse

| ID | Komenda | Weryfikacja forward | Weryfikacja inverse |
|---|---|---|---|
| HI-001 | `ADD_SHAPE` | kształt pojawia się w `state.shapes` | kształt usunięty z `state.shapes` |
| HI-002 | `REMOVE_SHAPES` | kształty znikają | kształty przywrócone |
| HI-003 | `UPDATE_SHAPE` | pole `after` nadpisuje stan | pole `before` przywraca stan |
| HI-004 | `UPDATE_SHAPES` (wiele kształtów) | wszystkie `after` zastosowane | wszystkie `before` przywrócone |
| HI-005 | `SET_SHAPES` | `state.shapes = after` | `state.shapes = before` |
| HI-006 | `REORDER_SHAPES` | kształty posortowane wg `after` | kształty posortowane wg `before` |

#### Zarządzanie kolejką

| ID | Scenariusz | Oczekiwany wynik |
|---|---|---|
| HI-010 | `undo` przy pustym `_past` | Bez efektu; `canUndo = false` |
| HI-011 | `redo` przy pustym `_future` | Bez efektu; `canRedo = false` |
| HI-012 | Nowa operacja po `undo` | `_future` wyczyszczone; `canRedo = false` |
| HI-013 | 51 operacji z rzędu (MAX_HISTORY = 50) | Pierwsza operacja usunięta; `_past.length = 50` |
| HI-014 | `undo` → stan A; `redo` → stan B | Stan B identyczny ze stanem przed `undo` |
| HI-015 | `clearHistory` | `_past = []`, `_future = []`, `canUndo = false`, `canRedo = false` |

### 4.3 Granice bounding boxów (`shapeBounds.ts`)

| ID | Kształt | Scenariusz | Oczekiwany wynik |
|---|---|---|---|
| SB-001 | Rect 100×50 w (200, 150) | `getBoundingBox` | `{x1:150, y1:125, x2:250, y2:175}` |
| SB-002 | Circle r=40 w (0, 0) | `getBoundingBox` | `{x1:-40, y1:-40, x2:40, y2:40}` |
| SB-003 | Dwa nakładające się bbox'y | `intersectsBoundingBox` | `true` |
| SB-004 | Dwa rozłączne bbox'y | `intersectsBoundingBox` | `false` |
| SB-005 | Bbox'y stykające się krawędziami | `intersectsBoundingBox` | `false` (warunek `<` / `>`) |

### 4.4 Uchwyty kształtów — `applyHandleDrag`

#### Rect (`applyRectHandleDrag`)

| ID | Uchwyt | Delta | Oczekiwany efekt |
|---|---|---|---|
| RH-001 | `top` | ldy = -20 | height += 20; x/y przesunięte o połowę delty w osi rotacji |
| RH-002 | `bottom` | ldy = 30 | height += 30 |
| RH-003 | `left` | ldx = -10 | width += 10 |
| RH-004 | `right` | ldx = 15 | width += 15 |
| RH-005 | `scale` | proporcjonalne | width i height proporcjonalne; `f = max(0.1,...)` |
| RH-006 | `top` przy height = 11, ldy = 5 | Minimalna wysokość | height = max(10, 11-5) = 6 |
| RH-007 | `left` przy width = 10, ldx = 5 | Minimalna szerokość | width = max(10, 10-5) = 10 |

#### Ogólne (wszystkie kształty)

| ID | Scenariusz | Oczekiwany wynik |
|---|---|---|
| GH-001 | Wymiar spada poniżej minimum (10 dla rect, 5 dla circle/ellipse) | Ograniczony do wartości minimalnej |
| GH-002 | Rotacja kształtu ≠ 0 — drag boczny uchwytu | Pozycja centrum korygowana o sin/cos rotacji |

### 4.5 Store — warstwy

| ID | Akcja | Warunki | Oczekiwany wynik |
|---|---|---|---|
| LA-001 | `addLayer()` | — | Nowa warstwa dodana; `activeLayerId` = nowe id |
| LA-002 | `removeLayer(id)` przy 1 warstwie | — | Brak efektu (guard `<= 1`) |
| LA-003 | `removeLayer(id)` przy 2+ warstwach | — | Warstwa i jej kształty usunięte; `activeLayerId` korygowane |
| LA-004 | `toggleLayerVisibility(id)` | layer.visible = true | layer.visible = false |
| LA-005 | `toggleLayerLock(id)` | layer.locked = false | layer.locked = true |
| LA-006 | `setLayerOpacity(id, 0.5)` | — | layer.opacity = 0.5 |
| LA-007 | `moveLayerUp(id)` przy ostatnim | — | Brak efektu (idx = length - 1) |
| LA-008 | `moveLayerDown(id)` przy pierwszym | — | Brak efektu (idx = 0) |
| LA-009 | `renameLayer(id, '')` | — | Nazwa pusta — UI powinien odrzucić (commitRename sprawdza `trimmed`) |
| LA-010 | `setLayers(layers, activeId)` | — | Pełne zastąpienie layers i activeLayerId |

### 4.6 Store — z-ordering

| ID | Akcja | Układ przed | Układ po |
|---|---|---|---|
| ZO-001 | `bringForward(['B'])` | [A, B, C] | [A, C, B] |
| ZO-002 | `bringToFront(['A'])` | [A, B, C] | [B, C, A] |
| ZO-003 | `sendBackward(['C'])` | [A, B, C] | [A, C, B] |
| ZO-004 | `sendToBack(['C'])` | [A, B, C] | [C, A, B] |
| ZO-005 | `bringForward` gdy kształt już na wierzchu | [A, B] gdzie B = selected | Bez zmiany kolejności |
| ZO-006 | Operacja z-order rejestruje `REORDER_SHAPES` w historii | — | `_past.length` rośnie |

### 4.7 Polilinia (`useMultilineDrawing`)

| ID | Scenariusz | Oczekiwany wynik |
|---|---|---|
| ML-001 | Brak zaznaczonych linii — `tryExtendOrClose` | Zwraca `false` |
| ML-002 | 1 zaznaczona linia — klik w odległości | Dodaje nowy segment; `selectedShapeIds` rozszerzone |
| ML-003 | ≥ 2 zaznaczone linie — klik blisko punktu startowego (<= threshold) | Zamyka polilinię; `selectedShapeIds = []` |
| ML-004 | ≥ 2 zaznaczone linie — klik daleko od punktu startowego | Wydłuża łańcuch; nie zamyka |
| ML-005 | Threshold skaluje się: `30 / canvasScale` | Przy scale=2 threshold = 15px, przy scale=0.5 threshold = 60px |

### 4.8 Import JSON (`JsonImportInput`)

| ID | Scenariusz | Dane wejściowe | Oczekiwany wynik |
|---|---|---|---|
| JI-001 | Wklejony poprawny JSON, Enter | Pełny CanvasDocument | Canvas zastąpiony; textarea wyczyszczone |
| JI-002 | Wklejony bare array kształtów, Enter | `[{type:'rect',...}]` | Kształty załadowane |
| JI-003 | Niepoprawny JSON, Enter | `{foo bar` | Obramowanie textarea czerwone przez 700 ms; canvas bez zmian |
| JI-004 | Shift+Enter | Dowolny tekst | Brak akcji (nowa linia w textarea) |
| JI-005 | Wyczyszczenie błędu przez edycję | Błąd aktywny; użytkownik zmienia tekst | `hasError = false` natychmiast |

### 4.9 Selekcja — marquee

| ID | Scenariusz | Oczekiwany wynik |
|---|---|---|
| MQ-001 | Przeciągnięcie obejmujące kształt na aktywnej warstwie | Kształt zaznaczony |
| MQ-002 | Przeciągnięcie obejmujące kształt na nieaktywnej warstwie | Kształt NIE zaznaczony |
| MQ-003 | Przeciągnięcie < MARQUEE_THRESHOLD (3px) | Marquee nie aktywowany; traktowane jako klik |
| MQ-004 | Warstwa zablokowana (`locked = true`) | Kształty na niej nie zaznaczane przez marquee |
| MQ-005 | Warstwa ukryta (`visible = false`) | Kształty nie zaznaczane przez marquee |

### 4.10 Scenariusze E2E — krytyczne ścieżki

#### E2E-001: Tworzenie i usuwanie kształtu
1. Otwórz aplikację (`http://localhost:3000`).
2. Kliknij narzędzie "Rect" w toolbarze.
3. Zweryfikuj: nowy prostokąt widoczny na canvasie, sidebar Properties widoczny.
4. Naciśnij `Delete`.
5. Zweryfikuj: prostokąt zniknął; sidebar Properties ukryty.

#### E2E-002: Undo / Redo przez skróty klawiaturowe
1. Utwórz prostokąt.
2. Utwórz koło.
3. Naciśnij `Ctrl+Z` → koło znika.
4. Naciśnij `Ctrl+Z` → prostokąt znika.
5. Naciśnij `Ctrl+Y` → prostokąt wraca.
6. Naciśnij `Ctrl+Shift+Z` → koło wraca.

#### E2E-003: Import JSON
1. Przygotuj JSON z jednym prostokątem (bare array format).
2. Wklej do textarei JSON Import, naciśnij Enter.
3. Zweryfikuj: prostokąt widoczny na canvasie.
4. Wklej niepoprawny JSON, naciśnij Enter.
5. Zweryfikuj: czerwone obramowanie textarea; canvas bez zmian.

#### E2E-004: Zarządzanie warstwami
1. Dodaj drugą warstwę (+).
2. Utwórz koło (na warstwie 2).
3. Zaznacz warstwę 1 w LayersSidebar.
4. Utwórz prostokąt (na warstwie 1).
5. Ukryj warstwę 2 (klik Eye).
6. Zweryfikuj: koło niewidoczne; prostokąt widoczny.
7. Usuń warstwę 2.
8. Zweryfikuj: koło trwale usunięte; `layers.length = 1`.

#### E2E-005: Zoom i pan
1. Wykonaj Ctrl+scroll (zoom in) — canvas przybliżony.
2. Zmień tool na "Hand", przeciągnij — canvas przesunięty.
3. Zweryfikuj: `canvasScale ≤ MAX_SCALE (2)` i `>= minScale`.

#### E2E-006: Właściwości kształtu
1. Utwórz prostokąt.
2. W PropertiesSidebar zmień Width na 200.
3. Zweryfikuj: kształt ma Width = 200 na canvasie.
4. Zmień fill color.
5. Zweryfikuj: kolor zaktualizowany w PictureDataDisplay JSON.

#### E2E-007: Multi-select i zbiorowe przesunięcie
1. Utwórz dwa prostokąty.
2. Przeciągnij marquee obejmujący oba.
3. Zweryfikuj: oba zaznaczone; `MultiShapeHandles` widoczne.
4. Przeciągnij oba kształty jednocześnie.
5. Naciśnij Ctrl+Z — oba wracają.

#### E2E-008: Polilinia
1. Wybierz narzędzie Line, kliknij, zaznacz jedną linię.
2. Kliknij w pustym obszarze — dodany nowy segment.
3. Kliknij blisko punktu startowego — polilinia zamknięta.
4. Zweryfikuj: `selectedShapeIds = []` po zamknięciu.

#### E2E-009: Wydajność przy 200 kształtach
1. Importuj JSON z 200 prostokątami (przygotowany fixture).
2. Zaznacz wszystkie (marquee).
3. Przeciągnij zaznaczenie.
4. Weryfikacja: brak widocznych zacinań (frame time < 16 ms mierzony przez `performance.now()`).

---

## 5. Środowisko testowe

### 5.1 Środowisko lokalne (development)

- Node.js >=20.9.0 (wymaganie `package.json#engines`)
- Przeglądarka: Chromium (Playwright instaluje Chromium headless)
- OS: macOS / Linux / Windows z WSL2
- Uruchomienie dev serwera: `npm run dev` (port 3000)
- Brak zależności zewnętrznych (API, bazy danych, CDN) — wszystko lokalne

### 5.2 Środowisko CI

- Playwright uruchamiany z `CI=true` → `retries: 2`, `reuseExistingServer: false`
- Dev server startowany automatycznie przez Playwright `webServer`
- Snapshoty Playwright: `tests/e2e/__snapshots__/`

### 5.3 Dane testowe

| Zestaw | Opis | Lokalizacja |
|---|---|---|
| `fixture-empty.json` | Pusty dokument (0 kształtów, 1 warstwa) | `tests/fixtures/` |
| `fixture-bare-array.json` | Bare array — 3 kształty różnych typów | `tests/fixtures/` |
| `fixture-full-doc.json` | Pełny CanvasDocument z 2 warstwami | `tests/fixtures/` |
| `fixture-200-shapes.json` | 200 prostokątów do testów wydajnościowych | `tests/fixtures/` |
| `fixture-invalid.json` | Celowo uszkodzony JSON | `tests/fixtures/` |

Dane generowane deterministycznie przez helper `tests/helpers/buildShape.ts` — bez losowych UUID aby testy były powtarzalne.

### 5.4 Mocking

- `jest-canvas-mock` — Canvas API (Konva wymaga `<canvas>` w środowisku jsdom)
- Zustand store resetowany przed każdym testem przez `act(() => store.setState(initialState))`
- Konva Stage i Layer mockowane w testach jednostkowych komponentów

---

## 6. Narzędzia do testowania

| Kategoria | Narzędzie | Wersja | Zastosowanie |
|---|---|---|---|
| Unit runner | Jest | 29.7 | Testy jednostkowe i komponentów |
| Unit environment | jest-environment-jsdom | 29.7 | Emulacja DOM w Node.js |
| Canvas mock | jest-canvas-mock | 2.5.2 | Stubowanie Canvas API dla Konva |
| Component testing | @testing-library/react | 16.3 | Render i interakcje React |
| User interactions | @testing-library/user-event | 14.6 | Symulacja klawiatury i myszy w Testing Library |
| Assertions | @testing-library/jest-dom | 6.6 | Niestandardowe matchery DOM |
| E2E runner | Playwright | 1.52 | Testy end-to-end w Chromium |
| Type checking | tsc --noEmit | 5.9 | Statyczna analiza typów |
| Linting | ESLint 9 | 9.x | Statyczna analiza kodu |
| Formatowanie | Prettier | 3.5 | Spójność formatu kodu |
| Coverage | Jest --coverage (Istanbul) | wbudowany | Raport pokrycia kodu |
| Raportowanie błędów | GitHub Issues | — | Śledzenie defektów |

### 6.1 Konfiguracja Jest

Plik `jest.config.js` — konfiguracja przez `next/jest`:
- Katalog testów: `tests/unit/**/*.test.ts(x)`
- Coverage z: `src/**/*.{ts,tsx}` (z wyłączeniem `.d.ts` i `layout.tsx`)
- Path alias `@/` → `src/`

### 6.2 Konfiguracja Playwright

Plik `playwright.config.ts`:
- Katalog testów: `tests/e2e/`
- Przeglądarki: Chromium (Desktop Chrome)
- Retry: 2× w CI, 0× lokalnie
- Trace: `on-first-retry`

---

## 7. Harmonogram testów

### Faza 1 — Fundament (tydzień 1–2)

Cel: pokryć całą logikę domenową testami jednostkowymi.

| Zadanie | Szacowany czas |
|---|---|
| Testy `documentCodec` (DC-001…DC-014) | 1 dzień |
| Testy historii — `applyForward`/`applyInverse` (HI-001…HI-015) | 1 dzień |
| Testy `shapeBounds` (SB-001…SB-005) | 0.5 dnia |
| Testy `handles` — rect, circle, ellipse, triangle (RH/GH) | 1.5 dnia |
| Testy store — warstwy (LA-001…LA-010) | 1 dzień |
| Testy store — z-order (ZO-001…ZO-006) | 0.5 dnia |
| Testy `useMultilineDrawing` (ML-001…ML-005) | 1 dzień |

**Kamień milowy:** Pokrycie kodu (coverage) ≥ 80% dla plików `src/lib/` i `src/store/`.

### Faza 2 — Komponenty (tydzień 3)

Cel: pokryć komponenty React testami integracyjnymi Testing Library.

| Zadanie | Szacowany czas |
|---|---|
| Testy `JsonImportInput` (JI-001…JI-005) | 0.5 dnia |
| Testy `LayersSidebar` | 1 dzień |
| Testy `PropertiesSidebar` | 1 dzień |
| Testy marquee (MQ-001…MQ-005) | 0.5 dnia |

**Kamień milowy:** Pokrycie kodu ≥ 70% dla `src/components/`.

### Faza 3 — E2E (tydzień 4)

Cel: pokryć krytyczne ścieżki scenariuszami Playwright.

| Zadanie | Szacowany czas |
|---|---|
| Fixtures danych testowych | 0.5 dnia |
| E2E-001…E2E-005 (tworzenie, undo, import, warstwy, zoom) | 2 dni |
| E2E-006…E2E-009 (właściwości, multi-select, polilinia, wydajność) | 1.5 dnia |
| Stabilizacja i retries | 1 dzień |

**Kamień milowy:** Wszystkie scenariusze E2E przechodzą 3× z rzędu bez flaky failures.

### Faza 4 — Utrzymanie (ciągłe)

- Testy dodawane przy każdej nowej funkcjonalności (zgodnie z Definition of Done w CLAUDE.md).
- Przegląd pokrycia przy każdym PR.
- Aktualizacja fixtures po zmianie schematu dokumentu (`SCHEMA_VERSION`).

---

## 8. Kryteria akceptacji testów

### 8.1 Kryteria wejścia (entry criteria)

- Kod przechodzi `npm run typecheck` bez błędów.
- Kod przechodzi `npm run lint` bez błędów.
- Środowisko lokalne: Node.js ≥ 20.9.0, `npm install` zakończone.
- Dla E2E: `npm run dev` uruchamia się na porcie 3000.

### 8.2 Kryteria wyjścia (exit criteria)

| Metryka | Próg |
|---|---|
| Pokrycie kodu linii — `src/lib/` | ≥ 85% |
| Pokrycie kodu linii — `src/store/` | ≥ 80% |
| Pokrycie kodu linii — `src/shapes/` | ≥ 75% |
| Pokrycie kodu linii — `src/components/` | ≥ 60% |
| Testy jednostkowe — przejście | 100% (0 failed) |
| Testy E2E — przejście | 100% (0 failed, max 2 retries) |
| Otwarte błędy krytyczne (P1) | 0 |
| Otwarte błędy wysokie (P2) | ≤ 2 (z planem naprawy) |
| Błędy w konsoli produkcyjnej | 0 (wymaganie PRD) |

### 8.3 Blokery wydania

Następujące warunki **blokują** wydanie nowej wersji:
- Regresja w którymkolwiek scenariuszu E2E.
- Błąd `SCHEMA_VERSION` bez migracji.
- Błąd console.error w live przeglądarce (wymaganie PRD).
- Pokrycie poniżej progów dla `src/lib/` lub `src/store/`.

---

## 9. Role i odpowiedzialności

| Rola | Osoba | Odpowiedzialności |
|---|---|---|
| **Autor / Developer** | mateuszhadrian | Pisanie kodu produkcyjnego i testów jednostkowych; triage błędów; aktualizacja fixtures |
| **Reviewer** | (peer review przez PR) | Weryfikacja że nowy kod ma testy zgodne z DoD; przegląd pokrycia |
| **QA (E2E)** | mateuszhadrian (lub CI bot) | Uruchamianie scenariuszy Playwright; zgłaszanie regresji jako GitHub Issues |

*Projekt jest jednoosobowy; podział ról stosowany przez separację zadań w czasie (pisanie → review własnych zmian po 24h).*

---

## 10. Procedury raportowania błędów

### 10.1 Klasyfikacja priorytetów

| Priorytet | Definicja | Przykłady |
|---|---|---|
| **P1 — Krytyczny** | Blokuje podstawowe funkcje; utrata danych | Undo nie działa; import niszczy canvas; crash aplikacji |
| **P2 — Wysoki** | Funkcja działa źle; obejście możliwe | Marquee zaznacza kształty z błędnej warstwy; handles z błędną matematyką |
| **P3 — Średni** | Degradacja UX; bez utraty danych | Kursor nie zmienia się na `grabbing`; animacja trwa za długo |
| **P4 — Niski** | Kosmetyczny; brak wpływu na dane | Nieaktualna wartość w placeholder; drobny offset px |

### 10.2 Szablon zgłoszenia błędu (GitHub Issue)

```markdown
## Tytuł
[P{1-4}] Krótki opis problemu (co nie działa)

## Środowisko
- OS: macOS 15.x / Windows 11
- Przeglądarka: Chromium 136
- Node.js: 20.x
- Commit: abc1234

## Kroki do odtworzenia
1. ...
2. ...
3. ...

## Oczekiwane zachowanie
...

## Rzeczywiste zachowanie
...

## Artefakty
- Screenshot / nagranie
- Trace Playwright (jeśli E2E)
- JSON canvasa w momencie błędu

## Możliwa przyczyna (opcjonalnie)
...
```

### 10.3 Przepływ pracy

```
Zgłoszenie (triage) → Przypisanie → In Progress → Code Review → Test → Closed
                                                               ↑
                                              Playwright / unit re-run
```

- Błędy P1 naprawiane przed każdą inną pracą.
- Każdy naprawiony błąd musi mieć test regresyjny dodany do suite.
- Zamknięcie błędu wymaga: commit z naprawą + test + przejście CI.

### 10.4 Triage błędów z Playwright

Jeśli test E2E failuje:
1. Sprawdź trace (`playwright show-trace`) — plik zapisywany przy pierwszym retry.
2. Sprawdź screenshot (`tests/e2e/__snapshots__/`).
3. Zreprodukuj lokalnie z `npm run test:e2e:ui`.
4. Oceń czy flaky (retry pomaga) czy deterministyczny — deterministic = P1/P2, flaky = P3.
