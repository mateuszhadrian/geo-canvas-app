'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Shape } from '@/shapes'
import type { ShapeUpdate } from './types'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvasConstants'
import type { ShapesSlice } from './slices/shapes'
import type { SelectionSlice } from './slices/selection'
import type { ViewportSlice } from './slices/viewport'
import type { ToolSlice, ToolType } from './slices/tool'
import type { HistorySlice } from './slices/history'
import type { HistoryCommand } from './history/types'
import type { ShapeUpdatePair } from './types'
import type { LayersSlice, Layer } from './slices/layers'
import { INITIAL_LAYER, DEFAULT_LAYER_ID, createLayer } from './slices/layers'

const MAX_HISTORY = 50

type HistoryState = Pick<HistorySlice, '_past' | '_future' | 'canUndo' | 'canRedo'>

function pushCmd(state: HistoryState, command: HistoryCommand) {
  state._past.push(command)
  if (state._past.length > MAX_HISTORY) state._past.shift()
  state._future = []
  state.canUndo = true
  state.canRedo = false
}

type MutableShapesState = { shapes: Shape[] }

function applyForward(state: MutableShapesState, command: HistoryCommand): void {
  switch (command.type) {
    case 'ADD_SHAPE':
      state.shapes.push(command.shape)
      break
    case 'REMOVE_SHAPES': {
      const ids = new Set(command.shapes.map((s: Shape) => s.id))
      state.shapes = state.shapes.filter((s: Shape) => !ids.has(s.id))
      break
    }
    case 'UPDATE_SHAPE': {
      const shape = state.shapes.find((s: Shape) => s.id === command.id)
      if (shape) Object.assign(shape, command.after)
      break
    }
    case 'UPDATE_SHAPES':
      command.updates.forEach(({ id, after }: ShapeUpdatePair) => {
        const s = state.shapes.find((sh: Shape) => sh.id === id)
        if (s) Object.assign(s, after)
      })
      break
    case 'SET_SHAPES':
      state.shapes = command.after
      break
    case 'REORDER_SHAPES': {
      const idxMap = new Map(command.after.map((id: string, i: number) => [id, i]))
      state.shapes = [...state.shapes].sort(
        (a: Shape, b: Shape) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0)
      )
      break
    }
  }
}

function applyInverse(state: MutableShapesState, command: HistoryCommand): void {
  switch (command.type) {
    case 'ADD_SHAPE':
      state.shapes = state.shapes.filter((s: Shape) => s.id !== command.shape.id)
      break
    case 'REMOVE_SHAPES':
      state.shapes.push(...command.shapes)
      break
    case 'UPDATE_SHAPE': {
      const shape = state.shapes.find((s: Shape) => s.id === command.id)
      if (shape) Object.assign(shape, command.before)
      break
    }
    case 'UPDATE_SHAPES':
      command.updates.forEach(({ id, before }: ShapeUpdatePair) => {
        const s = state.shapes.find((sh: Shape) => sh.id === id)
        if (s) Object.assign(s, before)
      })
      break
    case 'SET_SHAPES':
      state.shapes = command.before
      break
    case 'REORDER_SHAPES': {
      const idxMap = new Map(command.before.map((id: string, i: number) => [id, i]))
      state.shapes = [...state.shapes].sort(
        (a: Shape, b: Shape) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0)
      )
      break
    }
  }
}

type CanvasStore = ShapesSlice & SelectionSlice & ViewportSlice & ToolSlice & HistorySlice & LayersSlice

