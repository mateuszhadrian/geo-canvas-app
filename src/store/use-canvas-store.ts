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

type CanvasStore = ShapesSlice & SelectionSlice & ViewportSlice & ToolSlice

export const useCanvasStore = create<CanvasStore>()(
  immer((set) => ({
    // shapes slice
    shapes: [],
    stickyDefaults: {},
    addShape: (shape: Shape) =>
      set((state) => { state.shapes.push(shape) }),
    removeShape: (id: string) =>
      set((state) => {
        state.shapes = state.shapes.filter((s) => s.id !== id)
        state.selectedShapeIds = state.selectedShapeIds.filter((sid) => sid !== id)
      }),
    updateShape: (id: string, updates: ShapeUpdate) =>
      set((state) => {
        const shape = state.shapes.find((s) => s.id === id)
        if (shape) Object.assign(shape, updates)
      }),
    setShapes: (shapes: Shape[]) =>
      set((state) => { state.shapes = shapes }),

    // selection slice
    selectedShapeIds: [],
    setSelectedShapeIds: (ids: string[]) =>
      set((state) => { state.selectedShapeIds = ids }),
    toggleShapeSelection: (id: string) =>
      set((state) => {
        const idx = state.selectedShapeIds.indexOf(id)
        if (idx === -1) state.selectedShapeIds.push(id)
        else state.selectedShapeIds.splice(idx, 1)
      }),

    // viewport slice
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

    // tool slice
    activeTool: 'select' as ToolType,
    setActiveTool: (tool: ToolType) =>
      set((state) => { state.activeTool = tool }),
  }))
)
