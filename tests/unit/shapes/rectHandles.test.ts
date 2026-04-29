import { applyRectHandleDrag, captureRectStart } from '@/shapes/rect/handles'
import { buildRect } from '../../helpers/buildShape'
import type { HandleKind } from '@/shapes/_base/types'

const NO_ROTATION = { sinθ: 0, cosθ: 1 }
const NO_PTR = { x: 0, y: 0 }

function drag(
  overrides: { width?: number; height?: number; x?: number; y?: number; rotation?: number },
  kind: HandleKind,
  ldx: number,
  ldy: number,
  startLocalPtr = NO_PTR,
) {
  const shape = buildRect({ id: 'r', ...overrides })
  const start = captureRectStart(shape)
  const θ = (overrides.rotation ?? 0) * (Math.PI / 180)
  return applyRectHandleDrag(start, kind, ldx, ldy, startLocalPtr, Math.sin(θ), Math.cos(θ))
}

describe('RH-001: top handle drag up (ldy=-20)', () => {
  it('height = sh - ldy = 80 - (-20) = 100', () => {
    const result = drag({ width: 100, height: 80, x: 0, y: 0 }, 'top', 0, -20)
    expect(result.height).toBe(100)
  })

  it('center y shifts by ldy/2 * cosθ = -20/2 = -10 (moves toward top)', () => {
    const result = drag({ width: 100, height: 80, x: 0, y: 0 }, 'top', 0, -20)
    expect(result.y).toBeCloseTo(-10)
  })
})

describe('RH-002: bottom handle drag down (ldy=30)', () => {
  it('height = sh + ldy = 80 + 30 = 110', () => {
    const result = drag({ width: 100, height: 80, x: 0, y: 0 }, 'bottom', 0, 30)
    expect(result.height).toBe(110)
  })

  it('y shifts by ldy/2 * cosθ = 30/2 = 15 (center moves down)', () => {
    const result = drag({ width: 100, height: 80, x: 0, y: 0 }, 'bottom', 0, 30)
    expect(result.y).toBeCloseTo(15)
  })
})

describe('RH-003: left handle drag left (ldx=-10)', () => {
  it('width = sw - ldx = 100 - (-10) = 110', () => {
    const result = drag({ width: 100, height: 80, x: 0, y: 0 }, 'left', -10, 0)
    expect(result.width).toBe(110)
  })
})

describe('RH-004: right handle drag right (ldx=15)', () => {
  it('width = sw + ldx = 100 + 15 = 115', () => {
    const result = drag({ width: 100, height: 80, x: 0, y: 0 }, 'right', 15, 0)
    expect(result.width).toBe(115)
  })
})

describe('RH-005: scale handle — proportional resize', () => {
  it('both width and height scale proportionally', () => {
    const sw = 100, sh = 80
    const d_tr = Math.sqrt((sw / 2) ** 2 + (sh / 2) ** 2)
    // startLocalPtr at corner (sw/2, -sh/2), move to 2x corner
    const ptr = { x: sw / 2, y: -sh / 2 }
    const ldx = sw / 2, ldy = -sh / 2 // delta to reach 2× distance
    const result = drag({ width: sw, height: sh, x: 0, y: 0 }, 'scale', ldx, ldy, ptr)
    expect(result.width).toBeGreaterThan(sw)
    expect(result.height).toBeGreaterThan(sh)
  })

  it('scale factor clamped to min 0.1 when dragging inward past center', () => {
    const sw = 100, sh = 80
    const ptr = { x: sw / 2, y: -sh / 2 }
    // Drag so far inward that proj < 0 → f = 0.1
    const result = drag({ width: sw, height: sh, x: 0, y: 0 }, 'scale', -1000, 1000, ptr)
    expect(result.width).toBe(Math.max(10, 0.1 * sw))
    expect(result.height).toBe(Math.max(10, 0.1 * sh))
  })
})

describe('RH-006: top handle at minimum height', () => {
  it('height clamped to 10 when ldy=5 and sh=11', () => {
    const result = drag({ width: 100, height: 11, x: 0, y: 0 }, 'top', 0, 5)
    // sh - ldy = 11 - 5 = 6, but min is 10
    expect(result.height).toBe(10)
  })
})

describe('RH-007: left handle at minimum width', () => {
  it('width clamped to 10 when ldx=5 and sw=10', () => {
    const result = drag({ width: 10, height: 80, x: 0, y: 0 }, 'left', 5, 0)
    // sw - ldx = 10 - 5 = 5, but min is 10
    expect(result.width).toBe(10)
  })
})

describe('GH-001: minimum dimension enforcement', () => {
  it('rect: top drag never produces height < 10', () => {
    const result = drag({ width: 100, height: 10, x: 0, y: 0 }, 'top', 0, 100)
    expect(result.height).toBeGreaterThanOrEqual(10)
  })

  it('rect: left drag never produces width < 10', () => {
    const result = drag({ width: 10, height: 80, x: 0, y: 0 }, 'left', 100, 0)
    expect(result.width).toBeGreaterThanOrEqual(10)
  })
})

describe('GH-002: rotated rect handle drag corrects center position', () => {
  it('rotation=90°: top drag shifts x not y', () => {
    // sin(90°)=1, cos(90°)=0 → x offset = ldy/2 * (-sinθ) = -ldy/2
    const shape = buildRect({ id: 'r', x: 0, y: 0, width: 100, height: 80, rotation: 90 })
    const start = captureRectStart(shape)
    const θ = 90 * (Math.PI / 180)
    const sinθ = Math.sin(θ), cosθ = Math.cos(θ)
    const result = applyRectHandleDrag(start, 'top', 0, -20, NO_PTR, sinθ, cosθ)
    // y = s.y + (ldy / 2) * cosθ = 0 + (-10) * 0 = 0
    expect(result.y).toBeCloseTo(0)
    // x = s.x + (ldy / 2) * (-sinθ) = 0 + (-10) * (-1) = 10
    expect(result.x).toBeCloseTo(10)
    expect(result.height).toBe(100)
  })
})
