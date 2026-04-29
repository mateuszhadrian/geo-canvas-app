import type { ComponentType } from 'react'
import type {
  BaseShape,
  ShapeType,
  Point,
  BoundingBox,
  HandleGeometry,
  AnchorPoint,
  StartSnapshot,
  FieldUpdate,
  HandleKind,
} from './types'

export interface ShapeDefinition<S extends BaseShape = BaseShape> {
  type: ShapeType
  label: string
  icon: ComponentType

  create: (pos: Point) => S
  Renderer: ComponentType<{ shape: S; isSelected: boolean }>
  PropertiesPanel: ComponentType<{ shape: S }>

  // ── Geometry / bounds ─────────────────────────────────────────────────────
  /** Capture all geometric fields needed to undo/redo a drag. */
  captureGeometry: (shape: S) => FieldUpdate
  /** Axis-aligned bounding box in WORLD coords. */
  getBoundingBox: (shape: S) => BoundingBox
  /** World-space points used to compute multi-selection bbox. */
  getWorldPoints: (shape: S) => Point[]

  // ── Handle system ─────────────────────────────────────────────────────────
  // Null for shapes that use a custom handle component (e.g. line → MultiLineHandles).
  getHandles: ((shape: S) => HandleGeometry) | null
  captureStart: ((shape: S) => StartSnapshot) | null
  applyHandleDrag:
    | ((
        start: StartSnapshot,
        kind: HandleKind,
        ldx: number,
        ldy: number,
        startLocalPtr: Point,
        sinθ: number,
        cosθ: number
      ) => FieldUpdate)
    | null

  // ── Anchor points ─────────────────────────────────────────────────────────
  // LOCAL coords (relative to shape center). Used for connector attachments.
  anchors?: (shape: S) => AnchorPoint[]
}
