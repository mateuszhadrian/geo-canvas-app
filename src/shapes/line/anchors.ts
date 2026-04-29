import type { LineShape } from './types'
import type { AnchorPoint } from '../_base/types'

export function getLineAnchors(shape: LineShape): AnchorPoint[] {
  const pts = shape.points
  if (pts.length < 4) return []
  const anchors: AnchorPoint[] = [
    { id: 'start', x: pts[0], y: pts[1] },
    { id: 'end', x: pts[pts.length - 2], y: pts[pts.length - 1] },
  ]
  // Midpoints for multi-segment polylines
  for (let i = 2; i + 3 < pts.length; i += 2) {
    anchors.push({ id: `mid-${i}`, x: (pts[i] + pts[i + 2]) / 2, y: (pts[i + 1] + pts[i + 3]) / 2 })
  }
  return anchors
}
