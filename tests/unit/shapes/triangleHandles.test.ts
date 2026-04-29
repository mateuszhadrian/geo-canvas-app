import { applyTriangleHandleDrag, captureTriangleStart, getTriangleBoundingBox } from '@/shapes/triangle/handles'
import { buildTriangle } from '../../helpers/buildShape'
import type { TriangleVertices } from '@/shapes/triangle/types'
import type { HandleKind } from '@/shapes/_base/types'

const NO_PTR = { x: 0, y: 0 }

// Default triangle vertices: [0,-50, 50,50, -50,50] — isoceles pointing up
function drag(
  overrides: { vertices?: TriangleVertices; x?: number; y?: number; rotation?: number },
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr = NO_PTR,
) {
  const shape = buildTriangle({ id: 't', ...overrides })
  const start = captureTriangleStart(shape)
  const θ = (overrides.rotation ?? 0) * (Math.PI / 180)
  return applyTriangleHandleDrag(start, kind, ldx, ldy, startLocalPtr, Math.sin(θ), Math.cos(θ))
}

describe('TH-001: triangle side01 handle drag', () => {
  it('vertices shift: v0,v1 +ldx/3, v2 -2*ldx/3', () => {
    const result = drag({}, 'side01', 30, 0) as { vertices: TriangleVertices }
    const [x0, , x1, , x2] = result.vertices
    const [ox0, , ox1, , ox2] = [0, -50, 50, 50, -50, 50]
    expect(x0).toBeCloseTo(ox0 + 10)
    expect(x1).toBeCloseTo(ox1 + 10)
    expect(x2).toBeCloseTo(ox2 - 20)
  })

  it('center x shifts by 2/3 * ldx', () => {
    const result = drag({ x: 0, y: 0 }, 'side01', 30, 0) as { x: number }
    expect(result.x).toBeCloseTo(20)
  })
})

describe('TH-002: triangle side12 handle drag', () => {
  it('vertices shift: v0 -2*ldx/3, v1,v2 +ldx/3', () => {
    const result = drag({}, 'side12', 30, 0) as { vertices: TriangleVertices }
    const [x0, , x1, , x2] = result.vertices
    const [ox0, , ox1, , ox2] = [0, -50, 50, 50, -50, 50]
    expect(x0).toBeCloseTo(ox0 - 20)
    expect(x1).toBeCloseTo(ox1 + 10)
    expect(x2).toBeCloseTo(ox2 + 10)
  })
})

describe('TH-003: triangle side20 handle drag', () => {
  it('vertices shift: v0,v2 +ldx/3, v1 -2*ldx/3', () => {
    const result = drag({}, 'side20', 30, 0) as { vertices: TriangleVertices }
    const [x0, , x1, , x2] = result.vertices
    const [ox0, , ox1, , ox2] = [0, -50, 50, 50, -50, 50]
    expect(x0).toBeCloseTo(ox0 + 10)
    expect(x1).toBeCloseTo(ox1 - 20)
    expect(x2).toBeCloseTo(ox2 + 10)
  })
})

describe('TH-004: triangle scale handle', () => {
  it('all vertex coordinates scale proportionally', () => {
    const verts: TriangleVertices = [0, -50, 50, 50, -50, 50]
    const tr_x = Math.max(0, 50, -50)   // 50
    const tr_y = Math.min(-50, 50, 50)  // -50
    const ptr = { x: tr_x, y: tr_y }
    // Drag to 2x: ptr + delta = (100, -100)
    const result = drag({ vertices: verts }, 'scale', tr_x, tr_y, ptr) as { vertices: TriangleVertices }
    // f > 1 → all vertices scaled up
    for (let i = 0; i < 6; i++) {
      const orig = verts[i]
      if (orig !== 0) {
        expect(Math.abs(result.vertices[i])).toBeGreaterThan(Math.abs(orig))
      }
    }
  })

  it('scale factor clamped to 0.1 when dragging inward', () => {
    const verts: TriangleVertices = [0, -50, 50, 50, -50, 50]
    const tr_x = 50, tr_y = -50
    const ptr = { x: tr_x, y: tr_y }
    const result = drag({ vertices: verts }, 'scale', -1000, 1000, ptr) as { vertices: TriangleVertices }
    // f = 0.1 → vertices scaled by 0.1
    expect(result.vertices[1]).toBeCloseTo(0.1 * -50)
    expect(result.vertices[2]).toBeCloseTo(0.1 * 50)
  })
})

describe('TH-005: getTriangleBoundingBox', () => {
  it('bbox covers all three vertices in world space', () => {
    const triangle = buildTriangle({ id: 't', x: 100, y: 200, vertices: [0, -50, 50, 50, -50, 50] })
    const bbox = getTriangleBoundingBox(triangle)
    expect(bbox).toEqual({ x1: 50, y1: 150, x2: 150, y2: 250 })
  })

  it('bbox at origin with symmetric vertices is centered', () => {
    const triangle = buildTriangle({ id: 't', x: 0, y: 0, vertices: [-40, -30, 40, -30, 0, 50] as TriangleVertices })
    const bbox = getTriangleBoundingBox(triangle)
    expect(bbox.x1).toBe(-40)
    expect(bbox.x2).toBe(40)
    expect(bbox.y1).toBe(-30)
    expect(bbox.y2).toBe(50)
  })
})

describe('TH-006: rotated triangle side01 drag — center shifts along rotation axis', () => {
  it('rotation=90°: side01 drag in x shifts y', () => {
    const shape = buildTriangle({ id: 't', x: 0, y: 0, rotation: 90 })
    const start = captureTriangleStart(shape)
    const θ = Math.PI / 2
    // ldx=30, ldy=0; x = s.x + (30*2/3)*cosθ = 0; y = s.y + (30*2/3)*sinθ = 20
    const result = applyTriangleHandleDrag(start, 'side01', 30, 0, NO_PTR, Math.sin(θ), Math.cos(θ)) as {
      x: number
      y: number
    }
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(20)
  })
})
