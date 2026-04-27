'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import { useCanvasStore } from '@/store/use-canvas-store'
import { ShapeNode } from './ShapeNode'
import { GridBackground } from './GridBackground'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { PictureDataDisplay } from './PictureDataDisplay'
import { JsonImportInput } from './JsonImportInput'
import { SelectionMarquee } from './SelectionMarquee'
import { getShapeBoundingBox, intersectsBoundingBox } from '@/lib/shapeBounds'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvasConstants'

const ZOOM_STEP = 0.05
const MAX_SCALE = 2

const getMinScale = () =>
  Math.max(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT)
const MARQUEE_THRESHOLD = 3

function clampPosition(pos: { x: number; y: number }, scale: number): { x: number; y: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const hw = (CANVAS_WIDTH * scale) / 2
  const hh = (CANVAS_HEIGHT * scale) / 2
  return {
    x: Math.max(Math.min(hw, vw - hw), Math.min(Math.max(hw, vw - hw), pos.x)),
    y: Math.max(Math.min(hh, vh - hh), Math.min(Math.max(hh, vh - hh), pos.y)),
  }
}

export default function CanvasApp() {
  const shapes = useCanvasStore((state) => state.shapes)
  const activeTool = useCanvasStore((state) => state.activeTool)
  const canvasPosition = useCanvasStore((state) => state.canvasPosition)
  const canvasScale = useCanvasStore((state) => state.canvasScale)
  const setCanvasPosition = useCanvasStore((state) => state.setCanvasPosition)
  const setCanvasScale = useCanvasStore((state) => state.setCanvasScale)
  const setSelectedShapeIds = useCanvasStore((state) => state.setSelectedShapeIds)
  const [isPanning, setIsPanning] = useState(false)
  const [marqueeRect, setMarqueeRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  // Refs avoid stale closures in Konva event handlers across React renders
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null)
  const marqueeRectRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  // Konva fires 'click' immediately after 'mouseup' on empty canvas even after a drag;
  // this flag tells onClick to skip deselection when a marquee selection just happened.
  const didMarqueeSelectRef = useRef(false)

  const scaleRef = useRef(canvasScale)
  const positionRef = useRef(canvasPosition)
  useEffect(() => { scaleRef.current = canvasScale }, [canvasScale])
  useEffect(() => { positionRef.current = canvasPosition }, [canvasPosition])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      if (e.metaKey || e.ctrlKey) {
        const oldScale = scaleRef.current
        const direction = e.deltaY < 0 ? 1 : -1
        const newScale = Math.min(MAX_SCALE, Math.max(getMinScale(), oldScale * (1 + direction * ZOOM_STEP)))
        if (newScale === oldScale) return

        const ratio = newScale / oldScale
        const pos = positionRef.current
        setCanvasScale(newScale)
        setCanvasPosition(clampPosition({
          x: e.clientX - (e.clientX - pos.x) * ratio,
          y: e.clientY - (e.clientY - pos.y) * ratio,
        }, newScale))
      } else {
        const pos = positionRef.current
        setCanvasPosition(clampPosition({
          x: pos.x - e.deltaX,
          y: pos.y - e.deltaY,
        }, scaleRef.current))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [setCanvasPosition, setCanvasScale])

  useEffect(() => {
    const handleResize = () => {
      const minScale = getMinScale()
      const scale = scaleRef.current < minScale ? minScale : scaleRef.current
      if (scale !== scaleRef.current) setCanvasScale(scale)
      setCanvasPosition(clampPosition(positionRef.current, scale))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setCanvasScale, setCanvasPosition])

  // Clear marquee if mouse is released outside the Stage
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (marqueeStartRef.current || marqueeRectRef.current) {
        marqueeStartRef.current = null
        marqueeRectRef.current = null
        setMarqueeRect(null)
      }
    }
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const cursor =
    activeTool === 'hand'
      ? isPanning ? 'grabbing' : 'grab'
      : marqueeRect ? 'crosshair' : 'default'

  return (
    <div
      ref={containerRef}
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-canvas-bg)', cursor }}
    >
      <Toolbar />
      <Stage
        x={canvasPosition.x}
        y={canvasPosition.y}
        scaleX={canvasScale}
        scaleY={canvasScale}
        width={window?.innerWidth ?? 800}
        height={window?.innerHeight ?? 600}
        draggable={activeTool === 'hand'}
        dragBoundFunc={(pos) => clampPosition(pos, scaleRef.current)}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return
          if (didMarqueeSelectRef.current) {
            didMarqueeSelectRef.current = false
            return
          }
          setSelectedShapeIds([])
        }}
        onMouseDown={(e) => {
          if (activeTool !== 'select') return
          if (e.target !== e.currentTarget) return
          const stage = e.target.getStage()
          if (!stage) return
          const raw = stage.getPointerPosition()
          if (!raw) return
          const pos = {
            x: (raw.x - positionRef.current.x) / scaleRef.current,
            y: (raw.y - positionRef.current.y) / scaleRef.current,
          }
          marqueeStartRef.current = pos
          marqueeRectRef.current = null
        }}
        onMouseMove={(e) => {
          if (!marqueeStartRef.current) return
          const stage = e.target.getStage()
          if (!stage) return
          const raw = stage.getPointerPosition()
          if (!raw) return
          const pos = {
            x: (raw.x - positionRef.current.x) / scaleRef.current,
            y: (raw.y - positionRef.current.y) / scaleRef.current,
          }
          const { x: sx, y: sy } = marqueeStartRef.current
          if (Math.abs(pos.x - sx) < MARQUEE_THRESHOLD && Math.abs(pos.y - sy) < MARQUEE_THRESHOLD) return
          const newRect = { x1: sx, y1: sy, x2: pos.x, y2: pos.y }
          marqueeRectRef.current = newRect
          setMarqueeRect(newRect)
        }}
        onMouseUp={() => {
          if (!marqueeStartRef.current) return
          const rect = marqueeRectRef.current
          if (rect) {
            const normalized = {
              x1: Math.min(rect.x1, rect.x2),
              y1: Math.min(rect.y1, rect.y2),
              x2: Math.max(rect.x1, rect.x2),
              y2: Math.max(rect.y1, rect.y2),
            }
            const selected = shapes.filter((shape) =>
              intersectsBoundingBox(getShapeBoundingBox(shape), normalized)
            )
            setSelectedShapeIds(selected.map((s) => s.id))
            didMarqueeSelectRef.current = true
          }
          marqueeStartRef.current = null
          marqueeRectRef.current = null
          setMarqueeRect(null)
        }}
        onDragStart={(e) => {
          if (e.target !== e.currentTarget) return
          setIsPanning(true)
        }}
        onDragEnd={(e) => {
          if (e.target !== e.currentTarget) return
          setIsPanning(false)
          setCanvasPosition({ x: e.target.x(), y: e.target.y() })
        }}
        className="m-auto"
      >
        <GridBackground />
        <Layer>
          {shapes.map((shape) => (
            <ShapeNode key={shape.id} shape={shape} />
          ))}
          {marqueeRect && (
            <SelectionMarquee
              x1={marqueeRect.x1}
              y1={marqueeRect.y1}
              x2={marqueeRect.x2}
              y2={marqueeRect.y2}
            />
          )}
        </Layer>
      </Stage>
      <PictureDataDisplay />
      <JsonImportInput />
    </div>
  )
}
