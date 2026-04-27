# First Stage Process Report

Dokumentacja kroków wykonanych podczas pierwszej sesji implementacyjnej GeoCanvas.

---

## 1. Toolbar — tworzenie komponentu i integracja ze store

**Pliki:** `src/components/toolbar/Toolbar.tsx` (nowy), `src/store/slices/tool.ts` (nowy), `src/store/use-canvas-store.ts`, `src/app/globals.css`

### Co zostało zrobione

Stworzono pionowy toolbar po lewej stronie ekranu zgodnie z layoutem z PRD. Dodano dwie sekcje przycisków oddzielone separatorem:

- **Kursory:** Select (`MousePointer2`) i Pan (`Hand`) — ikony z `lucide-react`
- **Figury:** Rectangle (`Square`), Circle (`Circle`), Triangle (`Triangle`), Line (`Minus`)

Do store dodano nowy slice `ToolSlice` z polem `activeTool: ToolType` i akcją `setActiveTool`. Typ `ToolType = 'select' | 'hand'` — figury celowo nie są trwałym stanem toolbara.

Do `globals.css` dodano zmienną `--color-toolbar-border` dla obramowania toolbara.

### Zachowanie przycisków

- Przyciski kursorów: kliknięcie wywołuje `setActiveTool` → podświetlenie pozostaje dopóki kursor jest aktywny (`bg-white/15 ring-1`)
- Przyciski figur: kliknięcie **nie** wywołuje `setActiveTool` — podświetlenie pojawia się tylko w momencie kliknięcia (CSS `:active`), figura natychmiast pojawia się na środku canvasa

### Usunięte elementy

Z `CanvasApp.tsx` usunięto:
- tymczasowe przyciski `+ Shape` / `Clear` dla każdego typu figury
- `useEffect` nadpisujący właściwości domyślnych shape'ów
- `defaultShapes` z inicjalizacji store

---

## 2. Logika tworzenia figur — centrum canvasa

**Plik:** `src/components/toolbar/Toolbar.tsx`

Każda figura po kliknięciu przycisku w toolbarze pojawia się na środku aktualnie widocznego obszaru canvasa. Pozycja środka uwzględnia stan viewportu ze store:

```ts
x: (window.innerWidth / 2 - canvasPosition.x) / canvasScale
y: (window.innerHeight / 2 - canvasPosition.y) / canvasScale
```

Kształt tworzony jest przez `SHAPE_REGISTRY[type].create(center)` z domyślnymi wartościami zgodnymi z PRD (REQ-004 do REQ-007).

---

## 3. Kursor myszy i tryb draggable

**Pliki:** `src/components/canvas/CanvasApp.tsx`, `src/components/canvas/ShapeNode.tsx`, wszystkie Renderery

### Zmiana logiki (korekta po pierwszej implementacji)

Pierwotna implementacja miała odwróconą logikę. Po korekcie:

| Narzędzie | Kursor CSS | Figury `draggable` |
|-----------|------------|---------------------|
| `select`  | `default`  | `true`              |
| `hand`    | `grab` / `grabbing` | `false`    |

Prop `draggable` jest teraz przekazywany przez cały łańcuch: `ShapeNode` → `ShapeDefinition.Renderer` → konkretny komponent Konva.

### Zmiana `ShapeDefinition.Renderer`

Interfejs rozszerzono o `draggable: boolean` jako wymagany prop, wymuszając jawną deklarację w każdym Rendererze:

```ts
Renderer: ComponentType<{ shape: S; draggable: boolean; ... }>
```

Zaktualizowano wszystkie 5 Rendererów: `RectRenderer`, `CircleRenderer`, `EllipseRenderer`, `TriangleRenderer`, `LineRenderer`.

---

## 4. Pan sceny narzędziem dłoń

**Pliki:** `src/store/slices/viewport.ts`, `src/store/use-canvas-store.ts`, `src/components/canvas/CanvasApp.tsx`

Do `ViewportSlice` dodano akcję `setCanvasPosition`. Stage Konva otrzymał kontrolowane propy `x={canvasPosition.x}` i `y={canvasPosition.y}` oraz `draggable={activeTool === 'hand'}`.

Handlers na Stage:

```tsx
onDragStart={(e) => { if (e.target !== e.currentTarget) return; setIsPanning(true) }}
onDragEnd={(e) => { if (e.target !== e.currentTarget) return; setIsPanning(false); setCanvasPosition(...) }}
```

Stan lokalny `isPanning` przełącza kursor między `grab` a `grabbing` podczas aktywnego przeciągania sceny.

---

## 5. Naprawa: figura przeskakuje po przeciągnięciu

**Problem:** Po puszczeniu myszki figura pojawiała się w innym miejscu niż kursor.

**Przyczyna:** Konva zarządza pozycją węzła wewnętrznie podczas dragu, ale po zakończeniu React re-renderował komponent ze starymi wartościami `x/y` ze store — resetując pozycję do punktu startowego.

**Rozwiązanie:** Dodano `onDragEnd` do każdego Renderera, który odczytuje finalną pozycję z Konva i zapisuje ją do store:

```tsx
onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
```

W `ShapeNode` handler wywołuje `updateShape(shape.id, pos)`.

Interfejs `ShapeDefinition.Renderer` rozszerzono o:
```ts
onDragEnd: (pos: { x: number; y: number }) => void
```

---

## 6. Naprawa: figura przeskakuje proporcjonalnie do odległości przeciągnięcia

**Problem:** Im dalej przeciągnięto figurę, tym dalej przeskakiwała po puszczeniu. Przeskok był dokładnie równy odległości przeciągnięcia.

