# Dokument wymagań produktu (PRD) - GeoCanvas

> Wersja: 2026-04-28 (aktualizacja — uwzględnia zmiany zaakceptowane po pierwszej implementacji)
>
> Zmiany względem pierwotnego PRD są zaznaczone adnotacją `[ZMIANA]`. Wymagania niezaimplementowane jako `[PENDING]`.

## 1. Przegląd produktu GeoCanvas

GeoCanvas to minimalistyczny, geometryczny edytor kształtów działający w przeglądarce, zbudowany jako projekt edukacyjno-portfolio. Aplikacja umożliwia tworzenie, edycję i organizację geometrycznych kształtów na interaktywnym canvasie, z możliwością zapisywania i eksportowania prac.

Stylistycznie projekt nawiązuje do narzędzi takich jak tldraw i Excalidraw — czysty, geometryczny, minimalistyczny interfejs. Aplikacja jest wyłącznie SPA (Single Page Application) bez backendu. Jedyną formą trwałości danych jest autosave do localStorage oraz lokalny eksport/import pliku JSON.

Stack technologiczny:

- Framework: Next.js (App Router)
- Canvas: Konva.js + react-konva
- Język: TypeScript 5+ (strict mode)
- Zarządzanie stanem: Zustand + Immer
- **[ZMIANA]** Historia zmian: własny Command Pattern history slice (`src/store/slices/history.ts`) — `zundo` odrzucony (patrz sekcja 3.2 i `.ai/undo-redo-mechanism-analysis.md`)
- Stylowanie: TailwindCSS v4 (konfiguracja CSS-first via `@theme`)
- Color picker: @uiw/react-color
- Ikony: lucide-react
- Deploy: Vercel
- Wymagany runtime: Node.js >=20.9.0

Architektura kodu — zasada shape-centric modules:

Każdy typ figury żyje w swoim własnym katalogu `src/shapes/<nazwa>/` i zawiera **do 8 plików** [ZMIANA: wcześniej 6]:

```
src/shapes/
├── _base/              # BaseShape interface, domyślne wartości bazowe, ShapeDefinition interface
├── rect/               # prostokąt — typy, defaults, factory, Renderer, PropertiesPanel, handles, anchors, index
├── circle/             # koło
├── ellipse/            # elipsa (zaimplementowana, aktualnie niedostępna z toolbaru)
├── triangle/           # trójkąt
├── line/               # linia / polilinia
├── custom/             # (przyszłość) figury złożone / grupy
├── index.ts            # unia Shape, re-eksporty typów
└── registry.ts         # SHAPE_REGISTRY + SHAPE_TYPES — jedyne miejsce wiedzy o wszystkich figurach
```

**[ZMIANA]** `ShapeDefinition` jest znacznie bogatszy niż w pierwotnym projekcie — każda definicja kształtu zawiera teraz pełną logikę geometryczną, uchwytów i kotwic:

```typescript
interface ShapeDefinition<S extends BaseShape> {
  type: ShapeType
  label: string
  icon: ComponentType

  create: (pos: Point) => S
  Renderer: ComponentType<{ shape: S; isSelected: boolean }>
  PropertiesPanel: ComponentType<{ shape: S }>

  // Geometria / bounds — delegowane do definicji, nie w centralnych plikach
  captureGeometry: (shape: S) => FieldUpdate
  getBoundingBox: (shape: S) => BoundingBox
  getWorldPoints: (shape: S) => Point[]

  // System uchwytów — null dla kształtów ze specjalnym komponentem (np. linia)
  getHandles: ((shape: S) => HandleGeometry) | null
  captureStart: ((shape: S) => StartSnapshot) | null
  applyHandleDrag: (start, kind, ldx, ldy, startLocalPtr, sinθ, cosθ) => FieldUpdate | null

  // Punkty kotwic — opcjonalne, dla przyszłego systemu connectorów
  anchors?: (shape: S) => AnchorPoint[]
}
```

Store jest podzielony według rodzaju stanu:

```
src/store/
├── history/
│   └── types.ts        # HistoryCommand (ADD_SHAPE, REMOVE_SHAPES, UPDATE_SHAPE, UPDATE_SHAPES, SET_SHAPES, REORDER_SHAPES)
├── slices/
│   ├── shapes.ts       # interface ShapesSlice (shapes[], stickyDefaults, CRUD + layer-aware z-ordering)
│   ├── selection.ts    # interface SelectionSlice (selectedShapeIds)
│   ├── viewport.ts     # interface ViewportSlice (canvasScale, canvasPosition)
│   ├── tool.ts         # interface ToolSlice (activeTool: 'select' | 'hand')
│   ├── history.ts      # interface HistorySlice (_past[], _future[], canUndo, canRedo, undo, redo, clearHistory)
│   └── layers.ts       # [ZMIANA] interface LayersSlice (layers[], activeLayerId + CRUD)
├── use-canvas-store.ts # łączy wszystkie slices w jeden store (Zustand + Immer)
└── types.ts            # ShapeUpdate (intersection-based), CanvasState; re-eksportuje typy z @/shapes
```

**[ZMIANA]** Format dokumentu (`CanvasDocument`) jest własnym formatem z warstwami, metadanymi i schema versioning — nie jest oparty na `node.toJSON()` Konva:

