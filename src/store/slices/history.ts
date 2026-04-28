import type { HistoryCommand } from '../history/types'

export interface HistorySlice {
  _past: HistoryCommand[]
  _future: HistoryCommand[]
  canUndo: boolean
  canRedo: boolean
  pushHistory: (command: HistoryCommand) => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
}
