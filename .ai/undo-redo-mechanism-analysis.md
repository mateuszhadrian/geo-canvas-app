# Analiza mechanizmu Undo/Redo dla GeoCanvas

> Wersja: 2026-04-27  
> Kontekst: Zustand + Immer + react-konva + Supabase/Postgres (planowane) + real-time collaboration (planowane)

---

## 0. TL;DR — szybka decyzja

| Pytanie                   | Odpowiedź                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Czy używać `zundo`?       | **Nie** — zundo jest snapshot-based i nie nadaje się do późniejszej bazy ani kolaboracji |
| Ile opcji warto rozważyć? | **3** — snapshot, command pattern, diff-based                                            |
| Rekomendacja              | **Command Pattern** (custom history slice w Zustand)                                     |
| Nakład na MVP             | **~1–1,5 dnia** pracy                                                                    |
| Gotowość na bazę danych?  | **Tak** — komendy są JSON-serializowalne i gotowe do zapisu w Supabase                   |
| Gotowość na kolaborację?  | **Tak** — komendy są OT-friendly i można je przesyłać przez Supabase Realtime            |

---

## 1. Zebrane wymagania

Na podstawie rozmowy i analizy kodu:

- **Zakres undo/redo**: tylko mutacje kształtów (`addShape`, `removeShapes`, `updateShape`, `setShapes`); zmiany viewport (pan/zoom), narzędzia i zaznaczenia są **wykluczone**
- **Granularność**: jeden krok = jedna intencja użytkownika (drag → jeden krok po puszczeniu; wpisywanie wartości w input → jeden krok po zatwierdzeniu/blur)
- **Głębokość historii**: max 50 kroków
- **Trwałość historii**: tylko w obrębie sesji przeglądarkowej (brak persistencji przez localStorage/reload)
- **Operacje wsadowe**: usunięcie wielu kształtów naraz = **jeden krok** w historii
- **Baza danych (przyszłość)**: Supabase/Postgres
- **Kolaboracja (przyszłość)**: jednoczesna edycja przez wiele osób
- **Konflikty między urządzeniami**: ostrzeżenie "stan projektu na innym urządzeniu jest nowszy — zapis nadpisze te zmiany"
- **Priorytet MVP**: działające lokalne undo/redo z architekturą gotową na późniejsze podpięcie bazy

---

## 2. Trzy opcje — analiza porównawcza

### Opcja A — Snapshot JSON (pomysł użytkownika + zundo)

**Jak działa**: Po każdej operacji zapisujesz kopię całej tablicy `shapes[]` do historii. `undo` = przywrócenie poprzedniej kopii.

```
historia: [ [S1], [S1, S2], [S1, S2 (zmod)], ... ]
                                                ↑ aktualny stan
```

PRD przewiduje `zundo` (temporal middleware) jako gotową bibliotekę implementującą tę opcję.

**Zalety:**

- Prosta w rozumieniu i implementacji
- `zundo` to gotowa biblioteka — integracja to kilka linii kodu
- Przywracanie stanu to jedno wywołanie `setShapes(snapshot)`
- Naturalne wsparcie dla `partialize` (śledź tylko `shapes`, nie viewport)

**Wady:**

- **Brak semantyki**: historia mówi tylko "jakie kształty były", nie "co zostało zmienione" — przy debugowaniu i DB-sync to poważne ograniczenie
- **Rozmiar w pamięci**: 200 kształtów × ~150 bajtów/kształt = ~30 KB/snapshot × 50 kroków = ~1,5 MB tylko na historię (akceptowalne, ale rosłoby z rozbudową kształtów)
- **Baza danych**: każda aktualizacja jednego pola (np. zmiana koloru) powoduje zapis całego snapshotu — dużo redundancji
- **Kolaboracja**: przy jednoczesnej edycji dwóch osób snapshoty się wykluczają (ostatni zapis wygrywa); brak możliwości merge — to **fundamentalna blokada** dla real-time collaboration
- **Brak śladu zmian**: nie wiesz kto/kiedy co zmienił — brak audit trail