```typescript
interface CanvasDocument {
  meta: { schemaVersion; id; name; createdAt; updatedAt }
  canvas: { width; height }
  layers: DocumentLayer[] // każda warstwa ma id, name, visible, locked, opacity, shapes[]
  stickyDefaults: Record<ShapeType, Partial<ShapeProperties>>
}
```

---

Layout aplikacji:

```
┌──────────┬───────────────────────────────┬────────────┐
│          │                               │            │
│ Toolbar  │       CANVAS (Konva Stage)    │ Properties │
│ (lewy,   │   responsywny, ResizeObserver │  Sidebar   │
│ pionowy) │                               │  ────────  │
│          │                               │  Layers    │
│          │                               │  Sidebar   │
└──────────┴───────────────────────────────┴────────────┘
         [JSON Viewer] [JSON Import Textarea]
```

**[ZMIANA]** Prawy sidebar ma dwie sekcje: górna (scrollowalna) to Properties Sidebar (kontekstowy — widoczny gdy zaznaczony dokładnie jeden kształt), dolna to Layers Sidebar (zawsze widoczny). Na dole ekranu dostępny jest panel JSON Viewer oraz pole textarea do importu JSON przez wklejenie.

Toolbar pionowy po lewej zawiera sekcje oddzielone separatorami: narzędzia (kursor, dłoń), kształty (prostokąt, koło, trójkąt, linia) oraz akcje z-order (przesuń wyżej, przesuń na wierzch, przesuń niżej, przesuń na spód).

---

## 2. Problem użytkownika

Docelowi użytkownicy aplikacji to:

1. Autor projektu (frontend developer) — nauka Konva.js i react-konva jako nowej technologii canvas w środowisku React/Next.js; potrzeba praktycznego projektu demonstrującego zaawansowane wzorce architektoniczne (serializowalny stan, custom hooks, middleware).

2. Rekruterzy i osoby oceniające portfolio — potrzeba szybkiego zweryfikowania umiejętności kandydata w zakresie interaktywnych aplikacji graficznych, architektury stanu oraz jakości UX.

Problemy rozwiązywane przez aplikację:

- Brak prostego, lekkiego narzędzia do tworzenia i eksportowania prostych kompozycji geometrycznych działającego wyłącznie w przeglądarce, bez rejestracji ani backendu.
- Potrzeba demonstracyjnego projektu portfolio, który jest funkcjonalny, estetyczny i dokumentuje nietrywialną architekturę techniczną.
- Konieczność nauki i praktycznego opanowania Konva.js przez zbudowanie realnej, użytkowej aplikacji — zamiast izolowanych przykładów z dokumentacji.

---

## 3. Wymagania funkcjonalne

### 3.1 MVP Core (desktop only)

#### Tworzenie kształtów

- REQ-001: Użytkownik może wybrać narzędzie z paska: prostokąt, koło, trójkąt, linia.
- REQ-002: Po kliknięciu narzędzia kształt pojawia się w centrum aktualnie widocznego canvasa z domyślnymi właściwościami dla danego typu.
- REQ-003: Kształt jest natychmiast dostępny do manipulacji (drag, resize, rotate) bez dodatkowych kroków.
- REQ-004: Prostokąt tworzony jest jako `Rect` z domyślnymi właściwościami: fill `#4A90D9`, stroke `#2C5F8A`, strokeWidth `2`, opacity `1`.
- REQ-005: Koło/elipsa tworzony jest jako `Circle` z domyślnymi właściwościami: fill `#E8A838`, stroke `#B07820`, strokeWidth `2`, opacity `1`.
- REQ-006: Trójkąt tworzony jest jako kształt z wierzchołkami z domyślnymi właściwościami: fill `#5CB85C`, stroke `#3A7A3A`, strokeWidth `2`, opacity `1`.
- REQ-007: **[ZMIANA]** Linia tworzona jest jako segment z domyślnymi właściwościami: stroke `#333333`, strokeWidth `2`, opacity `1`, styl solid. Narzędzie linii obsługuje tryb **polilinii** — gdy zaznaczone są linie, kliknięcie na pustym obszarze canvasa wydłuża łańcuch o nowy segment. Kliknięcie blisko punktu startowego pierwszej linii (threshold: 30px / scale) domyka polilinię.
- REQ-008: Właściwości domyślne są "sticky" per typ kształtu — nowy kształt tego samego typu dziedziczy ostatnio używane właściwości tego typu.

#### Manipulacja kształtami

- REQ-009: Każdy kształt obsługuje przeciąganie (`draggable`). Przeciąganie zablokowane na warstwach z `locked = true`.
- REQ-010: **[ZMIANA]** Każdy kształt obsługuje resize, skalowanie proporcjonalne i rotate przez własny system uchwytów (nie Konva Transformer). Logika geometryczna uchwytów (pozycje, matematyka drag) jest zdefiniowana per kształt w `ShapeDefinition` (`getHandles`, `captureStart`, `applyHandleDrag`), a `ShapeHandles.tsx` jest generycznym komponentem delegującym do definicji. System uchwytów składa się z:
  - **4 uchwytów bocznych** — jeden na środku każdego boku bounding boxa; przeciąganie przesuwa tę krawędź
  - **1 uchwytu skalowania proporcjonalnego** — prawy górny róg; zachowuje aspect ratio
  - **1 uchwytu rotacji** — lewy górny róg; obraca kształt wokół centrum
