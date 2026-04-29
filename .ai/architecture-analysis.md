# Analiza Architektury GeoCanvas

> Sporządzona: 2026-04-28  
> Kontekst: Aplikacja do rysowania prostych projektów graficznych z naciskiem na wygodną rozbudowę
> poszczególnych elementów. Docelowo wzorzec dla serii aplikacji branżowych (spawalnictwo, budownictwo itp.)

---

## 1. Podsumowanie wykonawcze

Ogólna struktura projektu jest dobra — widać świadome projektowanie: rejestr kształtów, slice'y Zustand,
system historii. To solidna podstawa. Jednak **trzy miejsca w kodzie tworzą wąskie gardła rozszerzalności**,
które przy każdym nowym typie kształtu wymagają modyfikacji plików centralnych zamiast izolowanego
dopisania nowego modułu. Dopóki ich nie rozwiążesz, dodawanie nowych kształtów będzie bolało coraz bardziej.

Poza tym brakuje czterech systemów, które są już zaplanowane (warstwy, właściwości numeryczne) lub
będą nieuniknione (kotwice dla connector shapes, migracja do backendu). Lepiej zaprojektować je teraz
niż refaktorować pod presją.

---

## 2. Co działa dobrze (mocne strony)

### 2.1 Rejestr kształtów — dobry kierunek

`SHAPE_REGISTRY` i `ShapeDefinition` to właściwy wzorzec. Każdy kształt dostarcza swój typ, ikonę,
fabrykę i renderer — i jest to w zasadzie samowystarczalny moduł. Dodanie nowego kształtu do rejestru
nie wymaga zmiany żadnego innego pliku... _z wyjątkiem trzech miejsc opisanych w sekcji 3_.

### 2.2 Segmentacja store — właściwa

Podział na `ShapesSlice`, `SelectionSlice`, `ViewportSlice`, `ToolSlice`, `HistorySlice` jest czysty.
Każdy slice odpowiada za jeden obszar, i jest to dokładnie to podejście które będzie się dobrze skalować
gdy dodasz slice dla warstw, backendu (sync status), czy trybu rysowania.

### 2.3 System historii — przemyślany

Wzorzec komend z `before`/`after` i oddzielenie `updateShapeTransient` od `commitShapeUpdate` to dobre
rozwiązanie. Drag handle nie zaśmieca historii, a commit po `mouseup` tworzy jeden wpis. To będzie
działać poprawnie dla każdego nowego kształtu, pod warunkiem że `captureGeometry` zostanie naprawiony
(patrz sekcja 3.3).

### 2.4 Format dokumentu — gotowy na przyszłość

`CanvasDocument` ma już warstwy (`layers[]`), schema version z migracjami, sticky defaults. Ktoś
przemyślał ten format — nie trzeba go przepisywać gdy pojawi się backend, wystarczy go "obsłużyć" po
stronie Supabase.

### 2.5 Konwencja układu współrzędnych

Wszystkie kształty używają centrum (`x`, `y`) jako punktu odniesienia, z lokalnymi współrzędnymi
względem tego centrum. To jedyna sensowna konwencja dla aplikacji z rotacją — trzymaj ją.

---

## 3. Krytyczne problemy rozszerzalności

Są to miejsca, gdzie **dodanie nowego kształtu łamie zasadę Open/Closed** — zamiast dopisać nowy moduł,
musisz modyfikować istniejący, centralny plik.

### 3.1 `ShapeHandles.tsx` — największe wąskie gardło

**Problem:** Cały plik `ShapeHandles.tsx` (~540 linii) zawiera logikę matematyczną dla wszystkich
typów kształtów w jednym miejscu: `applyRectDrag`, `applyCircleSideDrag`, `applyTriangleSideDrag` itd.
Każdy nowy kształt wymaga:

- dodania `XxxStart` type
- rozszerzenia `captureStartShape()` o nowy case
- dodania `getHandleGeometry()` o nowy case
- dodania funkcji `applyXxxDrag`
- rozszerzenia `onMove` o kolejnego `else if`

Przy 10 typach kształtów ten plik będzie miał 2000+ linii i będzie niemożliwy w utrzymaniu.

**Rozwiązanie — przenieść logikę uchwytów do `ShapeDefinition`:**

