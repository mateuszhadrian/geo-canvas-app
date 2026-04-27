import type { BaseShape } from './types'

export const BASE_DEFAULTS: Omit<BaseShape, 'id' | 'type' | 'x' | 'y'> = {
  rotation: 0,
  opacity: 1,
  stroke: '#333333',
  strokeWidth: 2,
}
