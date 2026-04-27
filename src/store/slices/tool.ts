export type ToolType = 'select' | 'hand'

export interface ToolSlice {
  activeTool: ToolType
  setActiveTool: (tool: ToolType) => void
}
