export interface SelectionSlice {
  selectedShapeIds: string[]
  setSelectedShapeIds: (ids: string[]) => void
  toggleShapeSelection: (id: string) => void
}
