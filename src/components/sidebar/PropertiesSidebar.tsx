'use client'

import { useEffect, useRef, useState } from 'react'
import { Sketch } from '@uiw/react-color'
import type { ColorResult } from '@uiw/react-color'
import { useCanvasStore } from '@/store/use-canvas-store'
import { SHAPE_REGISTRY } from '@/shapes/registry'
import type { Shape } from '@/shapes'
import type { ShapeUpdate } from '@/store/types'

function hasFill(shape: Shape): shape is Extract<Shape, { fill: string }> {
  return 'fill' in shape
}

function getField(obj: unknown, key: string): unknown {
  return (obj as Record<string, unknown>)[key]
}

// ── ColorRow ──────────────────────────────────────────────────────────────────

function ColorRow({
  label, color, open, onToggle, onChange,
}: {
  label: string; color: string; open: boolean
  onToggle: () => void
  onChange: (c: ColorResult) => void
}) {
  return (
    <section>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded px-1 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <span className="h-4 w-4 shrink-0 rounded border border-gray-200" style={{ backgroundColor: color }} />
        <span>{label}</span>
        <span className="ml-auto font-mono text-gray-400">{color.toUpperCase()}</span>
      </button>
      {open && (
        <div className="mt-2 flex justify-center">
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
  const beforeRef = useRef<ShapeUpdate | null>(null)
  // Tracks which color field is currently being edited (set when picker opens)
  const openFieldRef = useRef<'fill' | 'stroke' | null>(null)

  // Commit pending color change on every pointer release anywhere on the page.
  // This ensures each drag gesture is immediately in history, so Ctrl+Z works
  // even when the picker is still open.
  useEffect(() => {
    if (!fillOpen && !strokeOpen) return

    const handlePointerUp = () => {
      const field = openFieldRef.current
      const shapeId = selectedShapeIds[0]
      if (!field || !shapeId || beforeRef.current === null) return

      const state = useCanvasStore.getState()
      const current = state.shapes.find((s) => s.id === shapeId)
      if (!current) return

      const currentVal = getField(current, field) as string
      const beforeVal = getField(beforeRef.current, field) as string | undefined
      if (beforeVal !== undefined && beforeVal !== currentVal) {
        state.commitShapeUpdate(shapeId, { [field]: beforeVal }, { [field]: currentVal })
        // Re-capture for any further drag in the same session
        beforeRef.current = { [field]: currentVal }
      }
    }

    document.addEventListener('pointerup', handlePointerUp)
    return () => document.removeEventListener('pointerup', handlePointerUp)
  }, [fillOpen, strokeOpen, selectedShapeIds])

  if (selectedShapeIds.length !== 1) return null

  const shape = shapes.find((s) => s.id === selectedShapeIds[0])
  if (!shape) return null

  const withFill = hasFill(shape)
  const opacityPct = Math.round(shape.opacity * 100)

  // Commits any pending transient change (called when picker closes or field switches).
  // The global pointerup handler covers drag-end; this covers hex-input edits and close.
  const commit = (field: keyof ShapeUpdate) => {
    if (beforeRef.current === null) return
    const current = useCanvasStore.getState().shapes.find((s) => s.id === shape.id)
    if (!current) { beforeRef.current = null; return }
    const currentVal = getField(current, field)
    const after: ShapeUpdate = { [field]: currentVal }
    if (getField(beforeRef.current, field) !== currentVal) {
      commitShapeUpdate(shape.id, beforeRef.current, after)
    }
    beforeRef.current = null
  }

  const { PropertiesPanel } = SHAPE_REGISTRY[shape.type]

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {shape.type}
      </p>

      {/* Shape-specific numeric properties */}
      <PropertiesPanel shape={shape as never} />

      <div className="border-t" style={{ borderColor: 'var(--color-toolbar-border)' }} />

      {/* Opacity */}
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
          onChange={(e) => updateShapeTransient(shape.id, { opacity: Number(e.target.value) / 100 })}
          onPointerUp={() => commit('opacity')}
          className="w-full accent-blue-500"
        />
      </section>

      {/* Fill */}
      {withFill && (
        <ColorRow
          label="Fill"
          color={(shape as Extract<Shape, { fill: string }>).fill}
          open={fillOpen}
          onToggle={() => {
            if (fillOpen) {
              commit('fill')
              openFieldRef.current = null
            } else {
              if (strokeOpen) {
                commit('stroke')
                setStrokeOpen(false)
              }
              openFieldRef.current = 'fill'
              beforeRef.current = { fill: (shape as Extract<Shape, { fill: string }>).fill }
            }
            setFillOpen((v) => !v)
          }}
          onChange={(c) => updateShapeTransient(shape.id, { fill: c.hex })}
        />
      )}

      {/* Stroke */}
      <ColorRow
        label="Stroke"
        color={shape.stroke}
        open={strokeOpen}
        onToggle={() => {
          if (strokeOpen) {
            commit('stroke')
            openFieldRef.current = null
          } else {
            if (fillOpen) {
              commit('fill')
              setFillOpen(false)
            }
            openFieldRef.current = 'stroke'
            beforeRef.current = { stroke: shape.stroke }
          }
          setStrokeOpen((v) => !v)
        }}
        onChange={(c) => updateShapeTransient(shape.id, { stroke: c.hex })}
      />
    </div>
  )
}
