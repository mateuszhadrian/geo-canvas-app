import { Square } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { RectShape } from './types'
import { createRect } from './factory'
import { RectRenderer } from './Renderer'
import { RectPropertiesPanel } from './PropertiesPanel'
import {
  captureRectStart,
  getRectHandles,
  applyRectHandleDrag,
  captureRectGeometry,
  getRectBoundingBox,
  getRectWorldPoints,
} from './handles'
import { getRectAnchors } from './anchors'

export const rectDefinition: ShapeDefinition<RectShape> = {
  type: 'rect',
  label: 'Rect',
  icon: Square,
  create: createRect,
  Renderer: RectRenderer,
  PropertiesPanel: RectPropertiesPanel,
  captureGeometry: captureRectGeometry,
  getBoundingBox: getRectBoundingBox,
  getWorldPoints: getRectWorldPoints,
  getHandles: getRectHandles,
  captureStart: captureRectStart,
  applyHandleDrag: applyRectHandleDrag,
  anchors: getRectAnchors,
}
