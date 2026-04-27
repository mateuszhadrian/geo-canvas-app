import type { CircleShape } from './types'
import { BASE_DEFAULTS } from '../_base/defaults'

export const CIRCLE_DEFAULTS: Omit<CircleShape, 'id' | 'x' | 'y'> = {
  ...BASE_DEFAULTS,
  type: 'circle',
  radius: 45,
  fill: '#E8A838',
}
