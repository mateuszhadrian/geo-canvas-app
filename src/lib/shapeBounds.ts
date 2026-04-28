import type { Shape } from '@/shapes'

export interface BoundingBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function getShapeBoundingBox(shape: Shape): BoundingBox {
  switch (shape.type) {
    case 'rect':
      return {
        x1: shape.x - shape.width / 2,
        y1: shape.y - shape.height / 2,
        x2: shape.x + shape.width / 2,
        y2: shape.y + shape.height / 2,
      }
    case 'circle':
      return {
        x1: shape.x - shape.radius,
        y1: shape.y - shape.radius,
        x2: shape.x + shape.radius,
        y2: shape.y + shape.radius,
      }
    case 'triangle': {
      const [x0, y0, x1, y1, x2, y2] = shape.vertices
      return {
        x1: shape.x + Math.min(x0, x1, x2),
        y1: shape.y + Math.min(y0, y1, y2),
        x2: shape.x + Math.max(x0, x1, x2),
        y2: shape.y + Math.max(y0, y1, y2),
      }
    }
    case 'ellipse':
      return {
        x1: shape.x - shape.radiusX,
        y1: shape.y - shape.radiusY,
        x2: shape.x + shape.radiusX,
        y2: shape.y + shape.radiusY,
      }
    case 'line': {
      const xs = shape.points.filter((_, i) => i % 2 === 0)
      const ys = shape.points.filter((_, i) => i % 2 === 1)
      return {
        x1: shape.x + Math.min(...xs),
        y1: shape.y + Math.min(...ys),
        x2: shape.x + Math.max(...xs),
        y2: shape.y + Math.max(...ys),
      }
    }
  }
}

export function intersectsBoundingBox(a: BoundingBox, b: BoundingBox): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1
}
