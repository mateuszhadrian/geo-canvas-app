import { Triangle } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { TriangleShape } from './types'
import { createTriangle } from './factory'
import { TriangleRenderer } from './Renderer'
import { TrianglePropertiesPanel } from './PropertiesPanel'

export const triangleDefinition: ShapeDefinition<TriangleShape> = {
  type: 'triangle',
  label: 'Triangle',
  icon: Triangle,
  create: createTriangle,
  Renderer: TriangleRenderer,
  PropertiesPanel: TrianglePropertiesPanel,
}