- REQ-010a: Uchwyty widoczne wyłącznie gdy kształt zaznaczony ORAZ kursor nad kształtem (hover + selection). `showFullHandles` prop kontroluje widoczność.
- REQ-010b: Gdy kursor opuści obszar kształtu, uchwyty znikają.
- REQ-010c: Hover bez zaznaczenia nie powoduje pojawienia się uchwytów.
- REQ-010d: **[ZMIANA]** Uchwyty wyświetlane wyłącznie dla pojedynczego zaznaczenia (`isOnlySelected`). Multi-select obsługiwany przez `MultiShapeHandles` / `MultiLineHandles`.
- REQ-011: Zaznaczony kształt można usunąć klawiszem `Delete` lub `Backspace`.
- REQ-012: **[PENDING]** Zaznaczony kształt można zduplikować skrótem `Ctrl+D` — nie zaimplementowane.
- REQ-013: Naciśnięcie `Escape` usuwa zaznaczenie.

#### Nawigacja po scenie

- REQ-014: Dostępne są dwa tryby kursora: strzałka (zaznaczanie/manipulacja) i dłoń (pan sceny).
- REQ-015: Zoom sceny działa przez `Ctrl/Cmd + scroll`; scena skaluje się względem pozycji kursora.
- REQ-016: Pan sceny działa w trybie dłoni przez przeciąganie lewym przyciskiem myszy. **[ZMIANA]** Pan przez scroll bez Ctrl (deltaX/deltaY) działa zawsze. `Space + drag` nie jest oddzielnie zaimplementowany.
- REQ-017: Scena jest responsywna — dynamicznie dopasowuje wymiary do dostępnej przestrzeni za pomocą `ResizeObserver` i `window resize` event.
- REQ-067: **[ZMIANA — NOWE]** Canvas wyświetla siatkę skalującą się z poziomem zoomu (GridBackground).

#### Zaznaczanie kształtów

- REQ-018: Kliknięcie kształtu zaznacza go (zaznaczenie pojedyncze).
- REQ-019: Kliknięcie pustego obszaru canvasa w trybie strzałki odznacza wszystkie kształty. Jeśli aktywne są zaznaczone linie, kliknięcie może rozszerzać polilinię (patrz REQ-007).
- REQ-020: Przeciąganie na pustym obszarze canvasa w trybie strzałki tworzy marquee selection. **[ZMIANA]** Marquee zaznacza kształty tylko z aktywnej warstwy (jeśli jest widoczna i odblokowana).
- REQ-021: `Ctrl/Cmd + klik` dodaje lub usuwa kształt z zaznaczenia (multi-select). `Shift + klik` zachowuje tę samą semantykę (Konva domyślnie).
- REQ-022: Przy multi-select system uchwytów wyświetla wspólny bounding box (`MultiShapeHandles` dla kształtów powierzchniowych, `MultiLineHandles` dla linii).
- REQ-023: Uchwyt skalowania proporcjonalnego w multi-select skaluje wszystkie zaznaczone kształty proporcjonalnie, zachowując wzajemne pozycje.

#### Panel właściwości (sidebar)

- REQ-024: Sidebar po prawej stronie ma dwie strefy: górna (Properties) i dolna (Layers) — obie widoczne.
- REQ-025: **[ZMIANA]** Properties Sidebar wyświetlany tylko gdy zaznaczony jest **dokładnie jeden kształt**. Gdy 0 lub ≥2 kształtów zaznaczonych — Properties Sidebar ukryty (null).
- REQ-026: **[ZMIANA]** Gdy kształt zaznaczony, sidebar wyświetla: typ kształtu, właściwości specyficzne dla kształtu (PropertiesPanel), opacity (slider), fill (color picker, jeśli kształt ma fill), stroke (color picker). Pola X/Y i strokeWidth nie są aktualnie wyświetlane w sidebar.
- REQ-027: Color picker dla fill i stroke zaimplementowany z użyciem `@uiw/react-color` (komponent `Sketch`).
- REQ-028: **[PENDING]** Pole kąta rotacji w sidebar — nie zaimplementowane.
- REQ-068: **[ZMIANA — NOWE]** Właściwości specyficzne per kształt:
  - `rect`: Width (min 10), Height (min 10), Corner radius (min 0)
  - `circle`: Radius (min 5)
  - `ellipse`: Radius X (min 5), Radius Y (min 5)
  - `triangle`: Base (approx, read-only), Height (approx, read-only) + wskazówka "Drag side handles to reshape"
  - `line`: Segments (read-only), Dashed (toggle switch)

#### Trwałość danych

- REQ-029: **[PENDING]** Autosave do localStorage — nie zaimplementowane.
- REQ-030: **[PENDING]** Autoload przy starcie — nie zaimplementowane.
- REQ-031: **[PENDING]** Przycisk "New Scene" z modalem potwierdzenia — nie zaimplementowane.
- REQ-032: **[PENDING]** Toast o błędzie zapisu localStorage — nie zaimplementowane.

#### System warstw

- REQ-069: **[ZMIANA — NOWE]** Każdy kształt należy do konkretnej warstwy (`layerId`). Nowe kształty są dodawane do aktywnej warstwy (`activeLayerId`).
- REQ-070: **[ZMIANA — NOWE]** Layers Sidebar (dolna część prawego sidebar) wyświetla listę warstw od frontowej (góra) do tylnej (dół) z możliwością:
  - Przełączania widoczności warstwy (Eye/EyeOff)
  - Blokowania/odblokowania warstwy (Lock/Unlock)
  - Zmiany nazwy warstwy przez podwójne kliknięcie (inline input)
  - Usuwania warstwy (minimalna 1 warstwa) — usuwa też kształty należące do warstwy
  - Zmiany kolejności warstw (ChevronUp / ChevronDown)
  - Regulacji opacity aktywnej warstwy (slider)
