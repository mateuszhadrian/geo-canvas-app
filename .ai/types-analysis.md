# TypeScript Types Analysis — GeoCanvas

Analiza pokrywa wszystkie pliki `.ts` / `.tsx` pod `src/`. Problemy pogrupowane tematycznie, każdy z dokładną lokalizacją i propozycją naprawy.

---

## 1. Jawne `any` — do zastąpienia konkretnym typem

### 1a. `state: any` w funkcjach `applyForward` / `applyInverse`

**Plik:** `src/store/use-canvas-store.ts` linie 27, 61

```ts
function applyForward(state: any, command: HistoryCommand): void { … }
function applyInverse(state: any, command: HistoryCommand): void { … }
```

Funkcje wywołane wewnątrz `immer set(…)` ze stanem draftu.
Obie operują tylko na `state.shapes`, więc wystarczy minimalny kontrakt:

```ts
type MutableShapesState = { shapes: Shape[] }
function applyForward(state: MutableShapesState, command: HistoryCommand): void { … }
function applyInverse(state: MutableShapesState, command: HistoryCommand): void { … }
```

Alternatywnie pełny `Draft<CanvasStore>` z `immer` (jeśli w przyszłości będą potrzebne inne pola stanu).

---

### 1b. `ShapeDefinition<any>` w rejestrze kształtów

**Plik:** `src/shapes/registry.ts` linia 9

```ts
export const SHAPE_REGISTRY: Record<ShapeType, ShapeDefinition<any>> = { … }
```

`ShapeDefinition<S extends BaseShape = BaseShape>` ma domyślny parametr — wystarczy:

```ts
export const SHAPE_REGISTRY: Record<ShapeType, ShapeDefinition> = { … }
```

Usuwa `any` bez utraty informacji, bo `BaseShape` to i tak dolna granica.

---

### 1c. `(before as any)[key]` / `(shape as any)[key]`

**Plik:** `src/store/use-canvas-store.ts` linia 131

```ts
for (const key of Object.keys(updates) as Array<keyof ShapeUpdate>) {
  ;(before as any)[key] = (shape as any)[key]
}
```

Cel: skopiować ze `shape` wartości kluczy z `updates` do `before`.
`shape` jest `Shape` (Draft), `before` to `ShapeUpdate`. Obie zmienne są typowo kompatybilne przez `ShapeUpdate`:

```ts
for (const key of Object.keys(updates) as Array<keyof ShapeUpdate>) {
  (before as ShapeUpdate)[key] = (shape as ShapeUpdate)[key]
}
```

lub krótszy zapis z `Object.fromEntries`:

```ts
const before: ShapeUpdate = Object.fromEntries(
  (Object.keys(updates) as Array<keyof ShapeUpdate>).map((k) => [k, (shape as ShapeUpdate)[k]])
)
```

---

### 1d. `(e: any)` w handlerach Konvy

**Plik:** `src/components/canvas/ShapeNode.tsx` linie 60, 78

```ts
onDragMove={(e: any) => { … }}
onDragEnd={(e: any) => { … }}
```

Konva eksportuje właściwy typ:

```ts
import type { KonvaEventObject } from 'konva/lib/Node'

onDragMove={(e: KonvaEventObject<DragEvent>) => { … }}
onDragEnd={(e: KonvaEventObject<DragEvent>) => { … }}
```

---

### 1e. `(shape as any).fill` gdy guard już istnieje

**Plik:** `src/components/sidebar/PropertiesSidebar.tsx` linia 138

```ts
if (beforeRef.current === null) beforeRef.current = { fill: (shape as any).fill }
```

Ten blok jest już wewnątrz JSX renderowanego tylko gdy `withFill === true`, ale TypeScript nie pamięta tego zawężenia w closurze. Poprawka:

```ts
if (beforeRef.current === null) {
  const s = shape as Extract<Shape, { fill: string }>
  beforeRef.current = { fill: s.fill }
}
```

lub wyciągnąć `fill` przed JSX:

```ts
const fill = withFill ? (shape as Extract<Shape, { fill: string }>).fill : undefined
```

