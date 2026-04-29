import { renderHook, act } from '@testing-library/react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { useMultilineDrawing } from '@/shapes/line/useMultilineDrawing'
import { INITIAL_LAYER, DEFAULT_LAYER_ID } from '@/store/slices/layers'
import { buildLine } from '../../helpers/buildShape'

beforeEach(() => {
  useCanvasStore.setState({
    layers: [{ ...INITIAL_LAYER }],
    activeLayerId: DEFAULT_LAYER_ID,
    shapes: [],
    selectedShapeIds: [],
    canvasScale: 1,
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
  })
})

function store() {
  return useCanvasStore.getState()
}

describe('ML-001: no selected lines → tryExtendOrClose returns false', () => {
  it('returns false immediately', () => {
    const { result } = renderHook(() => useMultilineDrawing())
    let returned: boolean
    act(() => {
      returned = result.current.tryExtendOrClose(500, 500)
    })
    expect(returned!).toBe(false)
    expect(store().shapes).toHaveLength(0)
  })
})

describe('ML-002: 1 selected line → extends chain', () => {
  it('adds a new line segment and extends selectedShapeIds', () => {
    // line from (0,0) to (100,0)
    const line = buildLine({ id: 'l1', x: 0, y: 0, points: [0, 0, 100, 0] })
    useCanvasStore.setState({ shapes: [line], selectedShapeIds: ['l1'] })

    const { result } = renderHook(() => useMultilineDrawing())
    act(() => {
      result.current.tryExtendOrClose(200, 0)
    })

    const { shapes, selectedShapeIds } = store()
    expect(shapes).toHaveLength(2)
    expect(selectedShapeIds).toHaveLength(2)
    expect(selectedShapeIds).toContain('l1')
  })
})

describe('ML-003: ≥2 selected lines, click close to start → closes polyline', () => {
  it('selectedShapeIds becomes empty after closing', () => {
    // l1: from (0,0) to (100,0) — start point is (0+0, 0+0) = (0,0)
    const l1 = buildLine({ id: 'l1', x: 0, y: 0, points: [0, 0, 100, 0] })
    // l2: from (100,0) to (200,0)
    const l2 = buildLine({ id: 'l2', x: 100, y: 0, points: [0, 0, 100, 0] })
    useCanvasStore.setState({ shapes: [l1, l2], selectedShapeIds: ['l1', 'l2'] })

    const { result } = renderHook(() => useMultilineDrawing())

    // Click at (0, 0) — exactly at the start of l1, threshold = 30/1 = 30
    act(() => {
      result.current.tryExtendOrClose(0, 0)
    })

    expect(store().selectedShapeIds).toHaveLength(0)
  })

  it('returns true when closing', () => {
    const l1 = buildLine({ id: 'l1', x: 0, y: 0, points: [0, 0, 100, 0] })
    const l2 = buildLine({ id: 'l2', x: 100, y: 0, points: [0, 0, 100, 0] })
    useCanvasStore.setState({ shapes: [l1, l2], selectedShapeIds: ['l1', 'l2'] })

    const { result } = renderHook(() => useMultilineDrawing())
    let returned: boolean
    act(() => {
      returned = result.current.tryExtendOrClose(5, 5) // within 30px of (0,0)
    })
    expect(returned!).toBe(true)
  })
})

describe('ML-004: ≥2 selected lines, click far from start → extends chain', () => {
  it('does not close — selectedShapeIds grows', () => {
    const l1 = buildLine({ id: 'l1', x: 0, y: 0, points: [0, 0, 100, 0] })
    const l2 = buildLine({ id: 'l2', x: 100, y: 0, points: [0, 0, 100, 0] })
    useCanvasStore.setState({ shapes: [l1, l2], selectedShapeIds: ['l1', 'l2'] })

    const { result } = renderHook(() => useMultilineDrawing())

    // Click far from start (0,0) — well beyond 30px threshold
    act(() => {
      result.current.tryExtendOrClose(500, 500)
    })

    expect(store().selectedShapeIds).toHaveLength(3)
    expect(store().shapes).toHaveLength(3)
  })
})

describe('ML-005: close threshold scales with canvasScale', () => {
  it('at scale=2, threshold=15 — click at 16px from start does NOT close', () => {
    useCanvasStore.setState({ canvasScale: 2 })
    const l1 = buildLine({ id: 'l1', x: 0, y: 0, points: [0, 0, 100, 0] })
    const l2 = buildLine({ id: 'l2', x: 100, y: 0, points: [0, 0, 100, 0] })
    useCanvasStore.setState({ shapes: [l1, l2], selectedShapeIds: ['l1', 'l2'] })

    const { result } = renderHook(() => useMultilineDrawing())
    act(() => {
      // 16px from (0,0): sqrt(16^2) = 16 > 30/2=15 → should NOT close
      result.current.tryExtendOrClose(16, 0)
    })

    // Did not close — selectedShapeIds still has entries
    expect(store().selectedShapeIds.length).toBeGreaterThan(0)
  })

  it('at scale=2, threshold=15 — click at 14px from start DOES close', () => {
    useCanvasStore.setState({ canvasScale: 2 })
    const l1 = buildLine({ id: 'l1', x: 0, y: 0, points: [0, 0, 100, 0] })
    const l2 = buildLine({ id: 'l2', x: 100, y: 0, points: [0, 0, 100, 0] })
    useCanvasStore.setState({ shapes: [l1, l2], selectedShapeIds: ['l1', 'l2'] })

    const { result } = renderHook(() => useMultilineDrawing())
    act(() => {
      // 14px from (0,0): sqrt(14^2) = 14 ≤ 15 → should close
      result.current.tryExtendOrClose(14, 0)
    })

    expect(store().selectedShapeIds).toHaveLength(0)
  })

  it('at scale=0.5, threshold=60 — click at 59px from start closes', () => {
    useCanvasStore.setState({ canvasScale: 0.5 })
    const l1 = buildLine({ id: 'l1', x: 0, y: 0, points: [0, 0, 100, 0] })
    const l2 = buildLine({ id: 'l2', x: 100, y: 0, points: [0, 0, 100, 0] })
    useCanvasStore.setState({ shapes: [l1, l2], selectedShapeIds: ['l1', 'l2'] })

    const { result } = renderHook(() => useMultilineDrawing())
    act(() => {
      result.current.tryExtendOrClose(59, 0)
    })

    expect(store().selectedShapeIds).toHaveLength(0)
  })
})

describe('multilineFirstLineId', () => {
  it('is null when < 2 lines are selected', () => {
    const l1 = buildLine({ id: 'l1', x: 0, y: 0 })
    useCanvasStore.setState({ shapes: [l1], selectedShapeIds: ['l1'] })

    const { result } = renderHook(() => useMultilineDrawing())
    expect(result.current.multilineFirstLineId).toBeNull()
  })

  it('returns first selected line id when ≥2 lines are selected', () => {
    const l1 = buildLine({ id: 'l1', x: 0, y: 0 })
    const l2 = buildLine({ id: 'l2', x: 100, y: 0 })
    useCanvasStore.setState({ shapes: [l1, l2], selectedShapeIds: ['l1', 'l2'] })

    const { result } = renderHook(() => useMultilineDrawing())
    expect(result.current.multilineFirstLineId).toBe('l1')
  })
})