- REQ-071: **[ZMIANA — NOWE]** Nową warstwę można dodać przyciskiem `+`. Aktywna warstwa jest wyróżniona tłem.
- REQ-072: **[ZMIANA — NOWE]** Kształty na ukrytych warstwach (`visible = false`) nie są renderowane na canvasie. Kształty na zablokowanych warstwach (`locked = true`) nie są interaktywne (brak draggable, brak listening) i nie są zaznaczane przez marquee.

#### Punkty kotwic (anchor points)

- REQ-073: **[ZMIANA — NOWE]** Każdy kształt może zdefiniować opcjonalne punkty kotwic (`anchors` w `ShapeDefinition`). Punkty kotwic są wyświetlane jako małe markery gdy kursor jest nad kształtem w trybie select i kształt nie jest zaznaczony — jako podgląd przyszłego systemu connectorów. Kotwice renderowane przez `AnchorPoints.tsx`.

#### Panels deweloperskie

- REQ-074: **[ZMIANA — NOWE]** JSON Viewer panel (PictureDataDisplay) wyświetlany w dolnym prawym rogu ekranu. Zawiera przycisk show/hide — po rozwinięciu pokazuje aktualne warstwy jako JSON (zakodowany przez `encodeDocument`). Panel ten jest narzędziem deweloperskim.
- REQ-075: **[ZMIANA — NOWE]** JSON Import textarea (JsonImportInput) wyświetlana w dolnym lewym rogu ekranu. Użytkownik wkleja JSON (format CanvasDocument, `layers[]` lub bare shapes array) i zatwierdza Enter. Błędny JSON podświetla pole na czerwono i czyści je po 700ms.

#### Zarządzanie stanem

- REQ-033: **[ZMIANA]** Stan aplikacji zarządzany przez Zustand + Immer (bez zundo). Pięć slice'ów: shapes, selection, viewport, tool, history + layers.

#### Skróty klawiaturowe (Core)

- REQ-034: `Delete` / `Backspace` — usuwa zaznaczone kształty (`removeShapes(selectedShapeIds)`).
- REQ-035: `Escape` — odznacza zaznaczenie.
- REQ-036: **[PENDING]** `Ctrl+D` — duplikuj kształt — nie zaimplementowane.
- REQ-076: **[ZMIANA — NOWE]** `Ctrl+Z` — undo (zaimplementowane w MVP Core).
- REQ-077: **[ZMIANA — NOWE]** `Ctrl+Y` / `Ctrl+Shift+Z` — redo (zaimplementowane w MVP Core).

---

### 3.2 MVP Extended

#### Rozszerzone właściwości w sidebarze

- REQ-037: **[ZAIMPLEMENTOWANE]** Sidebar dla prostokąta udostępnia pole `cornerRadius` (min 0).
- REQ-038: **[PENDING]** Sidebar wyświetla aktualny kąt obrotu zaznaczonego kształtu w stopniach.
- REQ-039: **[ZAIMPLEMENTOWANE]** Sidebar dla linii udostępnia toggle styl dashed (solid / dashed) przez switch button.

#### Organizacja kształtów

- REQ-040: **[PENDING]** Grupowanie zaznaczonych kształtów (`Ctrl+G`) — nie zaimplementowane.
- REQ-041: **[PENDING]** Rozgrupowywanie (`Ctrl+Shift+G`) — nie zaimplementowane.
- REQ-042: **[ZMIANA — CZĘŚCIOWO ZAIMPLEMENTOWANE]** Zarządzanie kolejnością rysowania kształtów (z-order) przez **4 przyciski w toolbarze**:
  - Bring Forward (ArrowUp) — `bringForward(selectedShapeIds)`
  - Bring to Front (BringToFront) — `bringToFront(selectedShapeIds)`
  - Send Backward (ArrowDown) — `sendBackward(selectedShapeIds)`
  - Send to Back (SendToBack) — `sendToBack(selectedShapeIds)`

  Wszystkie cztery operacje tworzą wpis `REORDER_SHAPES` w historii undo/redo. Skróty klawiaturowe `]`/`[` nie są jeszcze podpięte.

#### Eksport i import JSON

- REQ-043: **[ZMIANA]** Akcja "Export JSON" serializuje całą scenę do **własnego formatu `CanvasDocument`** (nie `node.toJSON()` Konva) i pobiera plik `.json` na dysk. **[PENDING]** Przycisk exportu w toolbarze / UI — nie zaimplementowany; aktualnie dostępne przez JSON Viewer panel (dev tool).
- REQ-044: **[ZMIANA]** Import JSON przez **wklejenie tekstu** do pola textarea w lewym dolnym rogu ekranu i naciśnięcie Enter. Format: pełny CanvasDocument, obiekt z `layers[]`, lub naga tablica kształtów. Dialog wyboru pliku nie jest zaimplementowany.
- REQ-045: Przy próbie wczytania uszkodzonego JSON pole textarea podświetla się na czerwono i czyści się po 700ms; scena pozostaje niezmieniona.

#### Eksport PNG

