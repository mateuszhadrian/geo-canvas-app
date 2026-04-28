import type { Shape } from '@/shapes'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import type { ShapeUpdate } from '@/store/types'

/** Capture all geometry fields for undo/redo snapshots. Delegates to ShapeDefinition. */
export function captureGeometry(shape: Shape): ShapeUpdate {
  return SHAPE_REGISTRY[shape.type].captureGeometry(shape) as ShapeUpdate
}