```typescript
// src/shapes/_base/definition.ts

export interface HandleDescriptor<HKind extends string> {
  kind: HKind
  getPosition: (shape: S) => Point // pozycja w local coords
  cursor?: string // CSS cursor
}

export interface ShapeDefinition<S extends BaseShape = BaseShape> {
  type: ShapeType
  label: string
  icon: ComponentType
  create: (pos: Point) => S
  Renderer: ComponentType<{ shape: S; isSelected: boolean }>
  PropertiesPanel: ComponentType<{ shape: S }>

  // NOWE — każdy kształt definiuje własne uchwyty i matematykę
  captureStart: (shape: S) => unknown // snapshot dla drag
  getHandles: (shape: S) => HandleDescriptor<string>[] // pozycje uchwytów
  applyHandleDrag: (
    // delta → ShapeUpdate
    start: unknown,
    kind: string,
    ldx: number,
    ldy: number,
    startLocalPtr: Point,
    sinθ: number,
    cosθ: number
  ) => ShapeUpdate

  // Poniżej opisane w sekcjach 3.2 i 3.3
  getBoundingBox: (shape: S) => BoundingBox
  captureGeometry: (shape: S) => ShapeUpdate
}
```

`ShapeHandles.tsx` staje się wtedy generycznym komponentem, który deleguje wszystko do definicji:

```typescript
// ShapeHandles.tsx — po refaktorze (~80 linii zamiast 540)
const def = SHAPE_REGISTRY[shape.type]
const handles = def.getHandles(shape)
// ...w onMove:
const updates = def.applyHandleDrag(dragState.start, kind, ldx, ldy, ...)
```

Każdy kształt (profil L, spoina, krzywa Beziera) niesie swoją matematykę we własnym katalogu
i `ShapeHandles.tsx` nie musi być nigdy modyfikowany.

### 3.2 `ShapeUpdate` jako płaski `Partial` — bomba zegarowa

**Problem:** `src/store/types.ts` definiuje `ShapeUpdate` jako jeden wielki płaski `Partial` wszystkich
możliwych właściwości wszystkich kształtów:

```typescript
export type ShapeUpdate = Partial<{
  type: ShapeType
  width: number; height: number; cornerRadius: number  // rect
  radius: number                                        // circle
  radiusX: number; radiusY: number                      // ellipse
  vertices: [...]                                       // triangle
  points: number[]; dash: boolean                       // line
  // ...i dalej będzie rosnąć
}>
```

Każdy nowy kształt z unikalnymi właściwościami (np. profil `flangeWidth`, `webHeight`,
spoina `type: 'butt' | 'fillet'`, `legSize`) musi dopisywać swoje pola do tego globalnego obiektu.
TypeScript przestaje wymagać spójności — możesz przypadkowo zapisać `radius` dla `rect`.

**Rozwiązanie — typowanie per kształt:**

```typescript
// Opcja A: generyczny (najsilniejsze typowanie)
type ShapeGeometry<S extends BaseShape> = Partial<
  Omit<S, 'id' | 'stroke' | 'strokeWidth' | 'opacity'>
>

// Opcja B: discriminated union (bardziej explicite)
type ShapeUpdate =
  | (Partial<Omit<RectShape, 'id'>> & { type: 'rect' })
  | (Partial<Omit<CircleShape, 'id'>> & { type: 'circle' })
  | (Partial<Omit<EllipseShape, 'id'>> & { type: 'ellipse' })
  // ...
  | Partial<BaseShape> // bazowe pola bez type
```

Opcja A jest czystsza i nie wymaga aktualizacji union przy każdym nowym kształcie.
Wymaga refaktoru wszystkich miejsc używających `ShapeUpdate`, ale warto to zrobić zanim baza kodu urośnie.

### 3.3 `captureGeometry.ts` i `shapeBounds.ts` — `switch/case` na centralizowane typy

**Problem:** Dwa pliki z funkcjami opartymi na `switch(shape.type)` / `if (shape.type === ...)`:

- `captureGeometry.ts:6` — wie jakie pola geometryczne ma każdy kształt
- `shapeBounds.ts:10` — wie jak obliczyć bounding box dla każdego kształtu

Każdy nowy kształt wymaga aktualizacji obu plików.

**Rozwiązanie:** Przenieść te funkcje do `ShapeDefinition` (jak pokazano w sekcji 3.1).
Wtedy `captureGeometry(shape)` staje się:

