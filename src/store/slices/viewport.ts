import type { Point } from '@/shapes'

export interface ViewportSlice {
  canvasScale: number
  canvasPosition: Point
  setCanvasScale: (scale: number) => void
  setCanvasPosition: (pos: Point) => void
}
