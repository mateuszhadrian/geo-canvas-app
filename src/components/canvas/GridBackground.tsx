'use client'

import { Layer, Shape } from 'react-konva'
import type Konva from 'konva'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvasConstants'

const DOT_SPACING = 40
const DOT_RADIUS = 0.75
const DOT_COLOR = '#A4ABB7'
const CANVAS_BG = '#ffffff'
const BORDER_COLOR = '#c8ccd4'
const CROSSHAIR_ARM = 40
const CROSSHAIR_COLOR = '#A4ABB7'

const HALF_W = CANVAS_WIDTH / 2
const HALF_H = CANVAS_HEIGHT / 2

// Konva does not expose _context in its public API. This accesses the underlying
// CanvasRenderingContext2D directly so we can use native canvas calls for the
// dot-grid (arc/fill in a loop) which are faster than Konva path objects.
type KonvaContextInternal = { _context: CanvasRenderingContext2D }

function drawCanvas(ctx: Konva.Context) {
  const nc = (ctx as unknown as KonvaContextInternal)._context

  nc.fillStyle = CANVAS_BG
  nc.fillRect(-HALF_W, -HALF_H, CANVAS_WIDTH, CANVAS_HEIGHT)

  nc.fillStyle = DOT_COLOR
  for (let x = -HALF_W; x <= HALF_W; x += DOT_SPACING) {
    for (let y = -HALF_H; y <= HALF_H; y += DOT_SPACING) {
      nc.beginPath()
      nc.arc(x, y, DOT_RADIUS, 0, Math.PI * 2)
      nc.fill()
    }
  }

  nc.strokeStyle = CROSSHAIR_COLOR
  nc.lineWidth = 1
  nc.beginPath()
  nc.moveTo(-CROSSHAIR_ARM, 0)
  nc.lineTo(CROSSHAIR_ARM, 0)
  nc.stroke()
  nc.beginPath()
  nc.moveTo(0, -CROSSHAIR_ARM)
  nc.lineTo(0, CROSSHAIR_ARM)
  nc.stroke()

  nc.strokeStyle = BORDER_COLOR
  nc.lineWidth = 1
  nc.strokeRect(-HALF_W, -HALF_H, CANVAS_WIDTH, CANVAS_HEIGHT)
}

export function GridBackground() {
  return (
    <Layer>
      <Shape sceneFunc={drawCanvas} listening={false} />
    </Layer>
  )
}
