import { generateId } from '@/lib/generateId'
import { LINE_DEFAULTS } from './defaults'
import type { LineShape } from './types'

export function createLine(pos: { x: number; y: number }): LineShape {
  return {
    ...LINE_DEFAULTS,
    id: generateId(),
    x: pos.x,
    y: pos.y,
    points: [0, 0, 500, 0],
  }
}
