import {
  getRectHandles,
  captureRectStart,
  captureRectGeometry,
  getRectBoundingBox,
  getRectWorldPoints,
} from '@/shapes/rect/handles'
import { createRect } from '@/shapes/rect/factory'
import { getRectAnchors } from '@/shapes/rect/anchors'
import { buildRect } from '../../helpers/buildShape'

describe('getRectHandles', () => {
  it('returns bbox = half-width × half-height around origin', () => {
    const rect = buildRect({ id: 'r', x: 0, y: 0, width: 100, height: 60 })
    const { bbox } = getRectHandles(rect)
    expect(bbox).toEqual({ x1: -50, y1: -30, x2: 50, y2: 30 })
  })

  it('returns 4 cardinal side handles', () => {
    const rect = buildRect({ id: 'r', width: 100, height: 60 })
    const { sides } = getRectHandles(rect)
    expect(sides).toHaveLength(4)
    expect(sides.find((s) => s.kind === 'top')).toMatchObject({ x: 0, y: -30 })
    expect(sides.find((s) => s.kind === 'bottom')).toMatchObject({ x: 0, y: 30 })
    expect(sides.find((s) => s.kind === 'left')).toMatchObject({ x: -50, y: 0 })
    expect(sides.find((s) => s.kind === 'right')).toMatchObject({ x: 50, y: 0 })
  })

  it('scale handle is at (hw, -hh)', () => {
    const rect = buildRect({ id: 'r', width: 100, height: 60 })
    expect(getRectHandles(rect).scale).toEqual({ x: 50, y: -30 })
  })

  it('rotate handle is at (-hw, -hh)', () => {
    const rect = buildRect({ id: 'r', width: 100, height: 60 })
    expect(getRectHandles(rect).rotate).toEqual({ x: -50, y: -30 })
  })
})

describe('captureRectStart', () => {
  it('captures x, y, rotation, width and height', () => {
    const rect = buildRect({ id: 'r', x: 10, y: 20, width: 80, height: 50, rotation: 90 })
    const snap = captureRectStart(rect) as {
      x: number; y: number; rotation: number; width: number; height: number
    }
    expect(snap.x).toBe(10)
    expect(snap.y).toBe(20)
    expect(snap.rotation).toBe(90)
    expect(snap.width).toBe(80)
    expect(snap.height).toBe(50)
  })
})

describe('captureRectGeometry', () => {
  it('returns x, y, rotation, width and height', () => {
    const rect = buildRect({ id: 'r', x: 5, y: 15, width: 80, height: 50, rotation: 0 })
    expect(captureRectGeometry(rect)).toEqual({ x: 5, y: 15, rotation: 0, width: 80, height: 50 })
  })
})

describe('getRectBoundingBox', () => {
  it('returns axis-aligned bbox for unrotated rect', () => {
    const rect = buildRect({ id: 'r', x: 200, y: 150, width: 100, height: 50 })
    expect(getRectBoundingBox(rect)).toEqual({ x1: 150, y1: 125, x2: 250, y2: 175 })
  })

  it('bbox width equals rect width for zero rotation', () => {
    const rect = buildRect({ id: 'r', x: 0, y: 0, width: 120, height: 80 })
    const bbox = getRectBoundingBox(rect)
    expect(bbox.x2 - bbox.x1).toBe(120)
    expect(bbox.y2 - bbox.y1).toBe(80)
  })
})

describe('getRectWorldPoints', () => {
  it('returns 4 world-space corner points', () => {
    const rect = buildRect({ id: 'r', x: 0, y: 0, width: 100, height: 60, rotation: 0 })
    const pts = getRectWorldPoints(rect)
    expect(pts).toHaveLength(4)
  })

  it('corners are correct for zero rotation', () => {
    const rect = buildRect({ id: 'r', x: 0, y: 0, width: 100, height: 60, rotation: 0 })
    const pts = getRectWorldPoints(rect)
    expect(pts[0]).toMatchObject({ x: -50, y: -30 })
    expect(pts[1]).toMatchObject({ x: 50, y: -30 })
    expect(pts[2]).toMatchObject({ x: 50, y: 30 })
    expect(pts[3]).toMatchObject({ x: -50, y: 30 })
  })

  it('corners rotate with shape rotation', () => {
    const rect0 = buildRect({ id: 'r', x: 0, y: 0, width: 100, height: 60, rotation: 0 })
    const rect90 = buildRect({ id: 'r', x: 0, y: 0, width: 100, height: 60, rotation: 90 })
    const pts0 = getRectWorldPoints(rect0)
    const pts90 = getRectWorldPoints(rect90)
    expect(pts0[0].x).not.toBeCloseTo(pts90[0].x)
  })
})

describe('createRect', () => {
  it('creates a rect at given position', () => {
    const rect = createRect({ x: 50, y: 100 })
    expect(rect.type).toBe('rect')
    expect(rect.x).toBe(50)
    expect(rect.y).toBe(100)
  })

  it('assigns a unique id on each call', () => {
    const a = createRect({ x: 0, y: 0 })
    const b = createRect({ x: 0, y: 0 })
    expect(a.id).not.toBe(b.id)
  })

  it('applies default width and height', () => {
    const rect = createRect({ x: 0, y: 0 })
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
  })
})

describe('getRectAnchors', () => {
  it('returns 9 anchor points', () => {
    const rect = buildRect({ id: 'r', width: 100, height: 60 })
    expect(getRectAnchors(rect)).toHaveLength(9)
  })

  it('center anchor is at origin', () => {
    const rect = buildRect({ id: 'r', width: 100, height: 60 })
    const center = getRectAnchors(rect).find((a) => a.id === 'c')!
    expect(center).toEqual({ id: 'c', x: 0, y: 0 })
  })

  it('top-left corner is at (-hw, -hh)', () => {
    const rect = buildRect({ id: 'r', width: 100, height: 60 })
    const tl = getRectAnchors(rect).find((a) => a.id === 'tl')!
    expect(tl).toEqual({ id: 'tl', x: -50, y: -30 })
  })

  it('bottom-right corner is at (hw, hh)', () => {
    const rect = buildRect({ id: 'r', width: 100, height: 60 })
    const br = getRectAnchors(rect).find((a) => a.id === 'br')!
    expect(br).toEqual({ id: 'br', x: 50, y: 30 })
  })

  it('anchor positions scale with shape dimensions', () => {
    const small = getRectAnchors(buildRect({ id: 'r', width: 50, height: 30 }))
    const large = getRectAnchors(buildRect({ id: 'r', width: 100, height: 60 }))
    const smallBr = small.find((a) => a.id === 'br')!
    const largeBr = large.find((a) => a.id === 'br')!
    expect(largeBr.x).toBe(smallBr.x * 2)
  })
})
