import type { LineShape } from './types'
import type { FieldUpdate, Point, BoundingBox } from '../_base/types'

export function captureLineGeometry(shape: LineShape): FieldUpdate {
  return { x: shape.x, y: shape.y, rotation: shape.rotation, points: [...shape.points] }
}

export function getLineBoundingBox(shape: LineShape): BoundingBox {
  const xs = shape.points.filter((_, i) => i % 2 === 0)
  const ys = shape.points.filter((_, i) => i % 2 === 1)
  return {
    x1: shape.x + Math.min(...xs),
    y1: shape.y + Math.min(...ys),
    x2: shape.x + Math.max(...xs),
    y2: shape.y + Math.max(...ys),
  }
}

export function getLineWorldPoints(shape: LineShape): Point[] {
  const θ = shape.rotation * (Math.PI / 180)
  const cosθ = Math.cos(θ),
    sinθ = Math.sin(θ)
  const out: Point[] = []
  for (let i = 0; i + 1 < shape.points.length; i += 2) {
    const lx = shape.points[i],
      ly = shape.points[i + 1]
    out.push({ x: shape.x + lx * cosθ - ly * sinθ, y: shape.y + lx * sinθ + ly * cosθ })
  }
  return out
}
