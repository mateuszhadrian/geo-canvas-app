import type { Shape } from '@/shapes'
import type { ShapeUpdate, ShapeUpdatePair } from '@/store/types'

export type HistoryCommand =
  | { type: 'ADD_SHAPE'; shape: Shape }
  | { type: 'REMOVE_SHAPES'; shapes: Shape[] }
  | { type: 'UPDATE_SHAPE'; id: string; before: ShapeUpdate; after: ShapeUpdate }
  | { type: 'UPDATE_SHAPES'; updates: ShapeUpdatePair[] }
  | { type: 'SET_SHAPES'; before: Shape[]; after: Shape[] }
  | { type: 'REORDER_SHAPES'; before: string[]; after: string[] }