export const useCanvasStore = create<CanvasStore>()(
  immer((set) => ({
    // ── layers slice ───────────────────────────────────────────────────────────

    layers: [INITIAL_LAYER],
    activeLayerId: DEFAULT_LAYER_ID,

    addLayer: (name?: string) =>
      set((state) => {
        const layer = createLayer(name)
        state.layers.push(layer)
        state.activeLayerId = layer.id
      }),

    removeLayer: (id: string) =>
      set((state) => {
        if (state.layers.length <= 1) return
        const idx = state.layers.findIndex((l) => l.id === id)
        if (idx === -1) return
        state.layers.splice(idx, 1)
        // Remove all shapes belonging to the deleted layer
        state.shapes = state.shapes.filter((s) => s.layerId !== id)
        if (state.activeLayerId === id) {
          state.activeLayerId = state.layers[Math.max(0, idx - 1)].id
        }
      }),

    renameLayer: (id: string, name: string) =>
      set((state) => {
        const layer = state.layers.find((l) => l.id === id)
        if (layer) layer.name = name
      }),

    toggleLayerVisibility: (id: string) =>
      set((state) => {
        const layer = state.layers.find((l) => l.id === id)
        if (layer) layer.visible = !layer.visible
      }),

    toggleLayerLock: (id: string) =>
      set((state) => {
        const layer = state.layers.find((l) => l.id === id)
        if (layer) layer.locked = !layer.locked
      }),

    setLayerOpacity: (id: string, opacity: number) =>
      set((state) => {
        const layer = state.layers.find((l) => l.id === id)
        if (layer) layer.opacity = opacity
      }),

    setActiveLayer: (id: string) =>
      set((state) => { state.activeLayerId = id }),

    moveLayerUp: (id: string) =>
      set((state) => {
        const idx = state.layers.findIndex((l) => l.id === id)
        if (idx < state.layers.length - 1) {
          const tmp = state.layers[idx]
          state.layers[idx] = state.layers[idx + 1]
          state.layers[idx + 1] = tmp
        }
      }),

    moveLayerDown: (id: string) =>
      set((state) => {
        const idx = state.layers.findIndex((l) => l.id === id)
        if (idx > 0) {
          const tmp = state.layers[idx]
          state.layers[idx] = state.layers[idx - 1]
          state.layers[idx - 1] = tmp
        }
      }),

    setLayers: (layers: Layer[], activeLayerId: string) =>
      set((state) => {
        state.layers = layers as typeof state.layers
        state.activeLayerId = activeLayerId
      }),

    // ── shapes slice ───────────────────────────────────────────────────────────

    shapes: [],
    stickyDefaults: {},

    addShape: (shape: Shape) =>
      set((state) => {
        // Inject active layerId if not already set
        const layerId = shape.layerId ?? state.activeLayerId
        const finalShape = { ...shape, layerId } as unknown as typeof state.shapes[0]
        state.shapes.push(finalShape)
        pushCmd(state, { type: 'ADD_SHAPE', shape: { ...shape, layerId } as Shape })
      }),

    removeShape: (id: string) =>
      set((state) => {
        const removed = state.shapes.filter((s) => s.id === id) as Shape[]
        state.shapes = state.shapes.filter((s) => s.id !== id)
        state.selectedShapeIds = state.selectedShapeIds.filter((sid) => sid !== id)
        if (removed.length > 0) pushCmd(state, { type: 'REMOVE_SHAPES', shapes: removed })
      }),

    removeShapes: (ids: string[]) =>
      set((state) => {
        const set_ = new Set(ids)
        const removed = state.shapes.filter((s) => set_.has(s.id)) as Shape[]
        state.shapes = state.shapes.filter((s) => !set_.has(s.id))
        state.selectedShapeIds = []
        if (removed.length > 0) pushCmd(state, { type: 'REMOVE_SHAPES', shapes: removed })
      }),

    updateShape: (id: string, updates: ShapeUpdate) =>
      set((state) => {
        const shape = state.shapes.find((s) => s.id === id)
        if (!shape) return
        const before: ShapeUpdate = {}
        for (const key of Object.keys(updates) as Array<keyof ShapeUpdate>) {
          ;(before as Record<string, unknown>)[key] = (shape as Record<string, unknown>)[key]
        }
        Object.assign(shape, updates)
        pushCmd(state, { type: 'UPDATE_SHAPE', id, before, after: updates })
      }),

    updateShapeTransient: (id: string, updates: ShapeUpdate) =>
      set((state) => {
        const shape = state.shapes.find((s) => s.id === id)
        if (shape) Object.assign(shape, updates)
      }),

    moveShapes: (items: ShapeUpdatePair[]) =>
      set((state) => {
        items.forEach(({ id, after }) => {
          const shape = state.shapes.find((s) => s.id === id)
          if (shape) Object.assign(shape, after)
        })
        pushCmd(state, { type: 'UPDATE_SHAPES', updates: items })
      }),

    commitShapeUpdate: (id: string, before: ShapeUpdate, after: ShapeUpdate) =>
      set((state) => {
        pushCmd(state, { type: 'UPDATE_SHAPE', id, before, after })
      }),

    commitShapesUpdate: (updates: ShapeUpdatePair[]) =>
      set((state) => {
        pushCmd(state, { type: 'UPDATE_SHAPES', updates })
      }),

    setShapes: (shapes: Shape[]) =>
      set((state) => {
        const before = state.shapes.slice() as Shape[]
        state.shapes = shapes as typeof state.shapes
        pushCmd(state, { type: 'SET_SHAPES', before, after: shapes })
      }),

    bringForward: (ids: string[]) =>
      set((state) => {
        const before = state.shapes.map((s) => s.id)
        const selected = new Set(ids)
        const arr = state.shapes
        for (let i = arr.length - 2; i >= 0; i--) {
          if (selected.has(arr[i].id) && !selected.has(arr[i + 1].id)) {
            ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
          }
        }
        const after = state.shapes.map((s) => s.id)
        if (before.join(',') !== after.join(',')) pushCmd(state, { type: 'REORDER_SHAPES', before, after })
      }),

    bringToFront: (ids: string[]) =>
      set((state) => {
        const before = state.shapes.map((s) => s.id)
        const selected = new Set(ids)
        const rest = state.shapes.filter((s) => !selected.has(s.id))
        const top = state.shapes.filter((s) => selected.has(s.id))
        state.shapes = [...rest, ...top] as typeof state.shapes
        const after = state.shapes.map((s) => s.id)
        if (before.join(',') !== after.join(',')) pushCmd(state, { type: 'REORDER_SHAPES', before, after })
      }),

    sendBackward: (ids: string[]) =>
      set((state) => {
        const before = state.shapes.map((s) => s.id)
        const selected = new Set(ids)
        const arr = state.shapes
        for (let i = 1; i < arr.length; i++) {
          if (selected.has(arr[i].id) && !selected.has(arr[i - 1].id)) {
            ;[arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]
          }
        }
        const after = state.shapes.map((s) => s.id)
        if (before.join(',') !== after.join(',')) pushCmd(state, { type: 'REORDER_SHAPES', before, after })
      }),

    sendToBack: (ids: string[]) =>
      set((state) => {
        const before = state.shapes.map((s) => s.id)
        const selected = new Set(ids)
        const rest = state.shapes.filter((s) => !selected.has(s.id))
        const bottom = state.shapes.filter((s) => selected.has(s.id))
        state.shapes = [...bottom, ...rest] as typeof state.shapes
        const after = state.shapes.map((s) => s.id)
        if (before.join(',') !== after.join(',')) pushCmd(state, { type: 'REORDER_SHAPES', before, after })
      }),

    // ── selection slice ────────────────────────────────────────────────────────

    selectedShapeIds: [],
    setSelectedShapeIds: (ids: string[]) =>
      set((state) => { state.selectedShapeIds = ids }),
    toggleShapeSelection: (id: string) =>
      set((state) => {
        const idx = state.selectedShapeIds.indexOf(id)
        if (idx === -1) state.selectedShapeIds.push(id)
        else state.selectedShapeIds.splice(idx, 1)
      }),

    // ── viewport slice ─────────────────────────────────────────────────────────

    canvasScale: typeof window !== 'undefined'
      ? Math.max(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT)
      : 1,
    canvasPosition: typeof window !== 'undefined'
      ? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      : { x: 400, y: 300 },
    setCanvasScale: (scale) =>
      set((state) => { state.canvasScale = scale }),
    setCanvasPosition: (pos) =>
      set((state) => { state.canvasPosition = pos }),

    // ── tool slice ─────────────────────────────────────────────────────────────

    activeTool: 'select' as ToolType,
    setActiveTool: (tool: ToolType) =>
      set((state) => { state.activeTool = tool }),

    // ── history slice ──────────────────────────────────────────────────────────

    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,

    pushHistory: (command: HistoryCommand) =>
      set((state) => { pushCmd(state, command) }),

    undo: () =>
      set((state) => {
        const command = state._past.pop()
        if (!command) return
        applyInverse(state, command)
        state._future.unshift(command)
        state.canUndo = state._past.length > 0
        state.canRedo = true
      }),

    redo: () =>
      set((state) => {
        const command = state._future.shift()
        if (!command) return
        applyForward(state, command)
        state._past.push(command)
        state.canUndo = true
        state.canRedo = state._future.length > 0
      }),

    clearHistory: () =>
      set((state) => {
        state._past = []
        state._future = []
        state.canUndo = false
        state.canRedo = false
      }),
  }))
)
