'use client'

import { useRef, useState } from 'react'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { RectShape } from './types'

function NumericField({
  label,
  value,
  min,
  onCommit,
}: {
  label: string
  value: number
  min?: number
  onCommit: (v: number) => void
}) {
  const [prevProp, setPrevProp] = useState(value)
  const [local, setLocal] = useState(String(Math.round(value)))
  if (prevProp !== value) {
    setPrevProp(value)
    setLocal(String(Math.round(value)))
  }

  const commit = () => {
    const n = parseFloat(local)
    if (!isNaN(n)) onCommit(min !== undefined ? Math.max(min, n) : n)
    else setLocal(String(Math.round(value)))
  }

  return (
    <div className="flex items-center gap-2">
      <label className="w-24 shrink-0 text-xs text-gray-500">{label}</label>
      <input
        type="number"
        value={local}
        min={min}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
        className="w-full rounded border px-1.5 py-0.5 text-xs font-mono text-gray-300 outline-none focus:border-blue-500"
        style={{ backgroundColor: 'var(--color-canvas-bg)', borderColor: 'var(--color-toolbar-border)' }}
      />
    </div>
  )
}

export function RectPropertiesPanel({ shape }: { shape: RectShape }) {
  const updateShapeTransient = useCanvasStore((s) => s.updateShapeTransient)
  const commitShapeUpdate = useCanvasStore((s) => s.commitShapeUpdate)
  const beforeRef = useRef<{ width?: number; height?: number; cornerRadius?: number } | null>(null)

  const commit = (field: 'width' | 'height' | 'cornerRadius', value: number) => {
    const before = beforeRef.current ?? { [field]: shape[field] }
    const after = { [field]: value }
    updateShapeTransient(shape.id, after)
    commitShapeUpdate(shape.id, before, after)
    beforeRef.current = null
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      <NumericField
        label="Width"
        value={shape.width}
        min={10}
        onCommit={(v) => { beforeRef.current = { width: shape.width }; commit('width', v) }}
      />
      <NumericField
        label="Height"
        value={shape.height}
        min={10}
        onCommit={(v) => { beforeRef.current = { height: shape.height }; commit('height', v) }}
      />
      <NumericField
        label="Corner radius"
        value={shape.cornerRadius}
        min={0}
        onCommit={(v) => { beforeRef.current = { cornerRadius: shape.cornerRadius }; commit('cornerRadius', v) }}
      />
    </div>
  )
}
