import type { Shape, ShapeType, ShapeProperties } from '@/shapes'
import type { ShapeUpdate, ShapeUpdatePair } from '../types'

export interface ShapesSlice {
  shapes: Shape[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  addShape: (shape: Shape) => void
  removeShape: (id: string) => void
  removeShapes: (ids: string[]) => void
  updateShape: (id: string, updates: ShapeUpdate) => void
  updateShapeTransient: (id: string, updates: ShapeUpdate) => void
  moveShapes: (items: ShapeUpdatePair[]) => void
  commitShapeUpdate: (id: string, before: ShapeUpdate, after: ShapeUpdate) => void
  commitShapesUpdate: (updates: ShapeUpdatePair[]) => void
  setShapes: (shapes: Shape[]) => void
  bringForward: (ids: string[]) => void
  bringToFront: (ids: string[]) => void
  sendBackward: (ids: string[]) => void
  sendToBack: (ids: string[]) => void
}