**Kiedy ma sens**: MVP bez planów na kolaborację, maksymalna prostota implementacji.

---

### Opcja B — Command Pattern (rekomendacja)

**Jak działa**: Każda operacja to **komenda** zawierająca `type` + dane potrzebne do **zastosowania** i **odwrócenia**. Historia = tablica komend.

```typescript
// przykład komendy dla ruchu kształtu
{ type: 'UPDATE_SHAPES', updates: [
    { id: 'abc', before: { x: 100, y: 100 }, after: { x: 200, y: 150 } }
]}
```

`undo` = zastosuj odwrotność komendy; `redo` = zastosuj komendę ponownie.

**Zalety:**

- **Semantyczna historia**: każda komenda opisuje intencję ("dodano kształt", "przesunięto 3 kształty") — audit trail gotowy
- **Wydajna pamięć**: komenda dla przesunięcia 200 kształtów to lista 200 `{id, before, after}` — kilka KB zamiast 30 KB snapshotu
- **Baza danych**: zapis komendy = jeden mały JSON-owy event; przechowywanie historii w Supabase jest tanie i naturalne
- **Kolaboracja (OT-ready)**: komendy można **scalać** (operational transform) lub **komponować** (CRDT); dwie osoby edytujące jednocześnie różne kształty = dwie komendy, które nie kolidują
- **Cross-device undo/redo**: wczytaj snapshot na nowym urządzeniu + komendy z bazy = pełna historia
- **Pełna kontrola**: debugowanie, cofanie konkretnych kroków, wyświetlanie listy zmian w UI
- **Naturalnie JSON-serializowalna** — gotowa do przesłania do bazy bez transformacji

**Wady:**

- **Więcej kodu**: każda operacja musi przechwycić `before` i `after` — ok. 50–80 linii więcej niż zundo
- **Obsługa przed/po**: dla `removeShapes` trzeba pobrać kształty przed usunięciem; dla `updateShape` trzeba pobrać aktualny stan przed mutacją
- **Testowanie**: komendy wymagają testów jednostkowych

**Kiedy ma sens**: każdy projekt z planami na bazę danych lub kolaborację — **czyli ten projekt**.

---

### Opcja C — Diff-based (JSON Patch, RFC 6902)

**Jak działa**: Zamiast pełnego snapshotu lub semantycznej komendy, obliczasz diff między dwoma stanami w formacie JSON Patch:

```json
[
  { "op": "replace", "path": "/shapes/0/x", "value": 200 },
  { "op": "replace", "path": "/shapes/0/y", "value": 150 }
]
```

**Zalety:**

- Mniejsze od snapshotów, standaryzowany format (RFC 6902)
- Można stosować biblioteki `fast-json-patch` lub podobne

**Wady:**

- **Bez semantyki**: diff mówi "co się zmieniło w JSON", ale nie "dlaczego" — brak audit trail
- **Złożone odwracanie**: żeby cofnąć diff, trzeba wyliczyć reverse-patch — można to zrobić, ale to dodatkowa warstwa złożoności
- **Indeksowanie tablicy**: JSON Patch używa indeksów (`/shapes/0/x`); gdy kształty zmieniają kolejność, indeksy się przesuwają — trzeba obsługiwać ID-based lookup
- **Nie nadaje się bezpośrednio do OT**: diffa trudno skomponować przy równoczesnych zmianach
- **Brak przewagi**: Command Pattern oferuje więcej (semantyka, OT) przy podobnym nakładzie implementacji

**Kiedy ma sens**: systemy z dużą ilością małych zmian rozproszonych po drzewie JSON; tutaj nie ma przewagi nad Command Pattern.

---

## 3. Tabela porównawcza

