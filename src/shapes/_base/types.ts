export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'triangle' | 'line'

export type Point = { x: number; y: number }

export interface BoundingBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface HandleDescriptor {
  kind: string
  x: number
  y: number
  cursor?: string
}

export interface HandleGeometry {
  bbox: BoundingBox
  sides: HandleDescriptor[]
  scale: Point
  rotate: Point
}

// Anchor points in LOCAL coords (relative to shape center at 0,0).
// Rendered inside the shape's Konva Group, so local ≡ screen when group transform applied.
export interface AnchorPoint {
  id: string
  x: number
  y: number
}

// Minimal snapshot required by ShapeHandles generic component.
// Each shape's captureStart returns a superset of this.
export interface StartSnapshot {
  x: number
  y: number
  rotation: number
}

// Loose update type used in ShapeDefinition to avoid a circular dep with store/types.ts.
// Values are always valid ShapeUpdate fields at runtime.
export type FieldUpdate = Partial<Record<string, unknown>>

export interface BaseShape {
  id: string
  type: ShapeType
  /** Layer this shape belongs to. Injected by the store on addShape. */
  layerId?: string
  x: number
  y: number
  rotation: number
  opacity: number
  stroke: string
  strokeWidth: number
}
