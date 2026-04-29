import type { RectShape } from './types'
import type { HandleGeometry, StartSnapshot, FieldUpdate, Point, BoundingBox, HandleKind } from '../_base/types'

interface RectStart extends StartSnapshot {
  width: number
  height: number
}

export function captureRectStart(shape: RectShape): StartSnapshot {
  return { x: shape.x, y: shape.y, rotation: shape.rotation, width: shape.width, height: shape.height } as RectStart
}

export function getRectHandles(shape: RectShape): HandleGeometry {
  const hw = shape.width / 2
  const hh = shape.height / 2
  return {
    bbox: { x1: -hw, y1: -hh, x2: hw, y2: hh },
    sides: [
      { x: 0, y: -hh, kind: 'top' },
      { x: 0, y: hh, kind: 'bottom' },
      { x: -hw, y: 0, kind: 'left' },
      { x: hw, y: 0, kind: 'right' },
    ],
    scale: { x: hw, y: -hh },
    rotate: { x: -hw, y: -hh },
  }
}

export function applyRectHandleDrag(
  start: StartSnapshot,
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr: Point,
  sinθ: number,
  cosθ: number,
): FieldUpdate {
  const s = start as RectStart
  const sw = s.width
  const sh = s.height
  const out: FieldUpdate = {}

  if (kind === 'scale') {
    const px = startLocalPtr.x + ldx
    const py = startLocalPtr.y + ldy
    const d_tr = Math.sqrt((sw / 2) ** 2 + (sh / 2) ** 2)
    const proj = (px * (sw / 2) + py * (-sh / 2)) / d_tr
    const f = Math.max(0.1, proj / d_tr)
    out.width = Math.max(10, f * sw)
    out.height = Math.max(10, f * sh)
    out.x = s.x + (f - 1) * ((sw / 2) * cosθ + (sh / 2) * sinθ)
    out.y = s.y + (f - 1) * ((sw / 2) * sinθ - (sh / 2) * cosθ)
    return out
  }

  if (kind === 'top') {
    out.height = Math.max(10, sh - ldy)
    out.x = s.x + (ldy / 2) * (-sinθ)
    out.y = s.y + (ldy / 2) * cosθ
  } else if (kind === 'bottom') {
    out.height = Math.max(10, sh + ldy)
    out.x = s.x + (ldy / 2) * (-sinθ)
    out.y = s.y + (ldy / 2) * cosθ
  } else if (kind === 'left') {
    out.width = Math.max(10, sw - ldx)
    out.x = s.x + (ldx / 2) * cosθ
    out.y = s.y + (ldx / 2) * sinθ
  } else if (kind === 'right') {
    out.width = Math.max(10, sw + ldx)
    out.x = s.x + (ldx / 2) * cosθ
    out.y = s.y + (ldx / 2) * sinθ
  }
  return out
}

export function captureRectGeometry(shape: RectShape): FieldUpdate {
  return { x: shape.x, y: shape.y, rotation: shape.rotation, width: shape.width, height: shape.height }
}

export function getRectBoundingBox(shape: RectShape): BoundingBox {
  return {
    x1: shape.x - shape.width / 2,
    y1: shape.y - shape.height / 2,
    x2: shape.x + shape.width / 2,
    y2: shape.y + shape.height / 2,
  }
}

export function getRectWorldPoints(shape: RectShape): Point[] {
  const θ = shape.rotation * (Math.PI / 180)
  const cosθ = Math.cos(θ), sinθ = Math.sin(θ)
  const hw = shape.width / 2, hh = shape.height / 2
  const w = (lx: number, ly: number): Point => ({
    x: shape.x + lx * cosθ - ly * sinθ,
    y: shape.y + lx * sinθ + ly * cosθ,
  })
  return [w(-hw, -hh), w(hw, -hh), w(hw, hh), w(-hw, hh)]
}
