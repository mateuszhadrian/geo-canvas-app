import type { LineShape } from './types'
import { BASE_DEFAULTS } from '../_base/defaults'

export const LINE_DEFAULTS: Omit<LineShape, 'id' | 'x' | 'y'> = {
  ...BASE_DEFAULTS,
  type: 'line',
  points: [],
  dash: false,
}