| Kryterium                          |     Snapshot (zundo)      |     **Command Pattern**     |     Diff-based     |
| ---------------------------------- | :-----------------------: | :-------------------------: | :----------------: |
| Łatwość implementacji MVP          |      ✅ Bardzo łatwa      |       ⚠️ Umiarkowana        |   ⚠️ Umiarkowana   |
| Pamięć (200 kształtów × 50)        |        ⚠️ ~1,5 MB         |        ✅ ~50–200 KB        |   ✅ ~100–300 KB   |
| Semantyczna historia / audit trail |          ❌ Brak          |          ✅ Pełna           |      ❌ Brak       |
| Gotowość na Supabase               |   ⚠️ Ciężkie snapshoty    |      ✅ Lekkie eventy       | ⚠️ Brak semantyki  |
| Cross-device undo/redo             |         ❌ Trudne         |        ✅ Naturalne         |     ❌ Trudne      |
| Gotowość na OT/kolaborację         |        ❌ Blokada         |        ✅ Naturalna         |     ⚠️ Trudna      |
| Konflikt detection                 |    ⚠️ Wersja projektu     |       ✅ Per-komenda        | ⚠️ Wersja projektu |
| Integracja z istniejącym kodem     | ✅ Minimalna (middleware) | ⚠️ Wymaga augmentacji akcji | ⚠️ Wymaga wrappera |
| Testy                              |      Mniej potrzebne      |   Więcej (ale izolowane)    |       Więcej       |

**Rekomendacja: Command Pattern** — jedyna opcja przygotowana na wszystkie 3 fazy: MVP, baza danych, kolaboracja.

---

## 4. Architektura Command Pattern — szczegółowy projekt

### 4.1 Typy komend

Mapują 1:1 na istniejące akcje w store, z dodaniem danych do odwrócenia (`before`):

```typescript
// src/store/history/types.ts

import type { Shape } from '@/shapes'
import type { ShapeUpdate } from '@/store/types'

export type HistoryCommand =
  | {
      type: 'ADD_SHAPE'
      shape: Shape // wystarczy shape — undo = usuń shape.id
    }
  | {
      type: 'REMOVE_SHAPES'
      shapes: Shape[] // pełne kształty — undo = przywróć wszystkie
    }
  | {
      type: 'UPDATE_SHAPE'
      id: string
      before: ShapeUpdate // stan przed zmianą
      after: ShapeUpdate // stan po zmianie
    }
  | {
      type: 'UPDATE_SHAPES'
      updates: Array<{
        id: string
        before: ShapeUpdate
        after: ShapeUpdate
      }>
    }
  | {
      type: 'SET_SHAPES' // dla import JSON / clear scene
      before: Shape[]
      after: Shape[]
    }
```

### 4.2 History slice

Nowy slice dodawany do istniejącego `CanvasStore`:

```typescript
// src/store/slices/history.ts

export interface HistorySlice {
  _past: HistoryCommand[] // max 50, indeks 0 = najstarszy
  _future: HistoryCommand[]
  canUndo: boolean // derived: _past.length > 0
  canRedo: boolean // derived: _future.length > 0
  pushHistory: (command: HistoryCommand) => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
}
```

Implementacja (pseudokod ilustracyjny — właściwy kod piszemy przy implementacji):

```typescript
// pseudokod — ilustracja logiki

pushHistory: (command) =>
  set((state) => {
    state._past.push(command)
    if (state._past.length > 50) state._past.shift() // FIFO, max 50
    state._future = [] // nowa akcja czyści redo stack
    state.canUndo = true
    state.canRedo = false
  })

undo: () =>
  set((state) => {
    const command = state._past.pop()
    if (!command) return
    applyInverse(state, command) // odwróć komendę
    state._future.unshift(command)
    state.canUndo = state._past.length > 0
    state.canRedo = true
  })

redo: () =>
  set((state) => {
    const command = state._future.shift()
    if (!command) return
    applyForward(state, command) // zastosuj komendę
    state._past.push(command)
    state.canUndo = true
    state.canRedo = state._future.length > 0
  })
```

### 4.3 Funkcje applyForward / applyInverse

