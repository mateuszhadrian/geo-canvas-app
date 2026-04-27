import { Minus } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { LineShape } from './types'
import { createLine } from './factory'
import { LineRenderer } from './Renderer'
import { LinePropertiesPanel } from './PropertiesPanel'

export const lineDefinition: ShapeDefinition<LineShape> = {
  type: 'line',
  label: 'Line',
  icon: Minus,
  create: createLine,
  Renderer: LineRenderer,
  PropertiesPanel: LinePropertiesPanel,
}
