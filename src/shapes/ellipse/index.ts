import { Disc } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { EllipseShape } from './types'
import { createEllipse } from './factory'
import { EllipseRenderer } from './Renderer'
import { EllipsePropertiesPanel } from './PropertiesPanel'
import {
  captureEllipseStart,
  getEllipseHandles,
  applyEllipseHandleDrag,
  captureEllipseGeometry,
  getEllipseBoundingBox,
  getEllipseWorldPoints,
} from './handles'
import { getEllipseAnchors } from './anchors'

export const ellipseDefinition: ShapeDefinition<EllipseShape> = {
  type: 'ellipse',
  label: 'Ellipse',
  icon: Disc,
  create: createEllipse,
  Renderer: EllipseRenderer,
  PropertiesPanel: EllipsePropertiesPanel,
  captureGeometry: captureEllipseGeometry,
  getBoundingBox: getEllipseBoundingBox,
  getWorldPoints: getEllipseWorldPoints,
  getHandles: getEllipseHandles,
  captureStart: captureEllipseStart,
  applyHandleDrag: applyEllipseHandleDrag,
  anchors: getEllipseAnchors,
}
