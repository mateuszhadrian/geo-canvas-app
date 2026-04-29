const TOOL_TYPES = ['select', 'hand'] as const
export type ToolType = (typeof TOOL_TYPES)[number]

export interface ToolSlice {
  activeTool: ToolType
  setActiveTool: (tool: ToolType) => void
}
