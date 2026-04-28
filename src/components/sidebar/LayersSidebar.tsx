'use client'

import { useState, useRef } from 'react'
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { Layer } from '@/store/slices/layers'

// ── LayerRow ──────────────────────────────────────────────────────────────────

function LayerRow({
  layer,
  isActive,
  canDelete,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  layer: Layer
  isActive: boolean
  canDelete: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(layer.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed) onRename(trimmed)
    else setDraft(layer.name)
    setEditing(false)
  }

  return (
    <div
      className={[
        'group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer select-none',
        isActive ? 'bg-blue-500/20 ring-1 ring-inset ring-blue-500/40' : 'hover:bg-white/5',
      ].join(' ')}
      onClick={onSelect}
    >
      {/* Visibility */}
      <button
        title={layer.visible ? 'Hide layer' : 'Show layer'}
        onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
        className="shrink-0 text-gray-500 hover:text-gray-200 transition-colors"
      >
        {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>

      {/* Lock */}
      <button
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        onClick={(e) => { e.stopPropagation(); onToggleLock() }}
        className="shrink-0 text-gray-500 hover:text-gray-200 transition-colors"
      >
        {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraft(layer.name); setEditing(false) }
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-xs text-gray-200 outline-none border-b border-blue-400"
          />
        ) : (
          <span
            className={[
              'block truncate text-xs',
              isActive ? 'text-gray-200' : 'text-gray-400',
              !layer.visible ? 'opacity-50' : '',
            ].join(' ')}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* Actions — shown on hover or when active */}
      <div className="hidden group-hover:flex items-center gap-0.5">
        <button
          title="Move up"
          onClick={(e) => { e.stopPropagation(); onMoveUp() }}
          className="text-gray-500 hover:text-gray-200 transition-colors"
        >
          <ChevronUp size={12} />
        </button>
        <button
          title="Move down"
          onClick={(e) => { e.stopPropagation(); onMoveDown() }}
          className="text-gray-500 hover:text-gray-200 transition-colors"
        >
          <ChevronDown size={12} />
        </button>
        {canDelete && (
          <button
            title="Delete layer"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── LayersSidebar ─────────────────────────────────────────────────────────────

export function LayersSidebar() {
  const layers = useCanvasStore((s) => s.layers)
  const activeLayerId = useCanvasStore((s) => s.activeLayerId)
  const addLayer = useCanvasStore((s) => s.addLayer)
  const removeLayer = useCanvasStore((s) => s.removeLayer)
  const renameLayer = useCanvasStore((s) => s.renameLayer)
  const toggleLayerVisibility = useCanvasStore((s) => s.toggleLayerVisibility)
  const toggleLayerLock = useCanvasStore((s) => s.toggleLayerLock)
  const setLayerOpacity = useCanvasStore((s) => s.setLayerOpacity)
  const setActiveLayer = useCanvasStore((s) => s.setActiveLayer)
  const moveLayerUp = useCanvasStore((s) => s.moveLayerUp)
  const moveLayerDown = useCanvasStore((s) => s.moveLayerDown)
  const shapes = useCanvasStore((s) => s.shapes)

  const activeLayer = layers.find((l) => l.id === activeLayerId)

  // Layers displayed top-to-bottom = frontmost-to-backmost (reversed array order)
  const displayedLayers = [...layers].reverse()

  return (
    <div
      className="border-t flex flex-col"
      style={{ borderColor: 'var(--color-toolbar-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Layers
        </span>
        <button
          title="Add layer"
          onClick={() => addLayer(`Layer ${layers.length + 1}`)}
          className="text-gray-500 hover:text-gray-200 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5" style={{ maxHeight: '200px' }}>
        {displayedLayers.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            isActive={layer.id === activeLayerId}
            canDelete={layers.length > 1}
            onSelect={() => setActiveLayer(layer.id)}
            onToggleVisibility={() => toggleLayerVisibility(layer.id)}
            onToggleLock={() => toggleLayerLock(layer.id)}
            onRename={(name) => renameLayer(layer.id, name)}
            onDelete={() => removeLayer(layer.id)}
            onMoveUp={() => moveLayerUp(layer.id)}
            onMoveDown={() => moveLayerDown(layer.id)}
          />
        ))}
      </div>

      {/* Active layer opacity */}
      {activeLayer && (
        <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: 'var(--color-toolbar-border)' }}>
          <label className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>{activeLayer.name} opacity</span>
            <span className="font-mono">{Math.round(activeLayer.opacity * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(activeLayer.opacity * 100)}
            onChange={(e) => setLayerOpacity(activeLayer.id, Number(e.target.value) / 100)}
            className="w-full accent-blue-500"
          />
        </div>
      )}

      {/* Shape count */}
      <div className="px-4 pb-2 text-[10px] text-gray-600">
        {shapes.filter((s) => (s.layerId ?? activeLayerId) === activeLayerId).length} shape(s) in active layer
      </div>
    </div>
  )
}
