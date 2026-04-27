import { generateId } from '@/lib/generateId'
import { RECT_DEFAULTS } from './defaults'
import type { RectShape } from './types'

export function createRect(pos: { x: number; y: number }): RectShape {
  return { ...RECT_DEFAULTS, id: generateId(), x: pos.x, y: pos.y }
}
