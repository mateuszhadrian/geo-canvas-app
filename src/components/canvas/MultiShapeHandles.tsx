'use client'

import { useRef } from 'react'
import { Circle as KonvaCircle, Rect as KonvaRect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCanvasStore } from '@/store/use-canvas-store'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import type { Shape, Point } from '@/shapes'
import type { TriangleVertices } from '@/shapes/triangle/types'
import type { ShapeUpdate, ShapeUpdatePair } from '@/store/types'
import type { BoundingBox } from '@/lib/shapeBounds'

// ── Per-shape geometry snapshot ───────────────────────────────────────────────

type MultiStartShape =
  | { id: string; type: 'rect';     x: number; y: number; rotation: number; width: number; height: number }
  | { id: string; type: 'circle';   x: number; y: number; rotation: number; radius: number }
  | { id: string; type: 'ellipse';  x: number; y: number; rotation: number; radiusX: number; radiusY: number }
  | { id: string; type: 'triangle'; x: number; y: number; rotation: number; vertices: TriangleVertices }
  | { id: string; type: 'line';     x: number; y: number; rotation: number; points: number[] }

function captureMultiStart(s: Shape): MultiStartShape {
  const base = { id: s.id, x: s.x, y: s.y, rotation: s.rotation }
  if (s.type === 'rect')     return { ...base, type: 'rect',     width: s.width, height: s.height }
  if (s.type === 'circle')   return { ...base, type: 'circle',   radius: s.radius }
  if (s.type === 'ellipse')  return { ...base, type: 'ellipse',  radiusX: s.radiusX, radiusY: s.radiusY }
  if (s.type === 'triangle') return { ...base, type: 'triangle', vertices: [...s.vertices] as TriangleVertices }
  return { ...base, type: 'line', points: [...s.points] }
}

const HR = 5
const PAD = HR + 4

// ── World-space bbox (accounts for rotation) ──────────────────────────────────

function getShapeWorldPoints(shape: Shape): Point[] {
  return SHAPE_REGISTRY[shape.type].getWorldPoints(shape)
}

interface GroupBbox extends BoundingBox { cx: number; cy: number }

function computeGroupBbox(shapes: Shape[]): GroupBbox | null {
  const allPts = shapes.flatMap(getShapeWorldPoints)
  if (allPts.length === 0) return null
  const xs = allPts.map((p) => p.x), ys = allPts.map((p) => p.y)
  const x1 = Math.min(...xs) - PAD, x2 = Math.max(...xs) + PAD
  const y1 = Math.min(...ys) - PAD, y2 = Math.max(...ys) + PAD
  return { x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 }
}

// ── Drag state ────────────────────────────────────────────────────────────────

interface DragState {
  kind: 'rotate' | 'scale'
  startPtr: Point
  cx: number; cy: number
  hdx: number; hdy: number
  hdLen: number
  shapes: MultiStartShape[]
}

function screenToWorld(e: PointerEvent, pos: Point, scale: number): Point {
  return { x: (e.clientX - pos.x) / scale, y: (e.clientY - pos.y) / scale }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onDragEnd: () => void }

export function MultiShapeHandles({ onDragEnd }: Props) {
  const shapes = useCanvasStore((s) => s.shapes)
  const selectedShapeIds = useCanvasStore((s) => s.selectedShapeIds)
  const updateShapeTransient = useCanvasStore((s) => s.updateShapeTransient)
  const commitShapesUpdate = useCanvasStore((s) => s.commitShapesUpdate)
  const dragRef = useRef<DragState | null>(null)
  const beforeMapRef = useRef<Map<string, ShapeUpdate>>(new Map())

  const selectedShapes = shapes.filter((s) => selectedShapeIds.includes(s.id))
  if (selectedShapes.length < 2) return null

  const bbox = computeGroupBbox(selectedShapes)
  if (!bbox) return null

  const { x1, y1, x2, y2, cx, cy } = bbox

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>, kind: 'scale' | 'rotate') => {
    e.cancelBubble = true
    const { canvasScale, canvasPosition } = useCanvasStore.getState()
    const startPtr = screenToWorld(e.evt, canvasPosition, canvasScale)
    const hdx = x2 - cx, hdy = y1 - cy
    const hdLen = Math.sqrt(hdx * hdx + hdy * hdy)

    dragRef.current = { kind, startPtr, cx, cy, hdx, hdy, hdLen, shapes: selectedShapes.map(captureMultiStart) }
    beforeMapRef.current = new Map(
      selectedShapes.map((s) => [s.id, SHAPE_REGISTRY[s.type].captureGeometry(s) as ShapeUpdate])
    )

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
        const sinΔ = Math.sin(dθRad), cosΔ = Math.cos(dθRad)
        d.shapes.forEach((l) => {
          const dx = l.x - d.cx, dy = l.y - d.cy
          updateShapeTransient(l.id, {
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

        d.shapes.forEach((l) => {
          const upd: ShapeUpdate = {
            x: d.cx + s * (l.x - d.cx),
            y: d.cy + s * (l.y - d.cy),
          }
          if (l.type === 'rect') {
            upd.width = Math.max(10, s * l.width)
            upd.height = Math.max(10, s * l.height)
          } else if (l.type === 'circle') {
            upd.radius = Math.max(5, s * l.radius)
          } else if (l.type === 'ellipse') {
            upd.radiusX = Math.max(5, s * l.radiusX)
            upd.radiusY = Math.max(5, s * l.radiusY)
          } else if (l.type === 'triangle') {
            upd.vertices = l.vertices.map((v) => v * s) as TriangleVertices
          } else if (l.type === 'line') {
            upd.points = l.points.map((v) => v * s)
          }
          updateShapeTransient(l.id, upd)
        })
      }
    }

    const onUp = () => {
      const d = dragRef.current
      if (d) {
        const { shapes: currentShapes } = useCanvasStore.getState()
        const updates: ShapeUpdatePair[] = d.shapes.map((l) => {
          const before = beforeMapRef.current.get(l.id) ?? { x: l.x, y: l.y, rotation: l.rotation }
          const current = currentShapes.find((s) => s.id === l.id)
          const after = current ? SHAPE_REGISTRY[current.type].captureGeometry(current) as ShapeUpdate : before
          return { id: l.id, before, after }
        })
        commitShapesUpdate(updates)
      }
      dragRef.current = null
      beforeMapRef.current.clear()
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
        x={x1} y={y1}
        width={x2 - x1} height={y2 - y1}
        fillEnabled={false}
        stroke='#3b82f6'
        strokeWidth={1}
        dash={[4, 3]}
        listening={false}
        perfectDrawEnabled={false}
      />
      {/* Scale — top-right corner, blue square */}
      <KonvaRect
        x={x2 - HR} y={y1 - HR}
        width={HR * 2} height={HR * 2}
        fill='#3b82f6'
        stroke='#1d4ed8'
        strokeWidth={1.5}
        onPointerDown={(e) => handlePointerDown(e as KonvaEventObject<PointerEvent>, 'scale')}
        onClick={(e) => { e.cancelBubble = true }}
      />
      {/* Rotate — top-left corner, amber circle */}
      <KonvaCircle
        x={x1} y={y1}
        radius={HR}
        fill='#f59e0b'
        stroke='#d97706'
        strokeWidth={1.5}
        onPointerDown={(e) => handlePointerDown(e as KonvaEventObject<PointerEvent>, 'rotate')}
        onClick={(e) => { e.cancelBubble = true }}
      />
    </>
  )
}
