'use client'

import { useRef, useState } from 'react'
import { Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { Shape } from '@/shapes'
import { ShapeHandles } from './ShapeHandles'
import { AnchorPoints } from './AnchorPoints'

export function ShapeNode({
  shape,
  disableListening = false,
  layerLocked = false,
}: {
  shape: Shape
  disableListening?: boolean
  layerLocked?: boolean
}) {
  const { Renderer } = SHAPE_REGISTRY[shape.type]
  const activeTool = useCanvasStore((s) => s.activeTool)
  const updateShape = useCanvasStore((s) => s.updateShape)
  const moveShapes = useCanvasStore((s) => s.moveShapes)
  const setSelectedShapeIds = useCanvasStore((s) => s.setSelectedShapeIds)
  const toggleShapeSelection = useCanvasStore((s) => s.toggleShapeSelection)
  const selectedShapeIds = useCanvasStore((s) => s.selectedShapeIds)

  const isSelected = selectedShapeIds.includes(shape.id)
  const isOnlySelected = isSelected && selectedShapeIds.length === 1
  const [isHovered, setIsHovered] = useState(false)
  const [handleDragActive, setHandleDragActive] = useState(false)
  const handleDragActiveRef = useRef(false)
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  const notListening = disableListening || layerLocked

  const onHandleDragActiveChange = (active: boolean) => {
    handleDragActiveRef.current = active
    setHandleDragActive(active)
  }

  // Show anchors when hovered in select mode (preview of connector system)
  const def = SHAPE_REGISTRY[shape.type]
  const anchorPoints = isHovered && activeTool === 'select' && def.anchors
    ? def.anchors(shape)
    : []

  return (
    <Group
      id={shape.id}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation}
      opacity={shape.opacity}
      draggable={activeTool === 'select' && !notListening}
      listening={!notListening}
      onClick={(e) => {
        if (e.evt.metaKey || e.evt.ctrlKey) toggleShapeSelection(shape.id)
        else setSelectedShapeIds([shape.id])
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragStart={(e) => {
        if (handleDragActiveRef.current) { e.target.stopDrag(); return }
        const { shapes: allShapes, selectedShapeIds: ids } = useCanvasStore.getState()
        const map = new Map<string, { x: number; y: number }>()
        allShapes.forEach((s) => { if (ids.includes(s.id)) map.set(s.id, { x: s.x, y: s.y }) })
        dragStartPositions.current = map
      }}
      onDragMove={(e: KonvaEventObject<DragEvent>) => {
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
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        const pos = { x: e.target.x(), y: e.target.y() }
        const { selectedShapeIds: ids } = useCanvasStore.getState()
        const startPos = dragStartPositions.current.get(shape.id)
        if (startPos && ids.includes(shape.id)) {
          const delta = { x: pos.x - startPos.x, y: pos.y - startPos.y }
          const items = ids.flatMap((id) => {
            const s = dragStartPositions.current.get(id)
            if (!s) return []
            return [{ id, before: { x: s.x, y: s.y }, after: { x: s.x + delta.x, y: s.y + delta.y } }]
          })
          if (items.length > 0) moveShapes(items)
        } else {
          updateShape(shape.id, pos)
          setSelectedShapeIds([shape.id])
        }
      }}
    >
      <Renderer shape={shape} isSelected={isSelected} />

      {/* Anchor points — shown on hover as preview of connector system */}
      {anchorPoints.length > 0 && !isSelected && (
        <AnchorPoints anchors={anchorPoints} />
      )}

      {isOnlySelected && activeTool === 'select' && (
        <ShapeHandles
          shape={shape}
          showFullHandles={isHovered || handleDragActive}
          onDragActiveChange={onHandleDragActiveChange}
        />
      )}
    </Group>
  )
}
