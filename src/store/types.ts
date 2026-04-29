export type {
  Shape,
  ShapeType,
  ShapeProperties,
  BaseShape,
  RectShape,
  CircleShape,
  EllipseShape,
  TriangleShape,
  LineShape,
} from '@/shapes'

import type { Shape, ShapeType, ShapeProperties, Point } from '@/shapes'
import type { RectShape, CircleShape, EllipseShape, TriangleShape, LineShape } from '@/shapes'

export type { Point }

// Derived from actual shape types — auto-updates when shapes change.
// Intersection of all shape geometries makes all fields available as optional.
type AllShapeGeometry = Omit<RectShape, 'id' | 'type' | 'layerId'> &
  Omit<CircleShape, 'id' | 'type' | 'layerId'> &
  Omit<EllipseShape, 'id' | 'type' | 'layerId'> &
  Omit<TriangleShape, 'id' | 'type' | 'layerId'> &
  Omit<LineShape, 'id' | 'type' | 'layerId'>

export type ShapeUpdate = Partial<AllShapeGeometry & { type: ShapeType }>

export type ShapeUpdatePair = { id: string; before: ShapeUpdate; after: ShapeUpdate }

export interface CanvasState {
  shapes: Shape[]
  selectedShapeIds: string[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  canvasScale: number
  canvasPosition: Point
}
