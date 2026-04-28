# Shape-Registry Canvas Architecture Pattern

> Derived from GeoCanvas. Intended as the canonical reference for designing the Welder Documentation App and any similar domain-specific canvas editor.

---

## 1. What Problem This Pattern Solves

You need a canvas editor where:
- The domain has a **closed but growing set of shape types** (welds, profiles, plates, pipes, connectors…)
- Each shape type has **unique geometry**, **unique properties panel**, **unique drag handles**, and **unique anchor points**
- The surrounding infrastructure (store, canvas renderer, history, layers) must work generically without knowing which shapes exist
- Adding a new shape type should touch only a single new directory — never the generic infrastructure
- Some shapes are **relational** (connectors): they attach to anchor points on other shapes and update automatically when those shapes move

The pattern achieves this through a **central shape registry** that maps every `ShapeType` to a `ShapeDefinition` object containing all per-type behaviour as functions and components. The rest of the app consumes the registry without switch-cases or instanceof checks.

**The central insight: every shape-specific behaviour is data, not code in the infrastructure.** The infrastructure (store, handles, sidebar, export) is written once against the `ShapeDefinition` interface. Shape authors implement the interface; the infrastructure runs automatically.

---

## 2. Directory Layout

```
src/
  shapes/
    _base/
      types.ts          ← shared geometry primitives (BaseShape, BoundingBox, ShapeConnection, etc.)
      definition.ts     ← ShapeDefinition<S> interface
    registry.ts         ← SHAPE_REGISTRY: Record<ShapeType, ShapeDefinition<any>>
    index.ts            ← re-exports Shape union, ShapeType union, all shape types
    rect/
      types.ts          ← RectShape interface
      index.ts          ← ShapeDefinition<RectShape> instance
      handles.ts        ← geometry math (captureStart, getHandles, applyHandleDrag)
      anchors.ts        ← anchor point math
      PropertiesPanel.tsx
    circle/ …
    ellipse/ …
    triangle/ …
    line/ …
    [new-shape]/ …      ← add new shape here; nothing else changes
  store/
    types.ts            ← ShapeUpdate (intersection-derived), HistoryEntry, Layer
    slices/
      shapes.ts
      layers.ts
      history.ts
      connections.ts    ← ConnectionsSlice: propagates moves to connected shapes
    use-canvas-store.ts ← combined Zustand store
  components/
    canvas/
      CanvasApp.tsx
      ShapeNode.tsx
      ShapeHandles.tsx  ← generic, registry-driven
      AnchorPoints.tsx  ← generic, registry-driven
      MultiShapeHandles.tsx
    sidebar/
      PropertiesSidebar.tsx
      LayersSidebar.tsx
  lib/
    captureGeometry.ts  ← thin registry facade
    shapeBounds.ts      ← thin registry facade
    documentCodec.ts    ← encode/decode for persistence
```

---

## 3. Core Types (`src/shapes/_base/types.ts`)

```typescript
export interface Point { x: number; y: number }

export interface BaseShape {
  id: string
  type: ShapeType
  x: number; y: number
  rotation: number
  opacity: number
  stroke: string
  strokeWidth: number
  layerId?: string        // injected by store on addShape
}

// Bounding box in world coords
export interface BoundingBox { x1: number; y1: number; x2: number; y2: number }

// A single drag handle descriptor (local coords relative to shape group origin)
export interface HandleDescriptor { kind: string; x: number; y: number; cursor?: string }

// Full handle geometry returned by getHandles()
export interface HandleGeometry {
  bbox: BoundingBox          // world bbox, used for multi-select box
  sides: HandleDescriptor[]  // edge/corner resize handles in local coords
  scale: Point               // uniform scale handle in local coords
  rotate: Point              // rotate handle in local coords
}

// A named attachment point in local coords (relative to shape group center)
export interface AnchorPoint {
  id: string
  x: number
  y: number
  direction?: number  // outward normal angle in degrees, 0 = right
                      // connector shapes use this to align tangentially to the surface
}

// A reference to a specific anchor on a specific shape
export interface ShapeConnection {
  shapeId: string   // ID of the shape being connected to
  anchorId: string  // ID of the anchor on that shape
}

// Connector shape — a shape that attaches to anchor points on other shapes.
// Weld symbols, dimension lines, cables in electrical apps all extend this.
export interface ConnectorShape extends BaseShape {
  connections: {
    start: ShapeConnection | null
    end:   ShapeConnection | null
  }
}

// Minimal drag-start snapshot; each shape extends it with geometry it needs
export interface StartSnapshot { x: number; y: number; rotation: number }

// Loose field update (avoids circular dep with store/types.ts)
export type FieldUpdate = Partial<Record<string, unknown>>
```

