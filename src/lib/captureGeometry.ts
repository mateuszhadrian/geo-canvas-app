import type { Shape } from '@/shapes'
import type { TriangleVertices } from '@/shapes/triangle/types'
import type { ShapeUpdate } from '@/store/types'

export function captureGeometry(shape: Shape): ShapeUpdate {
  const snap: ShapeUpdate = { x: shape.x, y: shape.y, rotation: shape.rotation, type: shape.type }
  if (shape.type === 'rect') {
    snap.width = shape.width
    snap.height = shape.height
  } else if (shape.type === 'circle') {
    snap.radius = shape.radius
  } else if (shape.type === 'ellipse') {
    snap.radiusX = shape.radiusX
    snap.radiusY = shape.radiusY
  } else if (shape.type === 'triangle') {
    snap.vertices = [...shape.vertices] as TriangleVertices
  } else if (shape.type === 'line') {
    snap.points = [...shape.points]
  }
  return snap
}
