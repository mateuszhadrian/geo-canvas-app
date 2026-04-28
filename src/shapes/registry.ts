import type { ShapeType } from './_base/types'
import type { ShapeDefinition } from './_base/definition'
import { rectDefinition } from './rect'
import { circleDefinition } from './circle'
import { ellipseDefinition } from './ellipse'
import { triangleDefinition } from './triangle'
import { lineDefinition } from './line'

// ShapeDefinition<any> is intentional: the registry is a heterogeneous map where each
// entry uses a different concrete shape type. ShapeDefinition<S> is invariant in S
// (Renderer is contravariant), so no common subtype exists — any is the correct escape.
export const SHAPE_REGISTRY: Record<ShapeType, ShapeDefinition<any>> = {
  rect: rectDefinition,
  circle: circleDefinition,
  ellipse: ellipseDefinition,
  triangle: triangleDefinition,
  line: lineDefinition,
}

export const SHAPE_TYPES = Object.keys(SHAPE_REGISTRY) as ShapeType[]
