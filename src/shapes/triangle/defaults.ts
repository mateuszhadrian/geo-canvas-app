import type { TriangleShape } from './types'
import { BASE_DEFAULTS } from '../_base/defaults'

export const TRIANGLE_DEFAULTS: Omit<TriangleShape, 'id' | 'x' | 'y'> = {
  ...BASE_DEFAULTS,
  type: 'triangle',
  radius: 45,
  fill: '#27AE60',
}
