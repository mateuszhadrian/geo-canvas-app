import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { useCanvasStore } from '@/store/use-canvas-store'
import type { ToolType } from '@/store/slices/tool'

// Avoid loading konva/react-konva (ESM) via the renderers imported by registry
jest.mock('@/shapes/registry', () => {
  const createShape = (type: string) => (pos: { x: number; y: number }) => ({
    id: `${type}-${Math.random()}`,
    type,
    x: pos.x,
    y: pos.y,
  })
  return {
    SHAPE_REGISTRY: {
      rect: { create: createShape('rect') },
      circle: { create: createShape('circle') },
      triangle: { create: createShape('triangle') },
      line: { create: createShape('line') },
    },
  }
})

jest.mock('@/store/use-canvas-store', () => ({
  useCanvasStore: jest.fn(),
}))

const mockAddShape = jest.fn()
const mockSetActiveTool = jest.fn()

function setupStoreMock(activeTool: ToolType = 'select', selectedShapeIds: string[] = []) {
  ;(useCanvasStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      activeTool,
      setActiveTool: mockSetActiveTool,
      addShape: mockAddShape,
      setSelectedShapeIds: jest.fn(),
      canvasPosition: { x: 0, y: 0 },
      canvasScale: 1,
      setCanvasPosition: jest.fn(),
      selectedShapeIds,
      bringForward: jest.fn(),
      bringToFront: jest.fn(),
      sendBackward: jest.fn(),
      sendToBack: jest.fn(),
    })
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  setupStoreMock()
})

// ─── Shape buttons ────────────────────────────────────────────────────────────

describe('Toolbar — shape buttons', () => {
  it('clicking Rectangle calls addShape with type "rect"', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Rectangle'))
    expect(mockAddShape).toHaveBeenCalledTimes(1)
    expect(mockAddShape).toHaveBeenCalledWith(expect.objectContaining({ type: 'rect' }))
  })

  it('clicking Circle calls addShape with type "circle"', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Circle'))
    expect(mockAddShape).toHaveBeenCalledTimes(1)
    expect(mockAddShape).toHaveBeenCalledWith(expect.objectContaining({ type: 'circle' }))
  })

  it('clicking Triangle calls addShape with type "triangle"', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Triangle'))
    expect(mockAddShape).toHaveBeenCalledTimes(1)
    expect(mockAddShape).toHaveBeenCalledWith(expect.objectContaining({ type: 'triangle' }))
  })

  it('clicking Line calls addShape with type "line"', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Line'))
    expect(mockAddShape).toHaveBeenCalledTimes(1)
    expect(mockAddShape).toHaveBeenCalledWith(expect.objectContaining({ type: 'line' }))
  })

  it('shape buttons never call setActiveTool', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    for (const label of ['Rectangle', 'Circle', 'Triangle', 'Line']) {
      await user.click(screen.getByTitle(label))
    }
    expect(mockSetActiveTool).not.toHaveBeenCalled()
  })

  it('each click on the same shape button creates a shape with a unique id', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Rectangle'))
    await user.click(screen.getByTitle('Rectangle'))
    const [first, second] = mockAddShape.mock.calls.map((c) => c[0])
    expect(first.id).not.toBe(second.id)
  })

  it('shape is created at the canvas center derived from store viewport', async () => {
    ;(useCanvasStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeTool: 'select',
        setActiveTool: mockSetActiveTool,
        addShape: mockAddShape,
        setSelectedShapeIds: jest.fn(),
        canvasPosition: { x: 100, y: 50 },
        canvasScale: 2,
        setCanvasPosition: jest.fn(),
        selectedShapeIds: [],
        bringForward: jest.fn(),
        bringToFront: jest.fn(),
        sendBackward: jest.fn(),
        sendToBack: jest.fn(),
      })
    )
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Rectangle'))
    const shape = mockAddShape.mock.calls[0][0]
    // center = (innerWidth/2 - 100) / 2 and (innerHeight/2 - 50) / 2
    const expectedX = (window.innerWidth / 2 - 100) / 2
    const expectedY = (window.innerHeight / 2 - 50) / 2
    expect(shape.x).toBeCloseTo(expectedX)
    expect(shape.y).toBeCloseTo(expectedY)
  })
})

// ─── Cursor buttons ───────────────────────────────────────────────────────────

describe('Toolbar — cursor buttons', () => {
  it('clicking Select calls setActiveTool with "select"', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Select'))
    expect(mockSetActiveTool).toHaveBeenCalledWith('select')
    expect(mockAddShape).not.toHaveBeenCalled()
  })

  it('clicking Pan calls setActiveTool with "hand"', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByTitle('Pan'))
    expect(mockSetActiveTool).toHaveBeenCalledWith('hand')
    expect(mockAddShape).not.toHaveBeenCalled()
  })

  it('Select button has active styling when activeTool is "select"', () => {
    setupStoreMock('select')
    render(<Toolbar />)
    expect(screen.getByTitle('Select').className).toContain('ring-1')
  })

  it('Pan button has active styling when activeTool is "hand"', () => {
    setupStoreMock('hand')
    render(<Toolbar />)
    expect(screen.getByTitle('Pan').className).toContain('ring-1')
  })

  it('Select button does not have active styling when activeTool is "hand"', () => {
    setupStoreMock('hand')
    render(<Toolbar />)
    expect(screen.getByTitle('Select').className).not.toContain('ring-1')
  })

  it('Pan button does not have active styling when activeTool is "select"', () => {
    setupStoreMock('select')
    render(<Toolbar />)
    expect(screen.getByTitle('Pan').className).not.toContain('ring-1')
  })
})
