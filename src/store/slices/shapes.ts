import type { Shape, ShapeType, ShapeProperties } from '@/shapes'
import type { ShapeUpdate } from '../types'

export interface ShapesSlice {
  shapes: Shape[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  addShape: (shape: Shape) => void
  removeShape: (id: string) => void
  updateShape: (id: string, updates: ShapeUpdate) => void
  setShapes: (shapes: Shape[]) => void
}
