import { act } from '@testing-library/react'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { RectShape, CircleShape } from '@/store/types'

const makeRect = (id = 'rect-1'): RectShape => ({
  id,
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  fill: '#ff0000',
  stroke: '#000',
  strokeWidth: 1,
  opacity: 1,
  rotation: 0,
  cornerRadius: 0,
})

const makeCircle = (id = 'circle-1'): CircleShape => ({
  id,
  type: 'circle',
  x: 50,
  y: 50,
  radius: 30,
  fill: '#00ff00',
  stroke: '#000',
  strokeWidth: 1,
  opacity: 1,
  rotation: 0,
})

beforeEach(() => {
  useCanvasStore.setState({ shapes: [], selectedShapeIds: [] })
})

describe('useCanvasStore', () => {
  it('addShape dodaje kształty do tablicy', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect())
    })

    expect(useCanvasStore.getState().shapes).toHaveLength(1)
    expect(useCanvasStore.getState().shapes[0]).toMatchObject({ id: 'rect-1', type: 'rect' })
  })

  it('addShape dodaje wiele kształtów niezależnie', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect('rect-1'))
      useCanvasStore.getState().addShape(makeRect('rect-2'))
      useCanvasStore.getState().addShape(makeCircle())
    })

    expect(useCanvasStore.getState().shapes).toHaveLength(3)
  })

  it('removeShape usuwa figurę po id', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect())
      useCanvasStore.getState().addShape(makeCircle())
    })

    act(() => {
      useCanvasStore.getState().removeShape('rect-1')
    })

    const shapes = useCanvasStore.getState().shapes
    expect(shapes).toHaveLength(1)
    expect(shapes[0].id).toBe('circle-1')
  })

  it('removeShape usuwa id z selectedShapeIds', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect())
      useCanvasStore.getState().setSelectedShapeIds(['rect-1'])
    })

    act(() => {
      useCanvasStore.getState().removeShape('rect-1')
    })

    expect(useCanvasStore.getState().selectedShapeIds).toHaveLength(0)
  })

  it('removeShape ignoruje nieistniejące id', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect())
    })

    act(() => {
      useCanvasStore.getState().removeShape('nieistniejace-id')
    })

    expect(useCanvasStore.getState().shapes).toHaveLength(1)
  })

  it('updateShape aktualizuje właściwości figury', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect())
    })

    act(() => {
      useCanvasStore.getState().updateShape('rect-1', { fill: '#0000ff', width: 200 })
    })

    const updated = useCanvasStore.getState().shapes[0] as RectShape
    expect(updated.fill).toBe('#0000ff')
    expect(updated.width).toBe(200)
  })

  it('updateShape nie zmienia pozostałych właściwości', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect())
    })

    act(() => {
      useCanvasStore.getState().updateShape('rect-1', { fill: '#0000ff' })
    })

    const updated = useCanvasStore.getState().shapes[0] as RectShape
    expect(updated.height).toBe(50)
    expect(updated.x).toBe(10)
    expect(updated.type).toBe('rect')
  })

  it('updateShape ignoruje nieistniejące id', () => {
    act(() => {
      useCanvasStore.getState().addShape(makeRect())
    })

    act(() => {
      useCanvasStore.getState().updateShape('nieistniejace-id', { fill: '#0000ff' })
    })

    const shape = useCanvasStore.getState().shapes[0] as RectShape
    expect(shape.fill).toBe('#ff0000')
  })
})
