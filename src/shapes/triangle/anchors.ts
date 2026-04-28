import type { TriangleShape } from './types'
import type { AnchorPoint } from '../_base/types'

export function getTriangleAnchors(shape: TriangleShape): AnchorPoint[] {
  const [x0, y0, x1, y1, x2, y2] = shape.vertices
  const cx = (x0 + x1 + x2) / 3
  const cy = (y0 + y1 + y2) / 3
  return [
    { id: 'v0',  x: x0,               y: y0               },
    { id: 'v1',  x: x1,               y: y1               },
    { id: 'v2',  x: x2,               y: y2               },
    { id: 'm01', x: (x0 + x1) / 2,    y: (y0 + y1) / 2   },
    { id: 'm12', x: (x1 + x2) / 2,    y: (y1 + y2) / 2   },
    { id: 'm20', x: (x2 + x0) / 2,    y: (y2 + y0) / 2   },
    { id: 'c',   x: cx,               y: cy               },
  ]
}
