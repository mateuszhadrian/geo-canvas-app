import type { EllipseShape } from './types'
import type { AnchorPoint } from '../_base/types'

export function getEllipseAnchors(shape: EllipseShape): AnchorPoint[] {
  const rX = shape.radiusX,
    rY = shape.radiusY
  return [
    { id: 'top', x: 0, y: -rY },
    { id: 'right', x: rX, y: 0 },
    { id: 'bottom', x: 0, y: rY },
    { id: 'left', x: -rX, y: 0 },
    { id: 'center', x: 0, y: 0 },
  ]
}
