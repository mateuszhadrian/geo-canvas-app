import type { CircleShape } from './types'
import type { HandleGeometry, StartSnapshot, FieldUpdate, Point, BoundingBox, HandleKind } from '../_base/types'

interface CircleStart extends StartSnapshot {
  radius: number
}

export function captureCircleStart(shape: CircleShape): StartSnapshot {
  return { x: shape.x, y: shape.y, rotation: shape.rotation, radius: shape.radius } as CircleStart
}

export function getCircleHandles(shape: CircleShape): HandleGeometry {
  const R = shape.radius
  return {
    bbox: { x1: -R, y1: -R, x2: R, y2: R },
    sides: [
      { x: 0, y: -R, kind: 'top' },
      { x: R, y: 0,  kind: 'right' },
      { x: 0, y: R,  kind: 'bottom' },
      { x: -R, y: 0, kind: 'left' },
    ],
    scale: { x: R, y: -R },
    rotate: { x: -R, y: -R },
  }
}

export function applyCircleHandleDrag(
  start: StartSnapshot,
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr: Point,
  sinθ: number,
  cosθ: number,
): FieldUpdate {
  const s = start as CircleStart
  const R = s.radius

  if (kind === 'scale') {
    const px = startLocalPtr.x + ldx
    const py = startLocalPtr.y + ldy
    const dTr = Math.sqrt(2) * R
    const proj = (px * R + py * (-R)) / dTr
    const f = Math.max(0.1, proj / dTr)
    return { radius: Math.max(5, f * R) }
  }

  let radiusX = R, radiusY = R
  let cx = 0, cy = 0

  if (kind === 'top') {
    const eLdy = Math.min(ldy, 2 * (R - 1))
    radiusY = Math.max(1, R - eLdy / 2)
    cy = eLdy / 2
  } else if (kind === 'bottom') {
    const eLdy = Math.max(ldy, -2 * (R - 1))
    radiusY = Math.max(1, R + eLdy / 2)
    cy = eLdy / 2
  } else if (kind === 'left') {
    const eLdx = Math.min(ldx, 2 * (R - 1))
    radiusX = Math.max(1, R - eLdx / 2)
    cx = eLdx / 2
  } else {
    const eLdx = Math.max(ldx, -2 * (R - 1))
    radiusX = Math.max(1, R + eLdx / 2)
    cx = eLdx / 2
  }

  // Side drag morphs circle into ellipse
  return {
    type: 'ellipse',
    radiusX,
    radiusY,
    x: s.x + cx * cosθ - cy * sinθ,
    y: s.y + cx * sinθ + cy * cosθ,
  }
}

export function captureCircleGeometry(shape: CircleShape): FieldUpdate {
  return { type: 'circle', x: shape.x, y: shape.y, rotation: shape.rotation, radius: shape.radius }
}

export function getCircleBoundingBox(shape: CircleShape): BoundingBox {
  const R = shape.radius
  return { x1: shape.x - R, y1: shape.y - R, x2: shape.x + R, y2: shape.y + R }
}

export function getCircleWorldPoints(shape: CircleShape): Point[] {
  const R = shape.radius
  return [
    { x: shape.x - R, y: shape.y - R },
    { x: shape.x + R, y: shape.y + R },
  ]
}
