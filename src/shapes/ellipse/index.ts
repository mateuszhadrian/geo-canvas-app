import { Disc } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { EllipseShape } from './types'
import { createEllipse } from './factory'
import { EllipseRenderer } from './Renderer'
import { EllipsePropertiesPanel } from './PropertiesPanel'

export const ellipseDefinition: ShapeDefinition<EllipseShape> = {
  type: 'ellipse',
  label: 'Ellipse',
  icon: Disc,
  create: createEllipse,
  Renderer: EllipseRenderer,
  PropertiesPanel: EllipsePropertiesPanel,
}
