import type { EllipseShape } from './types'
import { BASE_DEFAULTS } from '../_base/defaults'

export const ELLIPSE_DEFAULTS: Omit<EllipseShape, 'id' | 'x' | 'y'> = {
  ...BASE_DEFAULTS,
  type: 'ellipse',
  radiusX: 70,
  radiusY: 40,
  fill: '#C0392B',
}
