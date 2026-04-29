import type { RectShape } from './types'
import type { AnchorPoint } from '../_base/types'

export function getRectAnchors(shape: RectShape): AnchorPoint[] {
  const hw = shape.width / 2
  const hh = shape.height / 2
  return [
    { id: 'tl', x: -hw, y: -hh },
    { id: 'tc', x: 0, y: -hh },
    { id: 'tr', x: hw, y: -hh },
    { id: 'ml', x: -hw, y: 0 },
    { id: 'c', x: 0, y: 0 },
    { id: 'mr', x: hw, y: 0 },
    { id: 'bl', x: -hw, y: hh },
    { id: 'bc', x: 0, y: hh },
    { id: 'br', x: hw, y: hh },
  ]
}
