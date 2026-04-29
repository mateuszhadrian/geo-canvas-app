import { useCallback, useMemo } from 'react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { createLine } from './factory'
import type { LineShape } from './types'

export function useMultilineDrawing(): {
  multilineFirstLineId: string | null
  tryExtendOrClose: (clickX: number, clickY: number) => boolean
} {
  const shapes = useCanvasStore((s) => s.shapes)
  const selectedShapeIds = useCanvasStore((s) => s.selectedShapeIds)

  const multilineFirstLineId = useMemo(() => {
    const selectedLines = shapes.filter(
      (s): s is LineShape => s.type === 'line' && selectedShapeIds.includes(s.id)
    )
    if (selectedLines.length < 2) return null
    return selectedLines[0].id
  }, [shapes, selectedShapeIds])

  const tryExtendOrClose = useCallback((clickX: number, clickY: number): boolean => {
    const {
      selectedShapeIds: ids,
      shapes: allShapes,
      addShape,
      setSelectedShapeIds,
      canvasScale,
    } = useCanvasStore.getState()

    const selectedLines = allShapes.filter(
      (s): s is LineShape => s.type === 'line' && ids.includes(s.id)
    )
    if (selectedLines.length === 0) return false

    const anchorLine = selectedLines[selectedLines.length - 1]
    const pts = anchorLine.points
    const endAbsX = anchorLine.x + pts[pts.length - 2]
    const endAbsY = anchorLine.y + pts[pts.length - 1]

    if (selectedLines.length >= 2) {
      const firstLine = selectedLines[0]
      const startX = firstLine.x + firstLine.points[0]
      const startY = firstLine.y + firstLine.points[1]
      const closeThreshold = 30 / canvasScale
      const dx = clickX - startX
      const dy = clickY - startY
      if (Math.sqrt(dx * dx + dy * dy) <= closeThreshold) {
        const closingLine = createLine({ x: endAbsX, y: endAbsY })
        closingLine.points = [0, 0, startX - endAbsX, startY - endAbsY]
        addShape(closingLine)
        setSelectedShapeIds([])
        return true
      }
    }

    const newLine = createLine({ x: endAbsX, y: endAbsY })
    newLine.points = [0, 0, clickX - endAbsX, clickY - endAbsY]
    addShape(newLine)
    setSelectedShapeIds([...ids, newLine.id])
    return true
  }, [])

  return { multilineFirstLineId, tryExtendOrClose }
}