---

### 1f. `as any` przy dynamicznym dostępie do `ShapeUpdate`

**Plik:** `src/components/sidebar/PropertiesSidebar.tsx` linie 90–91

```ts
const after: ShapeUpdate = { [field]: (current as any)[field] }
if ((beforeRef.current as any)[field] !== (after as any)[field]) {
```

`current` jest `Shape`, `field` to `keyof ShapeUpdate`. Ponieważ `Shape` zawiera nadzbiór kluczy `ShapeUpdate`, bezpieczny dostęp:

```ts
const after: ShapeUpdate = { [field]: (current as Record<string, unknown>)[field] }
if ((beforeRef.current as Record<string, unknown>)[field] !== after[field]) {
```

lub pomocnicza funkcja z prawidłowym typem zwracania:

```ts
function readField<K extends keyof ShapeUpdate>(obj: ShapeUpdate | Shape, key: K): ShapeUpdate[K] {
  return (obj as ShapeUpdate)[key]
}
```

---

## 2. Asercje non-null (`!`) bez strażnika — ryzyko runtime

**Plik:** `src/components/canvas/ShapeHandles.tsx`

| Linia | Kod | Wymaga, żeby shape był |
|-------|-----|------------------------|
| 176 | `d.startShape.width!` | `rect` |
| 177 | `d.startShape.height!` | `rect` |
| 232 | `d.startShape.vertices!` | `triangle` |
| 270 | `d.startShape.vertices!` | `triangle` |
| 300 | `d.startShape.radius!` | `circle` |
| 333 | `d.startShape.radius!` | `circle` |
| 353 | `d.startShape.radiusX!` | `ellipse` |
| 354 | `d.startShape.radiusY!` | `ellipse` |
| 385 | `d.startShape.radiusX!` | `ellipse` |
| 386 | `d.startShape.radiusY!` | `ellipse` |

**Przyczyna źródłowa:** `DragState.startShape` jest płaskim obiektem z polami opcjonalnymi:

```ts
startShape: {
  x: number; y: number; rotation: number
  width?: number; height?: number
  vertices?: TriangleVertices
  radius?: number
  radiusX?: number; radiusY?: number
}
```

TypeScript nie wie, że gdy `kind === 'top'` i `type === 'rect'` to `width` i `height` na pewno istnieją.

**Rozwiązanie:** uczynić `startShape` dyskryminowaną unią:

```ts
type StartShapeGeometry =
  | { type: 'rect'; x: number; y: number; rotation: number; width: number; height: number }
  | { type: 'circle'; x: number; y: number; rotation: number; radius: number }
  | { type: 'ellipse'; x: number; y: number; rotation: number; radiusX: number; radiusY: number }
  | { type: 'triangle'; x: number; y: number; rotation: number; vertices: TriangleVertices }
  | { type: 'line'; x: number; y: number; rotation: number; points: number[] }

interface DragState {
  startPtr: Point
  startLocalPtr: Point
  startShape: StartShapeGeometry
  kind: HandleKind
}
```

Funkcje `applyRectDrag`, `applyCircleSideDrag` itp. przyjmują `DragState & { startShape: { type: 'rect'; … } }` lub przyjmują już zawężony `StartShapeGeometry`. Wszystkie asercje `!` znikają.

---

## 3. Zbędne rzuty `as ConcreteShape` po zawężeniu discriminated union

**Pliki:** `src/components/canvas/ShapeHandles.tsx`, `src/components/canvas/MultiShapeHandles.tsx`

Przykład z `ShapeHandles.tsx` linia 65:

```ts
if (shape.type === 'rect') {
  const s = shape as RectShape  // <— zbędne, TS już zawęził do RectShape
  const hw = s.width / 2
```

Po `if (shape.type === 'rect')` TypeScript samodzielnie zawęża `shape` do `RectShape` (discriminated union). Rzut `as RectShape` jest redundantny i maskuje fakt, że zawężenie działa poprawnie.