```typescript
function applyForward(state: CanvasStore, command: HistoryCommand) {
  switch (command.type) {
    case 'ADD_SHAPE':
      state.shapes.push(command.shape)
      break
    case 'REMOVE_SHAPES':
      const ids = new Set(command.shapes.map((s) => s.id))
      state.shapes = state.shapes.filter((s) => !ids.has(s.id))
      break
    case 'UPDATE_SHAPE':
      const shape = state.shapes.find((s) => s.id === command.id)
      if (shape) Object.assign(shape, command.after)
      break
    case 'UPDATE_SHAPES':
      command.updates.forEach(({ id, after }) => {
        const s = state.shapes.find((s) => s.id === id)
        if (s) Object.assign(s, after)
      })
      break
    case 'SET_SHAPES':
      state.shapes = command.after
      break
  }
}

function applyInverse(state: CanvasStore, command: HistoryCommand) {
  switch (command.type) {
    case 'ADD_SHAPE':
      state.shapes = state.shapes.filter((s) => s.id !== command.shape.id)
      break
    case 'REMOVE_SHAPES':
      state.shapes.push(...command.shapes) // przywróć usunięte
      break
    case 'UPDATE_SHAPE':
      const shape = state.shapes.find((s) => s.id === command.id)
      if (shape) Object.assign(shape, command.before)
      break
    case 'UPDATE_SHAPES':
      command.updates.forEach(({ id, before }) => {
        const s = state.shapes.find((s) => s.id === id)
        if (s) Object.assign(s, before)
      })
      break
    case 'SET_SHAPES':
      state.shapes = command.before
      break
  }
}
```

### 4.4 Augmentacja istniejących akcji w store

Minimalne zmiany w `use-canvas-store.ts` — każda akcja mutująca kształty przechwytuje `before` i wywołuje `pushHistory`:

```typescript
// Przykład augmentacji addShape:
addShape: (shape: Shape) =>
  set((state) => {
    state.shapes.push(shape)
    // dodajemy:
    pushHistoryCommand(state, { type: 'ADD_SHAPE', shape })
  }),

// Przykład augmentacji removeShapes:
removeShapes: (ids: string[]) =>
  set((state) => {
    const set_ = new Set(ids)
    const removed = state.shapes.filter(s => set_.has(s.id))  // przechwytuj PRZED usunięciem
    state.shapes = state.shapes.filter(s => !set_.has(s.id))
    state.selectedShapeIds = []
    pushHistoryCommand(state, { type: 'REMOVE_SHAPES', shapes: removed })
  }),

// Przykład augmentacji updateShape:
updateShape: (id: string, updates: ShapeUpdate) =>
  set((state) => {
    const shape = state.shapes.find(s => s.id === id)
    if (!shape) return
    const before = extractRelevantFields(shape, updates)  // tylko zmieniane pola
    Object.assign(shape, updates)
    pushHistoryCommand(state, { type: 'UPDATE_SHAPE', id, before, after: updates })
  }),
```

**Kluczowa zasada**: `before` zawiera tylko te pola, które są obecne w `updates` — nie cały kształt. Minimalizuje to rozmiar komendy.

### 4.5 Obsługa granularności

#### Drag (przeciąganie)

`ShapeNode.tsx` już używa `onDragStart` (linia 45) i `onDragEnd` (linia 76). `dragStartPositions` ref (linia 24) już zbiera pozycje początkowe wszystkich zaznaczonych kształtów.

Jedyna potrzebna zmiana: w `onDragEnd` użyć `updateShapes` zamiast wielokrotnego `updateShape`, żeby ruch wielu kształtów był **jedną komendą** `UPDATE_SHAPES`:

```typescript
// onDragEnd — zamiast wielu updateShape() wywołać jeden:
const updates = ids.map((id) => {
  const s = dragStartPositions.current.get(id)
  return { id, before: { x: s.x, y: s.y }, after: { x: s.x + delta.x, y: s.y + delta.y } }
})
executeUpdateShapes(updates) // jedna komenda UPDATE_SHAPES
```

#### Pola tekstowe w Properties Panel (jeszcze nie zaimplementowane)

Strategia: **commit on blur + commit on Enter**, nie na każde naciśnięcie klawisza.

