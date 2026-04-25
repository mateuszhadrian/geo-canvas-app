'use client'

export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'triangle' | 'line'

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

export interface RectShape extends BaseShape {
  type: 'rect'
  width: number
  height: number
  fill: string
  cornerRadius: number
}

export interface CircleShape extends BaseShape {
  type: 'circle'
  radius: number
  fill: string
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse'
  radiusX: number
  radiusY: number
  fill: string
}

export interface TriangleShape extends BaseShape {
  type: 'triangle'
  radius: number
  fill: string
}

export interface LineShape extends BaseShape {
  type: 'line'
  points: number[]
  dash: boolean
}

export type Shape = RectShape | CircleShape | EllipseShape | TriangleShape | LineShape

export type ShapeProperties = Omit<Shape, 'id' | 'type' | 'x' | 'y'>

export interface CanvasState {
  shapes: Shape[]
  selectedShapeIds: string[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  canvasScale: number
  canvasPosition: { x: number; y: number }
}
