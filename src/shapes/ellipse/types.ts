import type { BaseShape } from '../_base/types'

export interface EllipseShape extends BaseShape {
  type: 'ellipse'
  radiusX: number
  radiusY: number
  fill: string
}
