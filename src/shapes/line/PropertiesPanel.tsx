'use client'

import { useCanvasStore } from '@/store/use-canvas-store'
import type { LineShape } from './types'

export function LinePropertiesPanel({ shape }: { shape: LineShape }) {
  const updateShape = useCanvasStore((s) => s.updateShape)
  const segments = shape.points.length / 2 - 1

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Segments</span>
        <span className="font-mono text-gray-400">{segments}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="w-24 shrink-0 text-xs text-gray-500">Dashed</label>
        <button
          onClick={() => updateShape(shape.id, { dash: !shape.dash })}
          className={[
            'h-5 w-9 rounded-full transition-colors relative shrink-0',
            shape.dash ? 'bg-blue-500' : 'bg-gray-600',
          ].join(' ')}
          role="switch"
          aria-checked={shape.dash}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            style={{ left: shape.dash ? '18px' : '2px' }}
          />
        </button>
      </div>
    </div>
  )
}