```typescript
export function captureGeometry(shape: Shape): ShapeUpdate {
  const def = SHAPE_REGISTRY[shape.type]
  return def.captureGeometry(shape)
}
```

A `getShapeBoundingBox(shape)`:

```typescript
export function getShapeBoundingBox(shape: Shape): BoundingBox {
  const def = SHAPE_REGISTRY[shape.type]
  return def.getBoundingBox(shape)
}
```

Pliki `captureGeometry.ts` i `shapeBounds.ts` stają się cienkimi fasadami — nigdy nie trzeba ich
modyfikować. Każdy kształt niesie swoją matematykę.

### 3.4 `ShapeType` jako zamknięty string union

**Problem:** `src/shapes/_base/types.ts:1`:

```typescript
export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'triangle' | 'line'
```

Dodanie nowego kształtu wymaga zawsze modyfikacji tego pliku. To mało uciążliwe (jeden plik),
ale warto przemyśleć podejście.

**Rozwiązanie:** Dwa warianty:

```typescript
// Wariant A — zostawić union, ale eksportować z shape/index.ts
// Koszty: edycja jednego pliku przy nowym kształcie — akceptowalne

// Wariant B — ShapeType jako string z walidacją runtime
export type ShapeType = string
export function isValidShapeType(t: string): t is ShapeType {
  return t in SHAPE_REGISTRY
}
```

Wariant B jest lepszy gdy aplikacja kiedyś pozwoli na dynamiczne ładowanie definicji kształtów
(shape packs). Dla bieżących potrzeb Wariant A jest wystarczający.

---

## 4. Brakujące systemy

### 4.1 System kotwic (Anchor Points) — kluczowy dla connector shapes

**Kontekst:** Planujesz connector shapes — np. spoina spawalnicza która łączy dwa profile i "przywiązuje
się" do ich krawędzi. To nie jest trywialne bez dedykowanego systemu.

**Wymagane pojęcia:**

```typescript
// Kotwica — punkt na kształcie, do którego można przypiąć connector
interface AnchorPoint {
  id: string // np. 'top-left', 'mid-right', 'vertex-0'
  getPosition: (shape: S) => Point // pozycja w world coords
  direction?: number // kąt normalnej (do ustawiania connectora tangencjalnie)
}

// Połączenie — connector wie do czego jest przywiązany
interface ShapeConnection {
  shapeId: string // ID kształtu będącego źródłem
  anchorId: string // ID konkretnej kotwicy na tym kształcie
}

// Connector shape — kształt który posiada połączenia
interface ConnectorShape extends BaseShape {
  connections: {
    start: ShapeConnection | null
    end: ShapeConnection | null
  }
}
```

**Jak to wpływa na architekturę:**

1. `ShapeDefinition` musi dostać opcjonalne `anchors: (shape: S) => AnchorPoint[]`
2. Store musi wiedzieć o połączeniach — gdy jeden kształt jest przesuwany, wszystkie
   podłączone connectory muszą się zaktualizować
3. Nowy slice `ConnectionsSlice` lub rozszerzenie `ShapesSlice` o `updateConnectedShapes()`
4. `ShapeNode` musi renderować punkty kotwic gdy jest aktywny tryb rysowania connectora

**Ważne:** Zaimplementuj to jako opcjonalne rozszerzenie — kształty bez kotwic działają jak teraz.
`ShapeDefinition.anchors` może być `undefined` i wtedy kształt po prostu nie ma punktów podłączenia.

### 4.2 System warstw — schemat istnieje, implementacja nie

**Stan obecny:** `CanvasDocument` ma `layers[]`, ale `CanvasState` w store ma tylko płaską tablicę `shapes`.
Decodec spłaszcza warstwy do jednej tablicy przy załadowaniu.

**Co trzeba zrobić:**

```typescript
// store/types.ts — rozszerzyć CanvasState
interface CanvasState {
  layers: Layer[] // zamiast shapes[]
  activeLayerId: string
  // ...
}

interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  shapes: Shape[]
}
```

Store musi operować na kształtach przez pryzmat warstwy: `addShape(shape, layerId?)`.
Selekcja kształtów powinna ignorować zablokowane/ukryte warstwy.