```typescript
// w Properties Panel — wzorzec dla każdego pola numerycznego:
const [localValue, setLocalValue] = useState(String(shape.width))

const commit = () => {
  const parsed = parseFloat(localValue)
  if (!isNaN(parsed) && parsed !== shape.width) {
    updateShape(shape.id, { width: parsed })  // to pushuje do historii
  }
}

<input
  value={localValue}
  onChange={e => setLocalValue(e.target.value)}  // tylko lokalny stan, bez historii
  onBlur={commit}
  onKeyDown={e => e.key === 'Enter' && commit()}
/>
```

Analogicznie dla color pickerów — `onChangeComplete` (po zakończeniu zmiany) zamiast `onChange` (podczas przeciągania suwaka).

### 4.6 Skróty klawiaturowe

`CanvasApp.tsx` ma już handler `onKeyDown` (linia 109–126). Wystarczy dodać:

```typescript
// Cmd/Ctrl + Z → undo
if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
  e.preventDefault()
  undo()
}

// Cmd/Ctrl + Shift + Z lub Ctrl + Y → redo
if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
  e.preventDefault()
  redo()
}
```

Warto też zablokować domyślne `undo` przeglądarki na canvasie, bo może wchodzić w konflikt.

---

## 5. Plan implementacji MVP (lokalne undo/redo)

Kolejność minimalizuje ryzyko regresji:

### Etap 1 — Typy i core logika (bez UI)

1. Stwórz `src/store/history/types.ts` z definicją `HistoryCommand`
2. Stwórz `src/store/slices/history.ts` z interfejsem i implementacją slice
3. Dodaj `applyForward` / `applyInverse` do slice
4. Zintegruj history slice z `use-canvas-store.ts`

### Etap 2 — Augmentacja istniejących akcji

5. Zmodyfikuj `addShape` — dodaj `pushHistory`
6. Zmodyfikuj `removeShape` i `removeShapes` — przechwytuj `before`, dodaj `pushHistory`
7. Zmodyfikuj `updateShape` — przechwytuj `before`, dodaj `pushHistory`
8. Dodaj `updateShapes` (batch) — potrzebne dla drag wielu kształtów

### Etap 3 — Integracja z istniejącymi komponentami

9. Zmodyfikuj `ShapeNode.tsx` `onDragEnd` — użyj `updateShapes` zamiast pętli `updateShape`
10. Dodaj skróty klawiaturowe w `CanvasApp.tsx`

### Etap 4 — Testy

11. Testy jednostkowe `applyForward` / `applyInverse` dla każdego typu komendy
12. Testy `pushHistory` — limit 50, czyszczenie redo stack

**Szacowany czas**: ~8–12 godzin pracy dla doświadczonego dewelopera.

---

## 6. Ścieżka do bazy danych — Supabase/Postgres

Architektura projektowana od początku pod DB: komendy są już JSON-serializowalne i nadają się bezpośrednio do zapisu.

### 6.1 Schemat bazy

```sql
-- Projekty (aktualny stan jako snapshot)
CREATE TABLE projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Untitled',
  document   jsonb NOT NULL,      -- pełny CanvasDocument (snapshot)
  version    integer NOT NULL DEFAULT 0,  -- inkrementowany przy każdym save
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Historia komend (per sesja, per projekt)
CREATE TABLE project_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id),
  session_id      uuid NOT NULL,          -- generowany przy starcie sesji
  device_id       text,                   -- fingerprint urządzenia (opcjonalne)
  sequence_number integer NOT NULL,       -- kolejność w ramach sesji
  command         jsonb NOT NULL,         -- HistoryCommand jako JSON
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON project_history (project_id, created_at DESC);
CREATE INDEX ON project_history (project_id, session_id, sequence_number);
```

### 6.2 Flow: zapis do DB

```
[lokalna zmiana]
      ↓
pushHistory(command)  ← tylko pamięć, bez DB
      ↓
(user klika "Save" lub autosave co N sekund)
      ↓
PATCH /api/projects/:id
  body: { document: currentSnapshot, version: localVersion + 1, commands: newCommands[] }
      ↓
Supabase: UPDATE projects SET document = ..., version = version + 1
          INSERT INTO project_history VALUES (...) for each command
```

