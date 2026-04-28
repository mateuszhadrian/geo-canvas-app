export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'triangle' | 'line'

export type Point = { x: number; y: number }

export interface BaseShape {
  id: string
  type: ShapeType
  x: number
  y: number
  rotation: number
  opacity: number
  stroke: string
  strokeWidth: number
}
