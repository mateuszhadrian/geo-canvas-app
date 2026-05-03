import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LayersSidebar } from '@/components/sidebar/LayersSidebar'
import { useCanvasStore } from '@/store/use-canvas-store'
import { INITIAL_LAYER, DEFAULT_LAYER_ID } from '@/store/slices/layers'

function resetStore(overrides?: Partial<ReturnType<typeof useCanvasStore.getState>>) {
  useCanvasStore.setState({
    layers: [{ ...INITIAL_LAYER }],
    activeLayerId: DEFAULT_LAYER_ID,
    shapes: [],
    selectedShapeIds: [],
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
    ...overrides,
  })
}

beforeEach(() => resetStore())

describe('LayersSidebar — initial render', () => {
  it('renders the Layers heading', () => {
    render(<LayersSidebar />)
    expect(screen.getByText(/layers/i)).toBeInTheDocument()
  })

  it('renders the initial layer name', () => {
    render(<LayersSidebar />)
    expect(screen.getByText('Layer 1')).toBeInTheDocument()
  })

  it('renders the add layer button', () => {
    render(<LayersSidebar />)
    expect(screen.getByTitle('Add layer')).toBeInTheDocument()
  })

  it('shows shape count for active layer', () => {
    render(<LayersSidebar />)
    expect(screen.getByText(/0 shape\(s\) in active layer/i)).toBeInTheDocument()
  })

  it('shows opacity slider for active layer', () => {
    render(<LayersSidebar />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })
})

describe('LayersSidebar — add layer', () => {
  it('adds a new layer when Add layer is clicked', () => {
    render(<LayersSidebar />)
    fireEvent.click(screen.getByTitle('Add layer'))
    expect(useCanvasStore.getState().layers).toHaveLength(2)
  })

  it('renders the new layer name after adding', () => {
    render(<LayersSidebar />)
    fireEvent.click(screen.getByTitle('Add layer'))
    expect(screen.getByText('Layer 2')).toBeInTheDocument()
  })
})

describe('LayersSidebar — visibility toggle', () => {
  it('hides a layer when Eye button is clicked', () => {
    render(<LayersSidebar />)
    fireEvent.click(screen.getByTitle('Hide layer'))
    expect(useCanvasStore.getState().layers[0].visible).toBe(false)
  })

  it('shows a hidden layer when EyeOff button is clicked', () => {
    resetStore({
      layers: [{ ...INITIAL_LAYER, visible: false }],
      activeLayerId: DEFAULT_LAYER_ID,
    })
    render(<LayersSidebar />)
    fireEvent.click(screen.getByTitle('Show layer'))
    expect(useCanvasStore.getState().layers[0].visible).toBe(true)
  })
})

describe('LayersSidebar — lock toggle', () => {
  it('locks a layer when Unlock button is clicked', () => {
    render(<LayersSidebar />)
    fireEvent.click(screen.getByTitle('Lock layer'))
    expect(useCanvasStore.getState().layers[0].locked).toBe(true)
  })

  it('unlocks a locked layer', () => {
    resetStore({
      layers: [{ ...INITIAL_LAYER, locked: true }],
      activeLayerId: DEFAULT_LAYER_ID,
    })
    render(<LayersSidebar />)
    fireEvent.click(screen.getByTitle('Unlock layer'))
    expect(useCanvasStore.getState().layers[0].locked).toBe(false)
  })
})

describe('LayersSidebar — layer selection', () => {
  it('sets activeLayerId when a layer row is clicked', () => {
    const secondLayer = { id: 'layer-2', name: 'Layer 2', visible: true, locked: false, opacity: 1 }
    resetStore({
      layers: [{ ...INITIAL_LAYER }, secondLayer],
      activeLayerId: DEFAULT_LAYER_ID,
    })
    render(<LayersSidebar />)
    fireEvent.click(screen.getByText('Layer 2'))
    expect(useCanvasStore.getState().activeLayerId).toBe('layer-2')
  })
})

describe('LayersSidebar — rename layer', () => {
  it('shows input on double-click of layer name', async () => {
    render(<LayersSidebar />)
    const name = screen.getByText('Layer 1')
    fireEvent.doubleClick(name)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('commits rename on Enter', async () => {
    const user = userEvent.setup()
    render(<LayersSidebar />)
    fireEvent.doubleClick(screen.getByText('Layer 1'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Background')
    await user.keyboard('{Enter}')
    expect(useCanvasStore.getState().layers[0].name).toBe('Background')
  })

  it('reverts on Escape', async () => {
    const user = userEvent.setup()
    render(<LayersSidebar />)
    fireEvent.doubleClick(screen.getByText('Layer 1'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Changed')
    await user.keyboard('{Escape}')
    expect(useCanvasStore.getState().layers[0].name).toBe('Layer 1')
  })
})

describe('LayersSidebar — delete layer', () => {
  it('delete button not rendered when only one layer exists', () => {
    render(<LayersSidebar />)
    expect(screen.queryByTitle('Delete layer')).not.toBeInTheDocument()
  })

  it('removes layer when Delete is clicked with 2+ layers', () => {
    const secondLayer = { id: 'layer-2', name: 'Layer 2', visible: true, locked: false, opacity: 1 }
    resetStore({
      layers: [{ ...INITIAL_LAYER }, secondLayer],
      activeLayerId: DEFAULT_LAYER_ID,
    })
    render(<LayersSidebar />)
    const deleteButtons = screen.getAllByTitle('Delete layer')
    fireEvent.click(deleteButtons[0])
    expect(useCanvasStore.getState().layers).toHaveLength(1)
  })
})

describe('LayersSidebar — opacity slider', () => {
  it('updates layer opacity when slider changes', () => {
    render(<LayersSidebar />)
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '50' } })
    expect(useCanvasStore.getState().layers[0].opacity).toBe(0.5)
  })

  it('displays opacity percentage', () => {
    render(<LayersSidebar />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
