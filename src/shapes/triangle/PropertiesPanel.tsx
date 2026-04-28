'use client'

import type { TriangleShape } from './types'

export function TrianglePropertiesPanel({ shape }: { shape: TriangleShape }) {
  const [x0, y0, x1, y1, x2, y2] = shape.vertices
  const base = Math.hypot(x1 - x0, y1 - y0)
  const height = Math.abs(2 * (x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1))) / (2 * base || 1)

  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Base (approx)</span>
        <span className="font-mono text-gray-400">{Math.round(base)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Height (approx)</span>
        <span className="font-mono text-gray-400">{Math.round(height)}</span>
      </div>
      <p className="text-[10px] text-gray-600 pt-1">Drag side handles to reshape</p>
    </div>
  )
}
