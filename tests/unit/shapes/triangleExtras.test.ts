import {
  getTriangleHandles,
  captureTriangleStart,
  captureTriangleGeometry,
  getTriangleWorldPoints,
} from '@/shapes/triangle/handles'
import { createTriangle } from '@/shapes/triangle/factory'
import { getTriangleAnchors } from '@/shapes/triangle/anchors'
import { buildTriangle } from '../../helpers/buildShape'
import type { TriangleVertices } from '@/shapes/triangle/types'

const VERTS: TriangleVertices = [0, -50, 50, 50, -50, 50]

describe('getTriangleHandles', () => {
  it('bbox covers all vertices', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const { bbox } = getTriangleHandles(tri)
    expect(bbox.x1).toBe(-50)
    expect(bbox.y1).toBe(-50)
    expect(bbox.x2).toBe(50)
    expect(bbox.y2).toBe(50)
  })

  it('returns 3 side handles', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const { sides } = getTriangleHandles(tri)
    expect(sides).toHaveLength(3)
    expect(sides.find((s) => s.kind === 'side01')).toBeDefined()
    expect(sides.find((s) => s.kind === 'side12')).toBeDefined()
    expect(sides.find((s) => s.kind === 'side20')).toBeDefined()
  })

  it('side01 handle is midpoint of v0 and v1', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const side01 = getTriangleHandles(tri).sides.find((s) => s.kind === 'side01')!
    // midpoint([0,-50], [50,50]) = (25, 0)
    expect(side01.x).toBeCloseTo(25)
    expect(side01.y).toBeCloseTo(0)
  })

  it('scale handle is at top-right (bx2, by1)', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const { scale } = getTriangleHandles(tri)
    expect(scale).toEqual({ x: 50, y: -50 })
  })
})

describe('captureTriangleStart', () => {
  it('captures x, y, rotation and a copy of vertices', () => {
    const tri = buildTriangle({ id: 't', x: 10, y: 20, rotation: 45, vertices: VERTS })
    const snap = captureTriangleStart(tri) as {
      x: number
      y: number
      rotation: number
      vertices: TriangleVertices
    }
    expect(snap.x).toBe(10)
    expect(snap.y).toBe(20)
    expect(snap.rotation).toBe(45)
    expect(snap.vertices).toEqual(VERTS)
  })

  it('snapshot vertices are a copy, not same reference', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const snap = captureTriangleStart(tri) as unknown as { vertices: TriangleVertices }
    expect(snap.vertices).not.toBe(tri.vertices)
  })
})

describe('captureTriangleGeometry', () => {
  it('returns x, y, rotation and vertices', () => {
    const tri = buildTriangle({ id: 't', x: 5, y: 10, rotation: 0, vertices: VERTS })
    const geom = captureTriangleGeometry(tri) as {
      x: number
      y: number
      rotation: number
      vertices: TriangleVertices
    }
    expect(geom.x).toBe(5)
    expect(geom.y).toBe(10)
    expect(geom.rotation).toBe(0)
    expect(geom.vertices).toEqual(VERTS)
  })
})

describe('getTriangleWorldPoints', () => {
  it('returns 3 world-space vertex points', () => {
    const tri = buildTriangle({ id: 't', x: 0, y: 0, rotation: 0, vertices: VERTS })
    const pts = getTriangleWorldPoints(tri)
    expect(pts).toHaveLength(3)
  })

  it('vertices match for zero rotation', () => {
    const tri = buildTriangle({ id: 't', x: 100, y: 200, rotation: 0, vertices: VERTS })
    const pts = getTriangleWorldPoints(tri)
    expect(pts[0]).toMatchObject({ x: 100, y: 150 })
    expect(pts[1]).toMatchObject({ x: 150, y: 250 })
    expect(pts[2]).toMatchObject({ x: 50, y: 250 })
  })

  it('rotates vertices with shape rotation', () => {
    const tri0 = buildTriangle({ id: 't', x: 0, y: 0, rotation: 0, vertices: VERTS })
    const tri90 = buildTriangle({ id: 't', x: 0, y: 0, rotation: 90, vertices: VERTS })
    const pts0 = getTriangleWorldPoints(tri0)
    const pts90 = getTriangleWorldPoints(tri90)
    expect(pts0[0].x).not.toBeCloseTo(pts90[0].x)
  })
})

describe('createTriangle', () => {
  it('creates a triangle at given position with correct type', () => {
    const tri = createTriangle({ x: 30, y: 60 })
    expect(tri.type).toBe('triangle')
    expect(tri.x).toBe(30)
    expect(tri.y).toBe(60)
  })

  it('assigns a unique id on each call', () => {
    const a = createTriangle({ x: 0, y: 0 })
    const b = createTriangle({ x: 0, y: 0 })
    expect(a.id).not.toBe(b.id)
  })

  it('has 6-element vertices array', () => {
    const tri = createTriangle({ x: 0, y: 0 })
    expect(tri.vertices).toHaveLength(6)
  })
})

describe('getTriangleAnchors', () => {
  it('returns 7 anchor points', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    expect(getTriangleAnchors(tri)).toHaveLength(7)
  })

  it('v0 anchor matches first vertex', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const v0 = getTriangleAnchors(tri).find((a) => a.id === 'v0')!
    expect(v0).toEqual({ id: 'v0', x: 0, y: -50 })
  })

  it('centroid anchor is at average of vertices', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const center = getTriangleAnchors(tri).find((a) => a.id === 'c')!
    // centroid: x=(0+50-50)/3=0, y=(-50+50+50)/3≈16.67
    expect(center.x).toBeCloseTo(0)
    expect(center.y).toBeCloseTo(50 / 3)
  })

  it('midpoint m01 is average of v0 and v1', () => {
    const tri = buildTriangle({ id: 't', vertices: VERTS })
    const m01 = getTriangleAnchors(tri).find((a) => a.id === 'm01')!
    expect(m01.x).toBeCloseTo(25)
    expect(m01.y).toBeCloseTo(0)
  })
})
