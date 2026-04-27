import { generateId } from '@/lib/generateId'
import { ELLIPSE_DEFAULTS } from './defaults'
import type { EllipseShape } from './types'

export function createEllipse(pos: { x: number; y: number }): EllipseShape {
  return { ...ELLIPSE_DEFAULTS, id: generateId(), x: pos.x, y: pos.y }
}
