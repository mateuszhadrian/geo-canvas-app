import { act } from '@testing-library/react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { buildRect, buildCircle } from '../../helpers/buildShape'

const INITIAL_STATE = {
  shapes: [],
  selectedShapeIds: [],
  _past: [],
  _future: [],
  canUndo: false,
  canRedo: false,
}

beforeEach(() => {
  useCanvasStore.setState(INITIAL_STATE)
})

function store() {
  return useCanvasStore.getState()
}

// ── applyForward / applyInverse via undo/redo ─────────────────────────────────

describe('HI-001: ADD_SHAPE forward / inverse', () => {
  it('forward: shape appears in state.shapes', () => {
    act(() => { store().addShape(buildRect({ id: 'r1' })) })
    expect(store().shapes.map((s) => s.id)).toContain('r1')
  })

  it('inverse (undo): shape removed from state.shapes', () => {
    act(() => { store().addShape(buildRect({ id: 'r1' })) })
    act(() => { store().undo() })
    expect(store().shapes.map((s) => s.id)).not.toContain('r1')
  })

  it('redo after undo restores the shape', () => {
    act(() => { store().addShape(buildRect({ id: 'r1' })) })
    act(() => { store().undo() })
    act(() => { store().redo() })
    expect(store().shapes.map((s) => s.id)).toContain('r1')
  })
})

describe('HI-002: REMOVE_SHAPES forward / inverse', () => {
  it('forward: shapes disappear', () => {
    act(() => {
      store().addShape(buildRect({ id: 'r1' }))
      store().addShape(buildRect({ id: 'r2' }))
    })
    useCanvasStore.setState({ _past: [], _future: [], canUndo: false, canRedo: false })
    act(() => { store().removeShapes(['r1', 'r2']) })
    expect(store().shapes).toHaveLength(0)
  })

  it('inverse (undo): shapes restored', () => {
    act(() => {
      store().addShape(buildRect({ id: 'r1' }))
      store().addShape(buildRect({ id: 'r2' }))
    })
    useCanvasStore.setState({ _past: [], _future: [], canUndo: false, canRedo: false })
    act(() => { store().removeShapes(['r1', 'r2']) })
    act(() => { store().undo() })
    expect(store().shapes).toHaveLength(2)
  })
})

describe('HI-003: UPDATE_SHAPE forward / inverse', () => {
  beforeEach(() => {
    act(() => { store().addShape(buildRect({ id: 'r1', fill: '#aaaaaa' })) })
    useCanvasStore.setState({ _past: [], _future: [], canUndo: false, canRedo: false })
  })

  it('forward: "after" value applied', () => {
    act(() => { store().updateShape('r1', { fill: '#ffffff' }) })
    const shape = store().shapes.find((s) => s.id === 'r1') as typeof store.arguments
    expect((shape as { fill: string }).fill).toBe('#ffffff')
  })

  it('inverse (undo): "before" value restored', () => {
    act(() => { store().updateShape('r1', { fill: '#ffffff' }) })
    act(() => { store().undo() })
    const shape = store().shapes.find((s) => s.id === 'r1') as { fill: string }
    expect(shape.fill).toBe('#aaaaaa')
  })
})

describe('HI-004: UPDATE_SHAPES (bulk) forward / inverse', () => {
  beforeEach(() => {
    act(() => {
      store().addShape(buildRect({ id: 'r1', x: 10 }))
      store().addShape(buildRect({ id: 'r2', x: 20 }))
    })
    useCanvasStore.setState({ _past: [], _future: [], canUndo: false, canRedo: false })
  })

  it('forward: all "after" values applied', () => {
    act(() => {
      store().moveShapes([
        { id: 'r1', before: { x: 10 }, after: { x: 100 } },
        { id: 'r2', before: { x: 20 }, after: { x: 200 } },
      ])
    })
    expect((store().shapes.find((s) => s.id === 'r1') as { x: number }).x).toBe(100)
    expect((store().shapes.find((s) => s.id === 'r2') as { x: number }).x).toBe(200)
  })

  it('inverse (undo): all "before" values restored', () => {
    act(() => {
      store().moveShapes([
        { id: 'r1', before: { x: 10 }, after: { x: 100 } },
        { id: 'r2', before: { x: 20 }, after: { x: 200 } },
      ])
    })
    act(() => { store().undo() })
    expect((store().shapes.find((s) => s.id === 'r1') as { x: number }).x).toBe(10)
    expect((store().shapes.find((s) => s.id === 'r2') as { x: number }).x).toBe(20)
  })
})

