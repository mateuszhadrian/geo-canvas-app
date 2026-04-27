# Application Structure Analysis — Shape-Centric Architecture

## Current State

The codebase is small but already shows the scaling problem. Shape-specific logic lives scattered across multiple files:

| Concern | Current location |
|---|---|
| Type definitions | `src/store/types.ts` — all shapes in one file |
| Factory functions | `src/components/canvas/CanvasApp.tsx` — `createShape()` switch |
| Konva renderers | `src/components/canvas/CanvasApp.tsx` — `ShapeNode` switch |
| Labels / metadata | `src/components/canvas/CanvasApp.tsx` — `LABELS` constant |
| Properties panel | Not yet built |

Adding edge-beveling to `rect` today would require touching at least 3 places. At 10 shapes × 5–10 properties each, that becomes unworkable.

---

## Proposed Structure

```
src/
├── app/                         # Next.js App Router (unchanged)
├── components/
│   ├── canvas/
│   │   ├── CanvasAppClient.tsx  # SSR wrapper (unchanged)
│   │   ├── CanvasApp.tsx        # Stage + Layer + shape loop (thin)
│   │   └── ShapeNode.tsx        # dispatches to shape renderers via registry
│   ├── toolbar/
│   │   └── ShapeToolbar.tsx     # add-shape buttons (reads registry)
│   └── properties/
│       └── PropertiesPanel.tsx  # dispatches to shape property panels via registry
├── shapes/
│   ├── _base/
│   │   ├── types.ts             # BaseShape interface
│   │   └── defaults.ts          # shared base defaults (opacity, stroke, etc.)
│   ├── rect/
│   │   ├── types.ts             # RectShape, RectUpdate
│   │   ├── defaults.ts          # default width, height, fill, cornerRadius
│   │   ├── factory.ts           # createRect(overrides?) → RectShape
│   │   ├── Renderer.tsx         # <RectNode shape={...} />
│   │   ├── PropertiesPanel.tsx  # width / height / fill / cornerRadius controls
│   │   └── index.ts             # re-exports + ShapeDefinition object
│   ├── circle/
│   │   ├── types.ts
│   │   ├── defaults.ts
│   │   ├── factory.ts
│   │   ├── Renderer.tsx
│   │   ├── PropertiesPanel.tsx
│   │   └── index.ts
│   ├── ellipse/
│   │   └── (same pattern)
│   ├── triangle/
│   │   └── (same pattern)
│   ├── line/
│   │   └── (same pattern)
│   ├── custom/                  # future: groups / compound shapes
│   │   └── (same pattern)
│   └── registry.ts              # aggregates all ShapeDefinition objects
├── store/
│   ├── slices/
│   │   ├── shapes.ts            # shapes[], addShape, removeShape, updateShape
│   │   ├── selection.ts         # selectedShapeIds, setSelectedShapeIds
│   │   └── viewport.ts          # canvasScale, canvasPosition
│   ├── use-canvas-store.ts      # combines slices via Zustand
│   └── types.ts                 # CanvasState (store-level types only)
├── lib/
│   └── generateId.ts
└── types/
    └── index.ts                 # public re-exports (Shape, ShapeType, etc.)
```

---

## Shape Module Anatomy

Every shape lives in `src/shapes/<name>/` and exports a **ShapeDefinition** object:

```typescript
// src/shapes/_base/definition.ts
export interface ShapeDefinition<S extends BaseShape = BaseShape> {
  type:             S['type']
  label:            string                              // "Rectangle", "Circle" …
  icon:             React.ComponentType                 // lucide-react icon
  defaults:         Omit<S, 'id' | 'x' | 'y'>          // used by factory + sticky defaults
  create:           (pos: { x: number; y: number }, overrides?: Partial<S>) => S
  Renderer:         React.ComponentType<RendererProps<S>>
  PropertiesPanel:  React.ComponentType<PanelProps<S>>
}
```

### What goes in each file

| File | Responsibility |
|---|---|
| `types.ts` | TypeScript interface for this shape + its specific `Update` type |
| `defaults.ts` | Default property values (fill colour, size, cornerRadius …) |
| `factory.ts` | `create(pos, overrides?)` — returns a fully typed shape object |
| `Renderer.tsx` | Single Konva component — all visual logic for this shape |
| `PropertiesPanel.tsx` | Sidebar controls for this shape's properties |
| `index.ts` | Assembles and exports the `ShapeDefinition` object |

Example for `rect/index.ts`:

```typescript
import type { ShapeDefinition } from '../_base/definition'
import type { RectShape } from './types'
import { RECT_DEFAULTS } from './defaults'
import { createRect } from './factory'
import { RectRenderer } from './Renderer'
import { RectPropertiesPanel } from './PropertiesPanel'
import { Square } from 'lucide-react'

export const rectDefinition: ShapeDefinition<RectShape> = {
  type:            'rect',
  label:           'Rectangle',
  icon:            Square,
  defaults:        RECT_DEFAULTS,
  create:          createRect,
  Renderer:        RectRenderer,
  PropertiesPanel: RectPropertiesPanel,
}
```

---

## Shape Registry

`src/shapes/registry.ts` is the single file that knows about all shapes:

```typescript
import { rectDefinition }     from './rect'
import { circleDefinition }   from './circle'
import { ellipseDefinition }  from './ellipse'
import { triangleDefinition } from './triangle'
import { lineDefinition }     from './line'
import type { ShapeType }     from './_base/types'
import type { ShapeDefinition } from './_base/definition'

export const SHAPE_REGISTRY: Record<ShapeType, ShapeDefinition> = {
  rect:     rectDefinition,
  circle:   circleDefinition,
  ellipse:  ellipseDefinition,
  triangle: triangleDefinition,
  line:     lineDefinition,
}

export const SHAPE_TYPES = Object.keys(SHAPE_REGISTRY) as ShapeType[]
```

**Consumers never import from individual shape modules directly** — they go through the registry. This is the key rule that keeps the rest of the app shape-agnostic.

### How consumers use the registry

```typescript
// ShapeNode.tsx — zero shape-specific code
function ShapeNode({ shape }: { shape: Shape }) {
  const { Renderer } = SHAPE_REGISTRY[shape.type]
  return <Renderer shape={shape} />
}

// PropertiesPanel.tsx — zero shape-specific code
function PropertiesPanel({ shape }: { shape: Shape }) {
  const { PropertiesPanel } = SHAPE_REGISTRY[shape.type]
  return <PropertiesPanel shape={shape} />
}

// ShapeToolbar.tsx — zero shape-specific code
function ShapeToolbar() {
  return SHAPE_TYPES.map((type) => {
    const { label, icon: Icon, create } = SHAPE_REGISTRY[type]
    return <ToolbarButton key={type} label={label} icon={Icon} onCreate={create} />
  })
}
```

---

## Adding a New Shape (checklist)

When adding e.g. `polygon`:

1. Create `src/shapes/polygon/` with all 6 files
2. Add `'polygon'` to the `ShapeType` union in `src/shapes/_base/types.ts`
3. Import and add `polygonDefinition` to `SHAPE_REGISTRY` in `registry.ts`
4. Done — toolbar, canvas, and properties panel all pick it up automatically

**No other files need to change.**

---

## Modifying a Single Shape (example: bevel corners on rect)

All work happens inside `src/shapes/rect/`:

1. `types.ts` — add `bevelRadius: number` to `RectShape`
2. `defaults.ts` — add `bevelRadius: 0`
3. `factory.ts` — include `bevelRadius` in the created object
4. `Renderer.tsx` — pass `cornerRadius` computed from `bevelRadius` to Konva `<Rect>`
5. `PropertiesPanel.tsx` — add a slider for `bevelRadius`

**No other files need to change.**

---

## Future: Compound / Custom Shapes

When grouping (MVP Extended) or a `customShape` type arrives, create `src/shapes/custom/` following the same pattern. The `CustomShape` interface will reference child shape IDs:

```typescript
export interface CustomShape extends BaseShape {
  type: 'custom'
  childIds: string[]   // references other shapes in the store
  label: string        // user-defined group name
}
```

Its `Renderer` renders child shapes; its `PropertiesPanel` shows aggregate controls. The registry handles the rest.

---

## Store Slices

Splitting the store by concern (not by shape) keeps the shape modules independent of store internals:

```
store/slices/shapes.ts     — CRUD on the shapes array
store/slices/selection.ts  — which shape IDs are selected
store/slices/viewport.ts   — pan / zoom / canvas transform
store/slices/history.ts    — undo/redo stack (MVP Extended, zundo)
```

Shape-specific state (e.g. "is this rect in bevel-edit mode") stays in the shape's component, not the store — unless it needs to survive navigation or undo.

---

## Migration Path from Current Code

The refactor can be done incrementally without breaking anything:

1. **Create `src/shapes/_base/types.ts`** — move `BaseShape` and `ShapeType` union there
2. **Create one shape module** (start with `rect/`) — move its type, factory branch, and renderer branch
3. **Create `registry.ts`** — register only `rect` for now; others still in old files
4. **Update `ShapeNode`** to use registry for `rect`, fall through to old code for the rest
5. **Repeat for each shape**, removing old code as you go
6. **Split the store** into slices once shape modules are stable

Each step is independently shippable and the app keeps working throughout.
