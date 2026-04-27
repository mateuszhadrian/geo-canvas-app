import type { BaseShape } from '../_base/types'

export interface CircleShape extends BaseShape {
  type: 'circle'
  radius: number
  fill: string
}
