import { act } from '@testing-library/react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { DEFAULT_LAYER_ID, INITIAL_LAYER } from '@/store/slices/layers'
import { buildRect } from '../../helpers/buildShape'

beforeEach(() => {
  useCanvasStore.setState({
    layers: [{ ...INITIAL_LAYER }],
    activeLayerId: DEFAULT_LAYER_ID,
    shapes: [],
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
  })
})

function store() {
  return useCanvasStore.getState()
}

describe('LA-001: addLayer adds a new layer and sets it as active', () => {
  it('layers length increases by 1', () => {
    act(() => { store().addLayer() })
    expect(store().layers).toHaveLength(2)
  })

  it('activeLayerId points to the new layer', () => {
    act(() => { store().addLayer('New Layer') })
    const newLayer = store().layers[1]
    expect(store().activeLayerId).toBe(newLayer.id)
  })

  it('new layer has the provided name', () => {
    act(() => { store().addLayer('My Layer') })
    expect(store().layers[1].name).toBe('My Layer')
  })
})

describe('LA-002: removeLayer with only 1 layer — no effect', () => {
  it('layers remain unchanged when removing the last layer', () => {
    act(() => { store().removeLayer(DEFAULT_LAYER_ID) })
    expect(store().layers).toHaveLength(1)
    expect(store().layers[0].id).toBe(DEFAULT_LAYER_ID)
  })
})

describe('LA-003: removeLayer with 2+ layers — removes layer and its shapes', () => {
  it('layer and its shapes are removed', () => {
    let secondId = ''
    act(() => { store().addLayer('Second') })
    secondId = store().layers[1].id

    // Add a shape on the second layer
    act(() => {
      store().setActiveLayer(secondId)
      store().addShape(buildRect({ id: 'shape-on-2', layerId: secondId }))
    })
    expect(store().shapes).toHaveLength(1)

    act(() => { store().removeLayer(secondId) })

    expect(store().layers).toHaveLength(1)
    expect(store().shapes).toHaveLength(0)
  })

  it('activeLayerId is corrected after removing the active layer', () => {
    act(() => { store().addLayer('Second') })
    const secondId = store().layers[1].id
    act(() => { store().setActiveLayer(secondId) })
    act(() => { store().removeLayer(secondId) })
    expect(store().activeLayerId).toBe(DEFAULT_LAYER_ID)
  })
})

describe('LA-004: toggleLayerVisibility flips visible flag', () => {
  it('visible goes from true to false', () => {
    act(() => { store().toggleLayerVisibility(DEFAULT_LAYER_ID) })
    expect(store().layers[0].visible).toBe(false)
  })

  it('visible toggles back to true on second call', () => {
    act(() => { store().toggleLayerVisibility(DEFAULT_LAYER_ID) })
    act(() => { store().toggleLayerVisibility(DEFAULT_LAYER_ID) })
    expect(store().layers[0].visible).toBe(true)
  })
})

describe('LA-005: toggleLayerLock flips locked flag', () => {
  it('locked goes from false to true', () => {
    act(() => { store().toggleLayerLock(DEFAULT_LAYER_ID) })
    expect(store().layers[0].locked).toBe(true)
  })
})

describe('LA-006: setLayerOpacity sets opacity', () => {
  it('opacity is set to 0.5', () => {
    act(() => { store().setLayerOpacity(DEFAULT_LAYER_ID, 0.5) })
    expect(store().layers[0].opacity).toBe(0.5)
  })
})

describe('LA-007: moveLayerUp at last position — no change', () => {
  it('order unchanged when moving top layer up', () => {
    act(() => { store().addLayer('Second') })
    const secondId = store().layers[1].id
    const orderBefore = store().layers.map((l) => l.id)
    act(() => { store().moveLayerUp(secondId) })
    expect(store().layers.map((l) => l.id)).toEqual(orderBefore)
  })
})

describe('LA-008: moveLayerDown at first position — no change', () => {
  it('order unchanged when moving bottom layer down', () => {
    act(() => { store().addLayer('Second') })
    const orderBefore = store().layers.map((l) => l.id)
    act(() => { store().moveLayerDown(DEFAULT_LAYER_ID) })
    expect(store().layers.map((l) => l.id)).toEqual(orderBefore)
  })
})

describe('LA-009: renameLayer with empty string — name becomes empty', () => {
  it('layer name is set to empty string', () => {
    act(() => { store().renameLayer(DEFAULT_LAYER_ID, '') })
    expect(store().layers[0].name).toBe('')
  })
})

describe('LA-010: setLayers fully replaces layers and activeLayerId', () => {
  it('replaces all layers', () => {
    const newLayers = [
      { id: 'layer-a', name: 'A', visible: true, locked: false, opacity: 1 },
      { id: 'layer-b', name: 'B', visible: false, locked: true, opacity: 0.5 },
    ]
    act(() => { store().setLayers(newLayers, 'layer-b') })
    expect(store().layers).toHaveLength(2)
    expect(store().layers[0].id).toBe('layer-a')
    expect(store().layers[1].id).toBe('layer-b')
    expect(store().activeLayerId).toBe('layer-b')
  })
})

describe('moveLayerUp/Down swaps adjacent layers', () => {
  it('moveLayerUp moves a layer one position higher', () => {
    act(() => { store().addLayer('Second') })
    act(() => { store().moveLayerUp(DEFAULT_LAYER_ID) })
    expect(store().layers[1].id).toBe(DEFAULT_LAYER_ID)
  })

  it('moveLayerDown moves a layer one position lower', () => {
    act(() => { store().addLayer('Second') })
    const secondId = store().layers[1].id
    act(() => { store().moveLayerDown(secondId) })
    expect(store().layers[0].id).toBe(secondId)
  })
})
