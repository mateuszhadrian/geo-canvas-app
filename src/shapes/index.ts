export type { BaseShape, ShapeType } from './_base/types'
export type { RectShape } from './rect/types'
export type { CircleShape } from './circle/types'
export type { EllipseShape } from './ellipse/types'
export type { TriangleShape } from './triangle/types'
export type { LineShape } from './line/types'

import type { RectShape } from './rect/types'
import type { CircleShape } from './circle/types'
import type { EllipseShape } from './ellipse/types'
import type { TriangleShape } from './triangle/types'
import type { LineShape } from './line/types'

export type Shape = RectShape | CircleShape | EllipseShape | TriangleShape | LineShape
export type ShapeProperties = Omit<Shape, 'id' | 'type' | 'x' | 'y'>
