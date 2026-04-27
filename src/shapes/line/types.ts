import type { BaseShape } from '../_base/types'

export interface LineShape extends BaseShape {
  type: 'line'
  points: number[]
  dash: boolean
}
