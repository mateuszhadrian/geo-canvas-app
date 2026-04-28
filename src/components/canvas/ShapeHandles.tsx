'use client'

import { useRef } from 'react'
import { Circle as KonvaCircle, Rect as KonvaRect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCanvasStore } from '@/store/use-canvas-store'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import type { Shape, Point } from '@/shapes'
import type { ShapeUpdate } from '@/store/types'
import type { StartSnapshot } from '@/shapes/_base/types'

const HR = 5
const HOVER_PAD = 30

interface DragState {
  startPtr: Point
  startLocalPtr: Point
  start: StartSnapshot
  kind: string
}

interface Props {
  shape: Shape
  /** When false, only the invisible hit-rect is rendered (hover detection). */
  showFullHandles: boolean
  onDragActiveChange: (active: boolean) => void
}

export function ShapeHandles({ shape, showFullHandles, onDragActiveChange }: Props) {
  const updateShapeTransient = useCanvasStore((s) => s.updateShapeTransient)
  const commitShapeUpdate = useCanvasStore((s) => s.commitShapeUpdate)
  const dragRef = useRef<DragState | null>(null)
  const beforeRef = useRef<ShapeUpdate | null>(null)

  const def = SHAPE_REGISTRY[shape.type]
  if (!def.getHandles || !def.captureStart || !def.applyHandleDrag) return null

  const geo = def.getHandles(shape)
  if (!geo) return null

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>, kind: string) => {
    e.cancelBubble = true

    const start = def.captureStart!(shape)
    const { canvasScale, canvasPosition } = useCanvasStore.getState()
    const θ = shape.rotation * (Math.PI / 180)
    const sinθ = Math.sin(θ), cosθ = Math.cos(θ)

    const sx = (e.evt.clientX - canvasPosition.x) / canvasScale
    const sy = (e.evt.clientY - canvasPosition.y) / canvasScale
    const startPtr: Point = { x: sx, y: sy }

    const dx = sx - shape.x, dy = sy - shape.y
    const startLocalPtr: Point = { x: dx * cosθ + dy * sinθ, y: -dx * sinθ + dy * cosθ }

    dragRef.current = { startPtr, startLocalPtr, start, kind }
    beforeRef.current = def.captureGeometry(shape) as ShapeUpdate
    onDragActiveChange(true)

    const onMove = (pe: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const { canvasScale: cs, canvasPosition: cp } = useCanvasStore.getState()
      const cx = (pe.clientX - cp.x) / cs
      const cy = (pe.clientY - cp.y) / cs

      const θ2 = d.start.rotation * (Math.PI / 180)
      const sinθ2 = Math.sin(θ2), cosθ2 = Math.cos(θ2)
      const wdx = cx - d.startPtr.x, wdy = cy - d.startPtr.y
      const ldx = wdx * cosθ2 + wdy * sinθ2
      const ldy = -wdx * sinθ2 + wdy * cosθ2

      let updates: ShapeUpdate
      if (d.kind === 'rotate') {
        const a0 = Math.atan2(d.startPtr.y - d.start.y, d.startPtr.x - d.start.x)
        const a1 = Math.atan2(cy - d.start.y, cx - d.start.x)
        updates = { rotation: d.start.rotation + (a1 - a0) * (180 / Math.PI) }
      } else {
        updates = def.applyHandleDrag!(d.start, d.kind, ldx, ldy, d.startLocalPtr, sinθ2, cosθ2) as ShapeUpdate
      }

      if (Object.keys(updates).length > 0) updateShapeTransient(shape.id, updates)
    }

    const onUp = () => {
      const before = beforeRef.current
      if (before) {
        const current = useCanvasStore.getState().shapes.find((s) => s.id === shape.id)
        if (current) {
          const after = def.captureGeometry(current) as ShapeUpdate
          commitShapeUpdate(shape.id, before, after)
        }
      }
      dragRef.current = null
      beforeRef.current = null
      onDragActiveChange(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const { bbox, sides, scale: sh, rotate: rh } = geo

  return (
    <>
      {/* Invisible expanded hit area — keeps handles visible near bbox edge */}
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

          {/* Side / resize handles — white circles */}
          {sides.map(({ x, y, kind }) => (
            <KonvaCircle
              key={kind}
              x={x} y={y}
              radius={HR}
              fill='#ffffff'
              stroke='#3b82f6'
              strokeWidth={1.5}
              onPointerDown={(e) => handlePointerDown(e as KonvaEventObject<PointerEvent>, kind)}
              onClick={(e) => { e.cancelBubble = true }}
            />
          ))}

          {/* Proportional scale — blue square, top-right corner */}
          <KonvaRect
            x={sh.x - HR} y={sh.y - HR}
            width={HR * 2} height={HR * 2}
            fill='#3b82f6'
            stroke='#1d4ed8'
            strokeWidth={1.5}
            onPointerDown={(e) => handlePointerDown(e as KonvaEventObject<PointerEvent>, 'scale')}
            onClick={(e) => { e.cancelBubble = true }}
          />

          {/* Rotation — amber circle, top-left corner */}
          <KonvaCircle
            x={rh.x} y={rh.y}
            radius={HR}
            fill='#f59e0b'
            stroke='#d97706'
            strokeWidth={1.5}
            onPointerDown={(e) => handlePointerDown(e as KonvaEventObject<PointerEvent>, 'rotate')}
            onClick={(e) => { e.cancelBubble = true }}
          />
        </>
      )}
    </>
  )
}