**Why loose `FieldUpdate` instead of `ShapeUpdate`?**
`ShapeDefinition` lives in `_base/` which is imported by `shapes/`. `ShapeUpdate` (the strict type) lives in `store/types.ts` which imports `shapes/`. A strict import in both directions creates a circular dependency. The solution: `ShapeDefinition` uses `FieldUpdate` internally; call sites in the store cast with `as ShapeUpdate`. The runtime behaviour is identical.

---

## 4. The ShapeDefinition Interface (`src/shapes/_base/definition.ts`)

```typescript
export interface ShapeDefinition<S extends BaseShape = BaseShape> {
  // ── Metadata ──────────────────────────────────────────────────────────────
  type: ShapeType
  label: string
  icon: ComponentType                        // toolbar icon

  // ── Factory ───────────────────────────────────────────────────────────────
  create: (pos: Point) => S                  // creates a new shape at position

  // ── React components ──────────────────────────────────────────────────────
  Renderer: ComponentType<{ shape: S; isSelected: boolean }>
  PropertiesPanel: ComponentType<{ shape: S }>

  // ── Geometry read ─────────────────────────────────────────────────────────
  captureGeometry: (shape: S) => FieldUpdate  // snapshot of all mutable fields
  getBoundingBox: (shape: S) => BoundingBox
  getWorldPoints: (shape: S) => Point[]       // for multi-select convex hull

  // ── Handle drag (null = shape doesn't support handle editing) ─────────────
  // Invariant: either all three are non-null, or all are null.
  getHandles: ((shape: S) => HandleGeometry) | null
  captureStart: ((shape: S) => StartSnapshot) | null
  applyHandleDrag: ((
    start: StartSnapshot,
    kind: string,
    ldx: number, ldy: number,
    startLocalPtr: Point,
    sinθ: number, cosθ: number,
  ) => FieldUpdate) | null

  // ── Anchors (optional) ────────────────────────────────────────────────────
  // Shapes that expose anchors can be connected to by connector shapes.
  anchors?: (shape: S) => AnchorPoint[]

  // ── Connector resolution (connector shapes only) ──────────────────────────
  // Given a ShapeConnection descriptor and the full shapes array, returns the
  // world-coord position of the connected anchor. Store uses this to recompute
  // connector geometry whenever the target shape moves.
  resolveConnection?: (connection: ShapeConnection, shapes: Shape[]) => Point | null

  // ── Domain extensions (optional) ─────────────────────────────────────────
  // Per-shape validation rules (see Section 15 — ValidationSlice).
  validate?: (shape: S, context: ValidationContext) => ValidationViolation[]

  // SVG/DXF export (optional — implement when export is required)
  toSVG?: (shape: S) => string
  toDXF?: (shape: S) => string
}
```

---

## 5. The Registry (`src/shapes/registry.ts`)

```typescript
import type { ShapeDefinition } from './_base/definition'
import type { ShapeType } from '.'
import { RectDefinition }     from './rect'
import { CircleDefinition }   from './circle'
import { EllipseDefinition }  from './ellipse'
import { TriangleDefinition } from './triangle'
import { LineDefinition }     from './line'

// ShapeDefinition<any> is intentional: Renderer is contravariant on S,
// so no common subtype exists. Generic code calls through the registry
// without needing the concrete S.
export const SHAPE_REGISTRY: Record<ShapeType, ShapeDefinition<any>> = {
  rect:     RectDefinition,
  circle:   CircleDefinition,
  ellipse:  EllipseDefinition,
  triangle: TriangleDefinition,
  line:     LineDefinition,
}
```

**Adding a new shape type** (e.g. `weld-fillet`):
1. Create `src/shapes/weld-fillet/` with `types.ts`, `handles.ts`, `anchors.ts`, `index.ts`, `PropertiesPanel.tsx`
2. Add `'weld-fillet'` to the `ShapeType` union in `src/shapes/index.ts`
3. Register in `SHAPE_REGISTRY`
4. Add to `ShapeUpdate` intersection in `src/store/types.ts`

