'use client'

import { useRef } from 'react'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { Shape } from '@/shapes'

export function ShapeNode({ shape }: { shape: Shape }) {
  const { Renderer } = SHAPE_REGISTRY[shape.type]
  const activeTool = useCanvasStore((s) => s.activeTool)
  const updateShape = useCanvasStore((s) => s.updateShape)
  const setSelectedShapeIds = useCanvasStore((s) => s.setSelectedShapeIds)
  const toggleShapeSelection = useCanvasStore((s) => s.toggleShapeSelection)
  const selectedShapeIds = useCanvasStore((s) => s.selectedShapeIds)

  const isSelected = selectedShapeIds.includes(shape.id)
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  return (
    <Renderer
      shape={shape}
      draggable={activeTool === 'select'}
      isSelected={isSelected}
      onClick={(addToSelection) => {
        if (addToSelection) toggleShapeSelection(shape.id)
        else setSelectedShapeIds([shape.id])
      }}
      onDragStart={() => {
        const { shapes: allShapes, selectedShapeIds: ids } = useCanvasStore.getState()
        const map = new Map<string, { x: number; y: number }>()
        allShapes.forEach((s) => {
          if (ids.includes(s.id)) map.set(s.id, { x: s.x, y: s.y })
        })
        dragStartPositions.current = map
      }}
      onDragMove={(e: any) => {
        const node = e.target
        const startPos = dragStartPositions.current.get(shape.id)
        if (!startPos) return
        const delta = { x: node.x() - startPos.x, y: node.y() - startPos.y }
        const layer = node.getLayer()
        if (!layer) return
        const { selectedShapeIds: ids } = useCanvasStore.getState()
        ids.forEach((id: string) => {
          if (id === shape.id) return
          const other = layer.findOne('#' + id)
          if (!other) return
          const s = dragStartPositions.current.get(id)
          if (!s) return
          other.position({ x: s.x + delta.x, y: s.y + delta.y })
        })
        layer.batchDraw()
      }}
      onDragEnd={(pos) => {
        const { selectedShapeIds: ids } = useCanvasStore.getState()
        const startPos = dragStartPositions.current.get(shape.id)
        if (startPos && ids.includes(shape.id)) {
          const delta = { x: pos.x - startPos.x, y: pos.y - startPos.y }
          ids.forEach((id) => {
            const s = dragStartPositions.current.get(id)
            if (!s) return
            updateShape(id, { x: s.x + delta.x, y: s.y + delta.y })
          })
        } else {
          updateShape(shape.id, pos)
          setSelectedShapeIds([shape.id])
        }
      }}
    />
  )
}
