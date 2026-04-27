import type { ShapeType } from './_base/types'
import type { ShapeDefinition } from './_base/definition'
import { rectDefinition } from './rect'
import { circleDefinition } from './circle'
import { ellipseDefinition } from './ellipse'
import { triangleDefinition } from './triangle'
import { lineDefinition } from './line'

export const SHAPE_REGISTRY: Record<ShapeType, ShapeDefinition<any>> = {
  rect: rectDefinition,
  circle: circleDefinition,
  ellipse: ellipseDefinition,
  triangle: triangleDefinition,
  line: lineDefinition,
}

export const SHAPE_TYPES = Object.keys(SHAPE_REGISTRY) as ShapeType[]