Nothing else changes. No switch-cases to update.

---

## 6. ShapeUpdate: Intersection-Derived Strict Type

```typescript
// src/store/types.ts

type AllShapeGeometry =
  Omit<RectShape,      'id' | 'type' | 'layerId'> &
  Omit<CircleShape,    'id' | 'type' | 'layerId'> &
  Omit<EllipseShape,   'id' | 'type' | 'layerId'> &
  Omit<TriangleShape,  'id' | 'type' | 'layerId'> &
  Omit<LineShape,      'id' | 'type' | 'layerId'>

export type ShapeUpdate = Partial<AllShapeGeometry & { type: ShapeType }>
```

This type is the union of every mutable field on every shape. A partial update record can contain any combination of these fields. TypeScript will flag unknown field names at every call site. The `Omit` removes identity/classification fields that must never be patched via update.

**Note on new shape types**: When adding a new shape, `AllShapeGeometry` must also be updated (step 4 above). This is the one unavoidable touch-point at the store boundary. It is explicit and type-checked — better than the old flat `Partial<{...all fields...}>` which accepted any field name without validation.

---

## 7. Per-Shape Handle Math (`handles.ts`)

Each shape's `handles.ts` file exports pure functions with no side effects:

```typescript
// Example: src/shapes/rect/handles.ts

interface RectStart extends StartSnapshot {
  width: number
  height: number
}

export function captureRectStart(shape: RectShape): RectStart {
  return { x: shape.x, y: shape.y, rotation: shape.rotation,
           width: shape.width, height: shape.height }
}

export function getRectHandles(shape: RectShape): HandleGeometry {
  const hw = shape.width / 2
  const hh = shape.height / 2
  return {
    bbox: getRectBoundingBox(shape),
    sides: [
      { kind: 'n',  x: 0,   y: -hh, cursor: 'ns-resize' },
      { kind: 'ne', x: hw,  y: -hh, cursor: 'nesw-resize' },
      // … etc
    ],
    scale: { x: hw + 16, y: 0 },
    rotate: { x: 0, y: -(hh + 24) },
  }
}

export function applyRectHandleDrag(
  start: StartSnapshot,
  kind: string,
  ldx: number, ldy: number,
  _startLocalPtr: Point,
  _sinθ: number, _cosθ: number,
): FieldUpdate {
  const s = start as RectStart
  if (kind === 'n')  return { height: Math.max(10, s.height - ldy), y: s.y + ldy * Math.cos(…) }
  if (kind === 'ne') return { width: …, height: …, x: …, y: … }
  // … all handle kinds
  return {}
}
```