**Uwaga:** Undo/redo historii `HistoryCommand` nie uwzględnia warstw — `ADD_SHAPE` nie zapamiętuje
do której warstwy trafił kształt. Trzeba będzie rozszerzyć komendy gdy implementujesz warstwy.

### 4.3 Panel właściwości numerycznych — `PropertiesPanel` istnieje, ale jest pusty

**Stan obecny:** `ShapeDefinition.PropertiesPanel` jest w kontrakcie i każdy kształt ma plik
`PropertiesPanel.tsx`, ale są to puste stubs. `PropertiesSidebar` pokazuje tylko wspólne właściwości
(opacity, fill, stroke) bez kształtu-specyficznych.

**Co trzeba zrobić:**

Zaimplementować `PropertiesPanel` per kształt — to jest właśnie to miejsce gdzie użytkownik wpisuje
np. dla `rect`: `Width: [150] Height: [80] Corner radius: [5]`, a dla profilu L: `Flange width: [50]
Web height: [80] Thickness: [5]`.

Wzorzec do zastosowania:

```typescript
// Wzorzec transient update przez panel — taki sam jak handle drags
function RectPropertiesPanel({ shape }: { shape: RectShape }) {
  const updateShapeTransient = useCanvasStore((s) => s.updateShapeTransient)
  const commitShapeUpdate = useCanvasStore((s) => s.commitShapeUpdate)
  const [localWidth, setLocalWidth] = useState(shape.width)

  // Na onChange → updateShapeTransient (live preview)
  // Na onBlur/Enter → commitShapeUpdate (zapisuje do historii)
}
```

### 4.4 Migracja do backendu Supabase

**Stan obecny:** Persistence to localStorage + JSON import/export. `documentCodec.ts` jest gotowy
— potrafi serializować/deserializować pełny dokument.

**Co zmienia backend:**

1. **Autosave:** Zamiast `localStorage.setItem(...)` po każdej zmianie, wysyłaj debounced PATCH do
   Supabase. `documentCodec.ts` już generuje właściwy format.

2. **Nowy slice — `DocumentSlice`:**

```typescript
interface DocumentSlice {
  documentId: string | null
  documentName: string
  isSaving: boolean
  lastSavedAt: Date | null
  isDirty: boolean // czy są niezapisane zmiany
  saveDocument: () => Promise<void>
  loadDocument: (id: string) => Promise<void>
  createDocument: (name: string) => Promise<void>
}
```

3. **Optimistic updates:** Store działa lokalnie (jak teraz), backend sync jest async.
   `isDirty` flaga pokazuje użytkownikowi stan zapisu.

4. **Row-level security:** Każdy dokument ma `owner_id = auth.uid()`. Schemat Supabase:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,  -- cały CanvasDocument jako JSON
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

5. **Schema migrations:** `SCHEMA_VERSION` w `document.ts` już istnieje i jest przemyślany pod migracje.
   Zachowaj tę konwencję — gdy dodasz nowe pola do kształtów, trzeba migrować stare dokumenty.

### 4.5 Obsługa dotyku / tablet

**Stan obecny:** Wszystkie eventy to `mousemove`/`mouseup`/`mousedown` — nie działają na dotyku.
`ShapeHandles.tsx:396` przykładowo binduje `window.addEventListener('mousemove', onMove)`.

**Konva.js i dotyk:** Konva ma natywną obsługę dotyku (`touchstart`, `touchmove`) przez eventy Konva,
ale bindowania na `window` muszą obsługiwać zarówno `MouseEvent` jak i `TouchEvent`.

**Rozwiązanie — pointer events API:**

```typescript
// Zamiast:
window.addEventListener('mousemove', onMove)
window.addEventListener('mouseup', onUp)

// Użyj:
window.addEventListener('pointermove', onMove)
window.addEventListener('pointerup', onUp)
// + na elemencie startowym: element.setPointerCapture(e.pointerId)
```

Pointer Events API jest zunifikowane dla myszy, dotyku i stylusa. Jedno API obsługuje wszystkie
urządzenia. Na tabletach spawacza zadziała bez osobnej ścieżki kodu.

**Dodatkowe dla tabletu:**

- Uchwyty (`HR = 5` px) są za małe dla palca — na tablecie powinny być ~20px. Można to uzależnić
  od `navigator.maxTouchPoints > 0` lub od poziomu zoomu.
