import type { BaseShape } from '../_base/types'

export interface RectShape extends BaseShape {
  type: 'rect'
  width: number
  height: number
  fill: string
  cornerRadius: number
}
