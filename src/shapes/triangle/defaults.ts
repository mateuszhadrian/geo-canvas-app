import type { TriangleShape } from './types'
import { BASE_DEFAULTS } from '../_base/defaults'

// Equilateral triangle, circumradius = 45, pointing up.
// Konva RegularPolygon convention: V_n = (r*sin(n*2π/3), -r*cos(n*2π/3))
const R = 45
const SIN60 = Math.sqrt(3) / 2

export const TRIANGLE_DEFAULTS: Omit<TriangleShape, 'id' | 'x' | 'y'> = {
  ...BASE_DEFAULTS,
  type: 'triangle',
  fill: '#27AE60',
  vertices: [
    0,
    -R, // V0 — top
    R * SIN60,
    R / 2, // V1 — bottom-right
    -R * SIN60,
    R / 2, // V2 — bottom-left
  ],
}