- REQ-046: **[PENDING]** Eksport PNG z modalem konfiguracji — nie zaimplementowany.
- REQ-047: **[PENDING]** Krok 1: padding.
- REQ-048: **[PENDING]** Krok 2: wysokość i szerokość.
- REQ-049: **[PENDING]** Białe tło `#ffffff`.
- REQ-050: **[PENDING]** Pobranie pliku PNG.

#### Historia zmian (Undo/Redo)

- REQ-051: **[ZAIMPLEMENTOWANE]** Wszystkie mutacje kształtów (`addShape`, `removeShapes`, `updateShape`, `updateShapes`, `setShapes`, `bringForward`, `bringToFront`, `sendBackward`, `sendToBack`) są objęte historią. Zmiany viewport, selection, tool i layers **nie są** objęte historią.
- REQ-052: **[ZAIMPLEMENTOWANE]** `Ctrl+Z` cofa; `Ctrl+Y` lub `Ctrl+Shift+Z` ponawia. Wdrożone w MVP Core (patrz REQ-076, REQ-077).
- REQ-053: **[ZMIANA]** Historia zarządzana przez **własny Command Pattern history slice** (`src/store/slices/history.ts`), nie przez `zundo`. Komendy: `ADD_SHAPE`, `REMOVE_SHAPES`, `UPDATE_SHAPE`, `UPDATE_SHAPES`, `SET_SHAPES`, `REORDER_SHAPES` — JSON-serializowalne, gotowe na przyszły backend.
- REQ-054: **[ZAIMPLEMENTOWANE]** Limit 50 kroków; starsze kroki są usuwane (FIFO). Granularność: drag = 1 krok (`moveShapes`), commit z input = 1 krok (`commitShapeUpdate` / `commitShapesUpdate`), operacje wsadowe = 1 krok.

#### Obsługa touch/mobile

- REQ-055: **[PENDING]** Gesty dotykowe na urządzeniach mobilnych — nie zaimplementowane. Eventy pointer (onPointerDown/Move/Up) używane w marquee, ale pinch-to-zoom i touch-drag dla kształtów nie są obsługiwane.

#### Skróty klawiaturowe (Extended)

- REQ-056: **[ZAIMPLEMENTOWANE]** `Ctrl+Z` — cofnij.
- REQ-057: **[ZAIMPLEMENTOWANE]** `Ctrl+Y` — ponów.
- REQ-058: **[PENDING]** `Ctrl+G` — grupuj.
- REQ-059: **[PENDING]** `Ctrl+Shift+G` — rozgrupuj.
- REQ-060: **[PENDING]** `]` — przenieś kształt wyżej (toolbar działa, skrót klawiaturowy nie podpięty).
- REQ-061: **[PENDING]** `[` — przenieś kształt niżej (toolbar działa, skrót klawiaturowy nie podpięty).

---

### 3.3 Branding i jakość

- REQ-062: Nazwa aplikacji to "GeoCanvas"; UI jest wyłącznie w języku angielskim.
- REQ-063: Aplikacja posiada favicon w formacie SVG z motywem geometrycznym.
- REQ-064: Aplikacja posiada poprawne meta tagi (title, description) w HTML.
- REQ-065: Brak błędów w konsoli przeglądarki w środowisku produkcyjnym (Vercel).
- REQ-066: README projektu dokumentuje decyzje architektoniczne.

---

## 4. Granice produktu

### W zakresie — zaimplementowane

- Tworzenie kształtów: prostokąt, koło, trójkąt, linia.
- Typ `ellipse` zaimplementowany w kodzie (shapes/ellipse/), ale niedostępny z toolbaru.
- Manipulacja: drag, resize przez uchwyty boczne, rotate przez uchwyt rotacji, skalowanie proporcjonalne — własny system uchwytów per ShapeDefinition.
- Multi-select: marquee (active layer only) + Ctrl+klik; MultiShapeHandles i MultiLineHandles.
- Polilinia: klikanie wydłuża łańcuch linii, kliknięcie blisko punktu startowego zamyka polilinię.
- Nawigacja: zoom (Ctrl+scroll), pan (hand tool drag, scroll bez Ctrl), responsywność (ResizeObserver).
- Properties Sidebar: typ, shape-specific properties (Width/Height/CornerRadius/Radius/RadiusX/RadiusY/Dashed/Segments), opacity, fill, stroke — dla pojedynczego zaznaczenia.
- Historia (undo/redo): Command Pattern, 50 kroków, Ctrl+Z/Ctrl+Y, granularity drag+blur/Enter.
- Z-ordering: 4 operacje przez toolbar buttons, z historią.
- System warstw: LayersSlice + LayersSidebar — add/remove/rename/visibility/lock/opacity/reorder.
- Anchor points: podgląd na hover (przygotowanie systemu connectorów).
- Grid background.
- JSON Viewer (dev tool) i JSON Import przez textarea.
- Format dokumentu: CanvasDocument z layerami, meta, schema version.

### W zakresie — oczekuje implementacji (PENDING)

- Autosave/autoload localStorage.
- New Scene modal z potwierdzeniem.
- Ctrl+D — duplikowanie kształtu.
- Export JSON jako plik (przycisk w UI + download).
- Import JSON przez dialog wyboru pliku.
- Export PNG z modalem konfiguracji.
- Kąt rotacji w Properties Sidebar.
- Skróty klawiaturowe `]`/`[` dla z-ordering.
- Toast/snackbar notyfikacje (błędy, sukcesy).

