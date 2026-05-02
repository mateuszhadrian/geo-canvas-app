import { render, screen, fireEvent } from '@testing-library/react'
import { PictureDataDisplay } from '@/components/canvas/PictureDataDisplay'
import { useCanvasStore } from '@/store/use-canvas-store'
import { INITIAL_LAYER, DEFAULT_LAYER_ID } from '@/store/slices/layers'

beforeEach(() => {
  useCanvasStore.setState({
    shapes: [],
    layers: [{ ...INITIAL_LAYER }],
    activeLayerId: DEFAULT_LAYER_ID,
    selectedShapeIds: [],
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,
  })
})

describe('PictureDataDisplay — initial state', () => {
  it('renders the JSON label', () => {
    render(<PictureDataDisplay />)
    expect(screen.getByText('JSON')).toBeInTheDocument()
  })

  it('renders a "show" button when initially hidden', () => {
    render(<PictureDataDisplay />)
    expect(screen.getByRole('button', { name: /show/i })).toBeInTheDocument()
  })

  it('does not show JSON content initially', () => {
    render(<PictureDataDisplay />)
    expect(screen.queryByRole('code')).not.toBeInTheDocument()
    // pre element with JSON is not rendered when hidden
    expect(screen.queryByText(/"layers"/)).not.toBeInTheDocument()
  })
})

describe('PictureDataDisplay — toggle visibility', () => {
  it('shows JSON content after clicking "show"', () => {
    render(<PictureDataDisplay />)
    fireEvent.click(screen.getByRole('button', { name: /show/i }))
    expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument()
  })

  it('renders JSON content with layers key when visible', () => {
    render(<PictureDataDisplay />)
    fireEvent.click(screen.getByRole('button', { name: /show/i }))
    expect(screen.getByText(/"layers"/)).toBeInTheDocument()
  })

  it('hides JSON content after clicking "hide"', () => {
    render(<PictureDataDisplay />)
    fireEvent.click(screen.getByRole('button', { name: /show/i }))
    fireEvent.click(screen.getByRole('button', { name: /hide/i }))
    expect(screen.queryByText(/"layers"/)).not.toBeInTheDocument()
  })

  it('toggles back to "show" after hiding', () => {
    render(<PictureDataDisplay />)
    fireEvent.click(screen.getByRole('button', { name: /show/i }))
    fireEvent.click(screen.getByRole('button', { name: /hide/i }))
    expect(screen.getByRole('button', { name: /show/i })).toBeInTheDocument()
  })
})
