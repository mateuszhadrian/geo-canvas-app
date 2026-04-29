import {
  applyCircleHandleDrag,
  captureCircleStart,
  getCircleBoundingBox,
} from '@/shapes/circle/handles'
import { buildCircle } from '../../helpers/buildShape'
import type { HandleKind } from '@/shapes/_base/types'

const NO_PTR = { x: 0, y: 0 }
const NO_ROT = { sinθ: 0, cosθ: 1 }

function drag(
  overrides: { radius?: number; x?: number; y?: number; rotation?: number },
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr = NO_PTR
) {
  const shape = buildCircle({ id: 'c', ...overrides })
  const start = captureCircleStart(shape)
  const θ = (overrides.rotation ?? 0) * (Math.PI / 180)
  return applyCircleHandleDrag(start, kind, ldx, ldy, startLocalPtr, Math.sin(θ), Math.cos(θ))
}

describe('CH-001: circle top handle drag up → morphs to ellipse', () => {
  it('type becomes ellipse', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'top', 0, -20)
    expect(result.type).toBe('ellipse')
  })

  it('radiusY increases when dragging top handle up (ldy=-20)', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'top', 0, -20) as { radiusY: number }
    // eLdy = min(-20, 2*(50-1)) = -20; radiusY = max(1, 50 - (-20)/2) = 60
    expect(result.radiusY).toBe(60)
  })

  it('radiusX unchanged when dragging top handle', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'top', 0, -20) as { radiusX: number }
    expect(result.radiusX).toBe(50)
  })
})

describe('CH-002: circle bottom handle drag down → morphs to ellipse', () => {
  it('type becomes ellipse', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'bottom', 0, 30)
    expect(result.type).toBe('ellipse')
  })

  it('radiusY increases when dragging bottom handle down (ldy=30)', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'bottom', 0, 30) as { radiusY: number }
    // eLdy = max(30, -2*(50-1)) = 30; radiusY = max(1, 50 + 30/2) = 65
    expect(result.radiusY).toBe(65)
  })
})

describe('CH-003: circle left handle drag → morphs to ellipse', () => {
  it('radiusX increases when dragging left handle left (ldx=-15)', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'left', -15, 0) as { radiusX: number }
    // eLdx = min(-15, 2*(50-1)) = -15; radiusX = max(1, 50 - (-15)/2) = 57.5
    expect(result.radiusX).toBe(57.5)
  })

  it('radiusY unchanged when dragging left handle', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'left', -15, 0) as { radiusY: number }
    expect(result.radiusY).toBe(50)
  })
})

describe('CH-004: circle right handle drag → morphs to ellipse', () => {
  it('radiusX increases when dragging right handle right (ldx=20)', () => {
    const result = drag({ radius: 50, x: 0, y: 0 }, 'right', 20, 0) as { radiusX: number }
    // eLdx = max(20, -2*(50-1)) = 20; radiusX = max(1, 50 + 20/2) = 60
    expect(result.radiusX).toBe(60)
  })
})

describe('CH-005: circle scale handle → stays circle', () => {
  it('returns radius (not type ellipse)', () => {
    const R = 50
    const ptr = { x: R, y: -R }
    const result = drag({ radius: R, x: 0, y: 0 }, 'scale', R, -R, ptr)
    expect(result).toHaveProperty('radius')
    expect(result.type).toBeUndefined()
  })

  it('radius grows when scaling out', () => {
    const R = 50
    const ptr = { x: R, y: -R }
    const result = drag({ radius: R, x: 0, y: 0 }, 'scale', R, -R, ptr) as { radius: number }
    expect(result.radius).toBeGreaterThan(R)
  })

  it('radius clamped to min 5 when scaling inward past center', () => {
    const R = 50
    const ptr = { x: R, y: -R }
    const result = drag({ radius: R, x: 0, y: 0 }, 'scale', -1000, 1000, ptr) as { radius: number }
    expect(result.radius).toBe(Math.max(5, 0.1 * R))
  })
})

describe('CH-006: circle top handle minimum radius clamp', () => {
  it('radiusY clamped to 1 when dragged beyond full collapse', () => {
    // R=10, drag top down far: eLdy = min(100, 2*(10-1)=18) = 18; radiusY = max(1, 10-9) = 1
    const result = drag({ radius: 10, x: 0, y: 0 }, 'top', 0, 100) as { radiusY: number }
    expect(result.radiusY).toBeGreaterThanOrEqual(1)
  })
})

describe('CH-007: getCircleBoundingBox', () => {
  it('returns correct bbox for circle at (100, 150) with radius 30', () => {
    const circle = buildCircle({ id: 'c', x: 100, y: 150, radius: 30 })
    expect(getCircleBoundingBox(circle)).toEqual({ x1: 70, y1: 120, x2: 130, y2: 180 })
  })

  it('returns symmetric bbox centered at shape origin', () => {
    const circle = buildCircle({ id: 'c', x: 0, y: 0, radius: 45 })
    const bbox = getCircleBoundingBox(circle)
    expect(bbox.x2 - bbox.x1).toBe(90)
    expect(bbox.y2 - bbox.y1).toBe(90)
  })
})
