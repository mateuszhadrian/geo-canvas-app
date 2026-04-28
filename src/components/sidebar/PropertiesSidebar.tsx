'use client'

import { useRef, useState } from 'react'
import { Sketch } from '@uiw/react-color'
import type { ColorResult } from '@uiw/react-color'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { Shape } from '@/shapes'
import type { ShapeUpdate } from '@/store/types'

function hasFill(shape: Shape): shape is Extract<Shape, { fill: string }> {
  return 'fill' in shape
}

// ── ColorRow ──────────────────────────────────────────────────────────────────

function ColorRow({
  label,
  color,
  open,
  onToggle,
  onBeforeChange,
  onChange,
  onAfterChange,
}: {
  label: string
  color: string
  open: boolean
  onToggle: () => void
  onBeforeChange: () => void
  onChange: (c: ColorResult) => void
  onAfterChange: () => void
}) {
  return (
    <section>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded px-1 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <span
          className="h-4 w-4 shrink-0 rounded border border-gray-200"
          style={{ backgroundColor: color }}
        />
        <span>{label}</span>
        <span className="ml-auto font-mono text-gray-400">{color.toUpperCase()}</span>
      </button>
      {open && (
        <div
          className="mt-2 flex justify-center"
          onPointerDown={onBeforeChange}
          onPointerUp={onAfterChange}
        >
          <Sketch
            color={color}
            disableAlpha
            onChange={onChange}
            style={{ boxShadow: 'none', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </div>
      )}
    </section>
  )
}

// ── PropertiesSidebar ─────────────────────────────────────────────────────────

export function PropertiesSidebar() {
  const selectedShapeIds = useCanvasStore((s) => s.selectedShapeIds)
  const shapes = useCanvasStore((s) => s.shapes)
  const updateShapeTransient = useCanvasStore((s) => s.updateShapeTransient)
  const commitShapeUpdate = useCanvasStore((s) => s.commitShapeUpdate)

  const [fillOpen, setFillOpen] = useState(false)
  const [strokeOpen, setStrokeOpen] = useState(false)

  // "before" refs: capture original value at the start of each interaction
  const beforeRef = useRef<ShapeUpdate | null>(null)

  if (selectedShapeIds.length !== 1) return null

  const shape = shapes.find((s) => s.id === selectedShapeIds[0])
  if (!shape) return null

  const withFill = hasFill(shape)
  const opacityPct = Math.round(shape.opacity * 100)

  const commit = (field: keyof ShapeUpdate) => {
    if (beforeRef.current === null) return
    const current = useCanvasStore.getState().shapes.find((s) => s.id === shape.id)
    if (!current) { beforeRef.current = null; return }
    const currentVal = (current as unknown as Record<string, unknown>)[field]
    const after: ShapeUpdate = { [field]: currentVal }
    if ((beforeRef.current as Record<string, unknown>)[field] !== currentVal) {
      commitShapeUpdate(shape.id, beforeRef.current, after)
    }
    beforeRef.current = null
  }

  return (
    <div
      className="absolute right-0 top-0 z-10 flex h-full w-64 flex-col gap-4 overflow-y-auto border-l px-4 py-4"
      style={{
        backgroundColor: 'var(--color-sidebar-bg)',
        borderColor: 'var(--color-toolbar-border)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {shape.type}
      </p>

      <section>
        <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-gray-600">
          <span>Opacity</span>
          <span className="font-mono text-gray-400">{opacityPct}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={opacityPct}
          onPointerDown={() => { beforeRef.current = { opacity: shape.opacity } }}
          onChange={(e) =>
            updateShapeTransient(shape.id, { opacity: Number(e.target.value) / 100 })
          }
          onPointerUp={() => commit('opacity')}
          className="w-full accent-blue-500"
        />
      </section>

      {withFill && (
        <ColorRow
          label="Fill"
          color={shape.fill}
          open={fillOpen}
          onToggle={() => {
            setFillOpen((v) => !v)
            if (strokeOpen) setStrokeOpen(false)
          }}
          onBeforeChange={() => {
            if (beforeRef.current === null) {
              const s = shape as Extract<Shape, { fill: string }>
              beforeRef.current = { fill: s.fill }
            }
          }}
          onChange={(c) => updateShapeTransient(shape.id, { fill: c.hex })}
          onAfterChange={() => commit('fill')}
        />
      )}

      <ColorRow
        label="Stroke"
        color={shape.stroke}
        open={strokeOpen}
        onToggle={() => {
          setStrokeOpen((v) => !v)
          if (fillOpen) setFillOpen(false)
        }}
        onBeforeChange={() => {
          if (beforeRef.current === null) beforeRef.current = { stroke: shape.stroke }
        }}
        onChange={(c) => updateShapeTransient(shape.id, { stroke: c.hex })}
        onAfterChange={() => commit('stroke')}
      />
    </div>
  )
}