**Key math invariant**: All handle positions are in **local coords** (relative to the shape's Group center). Conversion to world coords is done once inside `ShapeHandles.tsx`, not here. `applyHandleDrag` receives `ldx/ldy` which are already in local space, so the pure functions never need `rotation`.

---

## 8. Generic Drag Handle Component (`ShapeHandles.tsx`)

One component handles all shape types:

```typescript
export function ShapeHandles({ shape }: { shape: Shape }) {
  const def = SHAPE_REGISTRY[shape.type]
  if (!def.getHandles || !def.captureStart || !def.applyHandleDrag) return null

  const geo = def.getHandles(shape)

  const startDrag = (kind: string) => (e: KonvaPointerEvent) => {
    const start = def.captureStart!(shape)
    const startPtr = worldToLocal(e.target.getStage()!.getPointerPosition()!, shape)

    // Capture the pointer so pointermove/pointerup fire even if the cursor leaves
    // the element. Required for stylus and touch — without it, drag drops when
    // the pointer briefly leaves the handle rect between frames.
    ;(e.evt.target as Element).setPointerCapture(e.evt.pointerId)

    const onMove = (ev: PointerEvent) => {
      const current = worldToLocal({ x: ev.clientX, y: ev.clientY }, shape)
      const ldx = current.x - startPtr.x
      const ldy = current.y - startPtr.y

      let update: FieldUpdate
      if (kind === 'rotate') {
        const angle = Math.atan2(current.x, -current.y) * (180 / Math.PI)
        update = { rotation: (start.rotation + angle) % 360 }
      } else {
        const θ = (shape.rotation * Math.PI) / 180
        update = def.applyHandleDrag!(start, kind, ldx, ldy, startPtr, Math.sin(θ), Math.cos(θ))
      }
      updateShapeTransient(shape.id, update as ShapeUpdate)
    }

    const onUp = () => {
      const geo0 = def.captureGeometry(shapeAtDragStart)
      const geo1 = def.captureGeometry(currentShape)
      commitShapeUpdate(shape.id, geo0 as ShapeUpdate, geo1 as ShapeUpdate)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <Group>
      {geo.sides.map((h) => (
        <Rect key={h.kind} x={h.x} y={h.y} … onPointerDown={startDrag(h.kind)} />
      ))}
      <Circle x={geo.rotate.x} y={geo.rotate.y} onPointerDown={startDrag('rotate')} />
      <Circle x={geo.scale.x}  y={geo.scale.y}  onPointerDown={startDrag('scale')}  />
    </Group>
  )
}
```

**Pointer Events API**: Use `pointer*` events everywhere (handles, canvas stage, multi-select). This gives identical behaviour for mouse, touch, and stylus with no extra code paths. Never use `mouse*` or `touch*` events in handle components.

### Tablet and stylus specifics

**Handle hit area**: The default rendered handle size of 5 px is too small for a finger or stylus tip. Use a transparent hit-area padding:
- Detect touch capability with `navigator.maxTouchPoints > 0`
- On touch devices: render 8 px visual, 20 px hit rect (`hitStrokeWidth` in Konva)
- On mouse devices: render 5 px visual, 8 px hit rect

**Pinch-to-zoom**: Multi-touch zoom must be handled in `CanvasApp.tsx` by tracking two active pointer IDs simultaneously. On each `pointermove`, compute the distance between the two pointers and derive a scale delta. Do not use `gesturestart`/`gesturechange` (Safari-only and deprecated). Apply scale and position together to the Konva `Stage` so the pinch midpoint stays fixed on screen.

**High-DPI / Retina**: Konva handles pixel ratio via `pixelRatio` prop on `Stage`. Set it to `window.devicePixelRatio` (default). On high-DPI tablets, handle coordinates in world space remain correct; do not scale coordinates manually.

---

## 9. Anchor Points

Anchors are optional per shape (`anchors?` in ShapeDefinition). When provided they return local-coord named points useful for snapping and connector shape attachment.

```typescript
// src/shapes/rect/anchors.ts
export function getRectAnchors(shape: RectShape): AnchorPoint[] {
  const hw = shape.width / 2, hh = shape.height / 2
  return [
    { id: 'tl', x: -hw, y: -hh, direction: 315 },
    { id: 'tc', x: 0,   y: -hh, direction: 270 },  // straight up — top face normal
    { id: 'tr', x: hw,  y: -hh, direction: 45  },
    { id: 'ml', x: -hw, y: 0,   direction: 180 },  // left face normal
    { id: 'c',  x: 0,   y: 0                   },  // interior — no direction
    { id: 'mr', x: hw,  y: 0,   direction: 0   },  // right face normal
    { id: 'bl', x: -hw, y: hh,  direction: 225 },
    { id: 'bc', x: 0,   y: hh,  direction: 90  },  // straight down — bottom face normal
    { id: 'br', x: hw,  y: hh,  direction: 135 },
  ]
}
```

`AnchorPoints.tsx` renders these as small diamonds using `RegularPolygon` (sides=4) in the shape's Konva Group, so they inherit the shape's transform automatically.

**Visibility rule**: show anchors when shape is hovered AND tool is `select` AND shape is NOT currently selected (selection shows handles instead). When the active tool is `connect`, show anchors on all non-selected shapes at all times.

**`direction`** (outward normal angle in degrees, 0 = right): connector shapes read this to align their endpoint tangentially to the surface. Face midpoints get the face normal (90°, 180°, 270°, 0°). Corners get the bisector angle. Interior points omit `direction`.

---

## 10. Connector Shapes & ConnectionsSlice

Connector shapes (weld symbols, dimension lines, cables in electrical apps) differ from regular shapes in one way: their **position derives from the shapes they connect to**. When a profile moves, any weld attached to it must move too.

### Data model

```typescript
// A connector shape stores two optional connection descriptors.
// A non-null connection means the endpoint is anchored to another shape.
interface WeldFilletShape extends ConnectorShape {
  // inherits: connections: { start: ShapeConnection | null, end: ShapeConnection | null }
  leg1: number
  leg2: number
  angle: number
}
```

### Implementing `resolveConnection` on a connector ShapeDefinition

```typescript
// src/shapes/weld-fillet/index.ts
const WeldFilletDefinition: ShapeDefinition<WeldFilletShape> = {
  // …
  resolveConnection: (connection, shapes) => {
    const target = shapes.find((s) => s.id === connection.shapeId)
    if (!target) return null
    const def = SHAPE_REGISTRY[target.type]
    const anchors = def.anchors?.(target) ?? []
    const anchor = anchors.find((a) => a.id === connection.anchorId)
    if (!anchor) return null
    // Convert local anchor coords to world coords using target shape's transform
    return localToWorld({ x: anchor.x, y: anchor.y }, target)
  },
}
```

### ConnectionsSlice

```typescript
// store/slices/connections.ts

interface ConnectionsSlice {
  // Called after any shape position/geometry update.
  // Finds all connector shapes connected to movedShapeId and
  // recomputes their geometry from the updated anchor positions.
  updateConnectedShapes: (movedShapeId: string) => void
}

// Implementation sketch:
updateConnectedShapes: (movedShapeId) => set((state) => {
  const connectors = state.shapes.filter(
    (s): s is ConnectorShape =>
      isConnectorShape(s) &&
      (s.connections.start?.shapeId === movedShapeId ||
       s.connections.end?.shapeId   === movedShapeId)
  )
  if (!connectors.length) return {}

  const updatedShapes = state.shapes.map((s) => {
    if (!connectors.some((c) => c.id === s.id)) return s
    const c = s as ConnectorShape
    const def = SHAPE_REGISTRY[s.type]
    const startPt = c.connections.start
      ? def.resolveConnection!(c.connections.start, state.shapes) : null
    const endPt = c.connections.end
      ? def.resolveConnection!(c.connections.end, state.shapes)   : null
    return { ...s, ...recomputeConnectorGeometry(c, startPt, endPt) }
  })
  return { shapes: updatedShapes }
})
```

### Integration with store actions

Call `updateConnectedShapes` inside both `updateShapeTransient` and `commitShapeUpdate` after applying the patch, so connector positions stay live during drag:

```typescript
updateShapeTransient: (id, patch) => {
  set((s) => ({ shapes: applyPatch(s.shapes, id, patch) }))
  get().updateConnectedShapes(id)
}
```

### Connect tool

A `connect` tool mode activates anchor visibility on all shapes. The user clicks a source anchor (sets `pendingConnection`), then clicks a target anchor. The store creates the connector shape with `connections.start` and `connections.end` set. The connector's `Renderer` reads `resolveConnection` at render time to compute its actual endpoint world positions.

### History

Connection changes (attaching/detaching a connector) are committed to history using the same `commitShapeUpdate` pattern. The `before` snapshot has `connections: { start: null, end: null }`, the `after` has the set connections. Undo restores the free-floating state.

---

## 11. Layer System

### Data model

```typescript
export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
}
```

Layers are **metadata only**. Shapes carry `layerId?: string`. The store injects `activeLayerId` on `addShape`:

```typescript
addShape: (shape) => set((s) => ({
  shapes: [...s.shapes, { ...shape, layerId: shape.layerId ?? s.activeLayerId }],
}))
```

This avoids nesting `shapes[]` inside `layers[]` — the flat shape array is easier to iterate for history, export, validation, and BOM extraction.

### Rendering

One Konva `<Layer>` per canvas layer, in z-order. All interactive controls (handles, anchors, multi-select box) live in a separate top-most Konva Layer that is always rendered last.

```tsx
{layers.map((layer) => (
  <KonvaLayer key={layer.id} opacity={layer.opacity} visible={layer.visible}>
    {shapes
      .filter((s) => s.layerId === layer.id)
      .map((s) => <ShapeNode key={s.id} shape={s} layerLocked={layer.locked} />)}
  </KonvaLayer>
))}
<KonvaLayer>  {/* controls — always on top */}
  <ShapeHandles … />
  <MultiShapeHandles … />
</KonvaLayer>
```

### Layer history

Layer operations (add, rename, reorder, delete) are NOT tracked in undo/redo history. History tracks only shape geometry changes. This matches Figma/Sketch behaviour and keeps history complexity manageable.

---

## 12. History (Undo/Redo)

```typescript
export interface HistoryEntry {
  shapeId: string
  before: ShapeUpdate
  after: ShapeUpdate
}

// store actions:
commitShapeUpdate(id, before, after)   // push entry, apply `after`
undo()                                 // apply entry.before
redo()                                 // apply entry.after
```

The pattern is **command-based with snapshots**: each entry is a before/after pair for a single shape. Multi-shape operations push one entry per shape. The store keeps a cursor (current index) into a flat array of entries.

Transient updates (`updateShapeTransient`) do NOT push history — they allow live preview during drag. The drag-end event calls `commitShapeUpdate` with the captured before/after.

---

## 13. Properties Panel Pattern

The `PropertiesSidebar` renders the shape-specific panel through the registry:

```tsx
const { PropertiesPanel } = SHAPE_REGISTRY[shape.type]
return (
  <div>
    <PropertiesPanel shape={shape as never} />  {/* shape-specific fields */}
    {/* … shared opacity, fill, stroke controls below */}
  </div>
)
```

`as never` is the correct escape hatch when the container receives `Shape` (union) but the registry's `PropertiesPanel` expects the concrete subtype `S`. The registry ensures the component and shape type always match; the cast is safe by construction.

### NumericField sync pattern

Numeric inputs need to display live values during handle drags while also allowing free text editing. The solution: two pieces of state, one tracking the last seen prop value:

```typescript
function NumericField({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [prevProp, setPrevProp] = useState(value)
  const [local, setLocal] = useState(String(Math.round(value)))

  // Runs synchronously during render before paint — updates local display
  // whenever the prop changes (e.g. from a handle drag).
  if (prevProp !== value) {
    setPrevProp(value)
    setLocal(String(Math.round(value)))
  }

  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = parseFloat(local)
        if (!isNaN(n)) onCommit(n)
        else setLocal(String(Math.round(value)))  // revert on bad input
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}
```

Do NOT use `useEffect` here — it runs after paint, causing a visible one-frame stale value during fast drags.
Do NOT use `useRef.current` during render — modern lint rules prohibit it.

---

## 14. Document Codec (Persistence)

```typescript
// Encode: shapes grouped by layer, layer metadata alongside
encodeDocument({ shapes, layers }) => DocumentFormat

// Decode: flat array of shapes with injected layerId, layer metadata restored
decodeDocument(doc) => { shapes, layers, activeLayerId }
```

The codec is the single place where the serialization format is defined. Shape types are encoded as their string literal (`'rect'`, `'circle'`, etc.). The registry is used to validate or migrate shape data on decode.

**Schema versioning**: Keep a `SCHEMA_VERSION` integer in the document root. When adding new fields to shapes, increment the version and add a migration function in the codec. This is required whenever documents are persisted remotely — old documents must be upgradeable without data loss.

---

## 15. Domain Extension Points

These are patterns for features that appear in most domain-specific canvas editors. Each is a separate slice or optional field on `ShapeDefinition` — none of them touch the core infrastructure.

### DocumentSlice (backend sync)

When the app needs remote persistence (Supabase, Firestore, custom API), add a `DocumentSlice`:

```typescript
interface DocumentSlice {
  documentId: string | null
  documentName: string
  isSaving: boolean
  lastSavedAt: Date | null
  isDirty: boolean        // true after any commitShapeUpdate, false after successful save
  saveDocument: () => Promise<void>
  loadDocument: (id: string) => Promise<void>
  createDocument: (name: string) => Promise<void>
}
```

The store operates locally (as now); `saveDocument` serializes via `documentCodec` and PATCHes the backend. Set `isDirty = true` on every `commitShapeUpdate`, `false` on successful save. Use debounced autosave triggered by the history cursor advancing.

**Supabase schema**:
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,          -- full CanvasDocument JSON
  schema_version INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON documents USING (owner_id = auth.uid());
```

### ValidationSlice (domain rules)

Domain apps often enforce geometric or semantic rules (e.g. "a fillet weld cannot be placed on a butt joint face", "minimum leg size for this plate thickness is 4 mm"). Add a `ValidationSlice`:

```typescript
interface ValidationViolation {
  shapeId: string
  anchorId?: string     // if the violation is localized to a connection point
  message: string
  severity: 'error' | 'warning'
}

interface ValidationContext {
  shapes: Shape[]
  // domain-specific context: material properties, applicable standard, etc.
}

interface ValidationSlice {
  violations: ValidationViolation[]
  validateAll: () => void              // full re-validation after load
  validateShape: (id: string) => void  // incremental, called after commitShapeUpdate
}
```

Validation rules live in per-shape `validators.ts` and are registered as optional `validate?` on `ShapeDefinition` (defined in Section 4). `ValidationSlice` iterates the registry and collects violations. `ShapeNode` receives an `isViolating` prop and renders a red outline when true.

### ShapeLibrary panel

Domain apps often provide a palette of pre-configured shapes (standard profile sizes, certified weld symbols). A `ShapeLibrary` is a static list of factory functions grouped by category — not part of the store:

```typescript
interface LibraryItem {
  label: string
  category: string
  create: (pos: Point) => Shape   // calls registry's create with preset properties
  thumbnail: string               // SVG string or data URL for the palette tile
}
```

The library panel renders items as draggable tiles. On drop onto the canvas, `addShape` is called with `item.create(dropPos)`. The library is static configuration — no slice needed.

### Unit system

For precision-domain apps (structural engineering, fabrication), add a `units` field to the document root:

```typescript
type UnitSystem = 'mm' | 'cm' | 'in'
const UNIT_FACTORS: Record<UnitSystem, number> = { mm: 1, cm: 10, in: 25.4 }
```

All internal values are stored in millimetres. `NumericField` receives a `unit` prop and applies the conversion factor for display and parsing. No unit logic spreads into shape math — shapes always work in mm internally.

---

## 16. Applying This Pattern to the Welder Documentation App

### Domain shapes to implement

| ShapeType | Geometry | Key properties | Anchors |
|---|---|---|---|
| `profile-l` | L-profile cross-section | width, height, thickness | corners + face midpoints |
| `profile-i` | I-beam cross-section | width, height, flangeThickness, webThickness | 8 face midpoints + centroid |
| `profile-t` | T-profile | width, height, flangeThickness, webThickness | 5 face midpoints + centroid |
| `plate` | Rect with thickness label | width, height, thickness | same as rect |
| `pipe` | Circle/ellipse with wall | outerRadius, wallThickness | 4 cardinals + center |
| `weld-fillet` | Triangle symbol + leg labels | leg1, leg2, angle | tip + base midpoints |
| `weld-groove` | V/U/J groove symbol | angle, rootGap, depth | as needed |
| `weld-spot` | Circle + X symbol | diameter | center |
| `dimension` | Arrow + text | length, unit, precision | endpoints |
| `note` | Text box | text, fontSize | corners |

Weld shapes (`weld-fillet`, `weld-groove`, `weld-spot`) are **connector shapes** — they extend `ConnectorShape` and implement `resolveConnection`.

### Recommended additions over base pattern

1. **Shape morphing on drag** — when a handle drag on a symmetric shape creates asymmetry, emit `{ type: 'ellipse', … }` in `applyHandleDrag`. The store applies it via `ShapeUpdate` which includes `type`. Use this for `pipe` → `pipe-elliptical` morph when dragged asymmetrically.

2. **Weld symbol placement** — weld shapes are connector shapes. They store `connections.start` pointing to the anchor on the joint face of a profile. `resolveConnection` computes the world position from that anchor at render time, so the weld symbol follows the profile automatically when it moves.

3. **Validation** — implement `ValidationSlice` from Section 15. Rules specific to welding (minimum leg sizes, prohibited joint configurations, standard compliance) live in `src/shapes/weld-*/validators.ts`.

4. **Unit system** — `mm` by default; expose `cm` and `in` toggle in document settings. Use the unit conversion pattern from Section 15. Numeric inputs in all weld and profile panels display in the selected unit.

5. **BOM extraction** — because all geometry is in pure functions (`captureGeometry`, `getBoundingBox`), a separate pass can iterate shapes, call registry functions, and produce a bill-of-materials table without rendering. No DOM dependency, runs anywhere.

6. **SVG/DXF export** — implement `toSVG` and `toDXF` on each shape's `ShapeDefinition`. A thin export module iterates `SHAPE_REGISTRY` and concatenates output. The registry dispatch handles the rest — no central switch-case.

### What NOT to change

- The registry pattern itself — it scales to 30+ shape types without modification
- The `FieldUpdate` / `ShapeUpdate` boundary — the circular-dependency solution is correct
- The layer system — metadata-only layers with `layerId` on shapes is the right separation
- The history pattern — before/after snapshots per shape remain correct for the welder domain
- The pointer events API — required for stylus input (Wacom tablets used in fabrication shops)
- `setPointerCapture` on drag start — required for reliable drag on touch and stylus

---

## 17. Technical Risks

### Konva.js vs. SVG

**Konva.js** (HTML5 Canvas) is the right choice for:
- Large shape counts (200+) without layout performance issues
- Visual effects (filters, drop shadows, custom compositing)
- Desktop-first applications with keyboard-heavy interaction

**Risks with Konva on tablet / stylus**:
- HTML5 Canvas does not auto-scale for high-DPI. Konva handles this via `pixelRatio`, but interaction handles based on `mouse*` events can behave unpredictably — mitigated by using Pointer Events API + `setPointerCapture` (Section 8).
- Konva hit detection is pixel-based, not DOM-based. There are no native accessible semantics. Screen reader support requires a separate ARIA-labelled DOM overlay if accessibility is required.
- Test on a real Wacom tablet early — stylus jitter and hover behaviour differ from mouse.

**When SVG would be the better choice**:
- Accessibility is a hard requirement (screen readers can traverse SVG DOM natively)
- SVG or DXF is the primary export deliverable (geometry is already described, no rasterisation)
- The app is primarily used on a touch device where DOM-native pointer events are more reliable

**Decision for this pattern**: Konva is the correct choice for performance and visual flexibility at the shape counts required. The touch/stylus gap is closed by Pointer Events API + `setPointerCapture`. If the app ever pivots to SVG-primary output, the `toSVG` method on `ShapeDefinition` provides the geometry without requiring a renderer change.

---

## 18. Pattern Summary (One Page)

```
ShapeType (closed union)
  │
  └─► SHAPE_REGISTRY[type] → ShapeDefinition<S>
        │
        ├── create(pos)                  → new S
        ├── Renderer                     → Konva Group (JSX)
        ├── PropertiesPanel              → sidebar form (JSX)
        ├── captureGeometry(s)           → FieldUpdate (before/after snapshot)
        ├── getBoundingBox(s)            → BoundingBox (world)
        ├── getWorldPoints(s)            → Point[] (for multi-select)
        ├── getHandles(s)                → HandleGeometry | null
        ├── captureStart(s)              → StartSnapshot | null
        ├── applyHandleDrag(…)           → FieldUpdate | null
        ├── anchors?(s)                  → AnchorPoint[]  (with direction)
        ├── resolveConnection?(c, ss)    → Point | null   (connector shapes)
        ├── validate?(s, ctx)            → ValidationViolation[]
        └── toSVG?(s) / toDXF?(s)       → string

Store
  ├── shapes: Shape[]                    (flat array, layerId on each)
  ├── layers: Layer[]                    (metadata only)
  ├── history: HistoryEntry[]            (before/after ShapeUpdate per shape)
  ├── updateShapeTransient(id, patch)    (live drag, no history)
  ├── commitShapeUpdate(id, b, a)        (end of drag, pushes history)
  └── updateConnectedShapes(movedId)     (propagates position to connector shapes)

ShapeHandles (generic)
  └── reads registry → renders handles → applyHandleDrag → updateShapeTransient

PropertiesSidebar (generic)
  └── reads registry → renders PropertiesPanel + shared opacity/color controls

AnchorPoints (generic)
  └── reads registry → renders anchor diamonds in local coords

CanvasApp
  └── one Konva Layer per canvas layer + one controls Layer on top

Domain extensions (optional, per-app)
  ├── DocumentSlice   → backend sync, isDirty flag, debounced autosave
  ├── ValidationSlice → per-shape validators, violation highlighting in renderer
  └── ShapeLibrary    → static palette of preset shapes, drag-to-canvas
```

**Adding a new shape type touches exactly four places**:
1. `src/shapes/[new-type]/` — new directory (types, handles, anchors, index, PropertiesPanel)
2. `src/shapes/index.ts` — one line added to `ShapeType` union
3. `src/shapes/registry.ts` — one line added to `SHAPE_REGISTRY`
4. `src/store/types.ts` — one line added to `AllShapeGeometry` intersection

No other file changes. The infrastructure runs the new shape automatically.