### Poza zakresem projektu (Planned Extensions)

- Grupowanie i rozgrupowywanie kształtów (`Ctrl+G` / `Ctrl+Shift+G`).
- Eksport do formatu JPG.
- Symulowany obrót 2.5D (efekt perspektywiczny przez scaleY).
- Połączenia między kształtami (connectory) — architektura (anchors, connections) przygotowana.
- Mind map / diagram mode z węzłami i relacjami.
- Tooltip inline z pozycją X/Y podczas przeciągania.
- Edycja wierzchołków trójkąta przez dedykowany tryb.
- Strzałki i polyline jako rozszerzenie narzędzia linia (polilinia jest, strzałki nie).
- Backend, konta użytkowników, synchronizacja w chmurze — architektura historii gotowa na Supabase.
- Współpraca wieloosobowa (real-time) — komendy OT-ready.
- Uwierzytelnianie.
- Obsługa dotyku / tablet (Pointer Events API — częściowo użyte w marquee, ale pinch-to-zoom i mobile gestures nie).

---

## 5. Historyjki użytkowników

### Tworzenie kształtów

---

US-001
Tytuł: Tworzenie prostokąta

Opis: Jako użytkownik chcę kliknąć narzędzie "Prostokąt" w toolbarze, aby natychmiast pojawił się nowy prostokąt na canvasie gotowy do edycji.

Kryteria akceptacji:

- Po kliknięciu ikony prostokąta na canvasie pojawia się nowy prostokąt w centrum aktualnie widocznego obszaru canvasa.
- Prostokąt ma domyślne właściwości: fill `#4A90D9`, stroke `#2C5F8A`, strokeWidth `2`, opacity `1`.
- Prostokąt jest natychmiast zaznaczony; uchwyty są widoczne gdy kursor znajduje się nad kształtem.
- Prostokąt można natychmiast przeciągać, resizować i obracać.
- Właściwości prostokąta są widoczne w Properties Sidebar po prawej stronie.

---

US-002
Tytuł: Tworzenie koła

Opis: Jako użytkownik chcę kliknąć narzędzie "Koło" w toolbarze, aby pojawił się nowy kształt na canvasie.

Kryteria akceptacji:

- Po kliknięciu ikony koła nowy kształt pojawia się w centrum widocznego canvasa.
- Kształt ma domyślne właściwości: fill `#E8A838`, stroke `#B07820`, strokeWidth `2`, opacity `1`.
- Kształt jest natychmiast zaznaczony; uchwyty są widoczne gdy kursor znajduje się nad kształtem.
- Właściwości kształtu są widoczne w sidebarze (Radius).

---

US-003
Tytuł: Tworzenie trójkąta

Opis: Jako użytkownik chcę kliknąć narzędzie "Trójkąt" w toolbarze, aby pojawił się nowy trójkąt na canvasie.

Kryteria akceptacji:

- Po kliknięciu ikony trójkąta nowy kształt pojawia się w centrum widocznego canvasa.
- Trójkąt ma domyślne właściwości: fill `#5CB85C`, stroke `#3A7A3A`, strokeWidth `2`, opacity `1`.
- Kształt jest natychmiast zaznaczony; uchwyty są widoczne.
- Sidebar wyświetla Base i Height (read-only) oraz wskazówkę o uchwytach bocznych.

---

US-004 [ZMIANA]
Tytuł: Tworzenie linii i polilinii

Opis: Jako użytkownik chcę kliknąć narzędzie "Linia" aby narysować linię, a następnie klikając dalej na canvasie wydłużyć ją o kolejne segmenty (polilinia).

Kryteria akceptacji:

- Po kliknięciu narzędzia linia nowy segment pojawia się w centrum widocznego canvasa.
- Linia ma domyślne właściwości: stroke `#333333`, strokeWidth `2`, opacity `1`, styl solid.
- Gdy zaznaczona jest jedna lub więcej linii tworzących łańcuch, kliknięcie na pustym obszarze canvasa dodaje nowy segment od końca ostatniej linii do klikniętego punktu.
- Kliknięcie blisko punktu startowego pierwszej linii (threshold 30px / skala) domyka polilinię łącząc koniec łańcucha ze startem.
- Sidebar linii wyświetla: Segments (liczba segmentów), toggle Dashed.

---

US-005
Tytuł: Sticky properties per typ kształtu

Opis: Jako użytkownik chcę, aby nowy kształt danego typu dziedziczył właściwości ostatnio edytowanego kształtu tego samego typu.

Kryteria akceptacji:

- Jeśli użytkownik zmienił kolor prostokąta, kolejny nowy prostokąt pojawia się z tym kolorem.
- Sticky properties są niezależne per typ kształtu.
- Przy pierwszym uruchomieniu używane są twarde wartości domyślne.

---

### Manipulacja kształtami

---

US-006
Tytuł: Przeciąganie kształtu

Opis: Jako użytkownik chcę móc przeciągać kształt po canvasie, zmieniając jego pozycję.

Kryteria akceptacji:

- Kliknięcie i przeciągnięcie zaznaczonego kształtu zmienia jego pozycję.
- Przeciąganie kilku zaznaczonych kształtów przesuwa je jednocześnie z zachowaniem wzajemnych odległości.
- Każde zakończenie drag (onDragEnd) tworzy jeden wpis `UPDATE_SHAPES` w historii.
- Kształty na zablokowanych warstwach nie reagują na drag.

