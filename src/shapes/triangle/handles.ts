import type { TriangleShape, TriangleVertices } from './types'
import type { HandleGeometry, StartSnapshot, FieldUpdate, Point, BoundingBox, HandleKind } from '../_base/types'

interface TriangleStart extends StartSnapshot {
  vertices: TriangleVertices
}

export function captureTriangleStart(shape: TriangleShape): StartSnapshot {
  return {
    x: shape.x, y: shape.y, rotation: shape.rotation,
    vertices: [...shape.vertices] as TriangleVertices,
  } as TriangleStart
}

export function getTriangleHandles(shape: TriangleShape): HandleGeometry {
  const [x0, y0, x1, y1, x2, y2] = shape.vertices
  const bx1 = Math.min(x0, x1, x2), bx2 = Math.max(x0, x1, x2)
  const by1 = Math.min(y0, y1, y2), by2 = Math.max(y0, y1, y2)
  return {
    bbox: { x1: bx1, y1: by1, x2: bx2, y2: by2 },
    sides: [
      { x: (x0 + x1) / 2, y: (y0 + y1) / 2, kind: 'side01' },
      { x: (x1 + x2) / 2, y: (y1 + y2) / 2, kind: 'side12' },
      { x: (x2 + x0) / 2, y: (y2 + y0) / 2, kind: 'side20' },
    ],
    scale: { x: bx2, y: by1 },
    rotate: { x: bx1, y: by1 },
  }
}

export function applyTriangleHandleDrag(
  start: StartSnapshot,
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr: Point,
  sinθ: number,
  cosθ: number,
): FieldUpdate {
  const s = start as TriangleStart
  const [x0, y0, x1, y1, x2, y2] = s.vertices

  if (kind === 'scale') {
    const px = startLocalPtr.x + ldx
    const py = startLocalPtr.y + ldy
    const tr_x = Math.max(x0, x1, x2)
    const tr_y = Math.min(y0, y1, y2)
    const d_tr = Math.sqrt(tr_x ** 2 + tr_y ** 2)
    const proj = (px * tr_x + py * tr_y) / d_tr
    const f = Math.max(0.1, proj / d_tr)
    return { vertices: [x0 * f, y0 * f, x1 * f, y1 * f, x2 * f, y2 * f] as TriangleVertices }
  }

  let nv: TriangleVertices
  if (kind === 'side01') {
    nv = [x0 + ldx / 3, y0 + ldy / 3, x1 + ldx / 3, y1 + ldy / 3, x2 - 2 * ldx / 3, y2 - 2 * ldy / 3]
  } else if (kind === 'side12') {
    nv = [x0 - 2 * ldx / 3, y0 - 2 * ldy / 3, x1 + ldx / 3, y1 + ldy / 3, x2 + ldx / 3, y2 + ldy / 3]
  } else {
    nv = [x0 + ldx / 3, y0 + ldy / 3, x1 - 2 * ldx / 3, y1 - 2 * ldy / 3, x2 + ldx / 3, y2 + ldy / 3]
  }

  return {
    vertices: nv,
    x: s.x + (ldx * 2 / 3) * cosθ - (ldy * 2 / 3) * sinθ,
    y: s.y + (ldx * 2 / 3) * sinθ + (ldy * 2 / 3) * cosθ,
  }
}

export function captureTriangleGeometry(shape: TriangleShape): FieldUpdate {
  return { x: shape.x, y: shape.y, rotation: shape.rotation, vertices: [...shape.vertices] as TriangleVertices }
}

export function getTriangleBoundingBox(shape: TriangleShape): BoundingBox {
  const [x0, y0, x1, y1, x2, y2] = shape.vertices
  return {
    x1: shape.x + Math.min(x0, x1, x2),
    y1: shape.y + Math.min(y0, y1, y2),
    x2: shape.x + Math.max(x0, x1, x2),
    y2: shape.y + Math.max(y0, y1, y2),
  }
}

export function getTriangleWorldPoints(shape: TriangleShape): Point[] {
  const θ = shape.rotation * (Math.PI / 180)
  const cosθ = Math.cos(θ), sinθ = Math.sin(θ)
  const v = shape.vertices
  return [
    { x: shape.x + v[0] * cosθ - v[1] * sinθ, y: shape.y + v[0] * sinθ + v[1] * cosθ },
    { x: shape.x + v[2] * cosθ - v[3] * sinθ, y: shape.y + v[2] * sinθ + v[3] * cosθ },
    { x: shape.x + v[4] * cosθ - v[5] * sinθ, y: shape.y + v[4] * sinθ + v[5] * cosθ },
  ]
}
