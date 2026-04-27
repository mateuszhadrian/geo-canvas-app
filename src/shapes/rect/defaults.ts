import type { RectShape } from './types'
import { BASE_DEFAULTS } from '../_base/defaults'

export const RECT_DEFAULTS: Omit<RectShape, 'id' | 'x' | 'y'> = {
  ...BASE_DEFAULTS,
  type: 'rect',
  width: 100,
  height: 70,
  fill: '#4A90D9',
  cornerRadius: 0,
}
