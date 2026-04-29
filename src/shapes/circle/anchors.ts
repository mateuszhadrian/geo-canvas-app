import type { CircleShape } from './types'
import type { AnchorPoint } from '../_base/types'

export function getCircleAnchors(shape: CircleShape): AnchorPoint[] {
  const R = shape.radius
  return [
    { id: 'top', x: 0, y: -R },
    { id: 'right', x: R, y: 0 },
    { id: 'bottom', x: 0, y: R },
    { id: 'left', x: -R, y: 0 },
    { id: 'center', x: 0, y: 0 },
  ]
}