**Przyczyna root-cause:** Konva propaguje eventy `dragstart`/`dragend` w górę hierarchii węzłów. W trybie `select`, gdy figura była przeciągana, event `dragend` bubblował do Stage'a. Handler Stage'a wywoływał:

```tsx
setCanvasPosition({ x: e.target.x(), y: e.target.y() })
```

...gdzie `e.target` był przeciąganą **figurą**, nie Stage'em. Powodowało to ustawienie offsetu całego Stage'a do współrzędnych figury, przesuwając cały canvas o pozycję figury.

**Rozwiązanie:** Guard `e.target !== e.currentTarget` — eventy z dzieci są ignorowane przez handlery Stage'a:

```tsx
onDragStart={(e) => { if (e.target !== e.currentTarget) return; ... }}
onDragEnd={(e) => { if (e.target !== e.currentTarget) return; ... }}
```

W Konva eventach: `target` = węzeł źródłowy, `currentTarget` = węzeł z handlerem. Gdy są różne — event pochodzi z dziecka.

---

## 7. Zaznaczanie figur i wyświetlanie pozycji

**Pliki:** `src/shapes/_base/definition.ts`, wszystkie Renderery, `src/components/canvas/ShapeNode.tsx`, `src/components/toolbar/Toolbar.tsx`, `src/components/canvas/PositionDisplay.tsx` (nowy), `src/components/canvas/CanvasApp.tsx`

### Zaznaczanie

Interfejs `ShapeDefinition.Renderer` rozszerzono o `onClick: () => void`. Każdy Renderer przekazuje go do węzła Konva. W `ShapeNode` handler wywołuje `setSelectedShapeIds([shape.id])`.

Trzy ścieżki prowadzące do zaznaczenia:
1. **Kliknięcie figury na canvasie** → `onClick` w ShapeNode
2. **Dodanie figury z toolbara** → po `addShape(shape)` Toolbar wywołuje `setSelectedShapeIds([shape.id])`
3. **Przeciągnięcie figury** → `onDragEnd` w ShapeNode wywołuje `setSelectedShapeIds([shape.id])`

Kliknięcie pustego obszaru canvasa odznacza wszystkie figury:
```tsx
// Stage onClick w CanvasApp:
if (e.target === e.currentTarget) setSelectedShapeIds([])
```

### PositionDisplay

Nowy komponent `PositionDisplay` (`src/components/canvas/PositionDisplay.tsx`) wyświetlany w prawym dolnym rogu ekranu (`position: fixed; bottom: 1rem; right: 1rem`). Odczytuje pozycję bezpośrednio ze store:

```tsx
const shape = shapes.find((s) => s.id === selectedShapeIds[0])
if (!shape) return null
// wyświetla: x: {Math.round(shape.x)}   y: {Math.round(shape.y)}
```

Komponent jest niewidoczny gdy żadna figura nie jest zaznaczona.

---

## 8. Testy jednostkowe Toolbar

**Plik:** `tests/unit/components/toolbar/Toolbar.test.tsx` (nowy)

13 testów w 2 describe-blokach:

### Toolbar — shape buttons (7 testów)
- Kliknięcie każdego z 4 przycisków figur wywołuje `addShape` z `expect.objectContaining({ type: '...' })`
- Przyciski figur nigdy nie wywołują `setActiveTool`
- Dwa kliknięcia tego samego przycisku tworzą figury z różnymi `id`
- Pozycja tworzonej figury uwzględnia `canvasPosition` i `canvasScale` ze store

### Toolbar — cursor buttons (6 testów)
- Select → `setActiveTool('select')`, brak `addShape`
- Pan → `setActiveTool('hand')`, brak `addShape`
- Aktywny przycisk kursorowy ma klasę `ring-1`, nieaktywny — nie ma

### Strategia mockowania

```ts
jest.mock('@/shapes/registry', ...) // przerywa łańcuch importu do konva (ESM)
jest.mock('@/store/use-canvas-store', () => ({ useCanvasStore: jest.fn() }))
```

`useCanvasStore` mockowany jako `jest.fn()`, konfigurowany per-test przez `setupStoreMock()` który aplikuje selektor na obiekcie stanu z mock-funkcjami.

---

## Podsumowanie zmian w strukturze projektu

```
src/
├── components/
│   ├── canvas/
│   │   ├── CanvasApp.tsx          ← zmodyfikowany
│   │   ├── ShapeNode.tsx          ← zmodyfikowany
│   │   └── PositionDisplay.tsx    ← NOWY
│   └── toolbar/
│       └── Toolbar.tsx            ← NOWY
├── shapes/
│   ├── _base/
│   │   └── definition.ts          ← rozszerzony o draggable, onClick, onDragEnd
│   ├── rect/Renderer.tsx          ← zaktualizowany
│   ├── circle/Renderer.tsx        ← zaktualizowany
│   ├── ellipse/Renderer.tsx       ← zaktualizowany
│   ├── triangle/Renderer.tsx      ← zaktualizowany
│   └── line/Renderer.tsx          ← zaktualizowany
├── store/
│   ├── slices/
│   │   ├── tool.ts                ← NOWY
│   │   └── viewport.ts            ← rozszerzony o setCanvasPosition
│   └── use-canvas-store.ts        ← zaktualizowany
└── app/
    └── globals.css                ← dodana zmienna --color-toolbar-border

tests/unit/components/toolbar/
└── Toolbar.test.tsx               ← NOWY (13 testów)
```
