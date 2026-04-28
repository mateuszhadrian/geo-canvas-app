'use client'

import { useRef } from 'react'
import { Circle as KonvaCircle, Rect as KonvaRect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { Shape, Point } from '@/shapes'
import type { TriangleVertices } from '@/shapes/triangle/types'
import type { ShapeUpdate } from '@/store/types'
import type { BoundingBox } from '@/lib/shapeBounds'
import { captureGeometry } from '@/lib/captureGeometry'

// ── Geometry snapshot for drag start (discriminated union — no optional fields) ──

type RectStart    = { type: 'rect';     x: number; y: number; rotation: number; width: number; height: number }
type CircleStart  = { type: 'circle';   x: number; y: number; rotation: number; radius: number }
type EllipseStart = { type: 'ellipse';  x: number; y: number; rotation: number; radiusX: number; radiusY: number }
type TriangleStart = { type: 'triangle'; x: number; y: number; rotation: number; vertices: TriangleVertices }

type StartShapeGeometry = RectStart | CircleStart | EllipseStart | TriangleStart

function captureStartShape(s: Shape): StartShapeGeometry | null {
  const base = { x: s.x, y: s.y, rotation: s.rotation }
  if (s.type === 'rect')     return { ...base, type: 'rect',     width: s.width, height: s.height }
  if (s.type === 'circle')   return { ...base, type: 'circle',   radius: s.radius }
  if (s.type === 'ellipse')  return { ...base, type: 'ellipse',  radiusX: s.radiusX, radiusY: s.radiusY }
  if (s.type === 'triangle') return { ...base, type: 'triangle', vertices: [...s.vertices] as TriangleVertices }
  return null  // line — handled by MultiLineHandles
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HR = 5   // handle radius in local px
const HOVER_PAD = 30  // invisible hit-rect expansion so handles don't vanish near bbox edge

// ── Handle kinds ──────────────────────────────────────────────────────────────

type RectHandleKind    = 'top' | 'bottom' | 'left' | 'right' | 'scale' | 'rotate'
type TriHandleKind     = 'side01' | 'side12' | 'side20' | 'scale' | 'rotate'
type CircleHandleKind  = 'top' | 'bottom' | 'left' | 'right' | 'scale' | 'rotate'
type EllipseHandleKind = 'top' | 'bottom' | 'left' | 'right' | 'scale' | 'rotate'
type HandleKind = RectHandleKind | TriHandleKind | CircleHandleKind | EllipseHandleKind

// ── Geometry descriptors ──────────────────────────────────────────────────────

interface SideHandle { x: number; y: number; kind: HandleKind }

interface HandleGeometry {
  bbox: BoundingBox
  sides: SideHandle[]
  scale: Point
  rotate: Point
}

function getHandleGeometry(shape: Shape): HandleGeometry | null {
  if (shape.type === 'rect') {
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

  if (shape.type === 'circle') {
    const R = shape.radius
    return {
      bbox: { x1: -R, y1: -R, x2: R, y2: R },
      sides: [
        { x: 0, y: -R, kind: 'top' },
        { x: R, y: 0, kind: 'right' },
        { x: 0, y: R, kind: 'bottom' },
        { x: -R, y: 0, kind: 'left' },
      ],
      scale: { x: R, y: -R },
      rotate: { x: -R, y: -R },
    }
  }

  if (shape.type === 'ellipse') {
    const rX = shape.radiusX, rY = shape.radiusY
    return {
      bbox: { x1: -rX, y1: -rY, x2: rX, y2: rY },
      sides: [
        { x: 0, y: -rY, kind: 'top' },
        { x: rX, y: 0, kind: 'right' },
        { x: 0, y: rY, kind: 'bottom' },
        { x: -rX, y: 0, kind: 'left' },
      ],
      scale: { x: rX, y: -rY },
      rotate: { x: -rX, y: -rY },
    }
  }

  if (shape.type === 'triangle') {
    const [x0, y0, x1, y1, x2, y2] = shape.vertices

    const m01: SideHandle = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, kind: 'side01' }
    const m12: SideHandle = { x: (x1 + x2) / 2, y: (y1 + y2) / 2, kind: 'side12' }
    const m20: SideHandle = { x: (x2 + x0) / 2, y: (y2 + y0) / 2, kind: 'side20' }

    const bx1 = Math.min(x0, x1, x2), bx2 = Math.max(x0, x1, x2)
    const by1 = Math.min(y0, y1, y2), by2 = Math.max(y0, y1, y2)

    return {
      bbox: { x1: bx1, y1: by1, x2: bx2, y2: by2 },
      sides: [m01, m12, m20],
      scale: { x: bx2, y: by1 },
      rotate: { x: bx1, y: by1 },
    }
  }

  return null
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

function screenToStage(e: MouseEvent, pos: Point, scale: number): Point {
  return { x: (e.clientX - pos.x) / scale, y: (e.clientY - pos.y) / scale }
}

function projectToLocal(wdx: number, wdy: number, sinθ: number, cosθ: number) {
  return {
    ldx: wdx * cosθ + wdy * sinθ,
    ldy: wdx * (-sinθ) + wdy * cosθ,
  }
}

// ── Drag state ────────────────────────────────────────────────────────────────

interface DragState {
  startPtr: Point
  startLocalPtr: Point
  startShape: StartShapeGeometry
  kind: HandleKind
}

// ── Rect drag math ────────────────────────────────────────────────────────────

function applyRectDrag(
  startShape: RectStart,
  startLocalPtr: Point,
  kind: HandleKind,
  ldx: number,
  ldy: number,
  sinθ: number,
  cosθ: number,
): ShapeUpdate {
  const sw = startShape.width
  const sh = startShape.height
  const out: ShapeUpdate = {}

  if (kind === 'scale') {
    const px = startLocalPtr.x + ldx
    const py = startLocalPtr.y + ldy
    const d_tr = Math.sqrt((sw / 2) ** 2 + (sh / 2) ** 2)
    const proj = (px * (sw / 2) + py * (-sh / 2)) / d_tr
    const s = Math.max(0.1, proj / d_tr)
    out.width = Math.max(10, s * sw)
    out.height = Math.max(10, s * sh)
    out.x = startShape.x + (s - 1) * ((sw / 2) * cosθ + (sh / 2) * sinθ)
    out.y = startShape.y + (s - 1) * ((sw / 2) * sinθ - (sh / 2) * cosθ)
    return out
  }

  if (kind === 'top') {
    out.height = Math.max(10, sh - ldy)
    out.x = startShape.x + (ldy / 2) * (-sinθ)
    out.y = startShape.y + (ldy / 2) * cosθ
  } else if (kind === 'bottom') {
    out.height = Math.max(10, sh + ldy)
    out.x = startShape.x + (ldy / 2) * (-sinθ)
    out.y = startShape.y + (ldy / 2) * cosθ
  } else if (kind === 'left') {
    out.width = Math.max(10, sw - ldx)
    out.x = startShape.x + (ldx / 2) * cosθ
    out.y = startShape.y + (ldx / 2) * sinθ
  } else if (kind === 'right') {
    out.width = Math.max(10, sw + ldx)
    out.x = startShape.x + (ldx / 2) * cosθ
    out.y = startShape.y + (ldx / 2) * sinθ
  }
  return out
}

// ── Triangle drag math ────────────────────────────────────────────────────────

function applyTriangleSideDrag(
  startShape: TriangleStart,
  kind: TriHandleKind,
  ldx: number,
  ldy: number,
  sinθ: number,
  cosθ: number,
): ShapeUpdate {
  const [x0, y0, x1, y1, x2, y2] = startShape.vertices

  let nv: TriangleVertices

  if (kind === 'side01') {
    nv = [
      x0 + ldx / 3, y0 + ldy / 3,
      x1 + ldx / 3, y1 + ldy / 3,
      x2 - 2 * ldx / 3, y2 - 2 * ldy / 3,
    ]
  } else if (kind === 'side12') {
    nv = [
      x0 - 2 * ldx / 3, y0 - 2 * ldy / 3,
      x1 + ldx / 3, y1 + ldy / 3,
      x2 + ldx / 3, y2 + ldy / 3,
    ]
  } else {
    // side20
    nv = [
      x0 + ldx / 3, y0 + ldy / 3,
      x1 - 2 * ldx / 3, y1 - 2 * ldy / 3,
      x2 + ldx / 3, y2 + ldy / 3,
    ]
  }

  const cx = ldx * 2 / 3
  const cy = ldy * 2 / 3
  return {
    vertices: nv,
    x: startShape.x + cx * cosθ - cy * sinθ,
    y: startShape.y + cx * sinθ + cy * cosθ,
  }
}

function applyTriangleScaleDrag(startShape: TriangleStart, startLocalPtr: Point, ldx: number, ldy: number): ShapeUpdate {
  const [x0, y0, x1, y1, x2, y2] = startShape.vertices
  const px = startLocalPtr.x + ldx
  const py = startLocalPtr.y + ldy

  const tr_x = Math.max(x0, x1, x2)
  const tr_y = Math.min(y0, y1, y2)
  const d_tr = Math.sqrt(tr_x ** 2 + tr_y ** 2)
  const proj = (px * tr_x + py * tr_y) / d_tr
  const s = Math.max(0.1, proj / d_tr)

  return {
    vertices: [x0 * s, y0 * s, x1 * s, y1 * s, x2 * s, y2 * s],
  }
}

// ── Circle drag math ──────────────────────────────────────────────────────────

function applyCircleSideDrag(
  startShape: CircleStart,
  kind: CircleHandleKind,
  ldx: number,
  ldy: number,
  sinθ: number,
  cosθ: number,
): ShapeUpdate {
  const R = startShape.radius
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
  } else {  // right
    const eLdx = Math.max(ldx, -2 * (R - 1))
    radiusX = Math.max(1, R + eLdx / 2)
    cx = eLdx / 2
  }

  return {
    type: 'ellipse',
    radiusX,
    radiusY,
    x: startShape.x + cx * cosθ - cy * sinθ,
    y: startShape.y + cx * sinθ + cy * cosθ,
  }
}

function applyCircleScaleDrag(startShape: CircleStart, startLocalPtr: Point, ldx: number, ldy: number): ShapeUpdate {
  const R = startShape.radius
  const px = startLocalPtr.x + ldx
  const py = startLocalPtr.y + ldy
  const dTr = Math.sqrt(R * R + R * R)
  const proj = (px * R + py * (-R)) / dTr
  const s = Math.max(0.1, proj / dTr)
  return { radius: Math.max(5, s * R) }
}

// ── Ellipse drag math ─────────────────────────────────────────────────────────

function applyEllipseSideDrag(
  startShape: EllipseStart,
  kind: EllipseHandleKind,
  ldx: number,
  ldy: number,
  sinθ: number,
  cosθ: number,
): ShapeUpdate {
  const rX = startShape.radiusX
  const rY = startShape.radiusY
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
  } else {  // right
    const eLdx = Math.max(ldx, -2 * (rX - 1))
    radiusX = Math.max(1, rX + eLdx / 2)
    cx = eLdx / 2
  }

  return {
    radiusX,
    radiusY,
    x: startShape.x + cx * cosθ - cy * sinθ,
    y: startShape.y + cx * sinθ + cy * cosθ,
  }
}

function applyEllipseScaleDrag(startShape: EllipseStart, startLocalPtr: Point, ldx: number, ldy: number): ShapeUpdate {
  const rX = startShape.radiusX
  const rY = startShape.radiusY
  const px = startLocalPtr.x + ldx
  const py = startLocalPtr.y + ldy
  const dTr = Math.sqrt(rX * rX + rY * rY)
  const proj = (px * rX + py * (-rY)) / dTr
  const s = Math.max(0.1, proj / dTr)
  return {
    radiusX: Math.max(5, s * rX),
    radiusY: Math.max(5, s * rY),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  shape: Shape
  /** Controls whether the visible handles (circles/squares) are shown.
   *  The invisible bbox hit-rect is always rendered when the component is mounted. */
  showFullHandles: boolean
  onDragActiveChange: (active: boolean) => void
}

export function ShapeHandles({ shape, showFullHandles, onDragActiveChange }: Props) {
  const updateShapeTransient = useCanvasStore((s) => s.updateShapeTransient)
  const commitShapeUpdate = useCanvasStore((s) => s.commitShapeUpdate)
  const dragRef = useRef<DragState | null>(null)
  const beforeRef = useRef<ShapeUpdate | null>(null)

  const geo = getHandleGeometry(shape)
  if (!geo) return null

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>, kind: HandleKind) => {
    e.cancelBubble = true

    const startShape = captureStartShape(shape)
    if (!startShape) return

    const { canvasScale, canvasPosition } = useCanvasStore.getState()
    const θ = shape.rotation * (Math.PI / 180)
    const sinθ = Math.sin(θ), cosθ = Math.cos(θ)

    const startPtr = screenToStage(e.evt, canvasPosition, canvasScale)
    const dx = startPtr.x - shape.x, dy = startPtr.y - shape.y
    const startLocalPtr: Point = { x: dx * cosθ + dy * sinθ, y: dx * (-sinθ) + dy * cosθ }

    dragRef.current = { startPtr, startLocalPtr, startShape, kind }
    beforeRef.current = captureGeometry(shape)
    onDragActiveChange(true)

    const onMove = (me: MouseEvent) => {
      const d = dragRef.current
      if (!d) return

      const { canvasScale: cs, canvasPosition: cp } = useCanvasStore.getState()
      const currPtr = screenToStage(me, cp, cs)

      const θ2 = d.startShape.rotation * (Math.PI / 180)
      const sinθ2 = Math.sin(θ2), cosθ2 = Math.cos(θ2)

      const { ldx, ldy } = projectToLocal(
        currPtr.x - d.startPtr.x,
        currPtr.y - d.startPtr.y,
        sinθ2, cosθ2,
      )

      let updates: ShapeUpdate = {}
      const id = shape.id

      if (d.kind === 'rotate') {
        const a0 = Math.atan2(d.startPtr.y - d.startShape.y, d.startPtr.x - d.startShape.x)
        const a1 = Math.atan2(currPtr.y - d.startShape.y, currPtr.x - d.startShape.x)
        updates.rotation = d.startShape.rotation + (a1 - a0) * (180 / Math.PI)
      } else if (d.startShape.type === 'rect') {
        updates = applyRectDrag(d.startShape, d.startLocalPtr, d.kind, ldx, ldy, sinθ2, cosθ2)
      } else if (d.startShape.type === 'triangle') {
        if (d.kind === 'scale') {
          updates = applyTriangleScaleDrag(d.startShape, d.startLocalPtr, ldx, ldy)
        } else {
          updates = applyTriangleSideDrag(d.startShape, d.kind as TriHandleKind, ldx, ldy, sinθ2, cosθ2)
        }
      } else if (d.startShape.type === 'circle') {
        if (d.kind === 'scale') {
          updates = applyCircleScaleDrag(d.startShape, d.startLocalPtr, ldx, ldy)
        } else {
          updates = applyCircleSideDrag(d.startShape, d.kind as CircleHandleKind, ldx, ldy, sinθ2, cosθ2)
        }
      } else if (d.startShape.type === 'ellipse') {
        if (d.kind === 'scale') {
          updates = applyEllipseScaleDrag(d.startShape, d.startLocalPtr, ldx, ldy)
        } else {
          updates = applyEllipseSideDrag(d.startShape, d.kind as EllipseHandleKind, ldx, ldy, sinθ2, cosθ2)
        }
      }

      if (Object.keys(updates).length > 0) updateShapeTransient(id, updates)
    }

    const onUp = () => {
      const before = beforeRef.current
      if (before) {
        const currentShape = useCanvasStore.getState().shapes.find((s) => s.id === shape.id)
        if (currentShape) {
          const after = captureGeometry(currentShape)
          commitShapeUpdate(shape.id, before, after)
        }
      }
      dragRef.current = null
      beforeRef.current = null
      onDragActiveChange(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const { bbox, sides, scale: sh, rotate: rh } = geo

  return (
    <>
      {/* Invisible hit-rect expanded by HOVER_PAD on all sides so the Group's
          hover area extends beyond the visible bbox — handles stay visible when
          the cursor is within 10 px of any edge, preventing accidental dismissal. */}
      <KonvaRect
        x={bbox.x1 - HOVER_PAD}
        y={bbox.y1 - HOVER_PAD}
        width={bbox.x2 - bbox.x1 + HOVER_PAD * 2}
        height={bbox.y2 - bbox.y1 + HOVER_PAD * 2}
        fill='rgba(0,0,0,0)'
        strokeEnabled={false}
        listening={true}
        perfectDrawEnabled={false}
      />

      {showFullHandles && (
        <>
          {/* Dashed bounding box */}
          <KonvaRect
            x={bbox.x1}
            y={bbox.y1}
            width={bbox.x2 - bbox.x1}
            height={bbox.y2 - bbox.y1}
            fillEnabled={false}
            stroke='#3b82f6'
            strokeWidth={1}
            dash={[4, 3]}
            listening={false}
            perfectDrawEnabled={false}
          />

          {/* Side / resize handles (white circle) */}
          {sides.map(({ x, y, kind }) => (
            <KonvaCircle
              key={kind}
              x={x} y={y}
              radius={HR}
              fill='#ffffff'
              stroke='#3b82f6'
              strokeWidth={1.5}
              onMouseDown={(e) => handleMouseDown(e, kind)}
              onClick={(e) => { e.cancelBubble = true }}
            />
          ))}

          {/* Proportional scale — top-right bbox corner, blue square */}
          <KonvaRect
            x={sh.x - HR} y={sh.y - HR}
            width={HR * 2} height={HR * 2}
            fill='#3b82f6'
            stroke='#1d4ed8'
            strokeWidth={1.5}
            onMouseDown={(e) => handleMouseDown(e, 'scale')}
            onClick={(e) => { e.cancelBubble = true }}
          />

          {/* Rotation — top-left bbox corner, amber circle */}
          <KonvaCircle
            x={rh.x} y={rh.y}
            radius={HR}
            fill='#f59e0b'
            stroke='#d97706'
            strokeWidth={1.5}
            onMouseDown={(e) => handleMouseDown(e, 'rotate')}
            onClick={(e) => { e.cancelBubble = true }}
          />
        </>
      )}
    </>
  )
}