**Dotyczy:** linie 65, 82, 98, 114 w `ShapeHandles.tsx`; linie 47, 51, 55, 65, 70 w `MultiShapeHandles.tsx`; linie 18-31 w `captureGeometry` w obu plikach.

**Naprawka:** usunąć rzuty i korzystać bezpośrednio z `shape`:

```ts
if (shape.type === 'rect') {
  const hw = shape.width / 2  // TypeScript wie, że shape.width istnieje
```

---

## 4. Niebezpieczny podwójny rzut `as unknown as …`

**Plik:** `src/components/canvas/GridBackground.tsx` linia 19

```ts
const nc = (ctx as unknown as { _context: CanvasRenderingContext2D })._context
```

`_context` to prywatna właściwość Konvy — typ zewnętrzny jej nie eksportuje. Podwójny rzut jest konieczny do obejścia systemu typów, ale jest kruchy (zmiana wewnętrznej implementacji Konvy złamie kod bez błędu TS).

**Minimalna poprawa:** wyodrębnić typ z komentarzem wyjaśniającym:

```ts
// Konva does not expose _context in its public API; this accesses the native
// CanvasRenderingContext2D directly to bypass Konva's path-based drawing.
type KonvaContextInternal = { _context: CanvasRenderingContext2D }
const nc = (ctx as unknown as KonvaContextInternal)._context
```

Albo przenieść całe rysowanie do osobnej warstwy HTML `<canvas>` i uniknąć haka do Konvy w ogóle (większa zmiana, ale eliminuje problem).

---

## 5. `(e.target as any).stopDrag?.()` — zbędne `any`

**Plik:** `src/components/canvas/ShapeNode.tsx` linia 50

```ts
;(e.target as any).stopDrag?.()
```

`e.target` jest `Konva.Node`, a `stopDrag()` to metoda publiczna zdefiniowana na `Konva.Node`. Rzut do `any` jest niepotrzebny:

```ts
e.target.stopDrag()
```

(Opcjonalne wywołanie `?.` też nie jest potrzebne — `stopDrag` zawsze istnieje na każdym Node.)

---

## 6. Powtarzający się inline typ `{ x: number; y: number }` — brak nazwane `Point`

**Wystąpień w całym kodzie: ~35**

Przykłady:
- `src/store/types.ts:30` — `canvasPosition: { x: number; y: number }`
- `src/components/canvas/ShapeHandles.tsx:50,52,58,59,60,139,154,155`
- `src/components/canvas/MultiShapeHandles.tsx:38,44,71,82,100,101,107`
- `src/components/canvas/CanvasApp.tsx:26,51,53,54,83`

**Propozycja:** dodać do `src/shapes/_base/types.ts` (lub nowego `src/lib/types.ts`):

```ts
export type Point = { x: number; y: number }
```

i zastąpić wszystkie inline `{ x: number; y: number }` przez `Point`.

---

## 7. `BoundingBox` zdefiniowany w `shapeBounds.ts`, ale nie używany w innych miejscach

**Plik:** `src/lib/shapeBounds.ts` linie 3–8 — `BoundingBox` jest eksportowany.

Jednak te miejsca definiują `{ x1, y1, x2, y2 }` inline zamiast importować `BoundingBox`:

| Plik | Linia | Kod |
|------|-------|-----|
| `src/components/canvas/CanvasApp.tsx` | 51 | `useState<{ x1: number; y1: number; x2: number; y2: number } \| null>` |
| `src/components/canvas/CanvasApp.tsx` | 54 | `useRef<{ x1: number; y1: number; x2: number; y2: number } \| null>` |
| `src/components/canvas/ShapeHandles.tsx` | 54 | `bbox: { x1: number; y1: number; x2: number; y2: number }` w interfejsie `HandleGeometry` |
| `src/components/canvas/MultiShapeHandles.tsx` | 76 | `interface GroupBbox { x1: …; y1: …; x2: …; y2: …; cx: …; cy: … }` |

W każdym z tych miejsc wystarczy `import type { BoundingBox } from '@/lib/shapeBounds'`.
`GroupBbox` rozszerza `BoundingBox` o `cx`, `cy`:

```ts
import type { BoundingBox } from '@/lib/shapeBounds'
interface GroupBbox extends BoundingBox { cx: number; cy: number }
```

---

## 8. Powtarzający się inline typ `{ id: string; before: ShapeUpdate; after: ShapeUpdate }` — brak nazwanego `ShapeUpdatePair`

Wzorzec pojawia się w 5 miejscach:

| Plik | Linia | Kontekst |
|------|-------|----------|
| `src/store/slices/shapes.ts` | 12 | parametr `moveShapes` |
| `src/store/slices/shapes.ts` | 14 | parametr `commitShapesUpdate` |
| `src/store/history/types.ts` | 8 | pole `updates` w `UPDATE_SHAPES` |
| `src/store/use-canvas-store.ts` | 146 | implementacja `moveShapes` |
| `src/store/use-canvas-store.ts` | 163 | implementacja `commitShapesUpdate` |

**Propozycja:** dodać do `src/store/types.ts`:

```ts
export type ShapeUpdatePair = { id: string; before: ShapeUpdate; after: ShapeUpdate }
```

---

## 9. Zduplikowana funkcja `captureGeometry`

**Pliki:**
- `src/components/canvas/ShapeHandles.tsx` linie 17–33
- `src/components/canvas/MultiShapeHandles.tsx` linie 15–31

Identyczna logika, drobna różnica: wersja w `ShapeHandles` uwzględnia `type: shape.type` w snapie, wersja w `MultiShapeHandles` nie.

**Propozycja:** wyodrębnić do `src/lib/captureGeometry.ts`:

```ts
export function captureGeometry(shape: Shape, includeType = false): ShapeUpdate { … }
```

i importować w obu miejscach.

---

## 10. Zduplikowany typ `StartShape` / `DragState.startShape`

**Pliki:**
- `ShapeHandles.tsx` linie 152–164 — `DragState.startShape` z opcjonalnymi polami
- `MultiShapeHandles.tsx` linie 89–96 — `StartShape` interface z opcjonalnymi polami

Obie struktury przechowują te same dane (geometrię kształtu na początku drag). Po rozwiązaniu punktu 2 (dyskryminowana unia `StartShapeGeometry`) typ ten może być współdzielony.

---

## 11. Brak annotacji zwracanego typu w `getMinScale` i `clampPosition`

**Plik:** `src/components/canvas/CanvasApp.tsx`

```ts
const getMinScale = () =>           // brak : number
  Math.max(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT)

function clampPosition(pos: { x: number; y: number }, scale: number) { // brak : { x: number; y: number }
```

TypeScript wnioskuje poprawnie, ale jawne adnotacje zwiększają czytelność dla tych publicznych helpery.

---

## Podsumowanie — priorytety

| Priorytet | Problem | Wpływ |
|-----------|---------|-------|
| **Wysoki** | `state: any` (#1a) — utrata typowania całego stanu przy każdym undo/redo | bezpieczeństwo typów |
| **Wysoki** | 10× `!` non-null assertions (#2) — potencjalne runtime crash jeśli `DragState` zostanie zbudowany niepoprawnie | stabilność |
| **Wysoki** | Zduplikowana `captureGeometry` (#9) — rozbieżność między wersjami (brak `type` w MultiShapeHandles) | spójność |
| **Średni** | `as any` w 4 miejscach (#1c, #1d, #1e, #1f) — wyłącza sprawdzanie typów | bezpieczeństwo typów |
| **Średni** | Zbędne rzuty po zawężeniu (#3) — zaciemniają że discriminated union działa | czytelność |
| **Średni** | `BoundingBox` i `Point` nieużywane jako named types (#6, #7) | utrzymanie |
| **Niski** | `ShapeUpdatePair` brak nazwanego typu (#8) | utrzymanie |
| **Niski** | `StartShape` zduplikowany (#10) | utrzymanie |
| **Niski** | Brak return type na 2 funkcjach (#11) | czytelność |
| **Info** | Podwójny rzut w `GridBackground` (#4) — celowy hack, wymaga komentarza | dokumentacja |
