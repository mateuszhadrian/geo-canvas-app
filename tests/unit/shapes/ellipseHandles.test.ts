import { applyEllipseHandleDrag, captureEllipseStart, getEllipseBoundingBox } from '@/shapes/ellipse/handles'
import { buildEllipse } from '../../helpers/buildShape'
import type { HandleKind } from '@/shapes/_base/types'

const NO_PTR = { x: 0, y: 0 }

function drag(
  overrides: { radiusX?: number; radiusY?: number; x?: number; y?: number; rotation?: number },
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr = NO_PTR,
) {
  const shape = buildEllipse({ id: 'e', ...overrides })
  const start = captureEllipseStart(shape)
  const θ = (overrides.rotation ?? 0) * (Math.PI / 180)
  return applyEllipseHandleDrag(start, kind, ldx, ldy, startLocalPtr, Math.sin(θ), Math.cos(θ))
}

describe('EH-001: ellipse top handle drag up (ldy=-20)', () => {
  it('radiusY increases', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'top', 0, -20) as { radiusY: number }
    // eLdy = min(-20, 2*(40-1)) = -20; radiusY = max(1, 40 - (-20)/2) = 50
    expect(result.radiusY).toBe(50)
  })

  it('radiusX unchanged', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'top', 0, -20) as { radiusX: number }
    expect(result.radiusX).toBe(60)
  })

  it('center y shifts upward by ldy/2', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'top', 0, -20) as { y: number }
    // cy = eLdy/2 = -10; y = s.y + cy * cosθ = 0 + (-10) * 1 = -10
    expect(result.y).toBeCloseTo(-10)
  })
})

describe('EH-002: ellipse bottom handle drag down (ldy=15)', () => {
  it('radiusY increases', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'bottom', 0, 15) as { radiusY: number }
    // eLdy = max(15, -2*(40-1)) = 15; radiusY = max(1, 40 + 15/2) = 47.5
    expect(result.radiusY).toBe(47.5)
  })

  it('center y shifts downward', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'bottom', 0, 15) as { y: number }
    expect(result.y).toBeCloseTo(7.5)
  })
})

describe('EH-003: ellipse left handle drag left (ldx=-10)', () => {
  it('radiusX increases', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'left', -10, 0) as { radiusX: number }
    // eLdx = min(-10, 2*(60-1)) = -10; radiusX = max(1, 60 - (-10)/2) = 65
    expect(result.radiusX).toBe(65)
  })

  it('radiusY unchanged', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'left', -10, 0) as { radiusY: number }
    expect(result.radiusY).toBe(40)
  })
})

describe('EH-004: ellipse right handle drag right (ldx=20)', () => {
  it('radiusX increases', () => {
    const result = drag({ radiusX: 60, radiusY: 40, x: 0, y: 0 }, 'right', 20, 0) as { radiusX: number }
    // eLdx = max(20, -2*(60-1)) = 20; radiusX = max(1, 60 + 20/2) = 70
    expect(result.radiusX).toBe(70)
  })
})

describe('EH-005: ellipse scale handle → proportional resize', () => {
  it('both radii grow when scaling out', () => {
    const rX = 60, rY = 40
    const ptr = { x: rX, y: -rY }
    const result = drag({ radiusX: rX, radiusY: rY, x: 0, y: 0 }, 'scale', rX, -rY, ptr) as {
      radiusX: number
      radiusY: number
    }
    expect(result.radiusX).toBeGreaterThan(rX)
    expect(result.radiusY).toBeGreaterThan(rY)
  })

  it('radii clamped to min 5 when scaling inward past center', () => {
    const rX = 60, rY = 40
    const ptr = { x: rX, y: -rY }
    const result = drag({ radiusX: rX, radiusY: rY, x: 0, y: 0 }, 'scale', -1000, 1000, ptr) as {
      radiusX: number
      radiusY: number
    }
    expect(result.radiusX).toBe(Math.max(5, 0.1 * rX))
    expect(result.radiusY).toBe(Math.max(5, 0.1 * rY))
  })
})

describe('EH-006: ellipse minimum radius clamp', () => {
  it('radiusY never below 1 when top-dragged beyond collapse', () => {
    const result = drag({ radiusX: 60, radiusY: 5, x: 0, y: 0 }, 'top', 0, 200) as { radiusY: number }
    expect(result.radiusY).toBeGreaterThanOrEqual(1)
  })

  it('radiusX never below 1 when left-dragged beyond collapse', () => {
    const result = drag({ radiusX: 5, radiusY: 40, x: 0, y: 0 }, 'left', 200, 0) as { radiusX: number }
    expect(result.radiusX).toBeGreaterThanOrEqual(1)
  })
})

describe('EH-007: getEllipseBoundingBox', () => {
  it('returns correct bbox for ellipse at (100, 200) with rX=60, rY=40', () => {
    const ellipse = buildEllipse({ id: 'e', x: 100, y: 200, radiusX: 60, radiusY: 40 })
    expect(getEllipseBoundingBox(ellipse)).toEqual({ x1: 40, y1: 160, x2: 160, y2: 240 })
  })

  it('bbox width = 2*radiusX and height = 2*radiusY', () => {
    const ellipse = buildEllipse({ id: 'e', x: 0, y: 0, radiusX: 60, radiusY: 40 })
    const bbox = getEllipseBoundingBox(ellipse)
    expect(bbox.x2 - bbox.x1).toBe(120)
    expect(bbox.y2 - bbox.y1).toBe(80)
  })
})

describe('EH-008: rotated ellipse top handle — center shifts along rotation axis', () => {
  it('rotation=90°: top drag shifts x not y', () => {
    const shape = buildEllipse({ id: 'e', x: 0, y: 0, radiusX: 60, radiusY: 40, rotation: 90 })
    const start = captureEllipseStart(shape)
    const θ = Math.PI / 2
    const result = applyEllipseHandleDrag(start, 'top', 0, -20, NO_PTR, Math.sin(θ), Math.cos(θ)) as {
      x: number
      y: number
    }
    // cy = -10; x = s.x + cy*(-sinθ) = 0 + (-10)*(-1) = 10; y = s.y + cy*cosθ = 0
    expect(result.x).toBeCloseTo(10)
    expect(result.y).toBeCloseTo(0)
  })
})
