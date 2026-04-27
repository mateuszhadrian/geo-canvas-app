export type { Shape, ShapeType, ShapeProperties, BaseShape, RectShape, CircleShape, EllipseShape, TriangleShape, LineShape } from '@/shapes'

import type { Shape, ShapeType, ShapeProperties } from '@/shapes'

export type ShapeUpdate = Partial<{
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
}>

export interface CanvasState {
  shapes: Shape[]
  selectedShapeIds: string[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  canvasScale: number
  canvasPosition: { x: number; y: number }
}
