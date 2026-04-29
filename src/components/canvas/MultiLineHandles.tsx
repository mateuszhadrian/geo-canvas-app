'use client'

import { useRef } from 'react'
import { Circle as KonvaCircle, Rect as KonvaRect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { LineShape } from '@/shapes/line/types'
import type { Point } from '@/shapes'
import type { BoundingBox } from '@/lib/shapeBounds'

const HR = 5
const PAD = HR + 4

// ── World-space geometry ──────────────────────────────────────────────────────

function lineWorldPoints(line: LineShape): Point[] {
  const θ = line.rotation * (Math.PI / 180)
  const cosθ = Math.cos(θ),
    sinθ = Math.sin(θ)
  const out: Point[] = []
  for (let i = 0; i + 1 < line.points.length; i += 2) {
    const lx = line.points[i],
      ly = line.points[i + 1]
    out.push({ x: line.x + lx * cosθ - ly * sinθ, y: line.y + lx * sinθ + ly * cosθ })
  }
  return out
}

interface Bbox extends BoundingBox {
  cx: number
  cy: number
}

function combinedBbox(lines: LineShape[]): Bbox | null {
  const pts = lines.flatMap(lineWorldPoints)
  if (pts.length === 0) return null
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y)
  const x1 = Math.min(...xs) - PAD,
    x2 = Math.max(...xs) + PAD
  const y1 = Math.min(...ys) - PAD,
    y2 = Math.max(...ys) + PAD
  return { x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 }
}

// ── Drag state ────────────────────────────────────────────────────────────────

interface StartLine {
  id: string
  x: number
  y: number
  rotation: number
  points: number[]
}

interface DragState {
  kind: 'scale' | 'rotate'
  startPtr: Point
  cx: number
  cy: number
  hdx: number
  hdy: number
  hdLen: number
  lines: StartLine[]
}

function screenToWorld(e: PointerEvent, pos: Point, scale: number): Point {
  return { x: (e.clientX - pos.x) / scale, y: (e.clientY - pos.y) / scale }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onDragEnd: () => void
}

export function MultiLineHandles({ onDragEnd }: Props) {
  const shapes = useCanvasStore((s) => s.shapes)
  const selectedShapeIds = useCanvasStore((s) => s.selectedShapeIds)
  const updateShape = useCanvasStore((s) => s.updateShape)
  const dragRef = useRef<DragState | null>(null)

  const selectedLines = shapes.filter(
    (s): s is LineShape => s.type === 'line' && selectedShapeIds.includes(s.id)
  )
  if (selectedLines.length === 0 || selectedShapeIds.length >= 2) return null

  const bbox = combinedBbox(selectedLines)
  if (!bbox) return null

  const { x1, y1, x2, y2, cx, cy } = bbox

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>, kind: 'scale' | 'rotate') => {
    e.cancelBubble = true
    const { canvasScale, canvasPosition } = useCanvasStore.getState()
    const startPtr = screenToWorld(e.evt, canvasPosition, canvasScale)
    const hdx = x2 - cx,
      hdy = y1 - cy
    const hdLen = Math.sqrt(hdx * hdx + hdy * hdy)

    dragRef.current = {
      kind,
      startPtr,
      cx,
      cy,
      hdx,
      hdy,
      hdLen,
      lines: selectedLines.map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        rotation: l.rotation,
        points: l.points.slice(),
      })),
    }

    const onMove = (pe: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const { canvasScale: cs, canvasPosition: cp } = useCanvasStore.getState()
      const curr = screenToWorld(pe, cp, cs)

      if (d.kind === 'rotate') {
        const a0 = Math.atan2(d.startPtr.y - d.cy, d.startPtr.x - d.cx)
        const a1 = Math.atan2(curr.y - d.cy, curr.x - d.cx)
        const dθDeg = (a1 - a0) * (180 / Math.PI)
        const dθRad = a1 - a0
        const sinΔ = Math.sin(dθRad),
          cosΔ = Math.cos(dθRad)
        d.lines.forEach((l) => {
          const dx = l.x - d.cx,
            dy = l.y - d.cy
          updateShape(l.id, {
            x: d.cx + dx * cosΔ - dy * sinΔ,
            y: d.cy + dx * sinΔ + dy * cosΔ,
            rotation: l.rotation + dθDeg,
          })
        })
      } else {
        if (d.hdLen === 0) return
        const rel = { x: curr.x - d.cx, y: curr.y - d.cy }
        const proj = (rel.x * d.hdx + rel.y * d.hdy) / d.hdLen
        const s = Math.max(0.1, proj / d.hdLen)
        d.lines.forEach((l) => {
          updateShape(l.id, {
            x: d.cx + s * (l.x - d.cx),
            y: d.cy + s * (l.y - d.cy),
            points: l.points.map((v) => v * s),
          })
        })
      }
    }

    const onUp = () => {
      dragRef.current = null
      onDragEnd()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <>
      <KonvaRect
        x={x1}
        y={y1}
        width={x2 - x1}
        height={y2 - y1}
        fillEnabled={false}
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[4, 3]}
        listening={false}
        perfectDrawEnabled={false}
      />
      {/* Scale — top-right, blue square */}
      <KonvaRect
        x={x2 - HR}
        y={y1 - HR}
        width={HR * 2}
        height={HR * 2}
        fill="#3b82f6"
        stroke="#1d4ed8"
        strokeWidth={1.5}
        onPointerDown={(e) => handlePointerDown(e as KonvaEventObject<PointerEvent>, 'scale')}
        onClick={(e) => {
          e.cancelBubble = true
        }}
      />
      {/* Rotate — top-left, amber circle */}
      <KonvaCircle
        x={x1}
        y={y1}
        radius={HR}
        fill="#f59e0b"
        stroke="#d97706"
        strokeWidth={1.5}
        onPointerDown={(e) => handlePointerDown(e as KonvaEventObject<PointerEvent>, 'rotate')}
        onClick={(e) => {
          e.cancelBubble = true
        }}
      />
    </>
  )
}