describe('HI-005: SET_SHAPES forward / inverse', () => {
  it('forward: state.shapes replaced with "after"', () => {
    act(() => { store().addShape(buildRect({ id: 'r1' })) })
    useCanvasStore.setState({ _past: [], _future: [], canUndo: false, canRedo: false })
    const newShapes = [buildRect({ id: 'r-new' })]
    act(() => { store().setShapes(newShapes) })
    expect(store().shapes).toHaveLength(1)
    expect(store().shapes[0].id).toBe('r-new')
  })

  it('inverse (undo): state.shapes replaced with "before"', () => {
    act(() => { store().addShape(buildRect({ id: 'r1' })) })
    useCanvasStore.setState({ _past: [], _future: [], canUndo: false, canRedo: false })
    act(() => { store().setShapes([buildRect({ id: 'r-new' })]) })
    act(() => { store().undo() })
    expect(store().shapes).toHaveLength(1)
    expect(store().shapes[0].id).toBe('r1')
  })
})

describe('HI-006: REORDER_SHAPES forward / inverse', () => {
  beforeEach(() => {
    act(() => {
      store().addShape(buildRect({ id: 'A' }))
      store().addShape(buildRect({ id: 'B' }))
      store().addShape(buildRect({ id: 'C' }))
    })
    useCanvasStore.setState({ _past: [], _future: [], canUndo: false, canRedo: false })
  })

  it('forward: bringForward reorders shapes', () => {
    act(() => { store().bringForward(['B']) })
    const ids = store().shapes.map((s) => s.id)
    expect(ids).toEqual(['A', 'C', 'B'])
  })

  it('inverse (undo): original order restored', () => {
    act(() => { store().bringForward(['B']) })
    act(() => { store().undo() })
    const ids = store().shapes.map((s) => s.id)
    expect(ids).toEqual(['A', 'B', 'C'])
  })
})

// ── Queue management ──────────────────────────────────────────────────────────

describe('HI-010: undo at empty _past — no effect', () => {
  it('canUndo remains false and shapes unchanged', () => {
    act(() => { store().undo() })
    expect(store().canUndo).toBe(false)
    expect(store().shapes).toHaveLength(0)
  })
})

describe('HI-011: redo at empty _future — no effect', () => {
  it('canRedo remains false', () => {
    act(() => { store().addShape(buildRect({ id: 'r1' })) })
    expect(store().canRedo).toBe(false)
    act(() => { store().redo() })
    expect(store().canRedo).toBe(false)
    expect(store().shapes).toHaveLength(1)
  })
})

describe('HI-012: new operation after undo clears _future', () => {
  it('canRedo becomes false after new action', () => {
    act(() => { store().addShape(buildRect({ id: 'r1' })) })
    act(() => { store().undo() })
    expect(store().canRedo).toBe(true)
    act(() => { store().addShape(buildRect({ id: 'r2' })) })
    expect(store().canRedo).toBe(false)
    expect(store()._future).toHaveLength(0)
  })
})

describe('HI-013: 51 operations — _past capped at MAX_HISTORY (50)', () => {
  it('_past.length equals 50 after 51 additions', () => {
    for (let i = 0; i < 51; i++) {
      act(() => { store().addShape(buildRect({ id: `r${i}` })) })
    }
    expect(store()._past.length).toBe(50)
  })
})

describe('HI-014: undo → state A, redo → state B identical to pre-undo', () => {
  it('state after redo matches state before undo', () => {
    act(() => {
      store().addShape(buildRect({ id: 'r1' }))
      store().addShape(buildCircle({ id: 'c1' }))
    })
    const beforeUndo = store().shapes.map((s) => s.id)
    act(() => { store().undo() })
    act(() => { store().redo() })
    expect(store().shapes.map((s) => s.id)).toEqual(beforeUndo)
  })
})

describe('HI-015: clearHistory resets all history state', () => {
  it('_past, _future, canUndo, canRedo are all cleared', () => {
    act(() => {
      store().addShape(buildRect({ id: 'r1' }))
      store().addShape(buildRect({ id: 'r2' }))
    })
    expect(store()._past.length).toBeGreaterThan(0)
    act(() => { store().clearHistory() })
    expect(store()._past).toHaveLength(0)
    expect(store()._future).toHaveLength(0)
    expect(store().canUndo).toBe(false)
    expect(store().canRedo).toBe(false)
  })
})