- Pinch-to-zoom wymaga osobnej obsługi w `CanvasApp.tsx` (gesturestart/gesturechange lub
  obliczanie odległości między dwoma wskaźnikami).

---

## 5. Rekomendacje architektoniczne — priorytetyzacja

### Priorytet 1 — Zrób to przed dodaniem nowego kształtu

| Problem                | Zmiana                                                                        | Pliki                                                                |
| ---------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| ShapeHandles monolith  | Przenieś `getHandles`, `captureStart`, `applyHandleDrag` do `ShapeDefinition` | `_base/definition.ts`, `ShapeHandles.tsx`, każdy `shapes/*/index.ts` |
| captureGeometry switch | Deleguj do `ShapeDefinition.captureGeometry`                                  | `lib/captureGeometry.ts`, `_base/definition.ts`                      |
| shapeBounds switch     | Deleguj do `ShapeDefinition.getBoundingBox`                                   | `lib/shapeBounds.ts`, `_base/definition.ts`                          |

Efekt: dodanie profilu L nie wymaga modyfikacji żadnego centralnego pliku poza `_base/types.ts`
(linia z union) i `shapes/registry.ts` (rejestracja).

### Priorytet 2 — Zrób przed implementacją connector shapes

| Problem                  | Zmiana                                                          | Pliki                                                     |
| ------------------------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| Brak anchor system       | Dodaj `anchors?: (shape) => AnchorPoint[]` do `ShapeDefinition` | `_base/definition.ts`, nowy `store/slices/connections.ts` |
| ShapeUpdate flat partial | Refaktoruj na `Partial<Omit<S, 'id'>>` lub discriminated union  | `store/types.ts`, wszystkie użycia `ShapeUpdate`          |

### Priorytet 3 — Zrób przed wdrożeniem backendu

| Problem          | Zmiana                                          | Pliki                                                                     |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Brak layer store | Implementuj `LayersSlice`, zaktualizuj store    | `store/slices/layers.ts`, `store/use-canvas-store.ts`, `documentCodec.ts` |
| Pointer events   | Zamień `mouse*` na `pointer*`                   | `ShapeHandles.tsx`, `MultiShapeHandles.tsx`, `MultiLineHandles.tsx`       |
| DocumentSlice    | Dodaj slice do zarządzania dokumentem/backendem | `store/slices/document.ts`                                                |

### Priorytet 4 — Przed pierwszym wydaniem na tablety

| Problem                                   | Zmiana                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| Uchwyty za małe                           | Dynamiczny rozmiar uchwytów zależny od trybu input           |
| Brak pinch-to-zoom                        | Obsługa multi-touch w `CanvasApp.tsx`                        |
| PropertiesSidebar niedostępny na tablecie | Panel właściwości jako dolny drawer/panel na małych ekranach |

---

## 6. Ocena struktury katalogów kształtów

```
src/shapes/
├── _base/                    ✅ Dobra separacja bazowych kontraktów
│   ├── types.ts              ⚠️  ShapeType union — akceptowalne, ale zablokowane
│   ├── definition.ts         ⚠️  Za szczupłe — brakuje handle/bounds/geometry
│   └── defaults.ts           ✅ OK
├── registry.ts               ✅ Centralna rejestracja — właściwa
├── index.ts                  ✅ OK
└── [rect|circle|...]         ✅ Dobra separacja per kształt
    ├── types.ts              ✅ Izolowane typy
    ├── defaults.ts           ✅ OK
    ├── factory.ts            ✅ OK
    ├── Renderer.tsx          ✅ OK
    ├── PropertiesPanel.tsx   ⚠️  Puste stubs — do implementacji
    └── index.ts              ✅ OK, ale brakuje eksportu handle logic
```

**Wniosek o modularności:** Struktura katalogów jest właściwa. Problem nie jest w tym że moduły
są źle zorganizowane, ale w tym że `ShapeDefinition` nie zbiera do siebie wszystkich zachowań
kształtu — część jest "wyciekła" do centralnych plików.

---

## 7. Wzorzec dla nowych typów kształtów branżowych

Po wdrożeniu rekomendacji z sekcji 5, dodanie profilu L polegałoby na:

