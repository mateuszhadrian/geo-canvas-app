import {
  parseDocument,
  encodeDocument,
  decodeDocument,
  serializeDocument,
} from '@/lib/documentCodec'
import { DEFAULT_LAYER_ID, INITIAL_LAYER } from '@/store/slices/layers'
import type { CanvasDocument } from '@/lib/document'
import type { RectShape } from '@/shapes'

function makeRectShape(id: string): RectShape {
  return {
    id,
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
}

function makeFullDoc(shapes: RectShape[] = []): CanvasDocument {
  return {
    meta: {
      schemaVersion: '1.0.0',
      id: 'test-doc-id',
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
        id: DEFAULT_LAYER_ID,
        name: 'Layer 1',
        visible: true,
        locked: false,
        opacity: 1,
        shapes,
      },
    ],
    stickyDefaults: {},
  }
}

describe('parseDocument', () => {
  it('DC-001: accepts full CanvasDocument and returns it 1:1', () => {
    const doc = makeFullDoc()
    const result = parseDocument(JSON.stringify(doc))
    expect(result.meta.id).toBe('test-doc-id')
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].id).toBe(DEFAULT_LAYER_ID)
    expect(result.canvas.background).toBe('#ffffff')
  })

  it('DC-002: partial doc with only layers — fills meta and canvas with defaults', () => {
    const partial = {
      layers: [
        {
          id: DEFAULT_LAYER_ID,
          name: 'Layer 1',
          visible: true,
          locked: false,
          opacity: 1,
          shapes: [],
        },
      ],
    }
    const result = parseDocument(JSON.stringify(partial))
    expect(result.meta).toBeDefined()
    expect(result.meta.schemaVersion).toBeDefined()
    expect(result.canvas).toBeDefined()
    expect(result.layers).toHaveLength(1)
  })

  it('DC-003: bare array treated as single layer with DEFAULT_LAYER_ID', () => {
    const shapes = [makeRectShape('rect-1')]
    const result = parseDocument(JSON.stringify(shapes))
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].id).toBe(DEFAULT_LAYER_ID)
    expect(result.layers[0].shapes).toHaveLength(1)
    expect(result.layers[0].shapes[0].id).toBe('rect-1')
  })

  it('DC-004: invalid JSON string throws "Invalid document: not valid JSON."', () => {
    expect(() => parseDocument('not json {')).toThrow('Invalid document: not valid JSON.')
  })

  it('DC-005: root = number → throws "root must be"', () => {
    expect(() => parseDocument('42')).toThrow(/root must be/)
  })

  it('DC-005: root = null → throws "root must be"', () => {
    expect(() => parseDocument('null')).toThrow(/root must be/)
  })

  it('DC-006: object without layers array → throws "layers" must be an array', () => {
    expect(() => parseDocument(JSON.stringify({ meta: { id: 'x' } }))).toThrow(
      '"layers" must be an array'
    )
  })

  it('DC-007: empty string → throws parse error', () => {
    expect(() => parseDocument('')).toThrow()
  })

  it('DC-008: 1000 shapes parse in < 100 ms', () => {
    const shapes = Array.from({ length: 1000 }, (_, i) => makeRectShape(`rect-${i}`))
    const json = JSON.stringify(shapes)
    const start = performance.now()
    parseDocument(json)
    expect(performance.now() - start).toBeLessThan(100)
  })
})

describe('encodeDocument / decodeDocument round-trip', () => {
  it('DC-010: encode → serialize → parse → decode yields identical shapes and layers', () => {
    const rect = { ...makeRectShape('rect-rt'), layerId: DEFAULT_LAYER_ID }
    const layers = [
      { id: DEFAULT_LAYER_ID, name: 'Layer 1', visible: true, locked: false, opacity: 1 },
    ]
    const encoded = encodeDocument({ shapes: [rect], layers, stickyDefaults: {} })
    const parsed = parseDocument(serializeDocument(encoded))
    const { shapes, layers: decodedLayers } = decodeDocument(parsed)

    expect(shapes).toHaveLength(1)
    expect(shapes[0].id).toBe('rect-rt')
    expect(decodedLayers).toHaveLength(1)
    expect(decodedLayers[0].id).toBe(DEFAULT_LAYER_ID)
  })

  it('DC-011: shape without layerId falls into first layer as orphan', () => {
    const rect = makeRectShape('rect-orphan') // no layerId
    const layers = [
      { id: DEFAULT_LAYER_ID, name: 'Layer 1', visible: true, locked: false, opacity: 1 },
    ]
    const encoded = encodeDocument({ shapes: [rect], layers, stickyDefaults: {} })
    expect(encoded.layers[0].shapes).toHaveLength(1)
    expect(encoded.layers[0].shapes[0].id).toBe('rect-orphan')
  })

  it('DC-012: empty canvas encodes and decodes without errors; decoded has ≥1 layer', () => {
    const layers = [
      { id: DEFAULT_LAYER_ID, name: 'Layer 1', visible: true, locked: false, opacity: 1 },
    ]
    const encoded = encodeDocument({ shapes: [], layers, stickyDefaults: {} })
    const { shapes, layers: decoded } = decodeDocument(parseDocument(serializeDocument(encoded)))
    expect(shapes).toHaveLength(0)
    expect(decoded.length).toBeGreaterThanOrEqual(1)
  })

  it('DC-013: decodeDocument with empty layers array returns INITIAL_LAYER', () => {
    const emptyLayersDoc: CanvasDocument = { ...makeFullDoc(), layers: [] }
    const result = decodeDocument(emptyLayersDoc)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].id).toBe(INITIAL_LAYER.id)
  })

  it('DC-014: encodeDocument preserves meta.id and meta.createdAt from existingMeta', () => {
    const existingMeta = {
      id: 'stable-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      name: 'Stable Doc',
    }
    const layers = [
      { id: DEFAULT_LAYER_ID, name: 'Layer 1', visible: true, locked: false, opacity: 1 },
    ]
    const encoded = encodeDocument({ shapes: [], layers, stickyDefaults: {}, existingMeta })
    expect(encoded.meta.id).toBe('stable-id')
    expect(encoded.meta.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('serializeDocument', () => {
  it('produces valid JSON that can be parsed back', () => {
    const doc = makeFullDoc([makeRectShape('r1')])
    const json = serializeDocument(doc)
    expect(() => JSON.parse(json)).not.toThrow()
    const parsed = JSON.parse(json)
    expect(parsed.meta.id).toBe('test-doc-id')
  })
})
