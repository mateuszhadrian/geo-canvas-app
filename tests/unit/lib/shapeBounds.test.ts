// Mock the registry to avoid loading Konva/react-konva in jsdom
jest.mock('@/shapes/registry', () => ({
  SHAPE_REGISTRY: {},
  SHAPE_TYPES: [],
}))

import { intersectsBoundingBox } from '@/lib/shapeBounds'
import { getRectBoundingBox } from '@/shapes/rect/handles'
import { getCircleBoundingBox } from '@/shapes/circle/handles'
import { buildRect, buildCircle } from '../../helpers/buildShape'
import type { BoundingBox } from '@/shapes/_base/types'

describe('SB-001: getRectBoundingBox — Rect 100×50 at (200, 150)', () => {
  it('returns correct axis-aligned bounding box', () => {
    const rect = buildRect({ id: 'r', x: 200, y: 150, width: 100, height: 50 })
    const bbox = getRectBoundingBox(rect)
    expect(bbox).toEqual({ x1: 150, y1: 125, x2: 250, y2: 175 })
  })
})

describe('SB-002: getCircleBoundingBox — Circle r=40 at (0, 0)', () => {
  it('returns correct axis-aligned bounding box', () => {
    const circle = buildCircle({ id: 'c', x: 0, y: 0, radius: 40 })
    const bbox = getCircleBoundingBox(circle)
    expect(bbox).toEqual({ x1: -40, y1: -40, x2: 40, y2: 40 })
  })
})

describe('SB-003 / SB-004 / SB-005: intersectsBoundingBox', () => {
  const boxA: BoundingBox = { x1: 0, y1: 0, x2: 100, y2: 100 }

  it('SB-003: overlapping boxes → true', () => {
    const boxB: BoundingBox = { x1: 50, y1: 50, x2: 150, y2: 150 }
    expect(intersectsBoundingBox(boxA, boxB)).toBe(true)
  })

  it('SB-004: disjoint boxes → false', () => {
    const boxB: BoundingBox = { x1: 200, y1: 200, x2: 300, y2: 300 }
    expect(intersectsBoundingBox(boxA, boxB)).toBe(false)
  })

  it('SB-005: touching edges only → false (uses strict < / >)', () => {
    const boxB: BoundingBox = { x1: 100, y1: 0, x2: 200, y2: 100 }
    expect(intersectsBoundingBox(boxA, boxB)).toBe(false)
  })

  it('one box fully inside another → true', () => {
    const inner: BoundingBox = { x1: 20, y1: 20, x2: 80, y2: 80 }
    expect(intersectsBoundingBox(boxA, inner)).toBe(true)
  })

  it('symmetric: a∩b equals b∩a', () => {
    const boxB: BoundingBox = { x1: 50, y1: 50, x2: 150, y2: 150 }
    expect(intersectsBoundingBox(boxA, boxB)).toBe(intersectsBoundingBox(boxB, boxA))
  })
})