---

US-006b
Tytuł: Widoczność uchwytów

Opis: Jako użytkownik chcę widzieć uchwyty tylko gdy jestem kursorem nad zaznaczonym kształtem.

Kryteria akceptacji:

- Uchwyty widoczne wyłącznie gdy kształt zaznaczony ORAZ kursor nad kształtem (lub drag uchwytu aktywny).
- Gdy kursor opuszcza obszar kształtu, uchwyty znikają.
- Hover na niezaznaczonym kształcie nie pokazuje uchwytów.
- Uchwyty wyświetlane tylko dla pojedynczego zaznaczenia (multi-select ma własny komponent).

---

US-007
Tytuł: Resize kształtu przez uchwyty boczne

Opis: Jako użytkownik chcę zmieniać rozmiar kształtu za pomocą 4 uchwytów bocznych.

Kryteria akceptacji:

- 4 uchwyty na środkach boków bounding boxa.
- Przeciąganie uchwytu zmienia kształt zgodnie z logiką per-shape (applyHandleDrag w ShapeDefinition).
- Zmiana rozmiaru przez uchwyt podczas drag jest transient (updateShapeTransient); commit po mouseup (commitShapeUpdate) — jeden wpis w historii.
- Uchwyty działają spójnie dla wszystkich typów kształtów.

---

US-008
Tytuł: Rotacja kształtu przez uchwyt rotacji

Opis: Jako użytkownik chcę obracać kształt za pomocą uchwytu rotacji w lewym górnym rogu.

Kryteria akceptacji:

- Uchwyt rotacji w lewym górnym rogu bounding boxa.
- Przeciąganie obraca kształt wokół centrum; kąt obliczany przez atan2 od pozycji startowej.
- Rotacja jest transient podczas drag, commit po mouseup — jeden wpis w historii.

---

US-007b
Tytuł: Skalowanie proporcjonalne przez uchwyt w prawym górnym rogu

Opis: Jako użytkownik chcę skalować kształt proporcjonalnie przez uchwyt w prawym górnym rogu.

Kryteria akceptacji:

- Uchwyt skalowania proporcjonalnego w prawym górnym rogu.
- Skalowanie zachowuje aspect ratio.
- Działa dla kształtów pojedynczych i multi-select.

---

US-009
Tytuł: Usuwanie kształtu

Opis: Jako użytkownik chcę usunąć zaznaczony kształt klawiszem Delete lub Backspace.

Kryteria akceptacji:

- `Delete` lub `Backspace` usuwa wszystkie zaznaczone kształty jedną komendą REMOVE_SHAPES.
- Po usunięciu Properties Sidebar jest ukryty.
- Operacja jest cofalna przez Ctrl+Z.
- Jeśli nic nie zaznaczone, klawisz nie wywołuje efektu.

---

US-009b [NOWE]
Tytuł: Zarządzanie kolejnością rysowania kształtów

Opis: Jako użytkownik chcę zmieniać kolejność rysowania kształtów przez przyciski w toolbarze.

Kryteria akceptacji:

- Cztery przyciski w toolbarze: Bring Forward, Bring to Front, Send Backward, Send to Back.
- Przyciski są wyłączone (disabled) gdy brak zaznaczenia.
- Każda operacja tworzy wpis REORDER_SHAPES w historii (cofalny).

---

### Nawigacja po scenie

---

US-012
Tytuł: Zoom sceny przez Ctrl+Scroll

Opis: Jako użytkownik chcę powiększać i pomniejszać scenę.

Kryteria akceptacji:

- `Ctrl/Cmd + scroll` zmienia skalę względem pozycji kursora.
- Minimalna skala to max(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT).
- Maksymalna skala to 2.0.
- Zoom płynny bez skokowego przeskakiwania.

---

US-013
Tytuł: Pan sceny narzędziem Dłoń

Opis: Jako użytkownik chcę przełączyć się na narzędzie Dłoń i przeciągać scenę.

Kryteria akceptacji:

- Kliknięcie ikony dłoni przełącza na tryb pan.
- Przeciąganie przesuwa scenę w ramach clampPosition (canvas nie wychodzi poza widoczny obszar).
- Kształty nie są zaznaczane podczas panu.

---

US-015
Tytuł: Responsywność canvasa

Kryteria akceptacji:

- Resize okna przeglądarki automatycznie dopasowuje skalę i pozycję canvasa.
- Kształty pozostają na swoich miejscach.

---

### Zaznaczanie kształtów

---

US-017
Tytuł: Multi-select przez marquee selection [ZMIANA]

Kryteria akceptacji:

- Przeciąganie na pustym obszarze w trybie select tworzy marquee.
- Zaznaczane są tylko kształty z aktywnej warstwy (jeśli widoczna i odblokowana).
- Kształty przecięte lub zawarte w marquee są zaznaczane.

---

### Panel warstw [NOWE]

---

US-050 [NOWE]
Tytuł: Zarządzanie warstwami

Opis: Jako użytkownik chcę organizować kształty w warstwach, kontrolować ich widoczność i blokadę.

Kryteria akceptacji:

