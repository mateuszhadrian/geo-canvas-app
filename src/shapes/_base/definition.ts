import type { ComponentType } from 'react'
import type { BaseShape, ShapeType } from './types'

export interface ShapeDefinition<S extends BaseShape = BaseShape> {
  type: ShapeType
  label: string
  icon: ComponentType
  create: (pos: { x: number; y: number }) => S
  Renderer: ComponentType<{ shape: S; draggable: boolean; isSelected: boolean; onClick: (addToSelection: boolean) => void; onDragStart: () => void; onDragMove: (e: any) => void; onDragEnd: (pos: { x: number; y: number }) => void }>
  PropertiesPanel: ComponentType<{ shape: S }>
}
