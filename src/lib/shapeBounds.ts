import type { Shape } from '@/shapes'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import type { BoundingBox } from '@/shapes/_base/types'

export type { BoundingBox }

/** Axis-aligned bounding box in world coords. Delegates to ShapeDefinition. */
export function getShapeBoundingBox(shape: Shape): BoundingBox {
  return SHAPE_REGISTRY[shape.type].getBoundingBox(shape)
}

export function intersectsBoundingBox(a: BoundingBox, b: BoundingBox): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1
}
