import { Square } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { RectShape } from './types'
import { createRect } from './factory'
import { RectRenderer } from './Renderer'
import { RectPropertiesPanel } from './PropertiesPanel'

export const rectDefinition: ShapeDefinition<RectShape> = {
  type: 'rect',
  label: 'Rect',
  icon: Square,
  create: createRect,
  Renderer: RectRenderer,
  PropertiesPanel: RectPropertiesPanel,
}
