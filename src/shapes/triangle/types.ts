import type { BaseShape } from '../_base/types'

export interface TriangleShape extends BaseShape {
  type: 'triangle'
  radius: number
  fill: string
}
