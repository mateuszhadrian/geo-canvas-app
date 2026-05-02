import { captureLineGeometry, getLineBoundingBox, getLineWorldPoints } from '@/shapes/line/handles'
import { createLine } from '@/shapes/line/factory'
import { getLineAnchors } from '@/shapes/line/anchors'
import { buildLine } from '../../helpers/buildShape'

describe('captureLineGeometry', () => {
  it('returns x, y, rotation and a copy of points', () => {
    const line = buildLine({ id: 'l', x: 10, y: 20, rotation: 0, points: [0, 0, 100, 50] })
    const geom = captureLineGeometry(line) as { x: number; y: number; rotation: number; points: number[] }
    expect(geom.x).toBe(10)
    expect(geom.y).toBe(20)
    expect(geom.rotation).toBe(0)
    expect(geom.points).toEqual([0, 0, 100, 50])
  })

  it('points array is a copy, not same reference', () => {
    const line = buildLine({ id: 'l', points: [0, 0, 100, 50] })
    const geom = captureLineGeometry(line) as { points: number[] }
    expect(geom.points).not.toBe(line.points)
  })
})

describe('getLineBoundingBox', () => {
  it('returns axis-aligned bbox for a simple horizontal line', () => {
    const line = buildLine({ id: 'l', x: 100, y: 200, points: [0, 0, 50, 0] })
    expect(getLineBoundingBox(line)).toEqual({ x1: 100, y1: 200, x2: 150, y2: 200 })
  })

  it('returns correct bbox for diagonal line', () => {
    const line = buildLine({ id: 'l', x: 0, y: 0, points: [0, 0, 40, 30] })
    expect(getLineBoundingBox(line)).toEqual({ x1: 0, y1: 0, x2: 40, y2: 30 })
  })

  it('handles multi-segment polyline', () => {
    const line = buildLine({ id: 'l', x: 10, y: 10, points: [0, 0, 50, 25, 100, -10] })
    const bbox = getLineBoundingBox(line)
    expect(bbox.x1).toBe(10)
    expect(bbox.y1).toBe(0)
    expect(bbox.x2).toBe(110)
    expect(bbox.y2).toBe(35)
  })

  it('works when line goes negative direction', () => {
    const line = buildLine({ id: 'l', x: 0, y: 0, points: [-50, -30, 50, 30] })
    const bbox = getLineBoundingBox(line)
    expect(bbox.x1).toBe(-50)
    expect(bbox.y1).toBe(-30)
    expect(bbox.x2).toBe(50)
    expect(bbox.y2).toBe(30)
  })
})

describe('getLineWorldPoints', () => {
  it('returns world-space points for unrotated horizontal line', () => {
    const line = buildLine({ id: 'l', x: 100, y: 50, rotation: 0, points: [0, 0, 80, 0] })
    const pts = getLineWorldPoints(line)
    expect(pts).toHaveLength(2)
    expect(pts[0]).toMatchObject({ x: 100, y: 50 })
    expect(pts[1]).toMatchObject({ x: 180, y: 50 })
  })

  it('returns rotated world-space points for 90° rotation', () => {
    const line = buildLine({ id: 'l', x: 0, y: 0, rotation: 90, points: [0, 0, 100, 0] })
    const pts = getLineWorldPoints(line)
    // After 90° rotation: (100, 0) → (0, 100)
    expect(pts[0]).toMatchObject({ x: 0, y: 0 })
    expect(pts[1].x).toBeCloseTo(0)
    expect(pts[1].y).toBeCloseTo(100)
  })

  it('multi-segment line returns one point per vertex pair', () => {
    const line = buildLine({ id: 'l', x: 0, y: 0, rotation: 0, points: [0, 0, 50, 0, 100, 50] })
    const pts = getLineWorldPoints(line)
    expect(pts).toHaveLength(3)
  })
})

describe('createLine', () => {
  it('creates a line at given position with correct type', () => {
    const line = createLine({ x: 30, y: 60 })
    expect(line.type).toBe('line')
    expect(line.x).toBe(30)
    expect(line.y).toBe(60)
  })

  it('assigns a unique id on each call', () => {
    const a = createLine({ x: 0, y: 0 })
    const b = createLine({ x: 0, y: 0 })
    expect(a.id).not.toBe(b.id)
  })

  it('has at least 4 points (one segment)', () => {
    const line = createLine({ x: 0, y: 0 })
    expect(line.points.length).toBeGreaterThanOrEqual(4)
  })
})

describe('getLineAnchors', () => {
  it('returns start and end anchors for a simple 2-point line', () => {
    const line = buildLine({ id: 'l', points: [0, 0, 100, 0] })
    const anchors = getLineAnchors(line)
    expect(anchors).toHaveLength(2)
    expect(anchors.find((a) => a.id === 'start')).toEqual({ id: 'start', x: 0, y: 0 })
    expect(anchors.find((a) => a.id === 'end')).toEqual({ id: 'end', x: 100, y: 0 })
  })

  it('returns midpoint anchors for multi-segment polyline', () => {
    const line = buildLine({ id: 'l', points: [0, 0, 50, 0, 100, 0] })
    const anchors = getLineAnchors(line)
    // start, end + mid-2 midpoint
    expect(anchors.length).toBeGreaterThan(2)
    expect(anchors.find((a) => a.id === 'mid-2')).toBeDefined()
  })

  it('returns empty array when points has fewer than 4 elements', () => {
    const line = buildLine({ id: 'l', points: [0, 0] })
    expect(getLineAnchors(line)).toHaveLength(0)
  })
})