### 6.3 Flow: wczytanie na nowym urządzeniu

```
GET /api/projects/:id
      ↓
Zwraca: { document, version, recentHistory: HistoryCommand[] (ostatnie 50) }
      ↓
setShapes(document.layers[0].shapes)  ← przywrócenie stanu
clearHistory()                         ← czysta historia (nowa sesja)
// opcjonalnie: załaduj ostatnie 50 komend jako historię
// → użytkownik może od razu robić undo/redo z poprzedniej sesji
```

### 6.4 Lokalne cache (localStorage) — jako backup

```typescript
// Autosave do localStorage przy każdej zmianie shapes[]
// (niezależnie od DB)
useEffect(() => {
  const state = { shapes, version: localVersion }
  try {
    localStorage.setItem(`geocanvas:${projectId}`, JSON.stringify(state))
  } catch (e) {
    /* quota exceeded — ignoruj, toast w UI */
  }
}, [shapes])
```

Historia komend **nie jest** zapisywana do localStorage (tylko bieżące shapes) — historia jest ephemeryczna w ramach sesji; do cross-device historii służy DB.

---

## 7. Obsługa konfliktów między urządzeniami

Scenariusz: urządzenie A i urządzenie B edytują ten sam projekt offline.

### 7.1 Detekcja konfliktu

Każdy projekt ma `version: integer`. Przed zapisem:

```typescript
async function saveProject(localDoc: CanvasDocument, localVersion: number) {
  const serverVersion = await fetchProjectVersion(projectId)

  if (serverVersion > sessionStartVersion) {
    // Ktoś zapisał po tym jak my zaczęliśmy sesję
    showConflictWarning({
      message: 'Ten projekt był zmodyfikowany na innym urządzeniu. Zapis nadpisze tamte zmiany.',
      onConfirm: () => forceSave(localDoc, localVersion),
      onCancel: () => reloadFromServer(),
    })
    return
  }

  await forceSave(localDoc, localVersion)
}
```

`sessionStartVersion` = `version` z DB w momencie wczytania projektu na początku sesji.

### 7.2 UX komunikatu konfliktu

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  Projekt zmodyfikowany na innym urządzeniu           │
│                                                         │
│  Ostatnia modyfikacja na innym urządzeniu:              │
│  27 kwi 2026, 14:32 (MacBook Pro)                       │
│                                                         │
│  Jeśli zapiszesz, tamte zmiany zostaną nadpisane.       │
│                                                         │
│  [Anuluj zapis]    [Nadpisz i zapisz]                   │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Nie-obsługiwany scenariusz (poza MVP)

Automatyczny merge konfliktów (CRDT) wymaga kompleksowej implementacji i jest planowany jako część Real-time collaboration. Przy nacisku na prostotę w MVP, model "last-write-wins z ostrzeżeniem" jest rozsądnym kompromisem.

---

## 8. Collaborative editing — przyszłość

Komend Pattern jest naturalnie OT-friendly (Operational Transformation). Oto jak wygląda ścieżka:

### 8.1 Supabase Realtime

```typescript
// Subskrypcja na komendy innych użytkowników
supabase
  .channel(`project:${projectId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'project_history',
      filter: `project_id=eq.${projectId}`,
    },
    (payload) => {
      const command: HistoryCommand = payload.new.command
      if (payload.new.session_id !== localSessionId) {
        applyRemoteCommand(command) // zastosuj komendę innego użytkownika
      }
    }
  )
  .subscribe()
