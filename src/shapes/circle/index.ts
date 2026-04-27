import { Circle } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { CircleShape } from './types'
import { createCircle } from './factory'
import { CircleRenderer } from './Renderer'
import { CirclePropertiesPanel } from './PropertiesPanel'

export const circleDefinition: ShapeDefinition<CircleShape> = {
  type: 'circle',
  label: 'Circle',
  icon: Circle,
  create: createCircle,
  Renderer: CircleRenderer,
  PropertiesPanel: CirclePropertiesPanel,
}
