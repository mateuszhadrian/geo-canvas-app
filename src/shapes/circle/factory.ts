import { generateId } from '@/lib/generateId'
import { CIRCLE_DEFAULTS } from './defaults'
import type { CircleShape } from './types'

export function createCircle(pos: { x: number; y: number }): CircleShape {
  return { ...CIRCLE_DEFAULTS, id: generateId(), x: pos.x, y: pos.y }
}