```

### 8.2 Dlaczego komendy się komponują

Gdy użytkownik A przesuwa kształt `X`, a użytkownik B zmienia kolor kształtu `Y`:

- Komenda A: `UPDATE_SHAPE { id: 'X', before: {x:100}, after: {x:200} }`
- Komenda B: `UPDATE_SHAPE { id: 'Y', before: {fill:'red'}, after: {fill:'blue'} }`

Obie komendy dotyczą różnych kształtów → **zero konfliktu**, obie mogą być zastosowane niezależnie.

Konflikt pojawia się gdy obie osoby edytują **to samo pole tego samego kształtu** jednocześnie → to wymaga OT i jest poza zakresem MVP. Przy prostym modelu "last-write-wins" na poziomie komend, większość przypadków będzie działać poprawnie.

### 8.3 Cursor/awareness (late future)

Supabase Presence API do śledzenia kursorów innych użytkowników w czasie rzeczywistym — nie wymaga zmian w architekturze komend.

---

## 9. Podsumowanie architektoniczne

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ZUSTAND STORE                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │ shapes slice │  │history slice │  │ selection / viewport /  │   │
│  │              │◄─┤              │  │ tool slices             │   │
│  │ addShape     │  │ _past[]      │  │ (bez historii)          │   │
│  │ removeShapes │  │ _future[]    │  │                         │   │
│  │ updateShape  │  │ canUndo      │  │                         │   │
│  │ setShapes    │  │ canRedo      │  │                         │   │
│  │              │  │ pushHistory  │  │                         │   │
│  │              │  │ undo / redo  │  │                         │   │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         ↑                    ↑
   komponenty              cmd+Z / cmd+shift+Z
   (ShapeNode,             (CanvasApp keydown)
    Toolbar, Sidebar)

MVP: tylko pamięć (brak localStorage dla historii)

─────── przyszłość ─────────────────────────────────────────────────

         ↓ save                    ↑ load
┌────────────────────────────────────────────────────────────────────┐
│  SUPABASE / POSTGRES                                               │
│  ┌──────────────────────┐  ┌─────────────────────────────────────┐ │
│  │ projects             │  │ project_history                     │ │
│  │ id, document (JSONB) │  │ id, project_id, session_id,         │ │
│  │ version, updated_at  │  │ sequence_number, command (JSONB),   │ │
│  └──────────────────────┘  │ user_id, created_at                 │ │
│  ← snapshot aktualnego     └─────────────────────────────────────┘ │
│    stanu (szybkie load)     ← log wszystkich komend (historia,      │
│                               audit trail, kolaboracja)             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 10. Czego NIE robić

- **Nie używaj `zundo`** — snapshot-based, blokuje kolaborację, brak semantyki. Mimo że PRD wspomina go w tech-stacku, to był wstępny wybór bez uwzględnienia planów na kolaborację i bazę danych. Własny history slice to ~80 linii kodu — nie ma potrzeby zewnętrznej zależności.
- **Nie zapisuj historii do localStorage** — historia jest ephemeryczna (sesyjna); localStorage do przechowania bieżącego stanu sceny (shapes[]) wystarcza.
- **Nie pushuj do historii przy każdym `onDragMove`** — tylko `onDragEnd`. Aktualny kod w `ShapeNode.tsx` już to respektuje.
- **Nie pushuj do historii przy zmianie zaznaczenia, viewport, narzędzia** — to nie są operacje na kształtach i nie powinny być cofalne.
- **Nie rób granularnych komend dla wpisywania** — "wpisanie 100" to jedna komenda, nie trzy (`1`, `10`, `100`). Commit on blur/Enter.

---

## 11. Decyzja — check-lista

Przed implementacją potwierdź:

- [ ] Command Pattern (nie zundo / nie snapshot) — **TAK/NIE**
- [ ] Głębokość: 50 kroków — **TAK/NIE**
- [ ] Tylko mutacje kształtów (nie viewport/selection) — **TAK/NIE**
- [ ] Granularność: drag = 1 krok, input = 1 krok (blur/Enter) — **TAK/NIE**
- [ ] Batch operations = 1 krok — **TAK/NIE**
- [ ] Historia ephemeryczna (tylko w sesji, nie w localStorage) — **TAK/NIE**
- [ ] Struktura gotowa na Supabase (bez wdrożenia DB w MVP) — **TAK/NIE**
