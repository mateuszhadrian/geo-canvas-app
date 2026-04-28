import type { BaseShape } from '../_base/types'

// Vertices in LOCAL coordinates (centroid at 0,0).
// Layout: [x0,y0, x1,y1, x2,y2]
export type TriangleVertices = [number, number, number, number, number, number]

export interface TriangleShape extends BaseShape {
  type: 'triangle'
  vertices: TriangleVertices
  fill: string
}
