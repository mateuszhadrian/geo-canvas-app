import {
  getEllipseHandles,
  captureEllipseStart,
  captureEllipseGeometry,
  getEllipseWorldPoints,
} from '@/shapes/ellipse/handles'
import { createEllipse } from '@/shapes/ellipse/factory'
import { getEllipseAnchors } from '@/shapes/ellipse/anchors'
import { buildEllipse } from '../../helpers/buildShape'

describe('getEllipseHandles', () => {
  it('returns bbox matching radiusX and radiusY', () => {
    const ellipse = buildEllipse({ id: 'e', x: 0, y: 0, radiusX: 60, radiusY: 40 })
    const { bbox } = getEllipseHandles(ellipse)
    expect(bbox).toEqual({ x1: -60, y1: -40, x2: 60, y2: 40 })
  })

  it('returns 4 cardinal side handles at correct positions', () => {
    const ellipse = buildEllipse({ id: 'e', radiusX: 60, radiusY: 40 })
    const { sides } = getEllipseHandles(ellipse)
    expect(sides).toHaveLength(4)
    expect(sides.find((s) => s.kind === 'top')).toMatchObject({ x: 0, y: -40 })
    expect(sides.find((s) => s.kind === 'right')).toMatchObject({ x: 60, y: 0 })
    expect(sides.find((s) => s.kind === 'bottom')).toMatchObject({ x: 0, y: 40 })
    expect(sides.find((s) => s.kind === 'left')).toMatchObject({ x: -60, y: 0 })
  })

  it('scale handle is at top-right corner (rX, -rY)', () => {
    const ellipse = buildEllipse({ id: 'e', radiusX: 60, radiusY: 40 })
    expect(getEllipseHandles(ellipse).scale).toEqual({ x: 60, y: -40 })
  })

  it('rotate handle is at top-left corner (-rX, -rY)', () => {
    const ellipse = buildEllipse({ id: 'e', radiusX: 60, radiusY: 40 })
    expect(getEllipseHandles(ellipse).rotate).toEqual({ x: -60, y: -40 })
  })
})

describe('captureEllipseStart', () => {
  it('captures x, y, rotation, radiusX and radiusY', () => {
    const ellipse = buildEllipse({ id: 'e', x: 10, y: 20, radiusX: 60, radiusY: 40, rotation: 45 })
    const snap = captureEllipseStart(ellipse) as {
      x: number; y: number; rotation: number; radiusX: number; radiusY: number
    }
    expect(snap.x).toBe(10)
    expect(snap.y).toBe(20)
    expect(snap.rotation).toBe(45)
    expect(snap.radiusX).toBe(60)
    expect(snap.radiusY).toBe(40)
  })
})

describe('captureEllipseGeometry', () => {
  it('returns x, y, rotation, radiusX and radiusY', () => {
    const ellipse = buildEllipse({ id: 'e', x: 5, y: 10, radiusX: 60, radiusY: 40, rotation: 0 })
    expect(captureEllipseGeometry(ellipse)).toEqual({
      x: 5, y: 10, rotation: 0, radiusX: 60, radiusY: 40,
    })
  })
})

describe('getEllipseWorldPoints', () => {
  it('returns 2 bounding-extent points for unrotated ellipse', () => {
    const ellipse = buildEllipse({ id: 'e', x: 100, y: 200, radiusX: 60, radiusY: 40, rotation: 0 })
    const pts = getEllipseWorldPoints(ellipse)
    expect(pts).toHaveLength(2)
    expect(pts[0]).toMatchObject({ x: 40, y: 160 })
    expect(pts[1]).toMatchObject({ x: 160, y: 240 })
  })

  it('bounding extent grows when ellipse is rotated 45°', () => {
    const unrotated = getEllipseWorldPoints(
      buildEllipse({ id: 'e', x: 0, y: 0, radiusX: 60, radiusY: 40, rotation: 0 })
    )
    const rotated = getEllipseWorldPoints(
      buildEllipse({ id: 'e', x: 0, y: 0, radiusX: 60, radiusY: 40, rotation: 45 })
    )
    const unrotWidth = unrotated[1].x - unrotated[0].x
    const rotWidth = rotated[1].x - rotated[0].x
    // At 45° the bounding box of an asymmetric ellipse is wider
    expect(rotWidth).not.toBeCloseTo(unrotWidth)
  })
})

describe('createEllipse', () => {
  it('creates an ellipse at given position with correct type', () => {
    const ellipse = createEllipse({ x: 80, y: 160 })
    expect(ellipse.type).toBe('ellipse')
    expect(ellipse.x).toBe(80)
    expect(ellipse.y).toBe(160)
  })

  it('assigns a unique id on each call', () => {
    const a = createEllipse({ x: 0, y: 0 })
    const b = createEllipse({ x: 0, y: 0 })
    expect(a.id).not.toBe(b.id)
  })

  it('applies default radiusX and radiusY', () => {
    const ellipse = createEllipse({ x: 0, y: 0 })
    expect(ellipse.radiusX).toBeGreaterThan(0)
    expect(ellipse.radiusY).toBeGreaterThan(0)
  })
})

describe('getEllipseAnchors', () => {
  it('returns 5 anchors', () => {
    const ellipse = buildEllipse({ id: 'e', radiusX: 60, radiusY: 40 })
    expect(getEllipseAnchors(ellipse)).toHaveLength(5)
  })

  it('top anchor is at (0, -radiusY)', () => {
    const ellipse = buildEllipse({ id: 'e', radiusX: 60, radiusY: 40 })
    const top = getEllipseAnchors(ellipse).find((a) => a.id === 'top')!
    expect(top).toEqual({ id: 'top', x: 0, y: -40 })
  })

  it('right anchor is at (radiusX, 0)', () => {
    const ellipse = buildEllipse({ id: 'e', radiusX: 60, radiusY: 40 })
    const right = getEllipseAnchors(ellipse).find((a) => a.id === 'right')!
    expect(right).toEqual({ id: 'right', x: 60, y: 0 })
  })

  it('center anchor is at (0, 0)', () => {
    const ellipse = buildEllipse({ id: 'e', radiusX: 60, radiusY: 40 })
    const center = getEllipseAnchors(ellipse).find((a) => a.id === 'center')!
    expect(center).toEqual({ id: 'center', x: 0, y: 0 })
  })
})
