import { generateId } from '@/lib/generateId'
import { TRIANGLE_DEFAULTS } from './defaults'
import type { TriangleShape } from './types'

export function createTriangle(pos: { x: number; y: number }): TriangleShape {
  return { ...TRIANGLE_DEFAULTS, id: generateId(), x: pos.x, y: pos.y }
}