```
src/shapes/l-profile/
├── types.ts           // LProfileShape extends BaseShape { flangeWidth, webHeight, thickness, fill }
├── defaults.ts        // domyślne wymiary profilu L
├── factory.ts         // createLProfile(pos) → LProfileShape
├── Renderer.tsx       // renderuje profil L jako Path konva
├── PropertiesPanel.tsx // inputy: Flange width, Web height, Thickness + fill/stroke
├── handles.ts         // getHandles(), captureStart(), applyHandleDrag() dla profilu L
│                      // handle na wewnętrznym narożniku, handle na każdym ramieniu
├── anchors.ts         // punkty kotwic: narożniki, środki krawędzi, punkt neutralny
└── index.ts           // ShapeDefinition<LProfileShape>
```

Żaden istniejący plik nie wymagałby modyfikacji poza:

- `src/shapes/_base/types.ts` — dodanie `'l-profile'` do union
- `src/shapes/registry.ts` — rejestracja nowej definicji

---

## 8. Wzorzec dla aplikacji branżowych (kolejne projekty)

Gdy będziesz tworzyć kolejne aplikacje na bazie tego wzorca, kluczowe pytania projektowe:

**1. Jaka jest podstawowa jednostka pracy?**

- GeoCanvas: kształt geometryczny
- Aplikacja spawalnicza: połączenie (weld joint) + elementy bazowe (profile, blachy)
- Aplikacja elektryczna: komponent + połączenie (kabel/przewód)
- Zawsze będą dwa rodzaje: _elementy pierwotne_ i _elementy relacyjne (connectors)_

**2. Jakie operacje są kluczowe?**

- Jeśli wymagana jest precyzja: dodaj system jednostek (mm/px ratio) i numeric inputs
- Jeśli wymagane są biblioteki elementów: dodaj ShapeLibrary panel z predefiniowanymi kształtami
- Jeśli wymagana jest weryfikacja poprawności: dodaj ValidationSlice (np. "ta spoina nie może tu być")

**3. Co pozostaje wspólne we wszystkich aplikacjach:**

- Registry + ShapeDefinition (ten wzorzec)
- Viewport (pan/zoom)
- Historia (undo/redo)
- Eksport do PNG/JPG
- Layers
- Anchor + connector system

**4. Co jest specyficzne per aplikacja:**

- Konkretne typy kształtów (profile, spoiny, elementy elektryczne)
- Reguły walidacji
- Właściwości numeryczne (i ich jednostki)
- Tryby rysowania (np. tryb "połącz dwa elementy")

---

## 9. Ryzyko techniczne — Konva.js vs. SVG

**Konva.js** (HTML5 Canvas) to dobry wybór dla:

- Dużej liczby kształtów (200+ bez problemu)
- Efektów wizualnych (filtry, cienie)
- Desktop

**Potencjalny problem z tabletem:**
HTML5 Canvas nie skaluje się automatycznie z DPI (retina/high-DPI na tabletach). Konva obsługuje
to przez `pixelRatio`, ale uchwyty interakcyjne oparte na mouse events mogą się zachowywać
nieprzewidywalnie. Zalecenie: jak najszybciej przetestuj interakcję na prawdziwym tablecie.

**SVG** byłoby lepsze dla:

- Dostępności (screen readers)
- Precyzyjnego dotyku (SVG elements to DOM nodes — pointer events są natywne)
- Eksportu SVG/DXF (masz już opis geometrii)

Decyzja: **Konva pozostaje słusznym wyborem** dla bieżących wymagań, ale uchwyty interakcyjne
muszą przejść na Pointer Events API zanim aplikacja trafi na tablet.

---

## 10. Checklist przed następną iteracją

- [ ] Przenieść `getHandles`/`captureStart`/`applyHandleDrag` do `ShapeDefinition`
- [ ] Przenieść `getBoundingBox` do `ShapeDefinition`
- [ ] Przenieść `captureGeometry` do `ShapeDefinition`
- [ ] Zaimplementować `PropertiesPanel` dla `rect` i `circle` (numeric inputs)
- [ ] Zamienić `mouse*` events na `pointer*` events w handle components
- [ ] Zaimplementować `LayersSlice` i połączyć z `documentCodec`
- [ ] Zaprojektować `AnchorPoint` interface i dodać do `ShapeDefinition` jako optional
- [ ] Napisać pierwszy connector shape (prosty łącznik między dwoma punktami) jako proof-of-concept
