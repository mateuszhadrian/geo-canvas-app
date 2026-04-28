'use client'

import { MousePointer2, Hand, Square, Circle, Triangle, Minus, BringToFront, SendToBack, ArrowUp, ArrowDown } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import type { ToolType } from '@/store/slices/tool'
import type { ShapeType } from '@/shapes'

interface CursorToolConfig {
  type: ToolType
  icon: React.ComponentType<LucideProps>
  label: string
}

interface ShapeToolConfig {
  type: ShapeType
  icon: React.ComponentType<LucideProps>
  label: string
}

const CURSOR_TOOLS: CursorToolConfig[] = [
  { type: 'select', icon: MousePointer2, label: 'Select' },
  { type: 'hand', icon: Hand, label: 'Pan' },
]

const SHAPE_TOOLS: ShapeToolConfig[] = [
  { type: 'rect', icon: Square, label: 'Rectangle' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'line', icon: Minus, label: 'Line' },
]

function getCanvasCenter(canvasPosition: { x: number; y: number }, canvasScale: number) {
  return {
    x: (window.innerWidth / 2 - canvasPosition.x) / canvasScale,
    y: (window.innerHeight / 2 - canvasPosition.y) / canvasScale,
  }
}

export function Toolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool)
  const setActiveTool = useCanvasStore((s) => s.setActiveTool)
  const addShape = useCanvasStore((s) => s.addShape)
  const setSelectedShapeIds = useCanvasStore((s) => s.setSelectedShapeIds)
  const canvasPosition = useCanvasStore((s) => s.canvasPosition)
  const canvasScale = useCanvasStore((s) => s.canvasScale)
  const selectedShapeIds = useCanvasStore((s) => s.selectedShapeIds)
  const bringForward = useCanvasStore((s) => s.bringForward)
  const bringToFront = useCanvasStore((s) => s.bringToFront)
  const sendBackward = useCanvasStore((s) => s.sendBackward)
  const sendToBack = useCanvasStore((s) => s.sendToBack)

  const hasSelection = selectedShapeIds.length > 0

  return (
    <div
      className="absolute left-0 top-0 z-10 flex h-full w-14 flex-col items-center gap-1 py-3 border-r"
      style={{
        backgroundColor: 'var(--color-toolbar-bg)',
        borderColor: 'var(--color-toolbar-border)',
      }}
    >
      {CURSOR_TOOLS.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          title={label}
          onClick={() => setActiveTool(type)}
          className={[
            'flex h-10 w-10 items-center justify-center rounded transition-colors',
            activeTool === type
              ? 'bg-white/15 text-white ring-1 ring-inset ring-white/20'
              : 'text-gray-400 hover:bg-white/10 hover:text-gray-200',
          ].join(' ')}
        >
          <Icon size={18} />
        </button>
      ))}

      <div className="my-1 w-8 border-t" style={{ borderColor: 'var(--color-toolbar-border)' }} />

      {SHAPE_TOOLS.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          title={label}
          onClick={() => {
            const shape = SHAPE_REGISTRY[type].create(getCanvasCenter(canvasPosition, canvasScale))
            addShape(shape)
            setSelectedShapeIds([shape.id])
          }}
          className="flex h-10 w-10 items-center justify-center rounded transition-colors text-gray-400 hover:bg-white/10 hover:text-gray-200 active:bg-white/15 active:text-white"
        >
          <Icon size={18} />
        </button>
      ))}

      <div className="my-1 w-8 border-t" style={{ borderColor: 'var(--color-toolbar-border)' }} />

      {[
        { label: 'Przesuń warstwę wyżej', icon: ArrowUp, action: () => bringForward(selectedShapeIds) },
        { label: 'Przesuń na wierzch', icon: BringToFront, action: () => bringToFront(selectedShapeIds) },
        { label: 'Przesuń warstwę niżej', icon: ArrowDown, action: () => sendBackward(selectedShapeIds) },
        { label: 'Przesuń na spód', icon: SendToBack, action: () => sendToBack(selectedShapeIds) },
      ].map(({ label, icon: Icon, action }) => (
        <button
          key={label}
          title={label}
          disabled={!hasSelection}
          onClick={action}
          className={[
            'flex h-10 w-10 items-center justify-center rounded transition-colors',
            hasSelection
              ? 'text-gray-400 hover:bg-white/10 hover:text-gray-200 active:bg-white/15 active:text-white'
              : 'text-gray-600 cursor-not-allowed',
          ].join(' ')}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  )
}