- Layers Sidebar widoczny zawsze w dolnej części prawego sidebar.
- Warstwy wyświetlane od frontowej (góra) do tylnej (dół).
- Każda warstwa ma przyciski: Eye (visibility), Lock, ChevronUp, ChevronDown, Trash (jeśli >1 warstwy).
- Podwójne kliknięcie nazwy warstwy otwiera inline input do zmiany nazwy.
- Przycisk + dodaje nową warstwę.
- Slider opacity reguluje przezroczystość aktywnej warstwy.
- Aktywna warstwa wyróżniona kolorem.
- Usunięcie warstwy usuwa też wszystkie jej kształty.
- Nie można usunąć ostatniej warstwy.

---

### Panel właściwości

---

US-021 [ZMIANA]
Tytuł: Edycja właściwości kształtu przez sidebar

Kryteria akceptacji:

- Sidebar wyświetlany gdy zaznaczony dokładnie 1 kształt.
- Wyświetla: typ, shape-specific PropertiesPanel, opacity slider, fill color picker (jeśli ma fill), stroke color picker.
- Zmiany przez color picker: transient podczas drag (onChange), commit po zakończeniu (onPointerUp/onAfterChange) — jeden wpis w historii.
- Zmiany numeryczne (NumericField): commit on blur lub Enter — jeden wpis w historii.

---

### Trwałość danych [PENDING]

---

US-030 [PENDING]
Tytuł: Autosave do localStorage

Kryteria akceptacji: Do zaimplementowania. Stan sceny (shapes + layers) zapisywany do localStorage po każdej zmianie kształtów.

---

### Historia zmian

---

US-036
Tytuł: Cofanie ostatniej zmiany (Undo) [ZAIMPLEMENTOWANE]

Kryteria akceptacji:

- `Ctrl+Z` cofa ostatnią komendę z historii.
- Dostępne dla: ADD_SHAPE, REMOVE_SHAPES, UPDATE_SHAPE, UPDATE_SHAPES, SET_SHAPES, REORDER_SHAPES.
- Historia do 50 kroków; przy przekroczeniu najstarsza komenda usuwana (FIFO).
- Gdy historia pusta, Ctrl+Z nie wywołuje efektu (`canUndo = false`).

---

US-037
Tytuł: Ponawianie cofniętej zmiany (Redo) [ZAIMPLEMENTOWANE]

Kryteria akceptacji:

- `Ctrl+Y` lub `Ctrl+Shift+Z` przywraca cofniętą komendę.
- Nowa akcja mutująca kształty czyści stos redo (`_future = []`).
- Gdy stos redo pusty, skrót nie wywołuje efektu (`canRedo = false`).

---

### Jakość i wydajność

---

US-044
Tytuł: Płynność działania przy 200 kształtach

Kryteria akceptacji:

- Scena z 200 kształtami renderuje się w 60 fps na przeciętnym laptopie.
- Drag, resize i rotate przy 200 kształtach bez zauważalnych lagów.
- Zoom i pan płynne.

---

US-045
Tytuł: Brak błędów w konsoli przeglądarki w środowisku produkcyjnym

Kryteria akceptacji:

- Aplikacja uruchomiona na Vercel nie generuje błędów ani ostrzeżeń w konsoli.
- Brak nieobsłużonych wyjątków JavaScript.

---

## 6. Metryki sukcesu

### Metryki wydajnościowe

| Metryka                        | Docelowa wartość                  |
| ------------------------------ | --------------------------------- |
| Framerate przy 200 kształtach  | >= 60 fps na przeciętnym laptopie |
| Czas ładowania aplikacji (LCP) | < 3 sekundy                       |
| Błędy w konsoli produkcyjnej   | 0                                 |

### Metryki jakości kodu i architektury

| Metryka                | Docelowa wartość                                        |
| ---------------------- | ------------------------------------------------------- |
| Zarządzanie stanem     | Zustand + Immer (custom history slice, bez zundo)       |
| Handle system          | Per-shape w ShapeDefinition (open/closed principle)     |
| Warstwy                | LayersSlice + LayersSidebar + layer-aware rendering     |
| Serializowalność stanu | Pełen eksport/import sceny do/z CanvasDocument JSON     |
| Historia zmian         | Command Pattern, 50 kroków, JSON-serializowalne komendy |

### Metryki portfolio

| Metryka             | Docelowa wartość                                                   |
| ------------------- | ------------------------------------------------------------------ |
| Dostępność live     | Aplikacja działa bez błędów na Vercel                              |
| Dokumentacja        | README zawiera opis decyzji architektonicznych                     |
| Zakres funkcjonalny | MVP Core ukończone jako milestone 1; MVP Extended jako milestone 2 |

### Definicja "gotowe" per milestone

MVP Core — aplikacja pozwala na tworzenie i edycję 4 typów kształtów (prostokąt, koło, trójkąt, linia/polilinia), nawigację po scenie, edycję właściwości w Properties Sidebar, zarządzanie warstwami przez LayersSidebar, undo/redo przez Command Pattern, z-ordering przez toolbar. Manipulacja przez własny system uchwytów per ShapeDefinition. Anchor points preview na hover. Grid background. JSON import przez textarea. Działa wyłącznie na desktopie. Brak błędów konsoli.

MVP Extended — aplikacja posiada: autosave/autoload localStorage, New Scene modal, Ctrl+D duplikowanie, Export JSON jako plik, Import JSON przez dialog pliku, Export PNG, kąt rotacji w sidebarze, skróty `]`/`[`. Opcjonalnie: grupowanie kształtów.
