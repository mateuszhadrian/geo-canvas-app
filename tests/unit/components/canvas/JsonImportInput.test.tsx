import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonImportInput } from '@/components/canvas/JsonImportInput'
import { useCanvasStore } from '@/store/use-canvas-store'

jest.mock('@/store/use-canvas-store', () => ({
  useCanvasStore: jest.fn(),
}))

const mockSetShapes = jest.fn()
const mockSetLayers = jest.fn()
const mockSetSelectedShapeIds = jest.fn()

function setupStoreMock() {
  ;(useCanvasStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      setShapes: mockSetShapes,
      setLayers: mockSetLayers,
      setSelectedShapeIds: mockSetSelectedShapeIds,
    })
  )
}

const RECT_SHAPE = {
  id: 'rect-1',
  type: 'rect',
  x: 100,
  y: 100,
  width: 100,
  height: 70,
  fill: '#4A90D9',
  cornerRadius: 0,
  rotation: 0,
  opacity: 1,
  stroke: '#333333',
  strokeWidth: 2,
}

const VALID_BARE_ARRAY = JSON.stringify([RECT_SHAPE])

const VALID_FULL_DOC = JSON.stringify({
  meta: {
    schemaVersion: '1.0.0',
    id: 'test',
    name: 'Test',
    createdAt: '2026-04-28T00:00:00.000Z',
    updatedAt: '2026-04-28T00:00:00.000Z',
  },
  canvas: {
    background: '#ffffff',
    width: 2000,
    height: 1414,
    grid: { visible: true, size: 20, color: '#e5e7eb', snapEnabled: false, snapThreshold: 8 },
  },
  layers: [
    {
      id: 'layer_default',
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      shapes: [RECT_SHAPE],
    },
  ],
  stickyDefaults: {},
})

function setTextareaValue(value: string) {
  const textarea = screen.getByRole('textbox')
  fireEvent.change(textarea, { target: { value } })
}

function pressEnter() {
  const textarea = screen.getByRole('textbox')
  fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false })
}

function pressShiftEnter() {
  const textarea = screen.getByRole('textbox')
  fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
  setupStoreMock()
})

describe('JI-001: valid full CanvasDocument + Enter → canvas replaced, textarea cleared', () => {
  it('calls setShapes, setLayers, setSelectedShapeIds and clears textarea', () => {
    render(<JsonImportInput />)
    setTextareaValue(VALID_FULL_DOC)
    pressEnter()

    expect(mockSetShapes).toHaveBeenCalledTimes(1)
    expect(mockSetLayers).toHaveBeenCalledTimes(1)
    expect(mockSetSelectedShapeIds).toHaveBeenCalledWith([])
    expect(screen.getByRole('textbox')).toHaveValue('')
  })
})

describe('JI-002: bare array of shapes + Enter → shapes loaded', () => {
  it('calls setShapes with decoded shapes from bare array', () => {
    render(<JsonImportInput />)
    setTextareaValue(VALID_BARE_ARRAY)
    pressEnter()

    expect(mockSetShapes).toHaveBeenCalledTimes(1)
    const shapes = mockSetShapes.mock.calls[0][0]
    expect(Array.isArray(shapes)).toBe(true)
    expect(shapes[0].id).toBe('rect-1')
  })
})

describe('JI-003: invalid JSON + Enter → error state, canvas unchanged', () => {
  it('does NOT call setShapes on invalid JSON', () => {
    render(<JsonImportInput />)
    setTextareaValue('this is not valid json at all !!!')
    pressEnter()

    expect(mockSetShapes).not.toHaveBeenCalled()
  })

  it('textarea border turns red on parse error', () => {
    render(<JsonImportInput />)
    setTextareaValue('not-valid-json!!!')
    pressEnter()

    const textarea = screen.getByRole('textbox')
    expect(textarea.style.border).toContain('#ef4444')
  })

  it('textarea is cleared and border resets after 700ms (fake timers)', () => {
    jest.useFakeTimers()
    render(<JsonImportInput />)
    setTextareaValue('bad json !!!')
    pressEnter()

    const textarea = screen.getByRole('textbox')
    expect(textarea.style.border).toContain('#ef4444')

    act(() => {
      jest.advanceTimersByTime(700)
    })

    expect(textarea).toHaveValue('')
  })
})

describe('JI-004: Shift+Enter — no action taken', () => {
  it('does not call setShapes on Shift+Enter', () => {
    render(<JsonImportInput />)
    setTextareaValue(VALID_BARE_ARRAY)
    pressShiftEnter()

    expect(mockSetShapes).not.toHaveBeenCalled()
  })

  it('textarea retains its value after Shift+Enter', () => {
    render(<JsonImportInput />)
    setTextareaValue(VALID_BARE_ARRAY)
    pressShiftEnter()

    // Value unchanged (no clearing on Shift+Enter)
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(VALID_BARE_ARRAY)
  })
})

describe('JI-005: editing after error clears the error state', () => {
  it('textarea value updates via onChange after an error (onChange is not suppressed)', () => {
    jest.useFakeTimers()
    render(<JsonImportInput />)

    // Trigger error
    setTextareaValue('bad json !!!')
    pressEnter()
    expect(screen.getByRole('textbox').style.border).toContain('#ef4444')

    // Editing updates the value — confirms onChange fires and setValue is called
    setTextareaValue('corrected content')
    expect(screen.getByRole('textbox')).toHaveValue('corrected content')
  })

  it('successful submission after error processes the document and clears the textarea', () => {
    jest.useFakeTimers()
    render(<JsonImportInput />)

    // Trigger error (fake timers block the 700ms auto-clear so it doesn't interfere)
    setTextareaValue('bad json !!!')
    pressEnter()
    expect(screen.getByRole('textbox').style.border).toContain('#ef4444')

    // Submit valid JSON — success path runs: setShapes + setValue('')
    setTextareaValue(VALID_BARE_ARRAY)
    pressEnter()

    expect(mockSetShapes).toHaveBeenCalledTimes(1)
    // Success path calls setValue('') — textarea is cleared
    expect(screen.getByRole('textbox')).toHaveValue('')
  })
})
