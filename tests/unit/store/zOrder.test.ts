import { act } from '@testing-library/react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { INITIAL_LAYER, DEFAULT_LAYER_ID } from '@/store/slices/layers'
import { buildRect } from '../../helpers/buildShape'

beforeEach(() => {
  useCanvasStore.setState({
    layers: [{ ...INITIAL_LAYER }],
    activeLayerId: DEFAULT_LAYER_ID,
    shapes: [
      buildRect({ id: 'A' }),
      buildRect({ id: 'B' }),
      buildRect({ id: 'C' }),
    ],
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
  })
})

function ids() {
  return useCanvasStore.getState().shapes.map((s) => s.id)
}

function store() {
  return useCanvasStore.getState()
}

describe('ZO-001: bringForward([B]) on [A, B, C] → [A, C, B]', () => {
  it('B moves one step forward', () => {
    act(() => { store().bringForward(['B']) })
    expect(ids()).toEqual(['A', 'C', 'B'])
  })
})

describe('ZO-002: bringToFront([A]) on [A, B, C] → [B, C, A]', () => {
  it('A moves to the top of the stack', () => {
    act(() => { store().bringToFront(['A']) })
    expect(ids()).toEqual(['B', 'C', 'A'])
  })
})

describe('ZO-003: sendBackward([C]) on [A, B, C] → [A, C, B]', () => {
  it('C moves one step backward', () => {
    act(() => { store().sendBackward(['C']) })
    expect(ids()).toEqual(['A', 'C', 'B'])
  })
})

describe('ZO-004: sendToBack([C]) on [A, B, C] → [C, A, B]', () => {
  it('C moves to the bottom of the stack', () => {
    act(() => { store().sendToBack(['C']) })
    expect(ids()).toEqual(['C', 'A', 'B'])
  })
})

describe('ZO-005: bringForward when shape is already at top — no change', () => {
  it('order unchanged when bringing top shape forward', () => {
    act(() => { store().bringForward(['C']) })
    expect(ids()).toEqual(['A', 'B', 'C'])
  })

  it('no history entry pushed when order does not change', () => {
    const pastBefore = store()._past.length
    act(() => { store().bringForward(['C']) })
    expect(store()._past.length).toBe(pastBefore)
  })
})

describe('ZO-006: z-order operations register REORDER_SHAPES in history', () => {
  it('_past grows after bringForward', () => {
    const before = store()._past.length
    act(() => { store().bringForward(['A']) })
    expect(store()._past.length).toBe(before + 1)
    expect(store()._past[store()._past.length - 1].type).toBe('REORDER_SHAPES')
  })

  it('_past grows after bringToFront', () => {
    const before = store()._past.length
    act(() => { store().bringToFront(['A']) })
    expect(store()._past.length).toBe(before + 1)
  })

  it('_past grows after sendBackward', () => {
    const before = store()._past.length
    act(() => { store().sendBackward(['C']) })
    expect(store()._past.length).toBe(before + 1)
  })

  it('_past grows after sendToBack', () => {
    const before = store()._past.length
    act(() => { store().sendToBack(['C']) })
    expect(store()._past.length).toBe(before + 1)
  })
})
