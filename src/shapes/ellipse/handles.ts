import type { EllipseShape } from './types'
import type { HandleGeometry, StartSnapshot, FieldUpdate, Point, BoundingBox, HandleKind } from '../_base/types'

interface EllipseStart extends StartSnapshot {
  radiusX: number
  radiusY: number
}

export function captureEllipseStart(shape: EllipseShape): StartSnapshot {
  return { x: shape.x, y: shape.y, rotation: shape.rotation, radiusX: shape.radiusX, radiusY: shape.radiusY } as EllipseStart
}

export function getEllipseHandles(shape: EllipseShape): HandleGeometry {
  const rX = shape.radiusX, rY = shape.radiusY
  return {
    bbox: { x1: -rX, y1: -rY, x2: rX, y2: rY },
    sides: [
      { x: 0,   y: -rY, kind: 'top' },
      { x: rX,  y: 0,   kind: 'right' },
      { x: 0,   y: rY,  kind: 'bottom' },
      { x: -rX, y: 0,   kind: 'left' },
    ],
    scale: { x: rX, y: -rY },
    rotate: { x: -rX, y: -rY },
  }
}

export function applyEllipseHandleDrag(
  start: StartSnapshot,
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr: Point,
  sinθ: number,
  cosθ: number,
): FieldUpdate {
  const s = start as EllipseStart
  const rX = s.radiusX, rY = s.radiusY

  if (kind === 'scale') {
    const px = startLocalPtr.x + ldx
    const py = startLocalPtr.y + ldy
    const dTr = Math.sqrt(rX * rX + rY * rY)
    const proj = (px * rX + py * (-rY)) / dTr
    const f = Math.max(0.1, proj / dTr)
    return { radiusX: Math.max(5, f * rX), radiusY: Math.max(5, f * rY) }
  }

  let radiusX = rX, radiusY = rY
  let cx = 0, cy = 0

  if (kind === 'top') {
    const eLdy = Math.min(ldy, 2 * (rY - 1))
    radiusY = Math.max(1, rY - eLdy / 2)
    cy = eLdy / 2
  } else if (kind === 'bottom') {
    const eLdy = Math.max(ldy, -2 * (rY - 1))
    radiusY = Math.max(1, rY + eLdy / 2)
    cy = eLdy / 2
  } else if (kind === 'left') {
    const eLdx = Math.min(ldx, 2 * (rX - 1))
    radiusX = Math.max(1, rX - eLdx / 2)
    cx = eLdx / 2
  } else {
    const eLdx = Math.max(ldx, -2 * (rX - 1))
    radiusX = Math.max(1, rX + eLdx / 2)
    cx = eLdx / 2
  }

  return {
    radiusX,
    radiusY,
    x: s.x + cx * cosθ - cy * sinθ,
    y: s.y + cx * sinθ + cy * cosθ,
  }
}

export function captureEllipseGeometry(shape: EllipseShape): FieldUpdate {
  return { x: shape.x, y: shape.y, rotation: shape.rotation, radiusX: shape.radiusX, radiusY: shape.radiusY }
}

export function getEllipseBoundingBox(shape: EllipseShape): BoundingBox {
  return {
    x1: shape.x - shape.radiusX,
    y1: shape.y - shape.radiusY,
    x2: shape.x + shape.radiusX,
    y2: shape.y + shape.radiusY,
  }
}

export function getEllipseWorldPoints(shape: EllipseShape): Point[] {
  const θ = shape.rotation * (Math.PI / 180)
  const cosθ = Math.cos(θ), sinθ = Math.sin(θ)
  const xExt = Math.sqrt((shape.radiusX * cosθ) ** 2 + (shape.radiusY * sinθ) ** 2)
  const yExt = Math.sqrt((shape.radiusX * sinθ) ** 2 + (shape.radiusY * cosθ) ** 2)
  return [
    { x: shape.x - xExt, y: shape.y - yExt },
    { x: shape.x + xExt, y: shape.y + yExt },
  ]
}
