export type { Shape, ShapeType, ShapeProperties, BaseShape, RectShape, CircleShape, EllipseShape, TriangleShape, LineShape } from '@/shapes'

import type { Shape, ShapeType, ShapeProperties, Point } from '@/shapes'

export type { Point }

export type ShapeUpdate = Partial<{
  type: ShapeType
  x: number
  y: number
  rotation: number
  opacity: number
  stroke: string
  strokeWidth: number
  fill: string
  width: number
  height: number
  cornerRadius: number
  radius: number
  radiusX: number
  radiusY: number
  points: number[]
  dash: boolean
  vertices: [number, number, number, number, number, number]
}>

export type ShapeUpdatePair = { id: string; before: ShapeUpdate; after: ShapeUpdate }

export interface CanvasState {
  shapes: Shape[]
  selectedShapeIds: string[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  canvasScale: number
  canvasPosition: Point
}
