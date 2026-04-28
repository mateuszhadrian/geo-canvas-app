import type { ComponentType } from 'react'
import type { BaseShape, ShapeType, Point } from './types'

export interface ShapeDefinition<S extends BaseShape = BaseShape> {
  type: ShapeType
  label: string
  icon: ComponentType
  create: (pos: Point) => S
  Renderer: ComponentType<{ shape: S; isSelected: boolean }>
  PropertiesPanel: ComponentType<{ shape: S }>
}
