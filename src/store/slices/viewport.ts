export interface ViewportSlice {
  canvasScale: number
  canvasPosition: { x: number; y: number }
  setCanvasScale: (scale: number) => void
  setCanvasPosition: (pos: { x: number; y: number }) => void
}
