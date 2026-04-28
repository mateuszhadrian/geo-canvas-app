import { Minus } from 'lucide-react'
import type { ShapeDefinition } from '../_base/definition'
import type { LineShape } from './types'
import { createLine } from './factory'
import { LineRenderer } from './Renderer'
import { LinePropertiesPanel } from './PropertiesPanel'
import { captureLineGeometry, getLineBoundingBox, getLineWorldPoints } from './handles'
import { getLineAnchors } from './anchors'

export const lineDefinition: ShapeDefinition<LineShape> = {
  type: 'line',
  label: 'Line',
  icon: Minus,
  create: createLine,
  Renderer: LineRenderer,
  PropertiesPanel: LinePropertiesPanel,
  captureGeometry: captureLineGeometry,
  getBoundingBox: getLineBoundingBox,
  getWorldPoints: getLineWorldPoints,
  // Line editing is handled by MultiLineHandles — no single-shape handles
  getHandles: null,
  captureStart: null,
  applyHandleDrag: null,
  anchors: getLineAnchors,
}
