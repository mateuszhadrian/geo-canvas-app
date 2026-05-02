import {
  getCircleHandles,
  captureCircleStart,
  captureCircleGeometry,
  getCircleWorldPoints,
} from '@/shapes/circle/handles'
import { createCircle } from '@/shapes/circle/factory'
import { getCircleAnchors } from '@/shapes/circle/anchors'
import { buildCircle } from '../../helpers/buildShape'

describe('getCircleHandles', () => {
  it('returns bbox symmetric around origin matching radius', () => {
    const circle = buildCircle({ id: 'c', x: 0, y: 0, radius: 50 })
    const handles = getCircleHandles(circle)
    expect(handles.bbox).toEqual({ x1: -50, y1: -50, x2: 50, y2: 50 })
  })

  it('returns 4 side handles at cardinal positions', () => {
    const circle = buildCircle({ id: 'c', x: 0, y: 0, radius: 30 })
    const { sides } = getCircleHandles(circle)
    expect(sides).toHaveLength(4)
    expect(sides.find((s) => s.kind === 'top')).toMatchObject({ x: 0, y: -30 })
    expect(sides.find((s) => s.kind === 'right')).toMatchObject({ x: 30, y: 0 })
    expect(sides.find((s) => s.kind === 'bottom')).toMatchObject({ x: 0, y: 30 })
    expect(sides.find((s) => s.kind === 'left')).toMatchObject({ x: -30, y: 0 })
  })

  it('returns scale handle at top-right corner', () => {
    const circle = buildCircle({ id: 'c', x: 0, y: 0, radius: 40 })
    const { scale } = getCircleHandles(circle)
    expect(scale).toEqual({ x: 40, y: -40 })
  })

  it('returns rotate handle at top-left corner', () => {
    const circle = buildCircle({ id: 'c', x: 0, y: 0, radius: 40 })
    const { rotate } = getCircleHandles(circle)
    expect(rotate).toEqual({ x: -40, y: -40 })
  })

  it('scales all handle positions proportionally with radius', () => {
    const small = getCircleHandles(buildCircle({ id: 'c', radius: 20 }))
    const large = getCircleHandles(buildCircle({ id: 'c', radius: 60 }))
    expect(large.scale.x / small.scale.x).toBeCloseTo(3)
  })
})

describe('captureCircleStart', () => {
  it('captures x, y, rotation and radius', () => {
    const circle = buildCircle({ id: 'c', x: 100, y: 200, radius: 45, rotation: 30 })
    const snapshot = captureCircleStart(circle) as { x: number; y: number; rotation: number; radius: number }
    expect(snapshot.x).toBe(100)
    expect(snapshot.y).toBe(200)
    expect(snapshot.rotation).toBe(30)
    expect(snapshot.radius).toBe(45)
  })
})

describe('captureCircleGeometry', () => {
  it('returns type, x, y, rotation and radius', () => {
    const circle = buildCircle({ id: 'c', x: 50, y: 75, radius: 30, rotation: 15 })
    const geom = captureCircleGeometry(circle)
    expect(geom).toEqual({ type: 'circle', x: 50, y: 75, rotation: 15, radius: 30 })
  })
})

describe('getCircleWorldPoints', () => {
  it('returns top-left and bottom-right bounding corners in world space', () => {
    const circle = buildCircle({ id: 'c', x: 100, y: 150, radius: 30 })
    const pts = getCircleWorldPoints(circle)
    expect(pts).toHaveLength(2)
    expect(pts[0]).toEqual({ x: 70, y: 120 })
    expect(pts[1]).toEqual({ x: 130, y: 180 })
  })

  it('is symmetric around center for zero-positioned circle', () => {
    const circle = buildCircle({ id: 'c', x: 0, y: 0, radius: 50 })
    const [p0, p1] = getCircleWorldPoints(circle)
    expect(p0.x).toBe(-p1.x)
    expect(p0.y).toBe(-p1.y)
  })
})

describe('createCircle', () => {
  it('creates a circle at given position', () => {
    const circle = createCircle({ x: 120, y: 240 })
    expect(circle.type).toBe('circle')
    expect(circle.x).toBe(120)
    expect(circle.y).toBe(240)
  })

  it('assigns a unique id on each call', () => {
    const a = createCircle({ x: 0, y: 0 })
    const b = createCircle({ x: 0, y: 0 })
    expect(a.id).not.toBe(b.id)
  })

  it('applies default radius', () => {
    const circle = createCircle({ x: 0, y: 0 })
    expect(typeof circle.radius).toBe('number')
    expect(circle.radius).toBeGreaterThan(0)
  })
})

describe('getCircleAnchors', () => {
  it('returns 5 anchor points', () => {
    const circle = buildCircle({ id: 'c', radius: 45 })
    expect(getCircleAnchors(circle)).toHaveLength(5)
  })

  it('top anchor is directly above center at y = -radius', () => {
    const circle = buildCircle({ id: 'c', radius: 45 })
    const top = getCircleAnchors(circle).find((a) => a.id === 'top')!
    expect(top.x).toBe(0)
    expect(top.y).toBe(-45)
  })

  it('center anchor is at origin', () => {
    const circle = buildCircle({ id: 'c', radius: 45 })
    const center = getCircleAnchors(circle).find((a) => a.id === 'center')!
    expect(center).toEqual({ id: 'center', x: 0, y: 0 })
  })

  it('anchor positions scale with radius', () => {
    const circle = buildCircle({ id: 'c', radius: 60 })
    const right = getCircleAnchors(circle).find((a) => a.id === 'right')!
    expect(right.x).toBe(60)
  })
})
